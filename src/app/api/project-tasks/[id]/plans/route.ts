import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { hasSectionRW } from "@/lib/permissions";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const task = await prisma.projectTask.findUnique({
    where: { id },
    include: { project: { select: { section: true } } },
  });
  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });
  if (!(await hasSectionRW(session, task.project.section))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { planIds }: { planIds: string[] } = await req.json();

  await prisma.$transaction([
    prisma.taskPlan.deleteMany({ where: { taskId: id } }),
    ...planIds.map((planId) =>
      prisma.taskPlan.create({ data: { taskId: id, planId } })
    ),
  ]);

  await recordAudit({
    userId: session.user.id,
    action: "UPDATE",
    entity: "task_plans",
    entityId: id,
    after: { planIds },
    req,
  });

  return NextResponse.json({ ok: true });
}
