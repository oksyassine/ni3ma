import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { canViewGovernance } from "@/lib/rbac";
import { rateLimit } from "@/lib/rate-limit";
import { recordAudit } from "@/lib/audit";
import { createHash } from "node:crypto";

// GET /api/accounting/export?year=YYYY&report=journal|ledger&format=csv
//
// Stream the chart, journal, or grand-livre as a CSV download. Used by
// the bureau for bailleur (INDH / EU / AFD) reporting. UTF-8 BOM so
// Excel-on-Windows opens it with the correct Arabic / French encoding.

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canViewGovernance(session.user.roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rl = rateLimit(`acct-export:${session.user.id}`, 10, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too Many Requests" }, { status: 429 });
  }

  const year = req.nextUrl.searchParams.get("year") ?? new Date().getFullYear().toString();
  const report = req.nextUrl.searchParams.get("report") ?? "journal";
  const yearStart = new Date(`${year}-01-01`);
  const yearEnd = new Date(`${Number(year) + 1}-01-01`);

  let csv = "\uFEFF"; // UTF-8 BOM
  let filename = `ni3ma-${report}-${year}.csv`;

  if (report === "chart") {
    csv += "code,label,class,type\n";
    const chart = await prisma.chartOfAccount.findMany({ orderBy: { code: "asc" } });
    for (const c of chart) {
      csv += `${csvField(c.code)},${csvField(c.label)},${c.class},${c.type}\n`;
    }
    filename = `ni3ma-chart-${year}.csv`;
  } else if (report === "ledger") {
    csv += "account,label,type,debit,credit,balance\n";
    const grouped = await prisma.journalLine.groupBy({
      by: ["accountCode", "side"],
      where: { entry: { entryDate: { gte: yearStart, lt: yearEnd } } },
      _sum: { amount: true },
    });
    const totals = new Map<string, { debit: number; credit: number; type: string; label: string }>();
    const chart = await prisma.chartOfAccount.findMany();
    const meta = new Map(chart.map((c) => [c.code, c]));
    for (const row of grouped) {
      const cur = totals.get(row.accountCode) ?? {
        debit: 0, credit: 0,
        type: meta.get(row.accountCode)?.type ?? "ASSET",
        label: meta.get(row.accountCode)?.label ?? "",
      };
      if (row.side === "DEBIT") cur.debit += Number(row._sum.amount ?? 0);
      else cur.credit += Number(row._sum.amount ?? 0);
      totals.set(row.accountCode, cur);
    }
    for (const [code, t] of totals) {
      const raw = t.debit - t.credit;
      const balance = (t.type === "ASSET" || t.type === "EXPENSE") ? raw : -raw;
      csv += `${csvField(code)},${csvField(t.label)},${t.type},${t.debit.toFixed(2)},${t.credit.toFixed(2)},${balance.toFixed(2)}\n`;
    }
  } else {
    // journal (default)
    csv += "date,piece,label,source,sourceId,debitAccount,creditAccount,debit,credit,analytic\n";
    const entries = await prisma.journalEntry.findMany({
      where: { entryDate: { gte: yearStart, lt: yearEnd } },
      orderBy: { entryDate: "asc" },
      include: { lines: true },
    });
    for (const e of entries) {
      const debits = e.lines.filter((l) => l.side === "DEBIT");
      const credits = e.lines.filter((l) => l.side === "CREDIT");
      const debitAccount = debits.map((l) => l.accountCode).join("+");
      const creditAccount = credits.map((l) => l.accountCode).join("+");
      const debit = debits.reduce((s, l) => s + Number(l.amount), 0);
      const credit = credits.reduce((s, l) => s + Number(l.amount), 0);
      csv += [
        e.entryDate.toISOString().slice(0, 10),
        csvField(e.pieceNumber ?? ""),
        csvField(e.label),
        e.source,
        csvField(e.sourceId ?? ""),
        csvField(debitAccount),
        csvField(creditAccount),
        debit.toFixed(2),
        credit.toFixed(2),
        csvField(e.analyticCode ?? ""),
      ].join(",") + "\n";
    }
  }

  await recordAudit({
    userId: session.user.id,
    action: "CREATE",
    entity: `accounting_${report}_export`,
    after: {
      year,
      length: csv.length,
      sha256: createHash("sha256").update(csv).digest("hex"),
    },
    req,
  });

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store, private",
    },
  });
}

function csvField(s: string): string {
  if (s == null) return "";
  let str = String(s);
  // Formula-injection guard. Excel / Sheets / Numbers interpret cells
  // starting with =, +, -, @, tab or CR as a formula. A malicious
  // donor name like `=cmd|'/c calc'!A1` would otherwise be auto-executed
  // when the bureau opens the export.
  if (/^[=+\-@\t\r]/.test(str)) str = "'" + str;
  if (/[",\n;]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}
