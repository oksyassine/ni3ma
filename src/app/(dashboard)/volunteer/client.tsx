"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useT } from "@/components/i18n/provider";
import { fmtMoney } from "@/lib/i18n/format";
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
  const { t, locale } = useT();
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
      toast.error(t("vol.selectError"));
      return;
    }
    const r = await fetch("/api/volunteer-hours", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, activityId: form.activityId || null }),
    });
    if (r.ok) {
      toast.success(t("vol.savedToast"));
      setForm({ ...form, hours: "", description: "", activityId: "" });
      load();
    } else toast.error(t("misc.failed"));
  };

  const approve = async (id: string, approve: boolean) => {
    const r = await fetch(`/api/volunteer-hours/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approve }),
    });
    if (r.ok) {
      toast.success(approve ? t("vol.approvedToast") : t("vol.rejectedToast"));
      load();
    }
  };

  const del = async (id: string) => {
    if (!confirm(t("misc.confirmDelete"))) return;
    const r = await fetch(`/api/volunteer-hours/${id}`, { method: "DELETE" });
    if (r.ok) {
      toast.success(t("misc.deleted"));
      load();
    }
  };

  const totalApproved = hours.filter((h) => h.approved).reduce((s, h) => s + Number(h.hours), 0);
  const totalFromTasks = hours.filter((h) => h.source === "TASK_WORKLOG").reduce((s, h) => s + Number(h.hours), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><HandHeart size={24} />{t("vol.title")}</h1>
        <p className="text-muted-foreground">{t("vol.leaderSubtitle")}</p>
      </div>

      <Card>
        <CardHeader><CardTitle>{t("vol.recordTitle")}</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={submit} className="grid gap-3 md:grid-cols-3">
            <div className="md:col-span-1">
              <Label>{t("vol.volunteer")}</Label>
              <select value={form.memberId} onChange={(e) => setForm({ ...form, memberId: e.target.value })} className="w-full h-9 px-3 rounded-md border bg-background text-sm">
                <option value="">{t("misc.selectPlaceholder")}</option>
                {adults.map((a) => (
                  <option key={a.id} value={a.id}>{a.fullName} (#{a.registrationNumber})</option>
                ))}
              </select>
            </div>
            <div>
              <Label>{t("misc.section")}</Label>
              <select value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value as Section })} className="w-full h-9 px-3 rounded-md border bg-background text-sm">
                {Object.entries(SECTION_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>{t("vol.activityOptional")}</Label>
              <select value={form.activityId} onChange={(e) => setForm({ ...form, activityId: e.target.value })} className="w-full h-9 px-3 rounded-md border bg-background text-sm">
                <option value="">—</option>
                {activities.filter((a) => a.section === form.section).map((a) => (
                  <option key={a.id} value={a.id}>{a.title}{a.activityDate ? ` (${a.activityDate})` : ""}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>{t("misc.date")}</Label>
              <Input type="date" value={form.hoursDate} onChange={(e) => setForm({ ...form, hoursDate: e.target.value })} />
            </div>
            <div>
              <Label>{t("misc.hoursLabel")}</Label>
              <Input type="number" step="0.5" min="0" value={form.hours} onChange={(e) => setForm({ ...form, hours: e.target.value })} />
            </div>
            <div className="md:col-span-3">
              <Label>{t("misc.descriptionLabel")}</Label>
              <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <Button type="submit">{t("vol.submit")}</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2">
          <Button size="sm" variant={filter === "" ? "default" : "outline"} onClick={() => setFilter("")}>{t("misc.all")}</Button>
          <Button size="sm" variant={filter === "false" ? "default" : "outline"} onClick={() => setFilter("false")}>{t("misc.pendingReview")}</Button>
          <Button size="sm" variant={filter === "true" ? "default" : "outline"} onClick={() => setFilter("true")}>{t("misc.approved")}</Button>
        </div>
        <div className="flex gap-2">
          <Badge variant="secondary">{t("vol.totalApproved", { total: fmtMoney(totalApproved, locale, 1) })}</Badge>
          {totalFromTasks > 0 && <Badge variant="outline">{t("vol.fromTasks", { total: fmtMoney(totalFromTasks, locale, 1) })}</Badge>}
        </div>
      </div>

      <Card>
        <CardContent className="divide-y p-0">
          {hours.length === 0 && <p className="text-center text-muted-foreground py-8">{t("misc.noRecords")}</p>}
          {hours.map((h) => {
            const fromTask = h.source === "TASK_WORKLOG";
            return (
              <div key={h.id} className="flex items-center gap-3 p-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{h.member.fullName}</span>
                    <Badge variant="outline">{SECTION_LABELS[h.section]}</Badge>
                    <span className="text-sm font-mono">{fmtMoney(Number(h.hours), locale, 1)} {t("misc.hoursShort")}</span>
                    {fromTask ? (
                      <Badge className="bg-purple-100 text-purple-800 text-[10px]">{t("vol.fromTaskBadge")}</Badge>
                    ) : h.approved ? (
                      <Badge variant="default">{t("misc.approved")}</Badge>
                    ) : (
                      <Badge variant="outline" className="text-orange-700">{t("misc.pendingReview")}</Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {h.hoursDate}
                    {h.activity && <> · {t("misc.activityLabel", { title: h.activity.title })}</>}
                    {h.project && <> · {t("misc.projectLabel")} {h.project.name}</>}
                    {h.approver && <> · {t("misc.approvedBy", { name: h.approver.fullName })}</>}
                  </div>
                  {h.description && <p className="text-xs text-muted-foreground mt-1">{h.description}</p>}
                </div>
                {!fromTask && !h.approved && (
                  <Button size="sm" onClick={() => approve(h.id, true)} className="bg-green-600 hover:bg-green-700">
                    <Check size={14} />{t("vol.approve")}
                  </Button>
                )}
                {!fromTask && h.approved && (
                  <Button size="sm" variant="outline" onClick={() => approve(h.id, false)}>
                    <X size={14} />{t("vol.unapprove")}
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
  const { t, locale } = useT();
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
      toast.success(t("misc.done"));
      setOpen(false);
      reload();
    } else toast.error(t("misc.failed"));
  };

  return (
    <>
      <Button size="icon" variant="ghost" onClick={() => setOpen(true)} title={t("misc.edit")}>
        <Pencil size={13} />
      </Button>
      {open && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="bg-card rounded-lg p-4 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold mb-3">{t("vol.editHours")}</h3>
            <form onSubmit={submit} className="space-y-3">
              <div>
                <Label>{t("misc.hoursLabel")}</Label>
                <Input type="number" step="0.5" value={form.hours} onChange={(e) => setForm({ ...form, hours: e.target.value })} />
              </div>
              <div>
                <Label>{t("misc.descriptionLabel")}</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm">{t("misc.save")}</Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>{t("misc.cancel")}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
