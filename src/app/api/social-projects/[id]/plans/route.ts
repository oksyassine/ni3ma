import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { hasSectionRead, hasSectionRW } from "@/lib/permissions";

async function projectSection(id: string) {
  return prisma.socialProject.findUnique({ where: { id }, select: { section: true } });
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const project = await projectSection(id);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!(await hasSectionRead(session, project.section))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const plans = await prisma.projectPlan.findMany({
    where: { projectId: id },
    orderBy: { position: "asc" },
  });
  return NextResponse.json(plans);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const project = await projectSection(id);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!(await hasSectionRW(session, project.section))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  if (!body.name?.trim()) return NextResponse.json({ error: "الاسم مطلوب" }, { status: 400 });

  const existingCount = await prisma.projectPlan.count({ where: { projectId: id } });
  const created = await prisma.projectPlan.create({
    data: {
      projectId: id,
      name: body.name.trim(),
      description: body.description ?? null,
      estimatedCost: body.estimatedCost ? parseFloat(body.estimatedCost) : null,
      isActive: existingCount === 0, // first plan is active by default
      position: existingCount,
    },
  });

  await recordAudit({
    userId: session.user.id,
    action: "CREATE",
    entity: "project_plan",
    entityId: created.id,
    after: created,
    req,
  });
  return NextResponse.json(created, { status: 201 });
}
