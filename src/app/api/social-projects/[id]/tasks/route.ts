import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { hasSectionRead, hasSectionRW } from "@/lib/permissions";
import type { TaskPriority } from "@prisma/client";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const project = await prisma.socialProject.findUnique({ where: { id }, select: { section: true } });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!(await hasSectionRead(session, project.section))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const tasks = await prisma.projectTask.findMany({
    where: { projectId: id },
    include: {
      assignees: { include: { member: { select: { id: true, fullName: true } } } },
      worklogs: { include: { member: { select: { fullName: true } } }, orderBy: { workedDate: "desc" } },
    },
    orderBy: [{ status: "asc" }, { position: "asc" }],
  });
  return NextResponse.json(tasks);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const project = await prisma.socialProject.findUnique({ where: { id }, select: { section: true } });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!(await hasSectionRW(session, project.section))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  if (!body.title?.trim()) return NextResponse.json({ error: "العنوان مطلوب" }, { status: 400 });

  const created = await prisma.projectTask.create({
    data: {
      projectId: id,
      title: body.title.trim(),
      description: body.description ?? null,
      priority: (body.priority ?? "MEDIUM") as TaskPriority,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      estimatedHours: body.estimatedHours ? parseFloat(body.estimatedHours) : null,
      plannedExpense: body.plannedExpense ? parseFloat(body.plannedExpense) : null,
      actualExpense: body.actualExpense ? parseFloat(body.actualExpense) : null,
      openForSelfClaim: !!body.openForSelfClaim,
      needsMedia: !!body.needsMedia,
      createdBy: session.user.id,
    },
  });

  await recordAudit({
    userId: session.user.id,
    action: "CREATE",
    entity: "project_task",
    entityId: created.id,
    after: created,
    req,
  });
  return NextResponse.json(created, { status: 201 });
}
