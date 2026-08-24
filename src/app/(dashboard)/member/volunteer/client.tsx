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
import { useT } from "@/components/i18n/provider";
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
  const { t } = useT();
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
      toast.error(t("memberVol.enterHours"));
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
      toast.success(t("memberVol.submittedToast"));
    } else toast.error(t("misc.failed"));
  };

  const totalApproved = records.filter((r) => r.approved).reduce((s, r) => s + r.hours, 0);
  const totalPending = records.filter((r) => !r.approved).reduce((s, r) => s + r.hours, 0);

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Heart size={24} />{t("memberVol.title")}</h1>
        <p className="text-muted-foreground">{t("memberVol.subtitle")}</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground">{t("memberVol.approvedHours")}</p>
            <p className="text-2xl font-bold text-green-600">{totalApproved.toFixed(1)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground">{t("misc.pendingReview")}</p>
            <p className="text-2xl font-bold text-orange-600">{totalPending.toFixed(1)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Plus size={18} />{t("memberVol.recordTitle")}</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t("misc.section")}</Label>
                <select value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value as Section })} className="w-full h-9 px-3 rounded-md border bg-background text-sm">
                  {Object.entries(SECTION_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>{t("misc.date")}</Label>
                <Input type="date" value={form.hoursDate} onChange={(e) => setForm({ ...form, hoursDate: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>{t("memberVol.hoursCount")}</Label>
              <Input type="number" step="0.5" min="0" value={form.hours} onChange={(e) => setForm({ ...form, hours: e.target.value })} />
            </div>
            <div>
              <Label>{t("memberVol.workDescription")}</Label>
              <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <Button type="submit">{t("memberVol.sendForReview")}</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>{t("memberVol.logTitle")}</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {records.length === 0 && <p className="text-center text-muted-foreground py-4">{t("memberVol.noRecordsYet")}</p>}
          {records.map((r) => (
            <div key={r.id} className="border rounded-lg p-3 bg-muted/20">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm">{r.hoursDate}</span>
                  <Badge variant="outline">{SECTION_LABELS[r.section]}</Badge>
                  <span className="text-sm font-mono">{r.hours.toFixed(1)} {t("misc.hoursShort")}</span>
                  {r.approved ? (
                    <Badge variant="default">{t("misc.approved")}</Badge>
                  ) : (
                    <Badge variant="outline" className="text-orange-700">{t("misc.pendingReview")}</Badge>
                  )}
                </div>
              </div>
              {r.activity && <p className="text-xs text-muted-foreground mt-1">{t("misc.activityLabel", { title: r.activity.title })}</p>}
              {r.description && <p className="text-xs mt-1">{r.description}</p>}
              {r.approver && <p className="text-[10px] text-muted-foreground mt-1">{t("misc.approvedBy", { name: r.approver.fullName })}</p>}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
