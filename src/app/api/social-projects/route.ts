import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { getCurrentAcademicYearId } from "@/lib/academic-year";
import { hasSectionRW } from "@/lib/permissions";
import { toIntOrNull, toFloatOrNull, toDateOrNull } from "@/lib/coerce";
import type { ProjectKind, ProjectStatus, Section } from "@prisma/client";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const where: Record<string, unknown> = {};
  const kind = searchParams.get("kind") as ProjectKind | null;
  const status = searchParams.get("status") as ProjectStatus | null;
  const section = searchParams.get("section") as Section | null;
  const academicYearId = searchParams.get("academicYearId");
  if (kind) where.kind = kind;
  if (status) where.status = status;
  if (section) where.section = section;
  if (academicYearId) where.academicYearId = academicYearId;

  const projects = await prisma.socialProject.findMany({
    where,
    include: {
      _count: { select: { donations: true, inKindDonations: true, tasks: true, plans: true } },
      donations: { select: { amount: true } },
      inKindDonations: { select: { estimatedValue: true } },
      tasks: { select: { status: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Compute summary metrics for each project
  const enriched = projects.map((p) => {
    const cashCollected = p.donations.reduce((s, d) => s + Number(d.amount), 0);
    const inKindEstimated = p.inKindDonations.reduce((s, d) => s + Number(d.estimatedValue ?? 0), 0);
    const tasksDone = p.tasks.filter((t) => t.status === "DONE").length;
    return {
      ...p,
      donations: undefined,
      inKindDonations: undefined,
      tasks: undefined,
      summary: {
        cashCollected,
        inKindEstimated,
        totalCollected: cashCollected + inKindEstimated,
        tasksTotal: p.tasks.length,
        tasksDone,
        progressPct: p.targetAmount && Number(p.targetAmount) > 0
          ? Math.min(100, Math.round((cashCollected + inKindEstimated) / Number(p.targetAmount) * 100))
          : null,
      },
    };
  });

  return NextResponse.json(enriched);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  if (!body.name?.trim()) {
    return NextResponse.json({ error: "الاسم مطلوب" }, { status: 400 });
  }

  const targetSection: Section = (body.section as Section) ?? "SOCIAL";
  if (!(await hasSectionRW(session, targetSection))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const academicYearId = await getCurrentAcademicYearId();

  const created = await prisma.socialProject.create({
    data: {
      name: body.name.trim(),
      kind: body.kind ?? "MACHROO3",
      description: body.description ?? null,
      objective: body.objective ?? null,
      targetAudience: body.targetAudience ?? null,
      expectedBeneficiaries: toIntOrNull(body.expectedBeneficiaries),
      location: body.location ?? null,
      partners: body.partners ?? null,
      targetAmount: toFloatOrNull(body.targetAmount),
      startDate: toDateOrNull(body.startDate),
      endDate: toDateOrNull(body.endDate),
      section: body.section ?? "SOCIAL",
      status: "ACTIVE",
      academicYearId,
      createdBy: session.user.id,
    },
  });

  await recordAudit({
    userId: session.user.id,
    action: "CREATE",
    entity: "social_project",
    entityId: created.id,
    after: created,
    req,
  });

  return NextResponse.json(created, { status: 201 });
}
