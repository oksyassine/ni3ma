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

type Year = { id: string; label: string; isCurrent: boolean };

type Summary = {
  totals: { contributions: number; expenses: number; donations: number; balance: number };
  monthly: { month: string; contributions: number; expenses: number; donations: number; balance: number }[];
  expensesByCategory: { category: string; total: number }[];
  expensesBySection: { section: string; total: number }[];
  topDonors: { name: string; total: number }[];
};

const CATEGORY_LABELS: Record<string, string> = {
  EDUCATIONAL: "تربوي",
  SOCIAL: "اجتماعي",
  QURAN: "قرآن",
  ADMINISTRATIVE: "إداري",
  MAINTENANCE: "صيانة",
  OTHER: "أخرى",
};

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

export function ReportsClient({ years }: { years: Year[] }) {
  const initial = years.find((y) => y.isCurrent)?.id ?? years[0]?.id ?? "";
  const [yearId, setYearId] = useState(initial);
  const [data, setData] = useState<Summary | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (yearId) params.set("academicYearId", yearId);
    fetch(`/api/financial/summary?${params}`).then((r) => r.json()).then(setData);
  }, [yearId]);

  const exportXlsx = () => {
    const params = new URLSearchParams();
    if (yearId) params.set("academicYearId", yearId);
    window.location.href = `/api/financial/export?${params}`;
  };

  if (!data) return <p className="text-center py-8 text-muted-foreground">جاري التحميل...</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">تقارير وإحصائيات</h1>
          <p className="text-muted-foreground">تحليل الوضع المالي للجمعية</p>
        </div>
        <div className="flex items-end gap-3">
          <div>
            <Label className="text-xs">السنة الدراسية</Label>
            <select
              value={yearId}
              onChange={(e) => setYearId(e.target.value)}
              className="h-9 px-3 rounded-md border bg-background text-sm"
            >
              <option value="">جميع السنوات</option>
              {years.map((y) => (
                <option key={y.id} value={y.id}>{y.label}</option>
              ))}
            </select>
          </div>
          <Button onClick={exportXlsx} variant="outline">
            <Download size={16} />Excel
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">المساهمات</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-green-600">{data.totals.contributions.toFixed(2)} د.م</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">التبرعات</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-blue-600">{data.totals.donations.toFixed(2)} د.م</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">المصاريف</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-red-600">{data.totals.expenses.toFixed(2)} د.م</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">الرصيد</CardTitle></CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${data.totals.balance >= 0 ? "text-green-600" : "text-red-600"}`}>
              {data.totals.balance.toFixed(2)} د.م
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>الإيرادات والمصاريف الشهرية</CardTitle></CardHeader>
        <CardContent style={{ height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.monthly}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="contributions" fill="#10b981" name="مساهمات" />
              <Bar dataKey="donations" fill="#3b82f6" name="تبرعات" />
              <Bar dataKey="expenses" fill="#ef4444" name="مصاريف" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>الرصيد التراكمي</CardTitle></CardHeader>
        <CardContent style={{ height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.monthly}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="balance" stroke="#10b981" strokeWidth={2} name="الرصيد" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>المصاريف حسب الصنف</CardTitle></CardHeader>
          <CardContent style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.expensesByCategory.map((e) => ({ ...e, name: CATEGORY_LABELS[e.category] ?? e.category }))}
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
          <CardHeader><CardTitle>أكبر المتبرعين</CardTitle></CardHeader>
          <CardContent>
            {data.topDonors.length === 0 && <p className="text-muted-foreground text-center py-4">لا توجد بيانات</p>}
            <div className="space-y-2">
              {data.topDonors.map((d, i) => (
                <div key={d.name} className="flex items-center justify-between text-sm py-2 border-b last:border-0">
                  <span className="flex items-center gap-2">
                    <span className="text-muted-foreground w-6">#{i + 1}</span>
                    <span className="font-medium">{d.name}</span>
                  </span>
                  <span className="font-mono">{d.total.toFixed(2)} د.م</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
