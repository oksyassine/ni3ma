import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { createHmac, randomBytes } from "node:crypto";
import { tokenize, paymentFormUrl } from "@/lib/payments/youcan";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { normalizeHost } from "@/lib/tenants";
import { recordAudit } from "@/lib/audit";

// POST /api/events/[id]/register
//
// Public endpoint (no auth required) — creates a Ticket in PENDING and,
// for paid ONLINE events, returns a YouCan payUrl. Members logged in via
// the member portal get a discount (configurable per event). Capacity is
// checked atomically inside a transaction against PAID + CHECKED_IN
// ticket counts (PENDING is reserved for ONLINE but auto-cancelled after
// 30 min by a future cron).
//
// Body: { attendeeName, attendeePhone, attendeeEmail?, consent, lang? }

const schema = z.object({
  attendeeName: z.string().trim().min(2).max(120),
  attendeePhone: z.string().trim().regex(/^\+?\d[\d\s-]{5,29}$/, "invalid phone"),
  attendeeEmail: z.string().trim().email().max(120).optional(),
  consent: z.literal(true, { message: "consent required" }),
  lang: z.enum(["ar", "fr", "en"]).optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  const { attendeeName, attendeePhone, attendeeEmail, lang } = parsed.data;

  // Trust the proxy-set client IP only. Fail closed if neither
  // Cloudflare nor a trusted reverse proxy is in front.
  const ip = req.headers.get("cf-connecting-ip")?.trim();
  if (!ip) {
    return NextResponse.json({
      error: "missing client IP — request must come through the configured proxy",
    }, { status: 400 });
  }
  // Throttle: 5 registrations per IP per 10 minutes.
  const rl = rateLimit(`event-reg:${ip}`, 5, 10 * 60 * 1000);
  if (!rl.allowed) return NextResponse.json({ error: "Too Many Requests" }, { status: 429 });

  // Capacity check + ticket create in one serializable transaction.
  // Capacity counts only PAID + CHECKED_IN (PENDING is held but
  // expires; this defends against phantom-ticket DoS).
  type CreatedTicket = { id: string; amountPaid: number; memberId: string | null; qrToken: string };
  type EventForReg = {
    id: string; slug: string; title: string;
    paymentMode: "FREE" | "ONLINE" | "ONSITE";
    capacity: number | null; visibility: string;
    memberDiscountPct: number | null;
  };

  const result = await prisma.$transaction(async (tx) => {
    const e = await tx.event.findUnique({
      where: { id },
      select: {
        id: true, slug: true, title: true, visibility: true,
        capacity: true, ticketPrice: true, paymentMode: true,
        memberDiscountPct: true, startsAt: true, endsAt: true,
      },
    });
    if (!e || e.visibility !== "PUBLISHED") return { kind: "not_available" as const };
    const now = new Date();
    if (e.startsAt && new Date(e.startsAt) <= now) return { kind: "not_available" as const };
    if (e.endsAt && new Date(e.endsAt) <= now) return { kind: "not_available" as const };
    if (e.capacity !== null) {
      const confirmed = await tx.ticket.count({
        where: { eventId: e.id, status: { in: ["PAID", "CHECKED_IN"] } },
      });
      if (confirmed >= e.capacity) return { kind: "sold_out" as const };
    }
    // Member discount only for subjectKind=member sessions.
    const session = await auth();
    let memberId: string | null = null;
    if (session?.user?.subjectKind === "member") {
      const m = await tx.member.findFirst({
        where: { username: session.user.username, isActive: true, memberType: "ADULT" },
        select: { id: true },
      });
      memberId = m?.id ?? null;
    }
    const basePrice = Number(e.ticketPrice);
    const discountPct = memberId ? Number(e.memberDiscountPct ?? 50) : 0;
    const finalPrice = +(basePrice * (1 - discountPct / 100)).toFixed(2);
    const t = await tx.ticket.create({
      data: {
        eventId: e.id,
        attendeeName,
        attendeePhone,
        attendeeEmail: attendeeEmail ?? null,
        memberId: memberId ?? null,
        amountPaid: finalPrice,
        qrToken: signQrToken(e.id),
        status: "PENDING",
      },
      select: { id: true, amountPaid: true, memberId: true, qrToken: true },
    });
    return { kind: "ok" as const, event: e, ticket: t, finalPrice };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

  if (result.kind === "not_available") {
    return NextResponse.json({ error: "not available" }, { status: 404 });
  }
  if (result.kind === "sold_out") {
    return NextResponse.json({ error: "sold out" }, { status: 409 });
  }
  const { event, ticket, finalPrice } = result;

  await recordAudit({
    userId: null,
    action: "CREATE",
    entity: "event_ticket",
    entityId: ticket.id,
    after: { eventId: event.id, attendeeName, attendeePhone, amountPaid: finalPrice },
    req,
  });

  if (event.paymentMode === "FREE" || finalPrice === 0) {
    if (event.paymentMode !== "FREE") {
      return NextResponse.json({ error: "free events must use FREE mode" }, { status: 400 });
    }
    await prisma.ticket.update({
      where: { id: ticket.id },
      data: { status: "PAID", paidAt: new Date() },
    });
    return NextResponse.json({ ok: true, ticketId: ticket.id });
  }

  if (event.paymentMode === "ONLINE") {
    const h = await headers();
    const hostHeader = h.get("x-forwarded-host") ?? h.get("host");
    const host = normalizeHost(hostHeader) ?? new URL(req.url).host;
    const proto = host.includes("localhost") ? "http" : "https";
    const origin = `${proto}://${host}`;
    const orderId = `evt-${event.slug}-${ticket.id.slice(0, 12)}`;
    const tokenizeResult = await tokenize({
      orderId,
      amountMad: finalPrice,
      successUrl: `${origin}/e/${event.slug}?paid=1&ref=${ticket.id}`,
      errorUrl: `${origin}/e/${event.slug}?paid=0&ref=${ticket.id}`,
      customerIp: ip,
      customer: {
        name: attendeeName,
        email: attendeeEmail,
        phone: attendeePhone,
      },
      metadata: {
        event_id: event.id,
        ticket_id: ticket.id,
        event_slug: event.slug,
      },
    });
    if (!tokenizeResult.ok) {
      await prisma.ticket.delete({ where: { id: ticket.id } }).catch(() => {});
      return NextResponse.json({ error: "payment init failed" }, { status: 502 });
    }
    const payUrl = paymentFormUrl(tokenizeResult.tokenId, lang ?? "ar");
    await prisma.ticket.update({
      where: { id: ticket.id },
      data: { youcanTxId: tokenizeResult.tokenId },
    });
    await recordAudit({
      userId: null,
      action: "CREATE",
      entity: "event_ticket_payment",
      entityId: ticket.id,
      after: { orderId, amount: finalPrice, payUrl: payUrl.replace(/^https?:\/\/[^/]+/, "") },
      req,
    });
    return NextResponse.json({ ok: true, ticketId: ticket.id, payUrl });
  }

  // ONSITE: stay PENDING; treasurer marks PAID at the door.
  return NextResponse.json({ ok: true, ticketId: ticket.id });
}

// HMAC-signed QR token. Verified by the checkin route before flipping
// status to CHECKED_IN, so DB read access does not allow forgery.
function signQrToken(eventId: string): string {
  const secret = process.env.CHECKIN_SIGNING_SECRET ?? "ni3ma-dev-checkin-secret";
  const nonce = randomBytes(16).toString("base64url");
  const sig = createHmac("sha256", secret).update(`${eventId}.${nonce}`).digest("base64url").slice(0, 32);
  return `${eventId}.${nonce}.${sig}`;
}
