import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { isFinancial, hasBureauRead } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Top-donor leaderboard contains real names. Restrict to FINANCIAL + maktab.
  if (!isFinancial(session.user.roles) && !(await hasBureauRead(session))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const academicYearId = searchParams.get("academicYearId");
  const yearScope: Record<string, unknown> = {};
  if (academicYearId) yearScope.academicYearId = academicYearId;

  const [contributions, expenses, donations] = await Promise.all([
    prisma.weeklyContribution.findMany({
      where: yearScope,
      select: { amount: true, weekStart: true, paidAt: true },
    }),
    prisma.expense.findMany({
      where: yearScope,
      select: { amount: true, expenseDate: true, category: true, section: true },
    }),
    prisma.donation.findMany({
      where: yearScope,
      select: { amount: true, donationDate: true, section: true, donorName: true, isAnonymous: true },
    }),
  ]);

  // Monthly aggregation
  const months: Record<string, { contributions: number; expenses: number; donations: number }> = {};
  const ensure = (key: string) => {
    if (!months[key]) months[key] = { contributions: 0, expenses: 0, donations: 0 };
    return months[key];
  };
  const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

  contributions.forEach((c) => { ensure(monthKey(c.weekStart)).contributions += Number(c.amount); });
  expenses.forEach((e) => { ensure(monthKey(e.expenseDate)).expenses += Number(e.amount); });
  donations.forEach((d) => { ensure(monthKey(d.donationDate)).donations += Number(d.amount); });

  const monthly = Object.entries(months)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, v]) => ({ month, ...v, balance: v.contributions + v.donations - v.expenses }));

  // By category (expenses)
  const expensesByCategory: Record<string, number> = {};
  expenses.forEach((e) => {
    expensesByCategory[e.category] = (expensesByCategory[e.category] ?? 0) + Number(e.amount);
  });

  // By section
  const expensesBySection: Record<string, number> = {};
  expenses.forEach((e) => {
    if (e.section) expensesBySection[e.section] = (expensesBySection[e.section] ?? 0) + Number(e.amount);
  });

  // Top donors
  const donorTotals: Record<string, number> = {};
  donations.forEach((d) => {
    if (!d.isAnonymous && d.donorName) {
      donorTotals[d.donorName] = (donorTotals[d.donorName] ?? 0) + Number(d.amount);
    }
  });
  const topDonors = Object.entries(donorTotals)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([name, total]) => ({ name, total }));

  const totalContributions = contributions.reduce((s, c) => s + Number(c.amount), 0);
  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const totalDonations = donations.reduce((s, d) => s + Number(d.amount), 0);

  return NextResponse.json({
    totals: {
      contributions: totalContributions,
      expenses: totalExpenses,
      donations: totalDonations,
      balance: totalContributions + totalDonations - totalExpenses,
    },
    monthly,
    expensesByCategory: Object.entries(expensesByCategory).map(([category, total]) => ({ category, total })),
    expensesBySection: Object.entries(expensesBySection).map(([section, total]) => ({ section, total })),
    topDonors,
  });
}
