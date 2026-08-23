import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { hasSectionRW, canSelfClaim } from "@/lib/permissions";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { memberId } = await req.json();
  if (!memberId) return NextResponse.json({ error: "memberId مطلوب" }, { status: 400 });

  // Loading the parent task lets us:
  //   1. Verify the section
  //   2. Check the openForSelfClaim flag for SECTION_READ users self-claiming
  const task = await prisma.projectTask.findUnique({
    where: { id },
    include: { project: { select: { section: true } } },
  });
  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

  const isSelfAssign = memberId === session.user.id;
  const hasRW = await hasSectionRW(session, task.project.section);
  if (!hasRW && !(isSelfAssign && canSelfClaim(task))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const created = await prisma.taskAssignment.upsert({
    where: { taskId_memberId: { taskId: id, memberId } },
    create: { taskId: id, memberId },
    update: {},
    include: { member: { select: { id: true, fullName: true } } },
  });
  await recordAudit({
    userId: session.user.id,
    action: "CREATE",
    entity: "task_assignment",
    entityId: created.id,
    after: created,
    req,
  });
  return NextResponse.json(created, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const memberId = searchParams.get("memberId");
  if (!memberId) return NextResponse.json({ error: "memberId مطلوب" }, { status: 400 });

  const task = await prisma.projectTask.findUnique({
    where: { id },
    include: { project: { select: { section: true } } },
  });
  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

  const isSelf = memberId === session.user.id;
  if (!isSelf && !(await hasSectionRW(session, task.project.section))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.taskAssignment.deleteMany({ where: { taskId: id, memberId } });
  await recordAudit({
    userId: session.user.id,
    action: "DELETE",
    entity: "task_assignment",
    entityId: `${id}:${memberId}`,
    req,
  });
  return NextResponse.json({ ok: true });
}
