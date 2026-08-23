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
  const before = await prisma.expense.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: Record<string, unknown> = {};
  if (body.category !== undefined) data.category = body.category;
  if (body.section !== undefined) data.section = body.section || null;
  if (body.description !== undefined) data.description = body.description;
  if (body.amount !== undefined) {
    const n = parseFloat(body.amount);
    if (!Number.isFinite(n) || n < 0) return NextResponse.json({ error: "مبلغ غير صالح" }, { status: 400 });
    data.amount = n;
  }
  if (body.expenseDate !== undefined) {
    const d = new Date(body.expenseDate);
    if (Number.isNaN(d.getTime())) return NextResponse.json({ error: "تاريخ غير صالح" }, { status: 400 });
    data.expenseDate = d;
  }
  if (body.projectId !== undefined) data.projectId = body.projectId || null;
  if (body.planId !== undefined) data.planId = body.planId || null;
  if (body.planLineItemId !== undefined) data.planLineItemId = body.planLineItemId || null;

  const updated = await prisma.expense.update({ where: { id }, data });
  await recordAudit({
    userId: session.user.id,
    action: "UPDATE",
    entity: "expense",
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
  const before = await prisma.expense.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.expense.delete({ where: { id } });
  await recordAudit({
    userId: session.user.id,
    action: "DELETE",
    entity: "expense",
    entityId: id,
    before,
    req,
  });
  return NextResponse.json({ ok: true });
}
