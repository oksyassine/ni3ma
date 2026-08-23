"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { Section } from "@prisma/client";
import { SECTION_LABELS } from "@/lib/section";
import { QrCode, Check, X, Save } from "lucide-react";

type Member = { id: string; fullName: string; registrationNumber: number };
type Activity = { id: string; title: string; activityDate: string | null; programId: string };
type AttRecord = { memberId: string; isPresent: boolean };

export function AttendancePage({ section }: { section: Section }) {
  const today = new Date().toISOString().slice(0, 10);
  const [members, setMembers] = useState<Member[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [date, setDate] = useState(today);
  const [activityId, setActivityId] = useState<string>("");
  const [att, setAtt] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const r = await fetch(`/api/members?section=${section}&limit=500`);
      if (r.ok) {
        const data = await r.json();
        setMembers(data.members ?? []);
      }
      const r2 = await fetch(`/api/programs?section=${section}`);
      if (r2.ok) {
        const programs: { id: string; activities: Activity[] }[] = await r2.json();
        const acts: Activity[] = [];
        programs.forEach((p) => p.activities.forEach((a) => acts.push({ ...a, programId: p.id })));
        setActivities(acts.sort((a, b) => (b.activityDate ?? "").localeCompare(a.activityDate ?? "")));
      }
    })();
  }, [section]);

  useEffect(() => {
    (async () => {
      const params = new URLSearchParams({ section, date });
      if (activityId) params.set("activityId", activityId);
      const r = await fetch(`/api/attendance?${params}`);
      if (r.ok) {
        const records: (AttRecord & { memberId: string })[] = await r.json();
        const map: Record<string, boolean> = {};
        records.forEach((rec) => { map[rec.memberId] = rec.isPresent; });
        setAtt(map);
      }
    })();
  }, [section, date, activityId]);

  const presentCount = useMemo(() => Object.values(att).filter(Boolean).length, [att]);

  const toggle = (id: string) => setAtt((p) => ({ ...p, [id]: !p[id] }));
  const markAll = (val: boolean) => {
    const next: Record<string, boolean> = {};
    members.forEach((m) => { next[m.id] = val; });
    setAtt(next);
  };

  const save = async () => {
    setSaving(true);
    const r = await fetch("/api/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        section,
        date,
        activityId: activityId || null,
        entries: members.map((m) => ({ memberId: m.id, isPresent: !!att[m.id] })),
      }),
    });
    if (r.ok) toast.success("تم حفظ الحضور");
    else toast.error("فشل الحفظ");
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">حضور {SECTION_LABELS[section]}</h1>
          <p className="text-muted-foreground">تسجيل الحضور والغياب</p>
        </div>
        <Link href={`/checkin?section=${section}${activityId ? `&activityId=${activityId}` : ""}`}>
          <Button variant="outline">
            <QrCode size={16} />وضع المسح
          </Button>
        </Link>
      </div>

      <Card>
        <CardContent className="grid gap-3 md:grid-cols-3 py-4">
          <div>
            <Label>التاريخ</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <Label>النشاط (اختياري)</Label>
            <select
              value={activityId}
              onChange={(e) => setActivityId(e.target.value)}
              className="w-full h-9 px-3 rounded-md border bg-background text-sm"
            >
              <option value="">— غير محدد —</option>
              {activities.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title}{a.activityDate ? ` (${a.activityDate.slice(0, 10)})` : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end gap-2">
            <Button variant="outline" size="sm" onClick={() => markAll(true)}>الكل حاضر</Button>
            <Button variant="outline" size="sm" onClick={() => markAll(false)}>الكل غائب</Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Badge variant="secondary">حاضر: {presentCount} / {members.length}</Badge>
        <Button onClick={save} disabled={saving}>
          <Save size={14} />{saving ? "..." : "حفظ"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>المنخرطين</CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          {members.map((m) => (
            <div key={m.id} className="flex items-center gap-3 py-2">
              <div className="flex-1">
                <span className="text-sm">{m.fullName}</span>
                <span className="text-xs text-muted-foreground ms-2">#{m.registrationNumber}</span>
              </div>
              <Button
                size="sm"
                variant={att[m.id] ? "default" : "outline"}
                onClick={() => toggle(m.id)}
                className={att[m.id] ? "bg-green-600 hover:bg-green-700" : ""}
              >
                {att[m.id] ? <Check size={14} /> : <X size={14} />}
                {att[m.id] ? "حاضر" : "غائب"}
              </Button>
            </div>
          ))}
          {members.length === 0 && (
            <p className="text-center text-muted-foreground py-4">لا يوجد منخرطون في هذا القسم</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
