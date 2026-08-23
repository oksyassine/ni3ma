"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { Section } from "@prisma/client";
import { SECTION_LABELS } from "@/lib/section";
import { Heart, Plus } from "lucide-react";

type Record = {
  id: string;
  hoursDate: string;
  hours: number;
  section: Section;
  description: string | null;
  approved: boolean;
  activity: { title: string } | null;
  approver: { fullName: string } | null;
};

export function MemberVolunteerClient({ memberId, initialRecords }: { memberId: string; initialRecords: Record[] }) {
  const [records, setRecords] = useState(initialRecords);
  const [form, setForm] = useState({
    section: "EDUCATIONAL" as Section,
    hoursDate: new Date().toISOString().slice(0, 10),
    hours: "",
    description: "",
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.hours) {
      toast.error("أدخل عدد الساعات");
      return;
    }
    const r = await fetch("/api/volunteer-hours", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, memberId }),
    });
    if (r.ok) {
      const created = await r.json();
      setRecords([
        {
          id: created.id,
          hoursDate: created.hoursDate.slice(0, 10),
          hours: Number(created.hours),
          section: created.section,
          description: created.description,
          approved: false,
          activity: null,
          approver: null,
        },
        ...records,
      ]);
      setForm({ ...form, hours: "", description: "" });
      toast.success("تم تسجيل الساعات. ستُراجع من قبل المسؤول.");
    } else toast.error("فشل");
  };

  const totalApproved = records.filter((r) => r.approved).reduce((s, r) => s + r.hours, 0);
  const totalPending = records.filter((r) => !r.approved).reduce((s, r) => s + r.hours, 0);

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Heart size={24} />تطوعي</h1>
        <p className="text-muted-foreground">تسجيل ساعات تطوعك في الجمعية</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground">ساعات معتمدة</p>
            <p className="text-2xl font-bold text-green-600">{totalApproved.toFixed(1)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground">قيد المراجعة</p>
            <p className="text-2xl font-bold text-orange-600">{totalPending.toFixed(1)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Plus size={18} />تسجيل ساعات تطوع</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>القسم</Label>
                <select value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value as Section })} className="w-full h-9 px-3 rounded-md border bg-background text-sm">
                  {Object.entries(SECTION_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>التاريخ</Label>
                <Input type="date" value={form.hoursDate} onChange={(e) => setForm({ ...form, hoursDate: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>عدد الساعات</Label>
              <Input type="number" step="0.5" min="0" value={form.hours} onChange={(e) => setForm({ ...form, hours: e.target.value })} />
            </div>
            <div>
              <Label>وصف العمل التطوعي</Label>
              <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <Button type="submit">إرسال للمراجعة</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>سجل التطوع</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {records.length === 0 && <p className="text-center text-muted-foreground py-4">لا توجد سجلات بعد</p>}
          {records.map((r) => (
            <div key={r.id} className="border rounded-lg p-3 bg-muted/20">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm">{r.hoursDate}</span>
                  <Badge variant="outline">{SECTION_LABELS[r.section]}</Badge>
                  <span className="text-sm font-mono">{r.hours.toFixed(1)} ساعة</span>
                  {r.approved ? (
                    <Badge variant="default">معتمد</Badge>
                  ) : (
                    <Badge variant="outline" className="text-orange-700">قيد المراجعة</Badge>
                  )}
                </div>
              </div>
              {r.activity && <p className="text-xs text-muted-foreground mt-1">النشاط: {r.activity.title}</p>}
              {r.description && <p className="text-xs mt-1">{r.description}</p>}
              {r.approver && <p className="text-[10px] text-muted-foreground mt-1">اعتمد: {r.approver.fullName}</p>}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
