import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { hasSectionRW } from "@/lib/permissions";
import type { Role } from "@/lib/rbac";

async function loadTaskAndGate(session: { user: { id: string; roles: Role[] } }, id: string) {
  const task = await prisma.projectTask.findUnique({
    where: { id },
    include: { project: { select: { section: true } } },
  });
  if (!task) return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  if (!(await hasSectionRW(session, task.project.section))) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { task };
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const gated = await loadTaskAndGate(session, id);
  if (gated.error) return gated.error;
  const before = gated.task!;

  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.title !== undefined) data.title = body.title;
  if (body.description !== undefined) data.description = body.description;
  if (body.status !== undefined) {
    data.status = body.status;
    data.completedAt = body.status === "DONE" ? new Date() : null;
  }
  if (body.priority !== undefined) data.priority = body.priority;
  if (body.dueDate !== undefined) {
    if (body.dueDate) {
      const d = new Date(body.dueDate);
      if (Number.isNaN(d.getTime())) return NextResponse.json({ error: "تاريخ غير صالح" }, { status: 400 });
      data.dueDate = d;
    } else data.dueDate = null;
  }
  if (body.estimatedHours !== undefined) {
    if (!body.estimatedHours) data.estimatedHours = null;
    else {
      const n = parseFloat(body.estimatedHours);
      if (!Number.isFinite(n)) return NextResponse.json({ error: "ساعات غير صالحة" }, { status: 400 });
      data.estimatedHours = n;
    }
  }
  if (body.plannedExpense !== undefined) {
    if (!body.plannedExpense) data.plannedExpense = null;
    else {
      const n = parseFloat(body.plannedExpense);
      if (!Number.isFinite(n)) return NextResponse.json({ error: "مبلغ غير صالح" }, { status: 400 });
      data.plannedExpense = n;
    }
  }
  if (body.actualExpense !== undefined) {
    if (!body.actualExpense) data.actualExpense = null;
    else {
      const n = parseFloat(body.actualExpense);
      if (!Number.isFinite(n)) return NextResponse.json({ error: "مبلغ غير صالح" }, { status: 400 });
      data.actualExpense = n;
    }
  }
  if (body.openForSelfClaim !== undefined) data.openForSelfClaim = !!body.openForSelfClaim;
  if (body.needsMedia !== undefined) data.needsMedia = !!body.needsMedia;

  const updated = await prisma.projectTask.update({ where: { id }, data });
  await recordAudit({
    userId: session.user.id,
    action: "UPDATE",
    entity: "project_task",
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
  const { id } = await params;
  const gated = await loadTaskAndGate(session, id);
  if (gated.error) return gated.error;
  const before = gated.task!;
  await prisma.projectTask.delete({ where: { id } });
  await recordAudit({
    userId: session.user.id,
    action: "DELETE",
    entity: "project_task",
    entityId: id,
    before,
    req,
  });
  return NextResponse.json({ ok: true });
}
