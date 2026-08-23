import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { getCurrentAcademicYear } from "@/lib/academic-year";
import { hasSectionRW } from "@/lib/permissions";
import type { Section } from "@prisma/client";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const section = searchParams.get("section");
  const academicYearId = searchParams.get("academicYearId");

  const where: Record<string, unknown> = {};
  if (section) where.section = section;
  if (academicYearId) where.academicYearId = academicYearId;

  const programs = await prisma.annualProgram.findMany({
    where,
    include: {
      activities: { orderBy: { activityDate: "asc" } },
      academicYear: true,
      _count: { select: { activities: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(programs);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const section = body.section as Section;
  if (!section) return NextResponse.json({ error: "section required" }, { status: 400 });
  if (!(await hasSectionRW(session, section))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ay = await getCurrentAcademicYear();
  const year = body.year ?? (ay ? new Date(ay.startDate).getFullYear() : new Date().getFullYear());

  const program = await prisma.annualProgram.create({
    data: {
      section: body.section,
      year,
      academicYearId: body.academicYearId ?? ay?.id ?? null,
      title: body.title,
      description: body.description ?? null,
      startDate: body.startDate ? new Date(body.startDate) : null,
      endDate: body.endDate ? new Date(body.endDate) : null,
      createdBy: session.user.id,
    },
  });

  await recordAudit({
    userId: session.user.id,
    action: "CREATE",
    entity: "program",
    entityId: program.id,
    after: program,
    req,
  });

  return NextResponse.json(program, { status: 201 });
}
