import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { isAdmin, isFinancial, isBureauRW } from "@/lib/permissions";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isFinancial(session.user.roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const body = await req.json();
  const before = await prisma.donation.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: Record<string, unknown> = {};
  if (body.donorName !== undefined) data.donorName = body.isAnonymous ? null : body.donorName;
  if (body.donorPhone !== undefined) data.donorPhone = body.donorPhone || null;
  if (body.amount !== undefined) {
    const n = parseFloat(body.amount);
    if (!Number.isFinite(n) || n < 0) return NextResponse.json({ error: "مبلغ غير صالح" }, { status: 400 });
    data.amount = n;
  }
  if (body.section !== undefined) data.section = body.section;
  if (body.projectId !== undefined) data.projectId = body.projectId || null;
  if (body.donationDate !== undefined) {
    const d = new Date(body.donationDate);
    if (Number.isNaN(d.getTime())) return NextResponse.json({ error: "تاريخ غير صالح" }, { status: 400 });
    data.donationDate = d;
  }
  if (body.isAnonymous !== undefined) data.isAnonymous = body.isAnonymous;
  if (body.notes !== undefined) data.notes = body.notes;
  if (body.markPaid === true) {
    data.isPaid = true;
    data.paidAt = new Date();
  }
  if (body.isPaid !== undefined) data.isPaid = body.isPaid;

  const updated = await prisma.donation.update({ where: { id }, data });
  await recordAudit({
    userId: session.user.id,
    action: "UPDATE",
    entity: "donation",
    entityId: id,
    before,
    after: updated,
    req,
  });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // Deletion: ADMIN, BUREAU_RW (ra2is), or FINANCIAL. BUREAU READ is not enough.
  if (!isAdmin(session.user.roles) && !isFinancial(session.user.roles) && !(await isBureauRW(session))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const before = await prisma.donation.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.donation.delete({ where: { id } });
  await recordAudit({
    userId: session.user.id,
    action: "DELETE",
    entity: "donation",
    entityId: id,
    before,
    req,
  });
  return NextResponse.json({ ok: true });
}
