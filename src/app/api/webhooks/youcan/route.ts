import { NextRequest, NextResponse } from "next/server";
import {
  parseWebhookEvent,
  verifyWebhookSignature,
} from "@/lib/payments/youcan";
import { control } from "@/lib/tenants";

// YouCan Pay webhook receiver (platform-level; register this URL in the
// YouCan Pay dashboard). Signature = HMAC-SHA256 hex of raw body, keyed by
// the private key. Idempotent: only a PENDING payment can transition to PAID.

export async function POST(req: NextRequest) {
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
  if (!payment) return NextResponse.json({ ok: true, ignored: true });

  if (event.event_name === "transaction.success") {
    if (payment.status === "PENDING") {
      const months = payment.months;
      // Extend from current period end if still valid, else from now.
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
            periodStart: new Date(),
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
      ]);
    }
  } else if (
    event.event_name === "transaction.failed" ||
    event.event_name === "transaction.canceled"
  ) {
    if (payment.status === "PENDING") {
      await control.tenantPayment.update({
        where: { id: payment.id },
        data: { status: event.event_name === "transaction.failed" ? "FAILED" : "CANCELLED" },
      });
    }
  }

  return NextResponse.json({ ok: true });
}
