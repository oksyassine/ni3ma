import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { getCurrentAcademicYearId } from "@/lib/academic-year";
import { hasSectionRW } from "@/lib/permissions";
import type { Section } from "@prisma/client";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { token, section, activityId, date } = await req.json();
  if (!token || !section) {
    return NextResponse.json({ error: "Missing token or section" }, { status: 400 });
  }
  // Taking attendance is a write — require RW (or higher) on the target section.
  if (!(await hasSectionRW(session, section as Section))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const member = await prisma.member.findUnique({
    where: { checkinToken: token },
    select: { id: true, fullName: true, registrationNumber: true },
  });
  if (!member) return NextResponse.json({ error: "Invalid token" }, { status: 404 });

  const academicYearId = await getCurrentAcademicYearId();
  const checkinDate = date ? new Date(date) : new Date(new Date().toDateString());

  const record = await prisma.attendance.upsert({
    where: {
      memberId_section_date_activityId: {
        memberId: member.id,
        section: section as Section,
        date: checkinDate,
        activityId: activityId ?? null,
      },
    },
    update: { isPresent: true, checkinMethod: "QR", recordedBy: session.user.id },
    create: {
      memberId: member.id,
      section: section as Section,
      date: checkinDate,
      activityId: activityId ?? null,
      isPresent: true,
      checkinMethod: "QR",
      recordedBy: session.user.id,
      academicYearId,
    },
  });

  await recordAudit({
    userId: session.user.id,
    action: "CREATE",
    entity: "attendance",
    entityId: record.id,
    after: { ...record, member },
    req,
  });

  return NextResponse.json({ ok: true, member, attendanceId: record.id });
}
