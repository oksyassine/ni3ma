import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { getCurrentAcademicYear } from "@/lib/academic-year";
import type { Section } from "@prisma/client";

type ProgramRow = {
  programTitle?: string;
  programDescription?: string;
  programStartDate?: string;
  programEndDate?: string;
  activityTitle?: string;
  activityDescription?: string;
  activityDate?: string;
  timeStart?: string;
  timeEnd?: string;
  location?: string;
  status?: string;
};

function parseDate(v: string | undefined): Date | null {
  if (!v) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(v)) return new Date(v);
  const m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return new Date(`${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`);
  return null;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { rows, section, dryRun }: { rows: ProgramRow[]; section: Section; dryRun?: boolean } = await req.json();
  if (!Array.isArray(rows) || !section) {
    return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
  }

  const ay = await getCurrentAcademicYear();
  const year = ay ? new Date(ay.startDate).getFullYear() : new Date().getFullYear();

  // Group by program title
  const groups = new Map<string, { program: ProgramRow; activities: ProgramRow[] }>();
  for (const r of rows) {
    if (!r.programTitle?.trim()) continue;
    const key = r.programTitle.trim();
    if (!groups.has(key)) groups.set(key, { program: r, activities: [] });
    if (r.activityTitle?.trim()) groups.get(key)!.activities.push(r);
  }

  const preview = Array.from(groups.entries()).map(([title, g]) => ({
    title,
    activitiesCount: g.activities.length,
    description: g.program.programDescription ?? null,
  }));

  if (dryRun) {
    return NextResponse.json({
      total: rows.length,
      programs: groups.size,
      activities: rows.filter((r) => r.activityTitle?.trim()).length,
      preview,
    });
  }

  let createdPrograms = 0;
  let createdActivities = 0;

  for (const [title, g] of groups) {
    const program = await prisma.annualProgram.upsert({
      where: { section_year: { section, year } },
      update: { title, description: g.program.programDescription ?? null },
      create: {
        section,
        year,
        academicYearId: ay?.id ?? null,
        title,
        description: g.program.programDescription ?? null,
        startDate: parseDate(g.program.programStartDate),
        endDate: parseDate(g.program.programEndDate),
        createdBy: session.user.id,
      },
    }).catch(async () => {
      // Section+year unique constraint blocks creating multiple programs same year — fall back to plain create with suffixed title
      return prisma.annualProgram.create({
        data: {
          section,
          year,
          academicYearId: ay?.id ?? null,
          title: `${title} (${Date.now()})`,
          description: g.program.programDescription ?? null,
          startDate: parseDate(g.program.programStartDate),
          endDate: parseDate(g.program.programEndDate),
          createdBy: session.user.id,
        },
      });
    });
    createdPrograms++;

    for (const a of g.activities) {
      await prisma.programActivity.create({
        data: {
          programId: program.id,
          title: a.activityTitle!.trim(),
          description: a.activityDescription ?? null,
          activityDate: parseDate(a.activityDate),
          timeStart: a.timeStart ?? null,
          timeEnd: a.timeEnd ?? null,
          location: a.location ?? null,
          status: a.status ?? "PLANNED",
        },
      });
      createdActivities++;
    }
  }

  await recordAudit({
    userId: session.user.id,
    action: "CREATE",
    entity: "program",
    after: { bulkImport: true, programs: createdPrograms, activities: createdActivities, section },
    req,
  });

  return NextResponse.json({ programs: createdPrograms, activities: createdActivities });
}
