"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type AccountRow = { code: string; label: string; type: string; class: number };
type EntryRow = {
  id: string;
  entryDate: string;
  pieceNumber: string;
  label: string;
  source: string;
  amount: number;
  analyticCode: string | null;
  lines: { accountCode: string; side: string; amount: number; label: string }[];
};
type LedgerRow = {
  accountCode: string;
  label: string;
  debit: number;
  credit: number;
  balance: number;
  type: string;
};

export function AccountingClient({
  year, report, fromDate, toDate, chart, entries, ledger, totals,
  fmtMoney, fmtDate,
}: {
  year: string;
  report: "journal" | "ledger";
  fromDate: string;
  toDate: string;
  chart: AccountRow[];
  entries: EntryRow[];
  ledger: LedgerRow[];
  totals: { debit: number; credit: number; count: number };
  fmtMoney: (n: number, locale: string, fd?: number) => string;
  fmtDate: (d: Date | string, locale: string) => string;
}) {
  const [dateFrom, setDateFrom] = useState(fromDate);
  const [dateTo, setDateTo] = useState(toDate);
  const [activeReport] = useState(report);

  function buildHref(r: string) {
    const params = new URLSearchParams();
    params.set("report", r);
    params.set("year", year);
    if (dateFrom) params.set("from", dateFrom);
    if (dateTo) params.set("to", dateTo);
    return `/bureau/accounting?${params.toString()}`;
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b">
        <Link
          href={buildHref("journal")}
          className={`px-4 py-2 text-sm ${activeReport === "journal" ? "border-b-2 border-primary font-semibold" : "text-muted-foreground"}`}
        >
          📒 Livre-journal
        </Link>
        <Link
          href={buildHref("ledger")}
          className={`px-4 py-2 text-sm ${activeReport === "ledger" ? "border-b-2 border-primary font-semibold" : "text-muted-foreground"}`}
        >
          📊 Grand livre
        </Link>
        <Link
          href="/bureau/accounting/chart"
          className="px-4 py-2 text-sm text-muted-foreground"
        >
          📒 Plan comptable
        </Link>
      </div>

      <form action="/bureau/accounting" method="get" className="flex items-end gap-3 flex-wrap">
        <input type="hidden" name="report" value={activeReport} />
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">Du</label>
          <Input
            type="date"
            name="from"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-44"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">Au</label>
          <Input
            type="date"
            name="to"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-44"
          />
        </div>
        <Button type="submit">🔍 Filtrer</Button>
        <input type="hidden" name="year" value={year} />
        <Link
          href={`/api/accounting/export?year=${year}&format=csv&report=${activeReport}`}
          className="rounded-md border px-3 py-2 text-xs hover:bg-muted"
        >
          📥 Exporter CSV
        </Link>
      </form>

      {activeReport === "journal" ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Livre-journal — Exercice {year}</CardTitle>
            <div className="flex gap-2 text-xs">
              <Badge variant="outline">{totals.count} écritures</Badge>
              <Badge className="bg-blue-100 text-blue-800">Débits: {fmtMoney(totals.debit, "fr")}</Badge>
              <Badge className="bg-green-100 text-green-800">Crédits: {fmtMoney(totals.credit, "fr")}</Badge>
              <Badge className={Math.abs(totals.debit - totals.credit) < 0.01 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                {Math.abs(totals.debit - totals.credit) < 0.01 ? "✓ Équilibré" : "⚠ Déséquilibré"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr>
                  <th className="p-2 text-start">Date</th>
                  <th className="p-2 text-start">Pièce</th>
                  <th className="p-2 text-start">Libellé</th>
                  <th className="p-2 text-start">Source</th>
                  <th className="p-2 text-end">Débit</th>
                  <th className="p-2 text-end">Crédit</th>
                </tr>
              </thead>
              <tbody>
                {entries.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-muted-foreground">
                      Aucune écriture sur cette période.
                    </td>
                  </tr>
                )}
                {entries.map((e) => {
                  const debit = e.lines.filter((l) => l.side === "DEBIT").reduce((s, l) => s + l.amount, 0);
                  const credit = e.lines.filter((l) => l.side === "CREDIT").reduce((s, l) => s + l.amount, 0);
                  return (
                    <tr key={e.id} className="border-b align-top">
                      <td className="p-2 font-mono text-xs">{e.entryDate}</td>
                      <td className="p-2 font-mono text-xs">{e.pieceNumber || "—"}</td>
                      <td className="p-2">
                        {e.label}
                        <div className="text-[10px] text-muted-foreground">
                          {e.lines.map((l) => `${l.accountCode} (${l.side === "DEBIT" ? "D" : "C"})`).join(" · ")}
                          {e.analyticCode ? ` · Ana ${e.analyticCode}` : ""}
                        </div>
                      </td>
                      <td className="p-2 text-xs">
                        <Badge variant="outline">{e.source}</Badge>
                      </td>
                      <td className="p-2 text-end font-mono">{fmtMoney(debit, "fr")}</td>
                      <td className="p-2 text-end font-mono">{fmtMoney(credit, "fr")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Grand livre — Exercice {year}</CardTitle>
          </CardHeader>
          <CardContent className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr>
                  <th className="p-2 text-start">Compte</th>
                  <th className="p-2 text-start">Libellé</th>
                  <th className="p-2 text-start">Type</th>
                  <th className="p-2 text-end">Débit</th>
                  <th className="p-2 text-end">Crédit</th>
                  <th className="p-2 text-end">Solde</th>
                </tr>
              </thead>
              <tbody>
                {ledger.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-muted-foreground">
                      Aucun mouvement sur cette période.
                    </td>
                  </tr>
                )}
                {ledger.map((row) => (
                  <tr key={row.accountCode} className="border-b">
                    <td className="p-2 font-mono">{row.accountCode}</td>
                    <td className="p-2">{row.label}</td>
                    <td className="p-2 text-xs">
                      <Badge variant="outline">{row.type}</Badge>
                    </td>
                    <td className="p-2 text-end font-mono">{fmtMoney(row.debit, "fr")}</td>
                    <td className="p-2 text-end font-mono">{fmtMoney(row.credit, "fr")}</td>
                    <td className="p-2 text-end font-mono font-bold">{fmtMoney(row.balance, "fr")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base text-sm">Plan comptable — {chart.length} comptes</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-2">
            Aperçu des classes — chaque classe représente un type d&apos;opération comptable (CGNC).
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((cls) => (
              <div key={cls} className="rounded bg-muted/40 p-2">
                <div className="font-bold">Classe {cls}</div>
                <div className="text-muted-foreground">{chart.filter((c) => c.class === cls).length} comptes</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
