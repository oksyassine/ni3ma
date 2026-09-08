import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { canManageGovernance } from "@/lib/rbac";
import { rateLimit } from "@/lib/rate-limit";
import { recordAudit } from "@/lib/audit";

// POST /api/events/[id]/checkin
//
// Body: { qrToken }  (from the kiosk scan)
//
// Idempotent: scanning the same QR twice is a no-op. Re-scanning a
// CHECKED_IN ticket returns the existing check-in time so the kiosk
// shows "already checked in at HH:MM".

const schema = z.object({ qrToken: z.string().min(8) });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageGovernance(session.user.roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const rl = rateLimit(`checkin:${session.user.id}`, 60, 60_000);
  if (!rl.allowed) return NextResponse.json({ error: "Too Many Requests" }, { status: 429 });

  const ticket = await prisma.ticket.findUnique({
    where: { qrToken: parsed.data.qrToken },
    include: { event: { select: { id: true } } },
  });
  if (!ticket || ticket.eventId !== id) {
    return NextResponse.json({ error: "ticket not found" }, { status: 404 });
  }

  // Already checked in — idempotent return.
  if (ticket.status === "CHECKED_IN") {
    return NextResponse.json({
      ok: true,
      alreadyCheckedIn: true,
      attendee: ticket.attendeeName,
      at: ticket.checkedInAt?.toISOString() ?? null,
    });
  }

  // Refuse to check in unpaid tickets.
  if (ticket.status === "PENDING" || ticket.status === "CANCELLED") {
    return NextResponse.json({ error: `ticket ${ticket.status.toLowerCase()}` }, { status: 409 });
  }

  const updated = await prisma.ticket.update({
    where: { id: ticket.id },
    data: {
      status: "CHECKED_IN",
      checkedInAt: new Date(),
      checkedInBy: session.user.id,
    },
    select: { id: true, attendeeName: true, checkedInAt: true },
  });

  await recordAudit({
    userId: session.user.id,
    action: "UPDATE",
    entity: "event_ticket",
    entityId: ticket.id,
    after: { status: "CHECKED_IN" },
    req,
  });

  return NextResponse.json({
    ok: true,
    alreadyCheckedIn: false,
    attendee: updated.attendeeName,
    at: updated.checkedInAt?.toISOString() ?? null,
  });
}
