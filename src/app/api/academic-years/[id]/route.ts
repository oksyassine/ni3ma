import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.user.roles.includes("ADMIN") && !session.user.roles.includes("BUREAU")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();

  const before = await prisma.academicYear.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (body.setCurrent === true) {
    await prisma.$transaction([
      prisma.academicYear.updateMany({ data: { isCurrent: false } }),
      prisma.academicYear.update({ where: { id }, data: { isCurrent: true } }),
    ]);
  }

  const update: Record<string, unknown> = {};
  if (body.label !== undefined) update.label = body.label;
  if (body.startDate !== undefined) update.startDate = new Date(body.startDate);
  if (body.endDate !== undefined) update.endDate = new Date(body.endDate);
  if (body.isClosed !== undefined) update.isClosed = body.isClosed;

  const updated = Object.keys(update).length
    ? await prisma.academicYear.update({ where: { id }, data: update })
    : await prisma.academicYear.findUnique({ where: { id } });

  await recordAudit({
    userId: session.user.id,
    action: "UPDATE",
    entity: "academic_year",
    entityId: id,
    before,
    after: updated,
    req,
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.user.roles.includes("ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const before = await prisma.academicYear.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (before.isCurrent) {
    return NextResponse.json({ error: "لا يمكن حذف السنة الحالية. عيّن سنة أخرى كحالية أولا." }, { status: 400 });
  }
  // Block deletion if year has dependent records
  const counts = await prisma.$transaction([
    prisma.weeklyContribution.count({ where: { academicYearId: id } }),
    prisma.expense.count({ where: { academicYearId: id } }),
    prisma.donation.count({ where: { academicYearId: id } }),
    prisma.attendance.count({ where: { academicYearId: id } }),
    prisma.quranProgress.count({ where: { academicYearId: id } }),
  ]);
  const total = counts.reduce((s, n) => s + n, 0);
  if (total > 0) {
    return NextResponse.json({ error: `لا يمكن الحذف: هناك ${total} سجل مرتبط بهذه السنة` }, { status: 400 });
  }
  await prisma.academicYear.delete({ where: { id } });
  await recordAudit({
    userId: session.user.id,
    action: "DELETE",
    entity: "academic_year",
    entityId: id,
    before,
    req,
  });
  return NextResponse.json({ ok: true });
}
