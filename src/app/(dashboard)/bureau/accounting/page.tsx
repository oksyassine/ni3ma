import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getT } from "@/lib/i18n/server";
import { canViewGovernance } from "@/lib/rbac";
import { fmtMoney, fmtDate } from "@/lib/i18n/format";
import { seedChart } from "@/lib/pcaf";
import { AccountingClient } from "./client";

// PCAF accounting page: shows the chart of accounts, plus links into the
// livre-journal (chronological) and grand livre (per-account). Seeds the
// standard chart on first visit so the bureau has something to post against.

export default async function AccountingPage({
  searchParams,
}: {
  searchParams: Promise<{ report?: "journal" | "ledger"; account?: string; year?: string; from?: string; to?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");
  if (!canViewGovernance(session.user.roles)) redirect("/unauthorized");
  const { t } = await getT();
  const params = await searchParams;

  // Seed the standard chart on first visit. Idempotent.
  await seedChart(prisma as unknown as Parameters<typeof seedChart>[0]);

  const chart = await prisma.chartOfAccount.findMany({ orderBy: { code: "asc" } });

  // Default to current year. Bureau can override via ?year=YYYY.
  const year = params.year ?? new Date().getFullYear().toString();
  const yearStart = new Date(`${year}-01-01`);
  const yearEnd = new Date(`${Number(year) + 1}-01-01`);

  const report = params.report ?? "journal";
  const fromDate = params.from ? new Date(params.from) : yearStart;
  const toDate = params.to ? new Date(params.to) : yearEnd;

  // Livre-journal: list of entries in date range.
  const entries = report === "journal"
    ? await prisma.journalEntry.findMany({
        where: { entryDate: { gte: fromDate, lt: toDate } },
        orderBy: { entryDate: "desc" },
        include: { lines: true },
        take: 500,
      })
    : [];

  // Grand livre: sum per account.
  let ledger: { accountCode: string; label: string; debit: number; credit: number; balance: number; type: string }[] = [];
  if (report === "ledger") {
    const grouped = await prisma.journalLine.groupBy({
      by: ["accountCode", "side"],
      where: {
        entry: { entryDate: { gte: fromDate, lt: toDate } },
      },
      _sum: { amount: true },
    });
    const totals = new Map<string, { debit: number; credit: number }>();
    for (const row of grouped) {
      const cur = totals.get(row.accountCode) ?? { debit: 0, credit: 0 };
      if (row.side === "DEBIT") cur.debit += Number(row._sum.amount ?? 0);
      else cur.credit += Number(row._sum.amount ?? 0);
      totals.set(row.accountCode, cur);
    }
    ledger = chart.map((acc) => {
      const t = totals.get(acc.code) ?? { debit: 0, credit: 0 };
      // For ASSET/EXPENSE: balance = debit - credit (positive = normal)
      // For LIABILITY/INCOME: balance = credit - debit
      const raw = t.debit - t.credit;
      const balance = (acc.type === "ASSET" || acc.type === "EXPENSE") ? raw : -raw;
      return {
        accountCode: acc.code,
        label: acc.label,
        debit: t.debit,
        credit: t.credit,
        balance,
        type: acc.type,
      };
    }).filter((row) => row.debit > 0 || row.credit > 0);
    ledger.sort((a, b) => b.balance - a.balance);
  }

  // Totals for the journal page.
  const totals = entries.reduce(
    (acc, e) => {
      acc.debit += e.lines.filter((l) => l.side === "DEBIT").reduce((s, l) => s + Number(l.amount), 0);
      acc.credit += e.lines.filter((l) => l.side === "CREDIT").reduce((s, l) => s + Number(l.amount), 0);
      acc.count += 1;
      return acc;
    },
    { debit: 0, credit: 0, count: 0 },
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("gov.accounting.title")}</h1>
        <p className="text-muted-foreground">{t("gov.accounting.subtitle")}</p>
      </div>
      <AccountingClient
        year={year}
        report={report}
        fromDate={fromDate.toISOString().slice(0, 10)}
        toDate={new Date(toDate.getTime() - 86_400_000).toISOString().slice(0, 10)}
        chart={chart.map((c) => ({ code: c.code, label: c.label, type: c.type, class: c.class }))}
        entries={entries.map((e) => ({
          id: e.id,
          entryDate: e.entryDate.toISOString().slice(0, 10),
          pieceNumber: e.pieceNumber ?? "",
          label: e.label,
          source: e.source,
          amount: Number(e.amount),
          analyticCode: e.analyticCode ?? null,
          lines: e.lines.map((l) => ({
            accountCode: l.accountCode,
            side: l.side,
            amount: Number(l.amount),
            label: l.label ?? "",
          })),
        }))}
        ledger={ledger}
        totals={totals}
        fmtMoney={fmtMoney}
        fmtDate={fmtDate}
      />
    </div>
  );
}
