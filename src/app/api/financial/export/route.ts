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

  // Journal sheet — PCGE-style livre journal for accountants/auditors.
  // Cotisations → 7142, dons → 7143, subventions not tracked here,
  // expenses mapped to 6x charge classes by category.
  const EXPENSE_ACCOUNT: Record<string, string> = {
    EDUCATIONAL: "6142",
    SOCIAL: "6145",
    QURAN: "6147",
    ADMINISTRATIVE: "6141",
    MAINTENANCE: "6133",
    OTHER: "6167",
  };
  type JournalRow = {
    date: string; piece: string; account: string;
    label: string; debit: number; credit: number;
  };
  const journal: JournalRow[] = [];
  for (const c of contributions) {
    journal.push({
      date: c.weekStart.toISOString().slice(0, 10),
      piece: `COT-${c.id.slice(-8)}`,
      account: "7142",
      label: `Cotisation ${c.member.fullName}`,
      debit: 0,
      credit: Number(c.amount),
    });
  }
  for (const d of donations.filter((x) => x.isPaid)) {
    journal.push({
      date: d.donationDate.toISOString().slice(0, 10),
      piece: `DON-${d.id.slice(-8)}`,
      account: "7143",
      label: `Don ${d.isAnonymous ? "-" : d.donorName ?? ""}`.trim(),
      debit: 0,
      credit: Number(d.amount),
    });
  }
  for (const e of expenses) {
    journal.push({
      date: e.expenseDate.toISOString().slice(0, 10),
      piece: `DEP-${e.id.slice(-8)}`,
      account: EXPENSE_ACCOUNT[e.category] ?? "6167",
      label: e.description.slice(0, 80),
      debit: Number(e.amount),
      credit: 0,
    });
  }
  const journalRows = journal
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((r) => ({
      "التاريخ / Date": r.date,
      "الوصل / Pièce": r.piece,
      "الحساب / Compte": r.account,
      "البيان / Libellé": r.label,
      "مدين / Débit": r.debit,
      "دائن / Crédit": r.credit,
    }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(journalRows), "اليومية-Journal");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="ni3ma-financial-${Date.now()}.xlsx"`,
    },
  });
}
