"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Check, X, Trash2, HandHeart, Pencil } from "lucide-react";
import { SECTION_LABELS } from "@/lib/section";
import type { Section } from "@prisma/client";

type Adult = { id: string; fullName: string; registrationNumber: number };
type Activity = { id: string; title: string; section: Section; activityDate: string | null };
type Hours = {
  id: string;
  hoursDate: string;
  hours: string;
  description: string | null;
  approved: boolean;
  section: Section;
  member: { id: string; fullName: string; registrationNumber: number };
  activity: { title: string } | null;
  approver: { fullName: string } | null;
  source?: "VOLUNTEER_HOURS" | "TASK_WORKLOG";
  project?: { id: string; name: string; section: Section } | null;
};

export function VolunteerLeaderClient({ adults, activities }: { adults: Adult[]; activities: Activity[] }) {
  const [hours, setHours] = useState<Hours[]>([]);
  const [filter, setFilter] = useState<"" | "true" | "false">("");
  const [form, setForm] = useState({
    memberId: "",
    section: "EDUCATIONAL" as Section,
    activityId: "",
    hoursDate: new Date().toISOString().slice(0, 10),
    hours: "",
    description: "",
  });

  const load = async () => {
    const params = new URLSearchParams();
    if (filter) params.set("approved", filter);
    params.set("includeWorklogs", "1");
    const r = await fetch(`/api/volunteer-hours?${params}`);
    if (r.ok) {
      const data = await r.json();
      setHours(data.map((h: Hours) => ({ ...h, hoursDate: (h.hoursDate as string).slice(0, 10) })));
    }
  };

  useEffect(() => { load(); }, [filter]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.memberId || !form.hours) {
      toast.error("اختر متطوع وأدخل ساعات");
      return;
    }
    const r = await fetch("/api/volunteer-hours", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, activityId: form.activityId || null }),
    });
    if (r.ok) {
      toast.success("تم تسجيل الساعات");
      setForm({ ...form, hours: "", description: "", activityId: "" });
      load();
    } else toast.error("فشل");
  };

  const approve = async (id: string, approve: boolean) => {
    const r = await fetch(`/api/volunteer-hours/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approve }),
    });
    if (r.ok) {
      toast.success(approve ? "تم الاعتماد" : "تم الرفض");
      load();
    }
  };

  const del = async (id: string) => {
    if (!confirm("حذف؟")) return;
    const r = await fetch(`/api/volunteer-hours/${id}`, { method: "DELETE" });
    if (r.ok) {
      toast.success("تم الحذف");
      load();
    }
  };

  const totalApproved = hours.filter((h) => h.approved).reduce((s, h) => s + Number(h.hours), 0);
  const totalFromTasks = hours.filter((h) => h.source === "TASK_WORKLOG").reduce((s, h) => s + Number(h.hours), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><HandHeart size={24} />ساعات التطوع</h1>
        <p className="text-muted-foreground">تسجيل واعتماد ساعات تطوع المتطوعين</p>
      </div>

      <Card>
        <CardHeader><CardTitle>تسجيل ساعات</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={submit} className="grid gap-3 md:grid-cols-3">
            <div className="md:col-span-1">
              <Label>المتطوع</Label>
              <select value={form.memberId} onChange={(e) => setForm({ ...form, memberId: e.target.value })} className="w-full h-9 px-3 rounded-md border bg-background text-sm">
                <option value="">— اختر —</option>
                {adults.map((a) => (
                  <option key={a.id} value={a.id}>{a.fullName} (#{a.registrationNumber})</option>
                ))}
              </select>
            </div>
            <div>
              <Label>القسم</Label>
              <select value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value as Section })} className="w-full h-9 px-3 rounded-md border bg-background text-sm">
                {Object.entries(SECTION_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>النشاط (اختياري)</Label>
              <select value={form.activityId} onChange={(e) => setForm({ ...form, activityId: e.target.value })} className="w-full h-9 px-3 rounded-md border bg-background text-sm">
                <option value="">—</option>
                {activities.filter((a) => a.section === form.section).map((a) => (
                  <option key={a.id} value={a.id}>{a.title}{a.activityDate ? ` (${a.activityDate})` : ""}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>التاريخ</Label>
              <Input type="date" value={form.hoursDate} onChange={(e) => setForm({ ...form, hoursDate: e.target.value })} />
            </div>
            <div>
              <Label>الساعات</Label>
              <Input type="number" step="0.5" min="0" value={form.hours} onChange={(e) => setForm({ ...form, hours: e.target.value })} />
            </div>
            <div className="md:col-span-3">
              <Label>الوصف</Label>
              <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <Button type="submit">تسجيل</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2">
          <Button size="sm" variant={filter === "" ? "default" : "outline"} onClick={() => setFilter("")}>الكل</Button>
          <Button size="sm" variant={filter === "false" ? "default" : "outline"} onClick={() => setFilter("false")}>قيد المراجعة</Button>
          <Button size="sm" variant={filter === "true" ? "default" : "outline"} onClick={() => setFilter("true")}>معتمدة</Button>
        </div>
        <div className="flex gap-2">
          <Badge variant="secondary">إجمالي معتمد: {totalApproved.toFixed(1)} ساعة</Badge>
          {totalFromTasks > 0 && <Badge variant="outline">من المهام: {totalFromTasks.toFixed(1)} ساعة</Badge>}
        </div>
      </div>

      <Card>
        <CardContent className="divide-y p-0">
          {hours.length === 0 && <p className="text-center text-muted-foreground py-8">لا توجد سجلات</p>}
          {hours.map((h) => {
            const fromTask = h.source === "TASK_WORKLOG";
            return (
              <div key={h.id} className="flex items-center gap-3 p-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{h.member.fullName}</span>
                    <Badge variant="outline">{SECTION_LABELS[h.section]}</Badge>
                    <span className="text-sm font-mono">{Number(h.hours).toFixed(1)} ساعة</span>
                    {fromTask ? (
                      <Badge className="bg-purple-100 text-purple-800 text-[10px]">📋 من مهمة</Badge>
                    ) : h.approved ? (
                      <Badge variant="default">معتمد</Badge>
                    ) : (
                      <Badge variant="outline" className="text-orange-700">قيد المراجعة</Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {h.hoursDate}
                    {h.activity && <> · {h.activity.title}</>}
                    {h.project && <> · مشروع: {h.project.name}</>}
                    {h.approver && <> · اعتمد: {h.approver.fullName}</>}
                  </div>
                  {h.description && <p className="text-xs text-muted-foreground mt-1">{h.description}</p>}
                </div>
                {!fromTask && !h.approved && (
                  <Button size="sm" onClick={() => approve(h.id, true)} className="bg-green-600 hover:bg-green-700">
                    <Check size={14} />اعتماد
                  </Button>
                )}
                {!fromTask && h.approved && (
                  <Button size="sm" variant="outline" onClick={() => approve(h.id, false)}>
                    <X size={14} />إلغاء الاعتماد
                  </Button>
                )}
                {!fromTask && (
                  <>
                    <VolunteerHoursEditButton hours={h} reload={load} />
                    <Button size="icon" variant="ghost" onClick={() => del(h.id)}>
                      <Trash2 size={14} />
                    </Button>
                  </>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

function VolunteerHoursEditButton({ hours, reload }: { hours: Hours; reload: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    hours: hours.hours,
    description: hours.description ?? "",
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await fetch(`/api/volunteer-hours/${hours.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (r.ok) {
      toast.success("تم");
      setOpen(false);
      reload();
    } else toast.error("فشل");
  };

  return (
    <>
      <Button size="icon" variant="ghost" onClick={() => setOpen(true)} title="تعديل">
        <Pencil size={13} />
      </Button>
      {open && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="bg-card rounded-lg p-4 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold mb-3">تعديل الساعات</h3>
            <form onSubmit={submit} className="space-y-3">
              <div>
                <Label>الساعات</Label>
                <Input type="number" step="0.5" value={form.hours} onChange={(e) => setForm({ ...form, hours: e.target.value })} />
              </div>
              <div>
                <Label>الوصف</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm">حفظ</Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>إلغاء</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
