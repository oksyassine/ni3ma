import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { isAdmin, isBureauRW } from "@/lib/permissions";
import { recordAudit } from "@/lib/audit";
import { randomBytes } from "crypto";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Rotating a member's QR token invalidates any printed badge and lets
  // anyone with the token impersonate attendance. Admin / BUREAU_RW only.
  if (!isAdmin(session.user.roles) && !(await isBureauRW(session))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const before = await prisma.member.findUnique({ where: { id }, select: { id: true } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const token = `c_${randomBytes(8).toString("hex")}`;
  const updated = await prisma.member.update({
    where: { id },
    data: { checkinToken: token },
    select: { id: true, checkinToken: true, fullName: true, registrationNumber: true },
  });

  await recordAudit({
    userId: session.user.id,
    action: "UPDATE",
    entity: "member_checkin_token",
    entityId: id,
    after: { rotated: true },
    req,
  });

  return NextResponse.json(updated);
}
