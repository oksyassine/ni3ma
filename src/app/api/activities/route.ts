import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { hasSectionRW } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const programId = searchParams.get("programId");
  const where: Record<string, unknown> = {};
  if (programId) where.programId = programId;
  const activities = await prisma.programActivity.findMany({
    where,
    include: {
      program: { select: { section: true, title: true } },
      _count: { select: { attendance: true } },
    },
    orderBy: { activityDate: "asc" },
  });
  return NextResponse.json(activities);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();

  // Activity inherits its section from the parent program. Gate on RW.
  if (!body.programId) return NextResponse.json({ error: "programId required" }, { status: 400 });
  const program = await prisma.annualProgram.findUnique({ where: { id: body.programId }, select: { section: true } });
  if (!program) return NextResponse.json({ error: "Program not found" }, { status: 404 });
  if (!(await hasSectionRW(session, program.section))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const activity = await prisma.programActivity.create({
    data: {
      programId: body.programId,
      title: body.title,
      description: body.description ?? null,
      activityDate: body.activityDate ? new Date(body.activityDate) : null,
      timeStart: body.timeStart ?? null,
      timeEnd: body.timeEnd ?? null,
      location: body.location ?? null,
      status: body.status ?? "PLANNED",
    },
  });
  await recordAudit({
    userId: session.user.id,
    action: "CREATE",
    entity: "activity",
    entityId: activity.id,
    after: activity,
    req,
  });
  return NextResponse.json(activity, { status: 201 });
}
