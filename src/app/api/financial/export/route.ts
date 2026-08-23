import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { isFinancial, hasBureauRead } from "@/lib/permissions";
import * as XLSX from "xlsx";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Financial XLSX contains donor names+phones, every contribution, every
  // expense. Gate to FINANCIAL or maktab (BUREAU READ+).
  if (!isFinancial(session.user.roles) && !(await hasBureauRead(session))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const academicYearId = searchParams.get("academicYearId");
  const where: Record<string, unknown> = {};
  if (academicYearId) where.academicYearId = academicYearId;

  const [contributions, expenses, donations] = await Promise.all([
    prisma.weeklyContribution.findMany({
      where,
      include: { member: { select: { fullName: true, registrationNumber: true } } },
      orderBy: { weekStart: "asc" },
    }),
    prisma.expense.findMany({ where, orderBy: { expenseDate: "asc" } }),
    prisma.donation.findMany({ where, orderBy: { donationDate: "asc" } }),
  ]);

  const wb = XLSX.utils.book_new();

  const contribRows = contributions.map((c) => ({
    "اسم المنخرط": c.member.fullName,
    "رقم التسجيل": c.member.registrationNumber,
    "أسبوع": c.weekStart.toISOString().slice(0, 10),
    "المبلغ": Number(c.amount),
    "الملاحظات": c.notes ?? "",
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(contribRows), "المساهمات");

  const expRows = expenses.map((e) => ({
    "التاريخ": e.expenseDate.toISOString().slice(0, 10),
    "الصنف": e.category,
    "القسم": e.section ?? "",
    "الوصف": e.description,
    "المبلغ": Number(e.amount),
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(expRows), "المصاريف");

  const donRows = donations.map((d) => ({
    "التاريخ": d.donationDate.toISOString().slice(0, 10),
    "اسم المتبرع": d.isAnonymous ? "مجهول" : (d.donorName ?? ""),
    "الهاتف": d.donorPhone ?? "",
    "القسم": d.section,
    "المبلغ": Number(d.amount),
    "الملاحظات": d.notes ?? "",
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(donRows), "التبرعات");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="ni3ma-financial-${Date.now()}.xlsx"`,
    },
  });
}
