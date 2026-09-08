import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import {
  parseWebhookEvent,
  verifyWebhookSignature,
} from "@/lib/payments/youcan";
import { control, getClientForDbUrl } from "@/lib/tenants";
import { rateLimit } from "@/lib/rate-limit";

// YouCan Pay webhook receiver (platform-level; register this URL in the
// YouCan Pay dashboard). Signature = HMAC-SHA256 hex of raw body, keyed by
// the private key. Idempotent: only a PENDING payment can transition to PAID.

function ipFor(req: NextRequest): string {
  return (
    req.headers.get("cf-connecting-ip")
    ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? "unknown"
  );
}

export async function POST(req: NextRequest) {
  // Throttle the webhook endpoint to keep signature verification (CPU work)
  // from being weaponized. 60 per IP per minute is plenty — YouCan retries
  // are typically seconds apart, and any honest gateway stays well below.
  const rl = rateLimit(`webhook:youcan:${ipFor(req)}`, 60, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too Many Requests" }, { status: 429 });
  }

  // Read the RAW body before any JSON parsing. The signature is computed
  // over the exact bytes YouCan POSTed, so req.json() → JSON.stringify() is
  // a guaranteed mismatch.
  const rawBody = await req.text();
  const signature =
    req.headers.get("x-youcan-pay-signature") ??
    req.headers.get("signature") ??
    req.headers.get("x-signature");

  if (!verifyWebhookSignature(signature, rawBody)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 403 });
  }

  const event = parseWebhookEvent(rawBody);
  if (!event?.event_name) {
    return NextResponse.json({ error: "malformed payload" }, { status: 400 });
  }

  const transaction = event.payload?.transaction;
  const orderId = transaction?.order_id ?? transaction?.metadata?.order_id;
  if (!orderId) {
    // Not related to our orders — acknowledge and ignore.
    return NextResponse.json({ ok: true, ignored: true });
  }

  const payment = await control.tenantPayment.findUnique({
    where: { orderId },
    include: { tenant: { select: { id: true, slug: true, currentPeriodEnd: true, plan: true } } },
  });
  // Compute the idempotency key early — used by both the platform
  // payment handler and the per-tenant event-ticket fan-out.
  const eventKey = String(event.event_id ?? createHash("sha256").update(rawBody).digest("hex"));

  // Event-ticket payments: orderId starts with "evt-". Resolve the ticket
  // via the ticket_id metadata and the host's tenant DB. YouCan posts to
  // a single platform webhook, so we have to fan out per-tenant from here.
  const isEventPayment = orderId.startsWith("evt-") && transaction?.metadata?.ticket_id;

  if (isEventPayment) {
    return await handleEventTicketWebhook(orderId, event, transaction, rawBody, eventKey, req);
  }
  if (!payment) return NextResponse.json({ ok: true, ignored: true });

  // Idempotency dedup uses eventKey (already computed above). Insert the
  // webhook event row first — the unique index on (provider, eventId)
  // catches concurrent duplicate delivery.
  try {
    await control.webhookEvent.create({
      data: {
        provider: "youcanpay",
        eventId: eventKey,
        eventName: event.event_name,
        tenantId: payment.tenantId,
        paymentId: payment.id,
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      // Already processed — acknowledge silently so YouCan stops retrying.
      return NextResponse.json({ ok: true, dedup: true });
    }
    throw e;
  }

  try {
    if (event.event_name === "transaction.success") {
      if (payment.status === "PENDING") {
        const months = payment.months;
        const base =
          payment.tenant.currentPeriodEnd && payment.tenant.currentPeriodEnd > new Date()
            ? payment.tenant.currentPeriodEnd
            : new Date();
        const periodEnd = new Date(base);
        periodEnd.setMonth(periodEnd.getMonth() + months);

        await control.$transaction([
          control.tenantPayment.update({
            where: { id: payment.id },
            data: {
              status: "PAID",
              transactionId: transaction?.id ?? null,
              periodStart: base,
              periodEnd,
            },
          }),
          control.tenant.update({
            where: { id: payment.tenantId },
            data: {
              plan: payment.plan,
              status: "ACTIVE",
              currentPeriodEnd: periodEnd,
              lastProvisionError: null,
            },
          }),
          control.platformAuditLog.create({
            data: {
              action: "billing.success",
              entity: "tenant_payment",
              entityId: payment.id,
              meta: { tenantId: payment.tenantId, plan: payment.plan, months } as never,
            },
          }),
        ]);
      }
    } else if (
      event.event_name === "transaction.failed" ||
      event.event_name === "transaction.canceled" ||
      event.event_name === "transaction.cancelled"
    ) {
      if (payment.status === "PENDING") {
        await control.$transaction([
          control.tenantPayment.update({
            where: { id: payment.id },
            data: { status: event.event_name === "transaction.failed" ? "FAILED" : "CANCELLED" },
          }),
          control.platformAuditLog.create({
            data: {
              action: "billing.failed",
              entity: "tenant_payment",
              entityId: payment.id,
              meta: { tenantId: payment.tenantId, eventName: event.event_name } as never,
            },
          }),
        ]);
      }
    }
  } catch (err) {
    // On processing failure, drop the dedup row so YouCan's retry can succeed.
    await control.webhookEvent.delete({
      where: { provider_eventId: { provider: "youcanpay", eventId: eventKey } },
    }).catch(() => {});
    throw err;
  }

  return NextResponse.json({ ok: true });
}

// Per-tenant event-ticket handler. YouCan posts to one platform URL;
// we fan out to the correct tenant DB based on the Host header.
async function handleEventTicketWebhook(
  orderId: string,
  event: { event_name?: string },
  transaction: { id?: string; metadata?: Record<string, string> } | undefined,
  rawBody: string,
  eventKey: string,
  req: NextRequest,
): Promise<NextResponse> {
  const ticketId = transaction?.metadata?.ticket_id;
  const tenantSlug = transaction?.metadata?.tenant_slug;
  if (!ticketId || !tenantSlug) {
    return NextResponse.json({ ok: true, ignored: true, reason: "missing ticket metadata" });
  }
  // Look up the tenant by slug (we trust the metadata because the orderId
  // is generated server-side and the slug is the tenant's own).
  const tenantRecord = await control.tenant.findUnique({
    where: { slug: tenantSlug },
    select: { dbUrl: true },
  }).catch(() => null);
  if (!tenantRecord) {
    return NextResponse.json({ ok: true, ignored: true, reason: "tenant not found" });
  }
  const client = getClientForDbUrl(tenantRecord.dbUrl);
  // We use the tenant Prisma client via a loose `as` cast — each tenant DB
  // has the same schema. This is the same pattern used elsewhere in the
  // webhook fan-out (see lib/tenants.ts getClientForDbUrl).
  const tenantPrisma = client as unknown as import("@prisma/client").PrismaClient;

  // Idempotency: look at the ticket directly. If status is already PAID
  // or CHECKED_IN, a re-delivery of the same transaction.success is a
  // no-op. Use the transaction id from the webhook to disambiguate.
  const ticket = await tenantPrisma.ticket.findUnique({
    where: { id: ticketId },
    select: { id: true, status: true, youcanTxId: true, amountPaid: true },
  });
  if (!ticket) {
    return NextResponse.json({ ok: true, ignored: true, reason: "ticket gone" });
  }
  // If the same youcanTxId was already applied, this is a re-delivery.
  const txId = transaction?.id ?? null;
  if (txId && ticket.youcanTxId === txId && (ticket.status === "PAID" || ticket.status === "CHECKED_IN")) {
    return NextResponse.json({ ok: true, dedup: true });
  }

  // Audit log on the platform (control) DB so platform admins see
  // event-payment activity without needing to hit the tenant DB.
  try {
    await control.platformAuditLog.create({
      data: {
        action: "billing.event",
        entity: "event_ticket",
        entityId: ticketId,
        meta: { eventName: event.event_name, orderId, tenantSlug, txId } as never,
      },
    });
  } catch {
    // best-effort
  }

  if (event.event_name === "transaction.success") {
    if (ticket.status === "PENDING") {
      await tenantPrisma.ticket.update({
        where: { id: ticket.id },
        data: {
          status: "PAID",
          paidAt: new Date(),
          youcanTxId: transaction?.id ?? null,
        },
      });
    }
  } else if (
    event.event_name === "transaction.failed" ||
    event.event_name === "transaction.canceled" ||
    event.event_name === "transaction.cancelled"
  ) {
    if (ticket.status === "PENDING") {
      await tenantPrisma.ticket.update({
        where: { id: ticket.id },
        data: { status: "CANCELLED" },
      });
    }
  }
  return NextResponse.json({ ok: true });
}
