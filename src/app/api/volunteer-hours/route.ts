import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { getCurrentAcademicYearId } from "@/lib/academic-year";
import type { Section } from "@prisma/client";

// Approver gate: ADMIN, legacy BUREAU role, BUREAU_RW (synthetic), or any
// SECTION_ADMIN. These are the people who can see/manage everyone's hours.
function isApprover(roles: string[]): boolean {
  return roles.some((r) => ["ADMIN", "BUREAU", "BUREAU_RW", "SECTION_ADMIN"].includes(r));
}

// Returns the set of sections the user can approve for. ADMIN/BUREAU/BUREAU_RW
// → all three. SECTION_ADMIN → only sections where they have ADMIN level.
async function approvableSections(session: { user: { id: string; roles: string[] } }): Promise<Section[] | "ALL"> {
  if (session.user.roles.some((r) => ["ADMIN", "BUREAU", "BUREAU_RW"].includes(r))) return "ALL";
  if (session.user.roles.includes("SECTION_ADMIN")) {
    const rows = await prisma.sectionPermission.findMany({
      where: {
        OR: [{ userId: session.user.id }, { memberId: session.user.id }],
        level: "ADMIN",
      },
      select: { section: true },
    });
    return rows.map((r) => r.section);
  }
  return [];
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const memberId = searchParams.get("memberId");
  const section = searchParams.get("section") as Section | null;
  const academicYearId = searchParams.get("academicYearId");
  const approved = searchParams.get("approved");
  const includeWorklogs = searchParams.get("includeWorklogs") === "1";

  const approver = isApprover(session.user.roles);
  // Non-approvers can only see their own records (used by /member/volunteer)
  const where: Record<string, unknown> = approver
    ? {}
    : { memberId: session.user.id };

  if (memberId) where.memberId = memberId;
  if (section) where.section = section;
  if (academicYearId) where.academicYearId = academicYearId;
  if (approved === "true") where.approved = true;
  if (approved === "false") where.approved = false;

  // For SECTION_ADMIN approvers, scope to their sections
  if (approver) {
    const sections = await approvableSections(session);
    if (sections !== "ALL" && sections.length > 0 && !section) {
      where.section = { in: sections };
    }
  }

  const records = await prisma.volunteerHours.findMany({
    where,
    include: {
      member: { select: { id: true, fullName: true, registrationNumber: true } },
      activity: { select: { title: true } },
      approver: { select: { fullName: true } },
    },
    orderBy: { hoursDate: "desc" },
    take: 500,
  });

  let merged: unknown[] = records.map((r) => ({
    ...r,
    source: "VOLUNTEER_HOURS" as const,
  }));

  // Optionally splice in TaskWorklog records — tasks logged in social projects
  if (includeWorklogs && approver) {
    const sections = await approvableSections(session);
    const projectFilter = sections === "ALL"
      ? {}
      : { project: { section: { in: sections } } };
    const worklogs = await prisma.taskWorklog.findMany({
      where: { task: projectFilter },
      include: {
        task: { select: { id: true, title: true, project: { select: { id: true, name: true, section: true } } } },
        member: { select: { id: true, fullName: true, registrationNumber: true } },
      },
      orderBy: { workedDate: "desc" },
      take: 500,
    });
    const wlMapped = worklogs.map((w) => ({
      id: `wl_${w.id}`,
      worklogId: w.id,
      hoursDate: w.workedDate,
      hours: w.hours,
      description: [w.task.title, w.description].filter(Boolean).join(" — "),
      approved: true, // task worklogs are implicitly approved (they're project work)
      section: w.task.project.section,
      member: w.member,
      activity: { title: w.task.title },
      approver: null,
      source: "TASK_WORKLOG" as const,
      project: w.task.project,
    }));
    merged = [...merged, ...wlMapped].sort((a, b) => {
      const da = (a as { hoursDate: Date | string }).hoursDate;
      const db = (b as { hoursDate: Date | string }).hoursDate;
      return new Date(db).getTime() - new Date(da).getTime();
    });
  }

  return NextResponse.json(merged);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const academicYearId = await getCurrentAcademicYearId();

  // Non-approvers can only log hours for themselves
  const targetMemberId = body.memberId;
  if (!targetMemberId) return NextResponse.json({ error: "memberId required" }, { status: 400 });
  if (!isApprover(session.user.roles) && targetMemberId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const created = await prisma.volunteerHours.create({
    data: {
      memberId: targetMemberId,
      section: body.section,
      activityId: body.activityId ?? null,
      hoursDate: new Date(body.hoursDate),
      hours: parseFloat(body.hours),
      description: body.description ?? null,
      approved: false,
      academicYearId,
    },
  });

  await recordAudit({
    userId: session.user.id,
    action: "CREATE",
    entity: "volunteer_hours",
    entityId: created.id,
    after: created,
    req,
  });
  return NextResponse.json(created, { status: 201 });
}
