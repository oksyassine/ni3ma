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
import { Plus, Trash2, Pencil, Flag, FileWarning, ShieldCheck } from "lucide-react";

type Mandate = {
  id: string;
  memberName: string;
  position: string;
  positionOrder: number;
  startedAt: string;
  endedAt: string | null;
  declaredAt: string | null;
  isActive: boolean;
  notes: string | null;
};

const POSITIONS = [
  { key: "PRESIDENT", order: 10 },
  { key: "VICE_PRESIDENT", order: 20 },
  { key: "SECRETARY", order: 30 },
  { key: "ASSISTANT_SECRETARY", order: 40 },
  { key: "TREASURER", order: 50 },
  { key: "ASSISTANT_TREASURER", order: 60 },
  { key: "ADVISOR", order: 70 },
  { key: "OTHER", order: 99 },
] as const;

function emptyForm() {
  return {
    memberName: "",
    position: "PRESIDENT",
    startedAt: "",
    declaredAt: "",
    notes: "",
  };
}

export function MandatesClient({
  initialActive,
  initialPast,
  canWrite,
}: {
  initialActive: Mandate[];
  initialPast: Mandate[];
  canWrite: boolean;
}) {
  const { t, locale } = useT();
  const [active, setActive] = useState(initialActive);
  const [past, setPast] = useState(initialPast);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [busy, setBusy] = useState(false);

  const fmtDate = (d: string | null) =>
    d ? new Date(d + "T12:00:00").toLocaleDateString(locale) : "—";

  // Art. 5 (loi 07-09): bureau changes must be filed with the local authority
  // within one month. Flag mandates started >7 days ago without a filing date.
  const now = Date.now();
  const notDeclared = active.filter(
    (m) => !m.declaredAt && now - new Date(m.startedAt + "T12:00:00").getTime() > 7 * 86_400_000
  );
  const endingSoon = active.filter((m) => {
    if (!m.endedAt) return false;
    const daysLeft = Math.ceil((new Date(m.endedAt + "T23:59:59").getTime() - now) / 86_400_000);
    return daysLeft >= 0 && daysLeft <= 90;
  });

  function openCreate() {
    setEditingId(null);
    setForm({ ...emptyForm(), startedAt: new Date().toISOString().slice(0, 10) });
    setDialogOpen(true);
  }

  function openEdit(m: Mandate) {
    setEditingId(m.id);
    setForm({
      memberName: m.memberName,
      position: POSITIONS.some((p) => p.key === m.position) ? m.position : "OTHER",
      startedAt: m.startedAt,
      declaredAt: m.declaredAt ?? "",
      notes: m.notes ?? "",
    });
    setDialogOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.memberName.trim()) {
      toast.error(t("gov.common.toastFailed"));
      return;
    }
    setBusy(true);
    const order = POSITIONS.find((p) => p.key === form.position)?.order ?? 99;
    const payload = {
      memberName: form.memberName.trim(),
      position: form.position,
      positionOrder: order,
      startedAt: form.startedAt || new Date().toISOString().slice(0, 10),
      declaredAt: form.declaredAt || null,
      isActive: editingId ? undefined : true,
      notes: form.notes || null,
    };
    try {
      const res = await fetch(editingId ? `/api/mandates/${editingId}` : "/api/mandates", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      const saved = await res.json();
      const normalized: Mandate = {
        ...saved,
        startedAt: String(saved.startedAt).slice(0, 10),
        endedAt: saved.endedAt ? String(saved.endedAt).slice(0, 10) : null,
        declaredAt: saved.declaredAt ? String(saved.declaredAt).slice(0, 10) : null,
      };
      if (editingId) {
        if (normalized.isActive) {
          setActive((prev) => prev.map((r) => (r.id === editingId ? normalized : r)));
          setPast((prev) => prev.filter((r) => r.id !== editingId));
        } else {
          setActive((prev) => prev.filter((r) => r.id !== editingId));
          setPast((prev) => [normalized, ...prev.filter((r) => r.id !== editingId)]);
        }
      } else {
        setActive((prev) => [...prev, normalized].sort((a, b) => a.positionOrder - b.positionOrder));
      }
      toast.success(t(editingId ? "gov.common.toastUpdated" : "gov.common.toastCreated"));
      setDialogOpen(false);
    } catch {
      toast.error(t("gov.common.toastFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function markEnded(m: Mandate) {
    setBusy(true);
    try {
      const res = await fetch(`/api/mandates/${m.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: false }),
      });
      if (!res.ok) throw new Error();
      const saved = await res.json();
      const normalized: Mandate = {
        ...m,
        isActive: false,
        endedAt: String(saved.endedAt).slice(0, 10),
      };
      setActive((prev) => prev.filter((r) => r.id !== m.id));
      setPast((prev) => [normalized, ...prev]);
      toast.success(t("gov.common.toastUpdated"));
    } catch {
      toast.error(t("gov.common.toastFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm(t("gov.mandates.confirmDelete"))) return;
    try {
      const res = await fetch(`/api/mandates/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setActive((prev) => prev.filter((r) => r.id !== id));
      setPast((prev) => prev.filter((r) => r.id !== id));
      toast.success(t("gov.common.toastDeleted"));
    } catch {
      toast.error(t("gov.common.toastFailed"));
    }
  }

  function mandateCard(m: Mandate, isCurrent: boolean) {
    const undeclared =
      isCurrent && !m.declaredAt && now - new Date(m.startedAt + "T12:00:00").getTime() > 7 * 86_400_000;
    return (
      <div key={m.id} className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-4">
        <div className="flex-1 min-w-[200px]">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold">{t(`gov.positions.${m.position}`)}</span>
            <span>{m.memberName}</span>
            {isCurrent && undeclared && (
              <Badge variant="destructive" className="gap-1">
                <FileWarning size={12} /> {t("gov.mandates.notDeclared")}
              </Badge>
            )}
            {isCurrent && m.declaredAt && (
              <Badge variant="outline" className="gap-1">
                <ShieldCheck size={12} /> {t("gov.mandates.declared")}
              </Badge>
            )}
            {isCurrent &&
              m.endedAt &&
              new Date(m.endedAt + "T23:59:59").getTime() - now <= 90 * 86_400_000 && (
                <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                  {t("gov.mandates.endingSoon")}
                </Badge>
              )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground" dir="auto">
            📅 {fmtDate(m.startedAt)} ← {fmtDate(m.endedAt)}
            {m.declaredAt ? ` · ${t("gov.mandates.declaredAt")}: ${fmtDate(m.declaredAt)}` : ""}
          </p>
          {m.notes && <p className="mt-1 text-xs text-muted-foreground" dir="auto">{m.notes}</p>}
        </div>
        {canWrite && (
          <div className="flex gap-1.5">
            {isCurrent && (
              <Button size="xs" variant="outline" disabled={busy} onClick={() => markEnded(m)}>
                <Flag size={12} /> {t("gov.mandates.markEnded")}
              </Button>
            )}
            <Button size="icon-sm" variant="ghost" onClick={() => openEdit(m)} title={t("gov.common.edit")}>
              <Pencil size={13} />
            </Button>
            <Button size="icon-sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => remove(m.id)} title={t("gov.common.delete")}>
              <Trash2 size={13} />
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {(notDeclared.length > 0 || endingSoon.length > 0) && (
        <div role="alert" className="rounded-xl border border-$1-300 bg-$1-50 p-4 text-sm text-red-900 dark:border-red-800 dark:bg-red-950/50 dark:text-red-200">
          <ul className="space-y-1 text-xs font-medium">
            {notDeclared.map((m) => (
              <li key={m.id}>
                ⛔ {m.memberName} ({t(`gov.positions.${m.position}`)}) — {t("gov.mandates.notDeclared")} {t("gov.mandates.subtitle")}
              </li>
            ))}
            {endingSoon.map((m) => (
              <li key={m.id}>
                ⏰ {m.memberName} — {t("gov.mandates.endingSoon")}: {fmtDate(m.endedAt)}
              </li>
            ))}
          </ul>
        </div>
      )}

      <section className="space-y-3">
        <h2 className="font-bold">{t("gov.mandates.current")}</h2>
        {active.length > 0 ? active.map((m) => mandateCard(m, true)) : (
          <p className="py-6 text-center text-sm text-muted-foreground">—</p>
        )}
      </section>

      {past.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-bold text-muted-foreground">{t("gov.mandates.past")}</h2>
          {past.map((m) => mandateCard(m, false))}
        </section>
      )}

      {canWrite && (
        <div className="flex justify-end">
          <Button onClick={openCreate}>
            <Plus size={14} /> {t("gov.mandates.add")}
          </Button>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={submit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>{t(editingId ? "gov.mandates.edit" : "gov.mandates.add")}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label>{t("gov.mandates.memberName")}</Label>
                <Input value={form.memberName} onChange={(e) => setForm({ ...form, memberName: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <Label>{t("gov.mandates.position")}</Label>
                <Select value={form.position} onValueChange={(v) => setForm({ ...form, position: v ?? "OTHER" })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {POSITIONS.map((p) => (
                      <SelectItem key={p.key} value={p.key}>
                        {t(`gov.positions.${p.key}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t("gov.mandates.startedAt")}</Label>
                <Input type="date" value={form.startedAt} onChange={(e) => setForm({ ...form, startedAt: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <Label>{t("gov.mandates.declaredAt")}</Label>
                <Input type="date" value={form.declaredAt} onChange={(e) => setForm({ ...form, declaredAt: e.target.value })} />
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
