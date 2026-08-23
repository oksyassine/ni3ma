import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { getCurrentAcademicYearId } from "@/lib/academic-year";
import { hasSectionRW } from "@/lib/permissions";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const newName: string | undefined = body.name?.trim();
  const recurring: boolean = body.recurring === true;

  const source = await prisma.socialProject.findUnique({
    where: { id },
    include: {
      plans: { include: { lineItems: true } },
      tasks: { include: { taskPlans: true } },
      stakeholders: true,
      risks: true,
    },
  });
  if (!source) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!(await hasSectionRW(session, source.section))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const academicYearId = await getCurrentAcademicYearId();

  // Atomic clone: either the entire copy succeeds, or nothing is created.
  // Prevents orphan partial clones from interrupted runs.
  const cloned = await prisma.$transaction(async (tx) => {
    const project = await tx.socialProject.create({
      data: {
        name: newName ?? `${source.name} (نسخة)`,
        kind: source.kind,
        description: source.description,
        objective: source.objective,
        targetAudience: source.targetAudience,
        expectedBeneficiaries: source.expectedBeneficiaries,
        location: source.location,
        partners: source.partners,
        targetAmount: source.targetAmount,
        section: source.section,
        status: "ACTIVE",
        academicYearId,
        createdBy: session.user.id,
        recurringFromId: recurring ? source.id : null,
      },
    });

    const planIdMap: Record<string, string> = {};
    for (const pl of source.plans) {
      const newPlan = await tx.projectPlan.create({
        data: {
          projectId: project.id,
          name: pl.name,
          description: pl.description,
          estimatedCost: pl.estimatedCost,
          isActive: pl.isActive,
          position: pl.position,
          lineItems: {
            create: pl.lineItems.map((li) => ({
              name: li.name,
              amount: li.amount,
              position: li.position,
            })),
          },
        },
      });
      planIdMap[pl.id] = newPlan.id;
    }

    for (const t of source.tasks) {
      await tx.projectTask.create({
        data: {
          projectId: project.id,
          title: t.title,
          description: t.description,
          priority: t.priority,
          dueDate: null,
          estimatedHours: t.estimatedHours,
          position: t.position,
          createdBy: session.user.id,
          taskPlans: {
            create: t.taskPlans
              .map((tp) => planIdMap[tp.planId])
              .filter(Boolean)
              .map((planId) => ({ planId })),
          },
        },
      });
    }

    for (const s of source.stakeholders) {
      await tx.projectStakeholder.create({
        data: { projectId: project.id, name: s.name, role: s.role, phone: s.phone, email: s.email, notes: s.notes },
      });
    }
    for (const r of source.risks) {
      await tx.projectRisk.create({
        data: { projectId: project.id, description: r.description, mitigation: r.mitigation, severity: r.severity, status: "OPEN" },
      });
    }
    return project;
  }, { timeout: 30_000 });

  await recordAudit({
    userId: session.user.id,
    action: "CREATE",
    entity: "social_project",
    entityId: cloned.id,
    after: { clonedFrom: source.id, name: cloned.name },
    req,
  });

  return NextResponse.json(cloned, { status: 201 });
}
