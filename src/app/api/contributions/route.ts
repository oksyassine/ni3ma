import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { getCurrentAcademicYearId } from "@/lib/academic-year";
import { isFinancial, hasBureauRead } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isFinancial(session.user.roles) && !(await hasBureauRead(session))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const weekStart = searchParams.get("weekStart");
  const academicYearId = searchParams.get("academicYearId");

  const where: Record<string, unknown> = {};
  if (weekStart) where.weekStart = new Date(weekStart);
  if (academicYearId) where.academicYearId = academicYearId;

  const contributions = await prisma.weeklyContribution.findMany({
    where,
    include: {
      member: { select: { id: true, fullName: true, registrationNumber: true } },
    },
    orderBy: { weekStart: "desc" },
  });

  return NextResponse.json(contributions);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isFinancial(session.user.roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { memberId, amount, weekStart, notes } = await req.json();
  const amountNum = parseFloat(amount);
  if (!Number.isFinite(amountNum) || amountNum < 0) {
    return NextResponse.json({ error: "مبلغ المساهمة غير صالح" }, { status: 400 });
  }
  const weekDate = new Date(weekStart);
  if (Number.isNaN(weekDate.getTime())) {
    return NextResponse.json({ error: "تاريخ غير صالح" }, { status: 400 });
  }
  const academicYearId = await getCurrentAcademicYearId();

  const before = await prisma.weeklyContribution.findUnique({
    where: { memberId_weekStart: { memberId, weekStart: weekDate } },
  });

  const contribution = await prisma.weeklyContribution.upsert({
    where: {
      memberId_weekStart: {
        memberId,
        weekStart: weekDate,
      },
    },
    update: {
      amount: amountNum,
      notes,
      recordedBy: session.user.id,
    },
    create: {
      memberId,
      amount: amountNum,
      weekStart: weekDate,
      notes,
      recordedBy: session.user.id,
      academicYearId,
    },
  });

  await recordAudit({
    userId: session.user.id,
    action: before ? "UPDATE" : "CREATE",
    entity: "contribution",
    entityId: contribution.id,
    before,
    after: contribution,
    req,
  });

  return NextResponse.json(contribution, { status: 201 });
}
