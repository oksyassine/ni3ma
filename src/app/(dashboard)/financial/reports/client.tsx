"use client";

import { useEffect, useState } from "react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Download } from "lucide-react";
import { useT } from "@/components/i18n/provider";
import { fmtMoney } from "@/lib/i18n/format";

type Year = { id: string; label: string; isCurrent: boolean };

type Summary = {
  totals: { contributions: number; expenses: number; donations: number; balance: number };
  monthly: { month: string; contributions: number; expenses: number; donations: number; balance: number }[];
  expensesByCategory: { category: string; total: number }[];
  expensesBySection: { section: string; total: number }[];
  topDonors: { name: string; total: number }[];
};

const CATEGORY_KEYS: Record<string, string> = {
  EDUCATIONAL: "financial.cat.educational",
  SOCIAL: "financial.cat.social",
  QURAN: "financial.cat.quran",
  ADMINISTRATIVE: "financial.cat.administrative",
  MAINTENANCE: "financial.cat.maintenance",
  OTHER: "financial.cat.other",
};

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

export function ReportsClient({ years }: { years: Year[] }) {
  const { t, locale } = useT();
  const initial = years.find((y) => y.isCurrent)?.id ?? years[0]?.id ?? "";
  const [yearId, setYearId] = useState(initial);
  const [data, setData] = useState<Summary | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setData(null); // eslint-disable-line react-hooks/set-state-in-effect
    const params = new URLSearchParams();
    if (yearId) params.set("academicYearId", yearId);
    fetch(`/api/financial/summary?${params}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((d) => { if (!controller.signal.aborted) setData(d); })
      .catch(() => { /* aborted — ignore */ });
    return () => controller.abort();
  }, [yearId]);

  const exportXlsx = async () => {
    const params = new URLSearchParams();
    if (yearId) params.set("academicYearId", yearId);
    try {
      const res = await fetch(`/api/financial/export?${params}`);
      if (!res.ok) {
        alert(t("financial.exportFailed"));
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ni3ma-financial-${yearId || "all"}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      alert(t("financial.exportFailed"));
    }
  };

  if (!data || !data.totals) return <p className="text-center py-8 text-muted-foreground">{t("common.loading")}</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t("financial.reportsTitle")}</h1>
          <p className="text-muted-foreground">{t("financial.reportsSubtitle")}</p>
        </div>
        <div className="flex items-end gap-3">
          <div>
            <Label className="text-xs">{t("financial.academicYear")}</Label>
            <select
              value={yearId}
              onChange={(e) => setYearId(e.target.value)}
              className="h-9 px-3 rounded-md border bg-background text-sm"
            >
              <option value="">{t("financial.allYears")}</option>
              {years.map((y) => (
                <option key={y.id} value={y.id}>{y.label}</option>
              ))}
            </select>
          </div>
          <Button onClick={exportXlsx} variant="outline">
            <Download size={16} />Excel
          </Button>
          <a
            href={`/financial/annual-report${yearId ? `?academicYearId=${yearId}` : ""}`}
            className="inline-flex h-8 items-center justify-center rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            {t("financial.annualReport")}
          </a>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">{t("financial.contributionsShort")}</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-green-600">{fmtMoney(data.totals.contributions, locale)} {t("financial.mad")}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">{t("financial.donationsShort")}</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-blue-600">{fmtMoney(data.totals.donations, locale)} {t("financial.mad")}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">{t("financial.expensesShort")}</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-red-600">{fmtMoney(data.totals.expenses, locale)} {t("financial.mad")}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">{t("financial.balance")}</CardTitle></CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${data.totals.balance >= 0 ? "text-green-600" : "text-red-600"}`}>
              {fmtMoney(data.totals.balance, locale)} {t("financial.mad")}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>{t("financial.monthlyIncomeExpenses")}</CardTitle></CardHeader>
        <CardContent style={{ height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.monthly}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="contributions" fill="#10b981" name={t("financial.contributionsShort")} />
              <Bar dataKey="donations" fill="#3b82f6" name={t("financial.donationsShort")} />
              <Bar dataKey="expenses" fill="#ef4444" name={t("financial.expensesShort")} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>{t("financial.cumulativeBalance")}</CardTitle></CardHeader>
        <CardContent style={{ height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.monthly}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="balance" stroke="#10b981" strokeWidth={2} name={t("financial.balance")} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>{t("financial.expensesByCategory")}</CardTitle></CardHeader>
          <CardContent style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.expensesByCategory.map((e) => ({ ...e, name: t(CATEGORY_KEYS[e.category] ?? "financial.cat.other") }))}
                  dataKey="total"
                  nameKey="name"
                  outerRadius={90}
                  label
                >
                  {data.expensesByCategory.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{t("financial.topDonors")}</CardTitle></CardHeader>
          <CardContent>
            {data.topDonors.length === 0 && <p className="text-muted-foreground text-center py-4">{t("financial.noData")}</p>}
            <div className="space-y-2">
              {data.topDonors.map((d, i) => (
                <div key={d.name} className="flex items-center justify-between text-sm py-2 border-b last:border-0">
                  <span className="flex items-center gap-2">
                    <span className="text-muted-foreground w-6">#{i + 1}</span>
                    <span className="font-medium">{d.name}</span>
                  </span>
                  <span className="font-mono">{fmtMoney(d.total, locale)} {t("financial.mad")}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
