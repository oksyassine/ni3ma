import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { hasSectionRW, isAdmin } from "@/lib/permissions";
import type { Role } from "@/lib/rbac";

// Owner of a worklog = the member it was logged for, OR the session user
// recorded it on behalf of (currently we don't track who recorded — so we
// treat the worklog's memberId as the only owner). Section RW (e.g.,
// section admin or maktab) can also edit.
async function canEditWorklog(session: { user: { id: string; roles: Role[] } }, worklog: { memberId: string; taskId: string }): Promise<boolean> {
  if (isAdmin(session.user.roles)) return true;
  if (worklog.memberId === session.user.id) return true;
  const task = await prisma.projectTask.findUnique({
    where: { id: worklog.taskId },
    include: { project: { select: { section: true } } },
  });
  if (!task) return false;
  return hasSectionRW(session, task.project.section);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  if (!body.memberId || !body.hours || !body.workedDate) {
    return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
  }

  // Logging on behalf of someone else requires section RW. Logging for
  // yourself is allowed (you're the assignee or self-claimer).
  const task = await prisma.projectTask.findUnique({
    where: { id },
    include: { project: { select: { section: true } }, assignees: { select: { memberId: true } } },
  });
  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });
  const isSelf = body.memberId === session.user.id;
  const isAssignee = task.assignees.some((a) => a.memberId === session.user.id);
  if (!isSelf && !isAssignee && !(await hasSectionRW(session, task.project.section))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const hours = parseFloat(body.hours);
  if (!Number.isFinite(hours) || hours <= 0) {
    return NextResponse.json({ error: "ساعات غير صالحة" }, { status: 400 });
  }
  const workedDate = new Date(body.workedDate);
  if (Number.isNaN(workedDate.getTime())) {
    return NextResponse.json({ error: "تاريخ غير صالح" }, { status: 400 });
  }

  const created = await prisma.taskWorklog.create({
    data: {
      taskId: id,
      memberId: body.memberId,
      hours,
      workedDate,
      description: body.description ?? null,
    },
    include: { member: { select: { fullName: true } } },
  });

  await recordAudit({
    userId: session.user.id,
    action: "CREATE",
    entity: "task_worklog",
    entityId: created.id,
    after: created,
    req,
  });
  return NextResponse.json(created, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  if (!body.worklogId) return NextResponse.json({ error: "worklogId مطلوب" }, { status: 400 });
  const before = await prisma.taskWorklog.findUnique({ where: { id: body.worklogId } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!(await canEditWorklog(session, before))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const data: Record<string, unknown> = {};
  if (body.hours !== undefined) {
    const n = parseFloat(body.hours);
    if (!Number.isFinite(n) || n <= 0) return NextResponse.json({ error: "ساعات غير صالحة" }, { status: 400 });
    data.hours = n;
  }
  if (body.workedDate !== undefined) {
    const d = new Date(body.workedDate);
    if (Number.isNaN(d.getTime())) return NextResponse.json({ error: "تاريخ غير صالح" }, { status: 400 });
    data.workedDate = d;
  }
  if (body.description !== undefined) data.description = body.description;

  const updated = await prisma.taskWorklog.update({ where: { id: body.worklogId }, data });
  await recordAudit({
    userId: session.user.id,
    action: "UPDATE",
    entity: "task_worklog",
    entityId: body.worklogId,
    before,
    after: updated,
    req,
  });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const worklogId = searchParams.get("worklogId");
  if (!worklogId) return NextResponse.json({ error: "worklogId مطلوب" }, { status: 400 });
  const before = await prisma.taskWorklog.findUnique({ where: { id: worklogId } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!(await canEditWorklog(session, before))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await prisma.taskWorklog.delete({ where: { id: worklogId } });
  await recordAudit({
    userId: session.user.id,
    action: "DELETE",
    entity: "task_worklog",
    entityId: worklogId,
    before,
    req,
  });
  return NextResponse.json({ ok: true });
}
