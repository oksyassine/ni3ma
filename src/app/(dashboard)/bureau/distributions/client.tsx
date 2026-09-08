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
import { toast } from "sonner";
import { useT } from "@/components/i18n/provider";
import { Plus, Trash2, Pencil, Package, ChevronDown, ChevronUp } from "lucide-react";

type Entry = {
  beneficiaryName: string;
  quantity: number;
  note: string | null;
};

type Campaign = {
  id: string;
  kind: string;
  name: string;
  yearLabel: string | null;
  unitLabel: string | null;
  plannedUnits: number;
  budget: number | null;
  startDate: string | null;
  endDate: string | null;
  notes: string | null;
  entries: Entry[];
};

const KINDS = ["RAMADAN_BASKET", "IFTAR", "ADHI", "EID_CLOTHES", "FOOD_BASKET", "SCHOOL_KIT", "OTHER"] as const;

function emptyForm() {
  return {
    kind: "RAMADAN_BASKET",
    name: "",
    yearLabel: "",
    unitLabel: "",
    plannedUnits: "0",
    budget: "",
    startDate: "",
    endDate: "",
    notes: "",
  };
}

export function DistributionsClient({ initial, canWrite }: { initial: Campaign[]; canWrite: boolean }) {
  const { t, locale } = useT();
  const [rows, setRows] = useState(initial);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [entryDrafts, setEntryDrafts] = useState<Record<string, Entry[]>>({});

  const fmtDate = (d: string | null) =>
    d ? new Date(d + "T12:00:00").toLocaleDateString(locale) : "—";
  const fmtMoney = (n: number) => n.toLocaleString(locale);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setDialogOpen(true);
  }

  function openEdit(c: Campaign) {
    setEditingId(c.id);
    setForm({
      kind: c.kind,
      name: c.name,
      yearLabel: c.yearLabel ?? "",
      unitLabel: c.unitLabel ?? "",
      plannedUnits: String(c.plannedUnits),
      budget: c.budget === null ? "" : String(c.budget),
      startDate: c.startDate ?? "",
      endDate: c.endDate ?? "",
      notes: c.notes ?? "",
    });
    setEntryDrafts((prev) => ({ ...prev, [c.id]: c.entries.map((e) => ({ ...e })) }));
    setDialogOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error(t("gov.common.toastFailed"));
      return;
    }
    setBusy(true);
    const payload: Record<string, unknown> = {
      kind: form.kind,
      name: form.name.trim(),
      yearLabel: form.yearLabel || null,
      unitLabel: form.unitLabel || null,
      plannedUnits: Number(form.plannedUnits) || 0,
      budget: form.budget === "" ? null : Number(form.budget),
      startDate: form.startDate || null,
      endDate: form.endDate || null,
      notes: form.notes || null,
    };
    if (editingId && entryDrafts[editingId]) {
      payload.entries = entryDrafts[editingId];
    }
    try {
      const res = await fetch(editingId ? `/api/distributions/${editingId}` : "/api/distributions", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      const saved = await res.json();
      const normalized: Campaign = {
        ...saved,
        entries: (saved.entries ?? []).map((e: Record<string, unknown>) => ({
          beneficiaryName: e.beneficiaryName as string,
          quantity: e.quantity as number,
          note: (e.note as string | null) ?? null,
        })),
      };
      setRows((prev) =>
        editingId ? prev.map((r) => (r.id === editingId ? normalized : r)) : [normalized, ...prev]
      );
      setEntryDrafts((prev) => {
        const next = { ...prev };
        delete next[saved.id as string];
        return next;
      });
      toast.success(t(editingId ? "gov.common.toastUpdated" : "gov.common.toastCreated"));
      setDialogOpen(false);
    } catch {
      toast.error(t("gov.common.toastFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm(t("gov.distributions.confirmDelete"))) return;
    try {
      const res = await fetch(`/api/distributions/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setRows((prev) => prev.filter((r) => r.id !== id));
      toast.success(t("gov.common.toastDeleted"));
    } catch {
      toast.error(t("gov.common.toastFailed"));
    }
  }

  function draftFor(c: Campaign): Entry[] {
    return entryDrafts[c.id] ?? c.entries;
  }

  function updateDraft(c: Campaign, i: number, patch: Partial<Entry>) {
    setEntryDrafts((prev) => {
      const list = (prev[c.id] ?? c.entries).map((e, j) => (j === i ? { ...e, ...patch } : e));
      return { ...prev, [c.id]: list };
    });
  }

  async function saveEntries(c: Campaign) {
    const entries = entryDrafts[c.id];
    if (!entries) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/distributions/${c.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries }),
      });
      if (!res.ok) throw new Error();
      const saved = await res.json();
      const normalized: Campaign = {
        ...saved,
        entries: (saved.entries ?? []).map((e: Record<string, unknown>) => ({
          beneficiaryName: e.beneficiaryName as string,
          quantity: e.quantity as number,
          note: (e.note as string | null) ?? null,
        })),
      };
      setRows((prev) => prev.map((r) => (r.id === c.id ? normalized : r)));
      setEntryDrafts((prev) => {
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
          <Button onClick={openCreate}>
            <Plus size={14} /> {t("gov.distributions.add")}
          </Button>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {rows.map((c) => {
          const delivered = draftFor(c).reduce((s, e) => s + e.quantity, 0);
          const pct = c.plannedUnits > 0 ? Math.min(100, Math.round((delivered / c.plannedUnits) * 100)) : 0;
          const isExpanded = expanded === c.id;
          const dirty = entryDrafts[c.id] !== undefined;
          return (
            <div key={c.id} className="rounded-xl border bg-card p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Package size={16} className="text-muted-foreground" />
                <span className="font-bold">{c.name}</span>
                <Badge variant="outline">{t(`gov.distKind.${c.kind}`)}</Badge>
                {c.yearLabel && <span className="text-xs text-muted-foreground">{c.yearLabel}</span>}
                <span className="ms-auto flex gap-1.5">
                  {!isExpanded && <Badge variant="secondary">⚖ {delivered}</Badge>}
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
                {c.unitLabel ? `${c.unitLabel} · ` : ""}
                📅 {fmtDate(c.startDate)} ← {fmtDate(c.endDate)}
                {c.budget !== null ? ` · 💰 ${fmtMoney(c.budget)} MAD` : ""}
              </p>

              <div className="mt-3">
                <div className="mb-1 flex justify-between text-xs">
                  <span className="text-muted-foreground">{t("gov.distributions.progress")}</span>
                  <span className="font-medium">
                    {t("gov.distributions.deliveredOf", { delivered, planned: c.plannedUnits })}
                    {c.unitLabel ? ` ${c.unitLabel}` : ""}
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted">
                  <div
                    className={`h-1.5 rounded-full ${pct >= 100 ? "bg-green-500" : "bg-primary"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>

              {isExpanded && (
                <div className="mt-4 space-y-2 border-t pt-3">
                  <p className="text-xs font-bold">{t("gov.distributions.entries")}</p>
                  {draftFor(c).map((e, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input
                        value={e.beneficiaryName}
                        disabled={!canWrite}
                        placeholder={t("gov.distributions.beneficiaryName")}
                        onChange={(ev) => updateDraft(c, i, { beneficiaryName: ev.target.value })}
                      />
                      <Input
                        type="number"
                        min={1}
                        className="w-20"
                        value={String(e.quantity)}
                        disabled={!canWrite}
                        onChange={(ev) => updateDraft(c, i, { quantity: Number(ev.target.value) || 1 })}
                      />
                      {canWrite && (
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() =>
                            setEntryDrafts((prev) => ({ ...prev, [c.id]: draftFor(c).filter((_, j) => j !== i) }))
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
                          setEntryDrafts((prev) => ({
                            ...prev,
                            [c.id]: [...draftFor(c), { beneficiaryName: "", quantity: 1, note: null }],
                          }))
                        }
                      >
                        <Plus size={13} /> {t("gov.distributions.addEntry")}
                      </Button>
                      {dirty && (
                        <Button size="sm" disabled={busy} onClick={() => saveEntries(c)}>
                          {t("gov.common.save")}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {c.notes && <p className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground" dir="auto">{c.notes}</p>}
            </div>
          );
        })}
      </div>
      {rows.length === 0 && (
        <p className="py-10 text-center text-muted-foreground">{t("gov.distributions.none")}</p>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <form onSubmit={submit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>{t(editingId ? "gov.distributions.edit" : "gov.distributions.add")}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label>{t("gov.distributions.name")}</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <Label>{t("gov.distributions.kind")}</Label>
                <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v ?? "OTHER" })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {KINDS.map((k) => (
                      <SelectItem key={k} value={k}>
                        {t(`gov.distKind.${k}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t("gov.distributions.yearLabel")}</Label>
                <Input placeholder="1447هـ / 2026" value={form.yearLabel} onChange={(e) => setForm({ ...form, yearLabel: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("gov.distributions.unitLabel")}</Label>
                <Input placeholder="سلة / وجبة / ثوب" value={form.unitLabel} onChange={(e) => setForm({ ...form, unitLabel: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("gov.distributions.plannedUnits")}</Label>
                <Input type="number" min={0} value={form.plannedUnits} onChange={(e) => setForm({ ...form, plannedUnits: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("gov.distributions.budget")}</Label>
                <Input type="number" min={0} step="0.01" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">📅</Label>
                  <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">→</Label>
                  <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>{t("gov.common.notes")}</Label>
                <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                {t("gov.common.cancel")}
              </Button>
              <Button type="submit" disabled={busy}>
                {t("gov.common.save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
