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
  const academicYearId = searchParams.get("academicYearId");
  const where: Record<string, unknown> = {};
  if (academicYearId) where.academicYearId = academicYearId;

  const expenses = await prisma.expense.findMany({
    where,
    include: {
      recorder: { select: { fullName: true } },
    },
    orderBy: { expenseDate: "desc" },
  });

  return NextResponse.json(expenses);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isFinancial(session.user.roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const amount = parseFloat(body.amount);
  if (!Number.isFinite(amount) || amount < 0) {
    return NextResponse.json({ error: "مبلغ المصروف غير صالح" }, { status: 400 });
  }
  const date = new Date(body.expenseDate);
  if (Number.isNaN(date.getTime())) {
    return NextResponse.json({ error: "تاريخ المصروف غير صالح" }, { status: 400 });
  }
  const academicYearId = await getCurrentAcademicYearId();

  const expense = await prisma.expense.create({
    data: {
      category: body.category,
      section: body.section || null,
      description: body.description,
      amount,
      expenseDate: date,
      projectId: body.projectId || null,
      planId: body.planId || null,
      planLineItemId: body.planLineItemId || null,
      recordedBy: session.user.id,
      academicYearId,
    },
  });

  await recordAudit({
    userId: session.user.id,
    action: "CREATE",
    entity: "expense",
    entityId: expense.id,
    after: expense,
    req,
  });

  return NextResponse.json(expense, { status: 201 });
}
