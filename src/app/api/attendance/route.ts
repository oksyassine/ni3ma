import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { getCurrentAcademicYearId } from "@/lib/academic-year";
import { hasSectionRead, hasSectionRW } from "@/lib/permissions";
import type { Section } from "@prisma/client";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const section = searchParams.get("section") as Section | null;
  if (section && !(await hasSectionRead(session, section))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const date = searchParams.get("date");
  const activityId = searchParams.get("activityId");
  const where: Record<string, unknown> = {};
  if (section) where.section = section;
  if (date) where.date = new Date(date);
  if (activityId) where.activityId = activityId;
  const records = await prisma.attendance.findMany({
    where,
    include: { member: { select: { id: true, fullName: true, registrationNumber: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(records);
}

// Bulk upsert — body: { section, date, activityId?, entries: [{ memberId, isPresent }] }
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  if (!body.section) return NextResponse.json({ error: "section required" }, { status: 400 });
  if (!(await hasSectionRW(session, body.section))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const academicYearId = await getCurrentAcademicYearId();
  const date = new Date(body.date);
  if (Number.isNaN(date.getTime())) {
    return NextResponse.json({ error: "تاريخ غير صالح" }, { status: 400 });
  }

  // Atomic bulk-upsert so partial failure doesn't leave a half-finished sheet.
  const results = await prisma.$transaction(
    body.entries.map((e: { memberId: string; isPresent: boolean }) =>
      prisma.attendance.upsert({
        where: {
          memberId_section_date_activityId: {
            memberId: e.memberId,
            section: body.section,
            date,
            activityId: body.activityId ?? null,
          },
        },
        update: {
          isPresent: e.isPresent,
          checkinMethod: "MANUAL",
          recordedBy: session.user.id,
        },
        create: {
          memberId: e.memberId,
          section: body.section,
          date,
          activityId: body.activityId ?? null,
          isPresent: e.isPresent,
          checkinMethod: "MANUAL",
          recordedBy: session.user.id,
          academicYearId,
        },
      })
    )
  );

  await recordAudit({
    userId: session.user.id,
    action: "UPDATE",
    entity: "attendance",
    after: { count: results.length, section: body.section, date: body.date, activityId: body.activityId },
    req,
  });

  return NextResponse.json({ count: results.length });
}
