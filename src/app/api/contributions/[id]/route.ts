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
  const before = await prisma.weeklyContribution.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: Record<string, unknown> = {};
  if (body.amount !== undefined) {
    const n = parseFloat(body.amount);
    if (!Number.isFinite(n) || n < 0) return NextResponse.json({ error: "مبلغ غير صالح" }, { status: 400 });
    data.amount = n;
  }
  if (body.weekStart !== undefined) {
    const d = new Date(body.weekStart);
    if (Number.isNaN(d.getTime())) return NextResponse.json({ error: "تاريخ غير صالح" }, { status: 400 });
    data.weekStart = d;
  }
  if (body.notes !== undefined) data.notes = body.notes;

  const updated = await prisma.weeklyContribution.update({ where: { id }, data });
  await recordAudit({
    userId: session.user.id,
    action: "UPDATE",
    entity: "contribution",
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
  if (!isAdmin(session.user.roles) && !isFinancial(session.user.roles) && !(await isBureauRW(session))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const before = await prisma.weeklyContribution.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.weeklyContribution.delete({ where: { id } });
  await recordAudit({
    userId: session.user.id,
    action: "DELETE",
    entity: "contribution",
    entityId: id,
    before,
    req,
  });
  return NextResponse.json({ ok: true });
}
