"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CourseParticipant, TrainingCourse } from "@prisma/client";
import { toast } from "sonner";
import { useT } from "@/components/i18n/provider";
import { Plus, Trash2, Pencil, GraduationCap, ChevronDown, ChevronUp } from "lucide-react";

type Participant = Pick<CourseParticipant, "fullName" | "phone" | "note">;
type CourseRow = Omit<TrainingCourse, "startDate" | "endDate" | "createdAt"> & {
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  participants: Participant[];
};

const STATUSES = ["PLANNED", "ONGOING", "DONE", "CANCELLED"] as const;

const STATUS_STYLES: Record<string, string> = {
  PLANNED: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  ONGOING: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  DONE: "bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  CANCELLED: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
};

function emptyForm() {
  return {
    title: "",
    field: "",
    trainerName: "",
    partner: "",
    location: "",
    seatsTotal: "0",
    startDate: "",
    endDate: "",
    status: "PLANNED",
    notes: "",
  };
}

export function TrainingsClient({ initial, canWrite }: { initial: CourseRow[]; canWrite: boolean }) {
  const { t, locale } = useT();
  const [rows, setRows] = useState(initial);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [participantDrafts, setParticipantDrafts] = useState<Record<string, Participant[]>>({});

  const fmtDate = (d: string | null) =>
    d ? new Date(d + "T12:00:00").toLocaleDateString(locale) : "—";

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setDialogOpen(true);
  }

  function openEdit(c: CourseRow) {
    setEditingId(c.id);
    setForm({
      title: c.title,
      field: c.field ?? "",
      trainerName: c.trainerName ?? "",
      partner: c.partner ?? "",
      location: c.location ?? "",
      seatsTotal: String(c.seatsTotal),
      startDate: c.startDate ?? "",
      endDate: c.endDate ?? "",
      status: c.status,
      notes: c.notes ?? "",
    });
    setParticipantDrafts((prev) => ({ ...prev, [c.id]: c.participants.map((p) => ({ ...p })) }));
    setDialogOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error(t("gov.common.toastFailed"));
      return;
    }
    setBusy(true);
    const payload: Record<string, unknown> = {
      title: form.title.trim(),
      field: form.field || null,
      trainerName: form.trainerName || null,
      partner: form.partner || null,
      location: form.location || null,
      seatsTotal: Number(form.seatsTotal) || 0,
      startDate: form.startDate || null,
      endDate: form.endDate || null,
      status: form.status,
      notes: form.notes || null,
    };
    if (editingId && participantDrafts[editingId]) payload.participants = participantDrafts[editingId];
    try {
      const res = await fetch(editingId ? `/api/courses/${editingId}` : "/api/courses", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      const saved = await res.json();
      const normalized: CourseRow = {
        ...saved,
        startDate: saved.startDate ? String(saved.startDate).slice(0, 10) : null,
        endDate: saved.endDate ? String(saved.endDate).slice(0, 10) : null,
        createdAt: String(saved.createdAt),
        participants: (saved.participants ?? []).map((p: Record<string, unknown>) => ({
          fullName: p.fullName as string,
          phone: (p.phone as string | null) ?? null,
          note: (p.note as string | null) ?? null,
        })),
      };
      setRows((prev) => (editingId ? prev.map((r) => (r.id === editingId ? normalized : r)) : [normalized, ...prev]));
      toast.success(t(editingId ? "gov.common.toastUpdated" : "gov.common.toastCreated"));
      setDialogOpen(false);
    } catch {
      toast.error(t("gov.common.toastFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm(t("gov.courses.confirmDelete"))) return;
    try {
      const res = await fetch(`/api/courses/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setRows((prev) => prev.filter((r) => r.id !== id));
      toast.success(t("gov.common.toastDeleted"));
    } catch {
      toast.error(t("gov.common.toastFailed"));
    }
  }

  function draftFor(c: CourseRow): Participant[] {
    return participantDrafts[c.id] ?? c.participants;
  }

  function updateDraft(c: CourseRow, i: number, patch: Partial<Participant>) {
    setParticipantDrafts((prev) => {
      const list = (prev[c.id] ?? c.participants).map((p, j) => (j === i ? { ...p, ...patch } : p));
      return { ...prev, [c.id]: list };
    });
  }

  async function saveParticipants(c: CourseRow) {
    const participants = participantDrafts[c.id];
    if (!participants) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/courses/${c.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participants }),
      });
      if (!res.ok) throw new Error();
      const saved = await res.json();
      const normalized: CourseRow = {
        ...c,
        participants: (saved.participants ?? []).map((p: Record<string, unknown>) => ({
          fullName: p.fullName as string,
          phone: (p.phone as string | null) ?? null,
          note: (p.note as string | null) ?? null,
        })),
      };
      setRows((prev) => prev.map((r) => (r.id === c.id ? normalized : r)));
      setParticipantDrafts((prev) => {
        const next = { ...prev };
        delete next[c.id];
        return next;
      });
      toast.success(t("gov.common.toastUpdated"));
    } catch {
      toast.error(t("gov.common.toastFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {canWrite && (
        <div className="flex justify-end">
          <Button onClick={() => { openCreate(); }}>
            <Plus size={14} /> {t("gov.courses.add")}
          </Button>
        </div>
      )}

      <div className="space-y-3">
        {rows.map((c) => {
          const enrolled = draftFor(c).length;
          const isExpanded = expanded === c.id;
          const dirty = participantDrafts[c.id] !== undefined;
          return (
            <div key={c.id} className="rounded-xl border bg-card p-4">
              <div className="flex flex-wrap items-center gap-2">
                <GraduationCap size={16} className="text-muted-foreground" />
                <span className="font-bold">{c.title}</span>
                <Badge className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[c.status] ?? ""}`}>
                  {t(`gov.courseStatus.${c.status}`)}
                </Badge>
                <span className="ms-auto flex gap-1.5">
                  {!isExpanded && <Badge variant="secondary">👥 {enrolled}</Badge>}
                  <Button size="icon-sm" variant="ghost" onClick={() => setExpanded(isExpanded ? null : c.id)}>
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </Button>
                  {canWrite && (
                    <>
                      <Button size="icon-sm" variant="ghost" onClick={() => openEdit(c)} title={t("gov.common.edit")}>
                        <Pencil size={13} />
                      </Button>
                      <Button size="icon-sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => remove(c.id)} title={t("gov.common.delete")}>
                        <Trash2 size={13} />
                      </Button>
                    </>
                  )}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground" dir="auto">
                {c.field ? `📚 ${c.field}` : ""}
                {c.trainerName ? ` · 🎓 ${c.trainerName}` : ""}
                {c.partner ? ` · 🤝 ${c.partner}` : ""}
                {c.location ? ` · 📍 ${c.location}` : ""}
              </p>
              {(c.startDate || c.endDate) && (
                <p className="mt-1 text-xs text-muted-foreground">
                  📅 {fmtDate(c.startDate)} ← {fmtDate(c.endDate)} ·{" "}
                  {t("gov.courses.enrolledOf", { n: enrolled, seats: c.seatsTotal })}
                </p>
              )}

              {isExpanded && (
                <div className="mt-4 space-y-2 border-t pt-3">
                  <p className="text-xs font-bold">{t("gov.courses.participants")}</p>
                  {draftFor(c).map((p, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input
                        value={p.fullName}
                        disabled={!canWrite}
                        placeholder={t("gov.courses.fullName")}
                        onChange={(e) => updateDraft(c, i, { fullName: e.target.value })}
                      />
                      <Input
                        dir="ltr"
                        className="w-32"
                        value={p.phone ?? ""}
                        disabled={!canWrite}
                        placeholder="📱"
                        onChange={(e) => updateDraft(c, i, { phone: e.target.value || null })}
                      />
                      {canWrite && (
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() =>
                            setParticipantDrafts((prev) => ({ ...prev, [c.id]: draftFor(c).filter((_, j) => j !== i) }))
                          }
                        >
                          <Trash2 size={12} />
                        </Button>
                      )}
                    </div>
                  ))}
                  {draftFor(c).length === 0 && (
                    <p className="text-xs text-muted-foreground">{t("gov.distributions.noEntries")}</p>
                  )}
                  {canWrite && (
                    <div className="flex gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setParticipantDrafts((prev) => ({
                            ...prev,
                            [c.id]: [...draftFor(c), { fullName: "", phone: null, note: null }],
                          }))
                        }
                      >
                        <Plus size={13} /> {t("gov.courses.addParticipant")}
                      </Button>
                      {dirty && (
                        <Button size="sm" disabled={busy} onClick={() => saveParticipants(c)}>
                          {t("gov.common.save")}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {rows.length === 0 && (
          <p className="py-10 text-center text-muted-foreground">{t("gov.courses.none")}</p>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <form onSubmit={submit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>{t(editingId ? "gov.courses.edit" : "gov.courses.add")}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label>{t("gov.courses.titleField")}</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <Label>{t("gov.courses.field")}</Label>
                <Input placeholder="محو الأمية / تكوين إداري" value={form.field} onChange={(e) => setForm({ ...form, field: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("gov.courses.trainerName")}</Label>
                <Input value={form.trainerName} onChange={(e) => setForm({ ...form, trainerName: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("gov.courses.partner")}</Label>
                <Input value={form.partner} onChange={(e) => setForm({ ...form, partner: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("gov.courses.location")}</Label>
                <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("gov.courses.seatsTotal")}</Label>
                <Input type="number" min={0} value={form.seatsTotal} onChange={(e) => setForm({ ...form, seatsTotal: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("gov.courses.status")}</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v ?? "PLANNED" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>{t(`gov.courseStatus.${s}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:col-span-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">📅</Label>
                  <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">→</Label>
                  <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>{t("gov.common.cancel")}</Button>
              <Button type="submit" disabled={busy}>{t("gov.common.save")}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
