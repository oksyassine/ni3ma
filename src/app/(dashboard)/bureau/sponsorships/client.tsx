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
import { Plus, Trash2, Pencil, HeartHandshake, Pause, Play, Flag } from "lucide-react";

type Sponsorship = {
  id: string;
  kind: string;
  beneficiaryName: string;
  sponsorName: string;
  sponsorPhone: string | null;
  monthlyAmount: number;
  dayOfMonth: number;
  startedAt: string;
  endedAt: string | null;
  status: string;
  notes: string | null;
};

const KINDS = ["YATIM", "STUDENT", "FAMILY"] as const;

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  PAUSED: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  ENDED: "bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

function emptyForm() {
  return {
    kind: "YATIM",
    beneficiaryName: "",
    sponsorName: "",
    sponsorPhone: "",
    monthlyAmount: "",
    dayOfMonth: "5",
    startedAt: "",
    notes: "",
  };
}

export function SponsorshipsClient({ initial, canWrite }: { initial: Sponsorship[]; canWrite: boolean }) {
  const { t, locale } = useT();
  const [rows, setRows] = useState(initial);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [busy, setBusy] = useState(false);

  const fmtDate = (d: string | null) =>
    d ? new Date(d + "T12:00:00").toLocaleDateString(locale) : "—";

  const active = rows.filter((r) => r.status === "ACTIVE");
  const monthlyTotal = active.reduce((s, r) => s + r.monthlyAmount, 0);
  const fmtMoney = (n: number) => n.toLocaleString(locale);

  function openCreate() {
    setEditingId(null);
    setForm({ ...emptyForm(), startedAt: new Date().toISOString().slice(0, 10) });
    setDialogOpen(true);
  }

  function openEdit(s: Sponsorship) {
    setEditingId(s.id);
    setForm({
      kind: s.kind,
      beneficiaryName: s.beneficiaryName,
      sponsorName: s.sponsorName,
      sponsorPhone: s.sponsorPhone ?? "",
      monthlyAmount: String(s.monthlyAmount),
      dayOfMonth: String(s.dayOfMonth),
      startedAt: s.startedAt,
      notes: s.notes ?? "",
    });
    setDialogOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.beneficiaryName.trim() || !form.sponsorName.trim() || !form.monthlyAmount || !form.startedAt) {
      toast.error(t("gov.common.toastFailed"));
      return;
    }
    setBusy(true);
    const payload = {
      kind: form.kind,
      beneficiaryName: form.beneficiaryName.trim(),
      sponsorName: form.sponsorName.trim(),
      sponsorPhone: form.sponsorPhone || null,
      monthlyAmount: Number(form.monthlyAmount),
      dayOfMonth: Number(form.dayOfMonth) || 5,
      startedAt: form.startedAt,
      status: editingId ? undefined : "ACTIVE",
      notes: form.notes || null,
    };
    try {
      const res = await fetch(editingId ? `/api/sponsorships/${editingId}` : "/api/sponsorships", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      const saved = await res.json();
      const normalized: Sponsorship = {
        ...saved,
        monthlyAmount: Number(saved.monthlyAmount),
        startedAt: String(saved.startedAt).slice(0, 10),
        endedAt: saved.endedAt ? String(saved.endedAt).slice(0, 10) : null,
      };
      setRows((prev) =>
        editingId ? prev.map((r) => (r.id === editingId ? normalized : r)) : [normalized, ...prev]
      );
      toast.success(t(editingId ? "gov.common.toastUpdated" : "gov.common.toastCreated"));
      setDialogOpen(false);
    } catch {
      toast.error(t("gov.common.toastFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(s: Sponsorship, status: "ACTIVE" | "PAUSED" | "ENDED") {
    setBusy(true);
    try {
      const res = await fetch(`/api/sponsorships/${s.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      const saved = await res.json();
      setRows((prev) =>
        prev.map((r) =>
          r.id === s.id
            ? {
                ...r,
                status: saved.status,
                endedAt: saved.endedAt ? String(saved.endedAt).slice(0, 10) : null,
              }
            : r
        )
      );
      toast.success(t("gov.common.toastUpdated"));
    } catch {
      toast.error(t("gov.common.toastFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm(t("gov.sponsorships.confirmDelete"))) return;
    try {
      const res = await fetch(`/api/sponsorships/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setRows((prev) => prev.filter((r) => r.id !== id));
      toast.success(t("gov.common.toastDeleted"));
    } catch {
      toast.error(t("gov.common.toastFailed"));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4 rounded-xl border bg-card p-4">
        <HeartHandshake size={20} className="text-muted-foreground" />
        <span className="text-sm">
          {t("gov.sponsorships.activeCount")}: <b>{active.length}</b>
        </span>
        <span className="text-sm">
          {t("gov.sponsorships.monthlyTotal")}: <b>{fmtMoney(monthlyTotal)} MAD</b>
        </span>
        {canWrite && (
          <Button size="sm" className="ms-auto" onClick={openCreate}>
            <Plus size={14} /> {t("gov.sponsorships.add")}
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {rows.map((s) => (
          <div key={s.id} className="rounded-xl border bg-card p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold">{s.beneficiaryName}</span>
              <Badge variant="outline">{t(`gov.sponsorshipKind.${s.kind}`)}</Badge>
              <Badge className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[s.status] ?? ""}`}>
                {t(`gov.sponsorshipStatus.${s.status}`)}
              </Badge>
              {canWrite && (
                <span className="ms-auto flex gap-1.5">
                  {s.status === "ACTIVE" && (
                    <>
                      <Button size="xs" variant="outline" disabled={busy} onClick={() => setStatus(s, "PAUSED")}>
                        <Pause size={12} /> {t("gov.sponsorships.pause")}
                      </Button>
                      <Button size="xs" variant="outline" disabled={busy} onClick={() => setStatus(s, "ENDED")}>
                        <Flag size={12} /> {t("gov.sponsorships.end")}
                      </Button>
                    </>
                  )}
                  {(s.status === "PAUSED" || s.status === "ENDED") && (
                    <Button size="xs" variant="outline" disabled={busy} onClick={() => setStatus(s, "ACTIVE")}>
                      <Play size={12} /> {t("gov.sponsorships.resume")}
                    </Button>
                  )}
                  <Button size="icon-sm" variant="ghost" onClick={() => openEdit(s)} title={t("gov.common.edit")}>
                    <Pencil size={13} />
                  </Button>
                  <Button size="icon-sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => remove(s.id)} title={t("gov.common.delete")}>
                    <Trash2 size={13} />
                  </Button>
                </span>
              )}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground" dir="auto">
              <span>
                👤 {s.sponsorName}
                {s.sponsorPhone ? ` · ${s.sponsorPhone}` : ""}
              </span>
              <span>
                💰 <b className="text-foreground">{fmtMoney(s.monthlyAmount)}</b> MAD /{" "}
                {t("gov.sponsorships.dayOfMonth")}: {s.dayOfMonth}
              </span>
              <span>📅 {fmtDate(s.startedAt)} ←</span>
              {s.endedAt && <span>🏁 {fmtDate(s.endedAt)}</span>}
            </div>
            {s.notes && <p className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">{s.notes}</p>}
          </div>
        ))}
        {rows.length === 0 && (
          <p className="py-10 text-center text-muted-foreground">{t("gov.sponsorships.none")}</p>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <form onSubmit={submit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>{t(editingId ? "gov.sponsorships.edit" : "gov.sponsorships.add")}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>{t("gov.sponsorships.kind")}</Label>
                <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v ?? "YATIM" })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {KINDS.map((k) => (
                      <SelectItem key={k} value={k}>
                        {t(`gov.sponsorshipKind.${k}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t("gov.sponsorships.beneficiaryName")}</Label>
                <Input value={form.beneficiaryName} onChange={(e) => setForm({ ...form, beneficiaryName: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <Label>{t("gov.sponsorships.sponsorName")}</Label>
                <Input value={form.sponsorName} onChange={(e) => setForm({ ...form, sponsorName: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <Label>{t("gov.sponsorships.sponsorPhone")}</Label>
                <Input dir="ltr" value={form.sponsorPhone} onChange={(e) => setForm({ ...form, sponsorPhone: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("gov.sponsorships.monthlyAmount")}</Label>
                <Input type="number" min={0} step="0.01" value={form.monthlyAmount} onChange={(e) => setForm({ ...form, monthlyAmount: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <Label>{t("gov.sponsorships.dayOfMonth")} (1-28)</Label>
                <Input type="number" min={1} max={28} value={form.dayOfMonth} onChange={(e) => setForm({ ...form, dayOfMonth: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("gov.sponsorships.startedAt")}</Label>
                <Input type="date" value={form.startedAt} onChange={(e) => setForm({ ...form, startedAt: e.target.value })} required />
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
