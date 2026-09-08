"use client";

import Link from "next/link";
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
import type { VolunteerContract } from "@prisma/client";
import { toast } from "sonner";
import { useT } from "@/components/i18n/provider";
import { Plus, Trash2, Pencil, FileSignature, Printer } from "lucide-react";

type ContractRow = Omit<
  VolunteerContract,
  "birthDate" | "weeklyHours" | "startDate" | "endDate" | "signedAt" | "createdAt"
> & {
  birthDate: string | null;
  weeklyHours: number | null;
  startDate: string;
  endDate: string | null;
  signedAt: string | null;
  createdAt: string;
};

const STATUSES = ["DRAFT", "ACTIVE", "ENDED", "TERMINATED"] as const;

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  ACTIVE: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  ENDED: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  TERMINATED: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
};

function emptyForm() {
  return {
    volunteerName: "",
    cin: "",
    phone: "",
    missionTitle: "",
    missionDetails: "",
    weeklyHours: "",
    startDate: new Date().toISOString().slice(0, 10),
    endDate: "",
    insuranceRef: "",
    status: "DRAFT",
    notes: "",
  };
}

export function ContractsClient({ initial, canWrite }: { initial: ContractRow[]; canWrite: boolean }) {
  const { t, locale } = useT();
  const [rows, setRows] = useState(initial);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [busy, setBusy] = useState(false);

  const fmtDate = (d: string | null) =>
    d ? new Date(d + "T12:00:00").toLocaleDateString(locale) : "—";

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setDialogOpen(true);
  }

  function openEdit(c: ContractRow) {
    setEditingId(c.id);
    setForm({
      volunteerName: c.volunteerName,
      cin: c.cin ?? "",
      phone: c.phone ?? "",
      missionTitle: c.missionTitle,
      missionDetails: c.missionDetails ?? "",
      weeklyHours: c.weeklyHours === null ? "" : String(c.weeklyHours),
      startDate: c.startDate,
      endDate: c.endDate ?? "",
      insuranceRef: c.insuranceRef ?? "",
      status: c.status,
      notes: c.notes ?? "",
    });
    setDialogOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.volunteerName.trim() || !form.missionTitle.trim()) {
      toast.error(t("gov.common.toastFailed"));
      return;
    }
    setBusy(true);
    const payload = {
      volunteerName: form.volunteerName.trim(),
      cin: form.cin || null,
      phone: form.phone || null,
      missionTitle: form.missionTitle.trim(),
      missionDetails: form.missionDetails || null,
      weeklyHours: form.weeklyHours === "" ? null : Number(form.weeklyHours),
      startDate: form.startDate,
      endDate: form.endDate || null,
      insuranceRef: form.insuranceRef || null,
      status: form.status,
      notes: form.notes || null,
    };
    try {
      const res = await fetch(editingId ? `/api/volunteer-contracts/${editingId}` : "/api/volunteer-contracts", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      const saved = await res.json();
      const normalized: ContractRow = {
        ...saved,
        birthDate: saved.birthDate ? String(saved.birthDate).slice(0, 10) : null,
        startDate: String(saved.startDate).slice(0, 10),
        endDate: saved.endDate ? String(saved.endDate).slice(0, 10) : null,
        signedAt: saved.signedAt ? String(saved.signedAt).slice(0, 10) : null,
        createdAt: String(saved.createdAt),
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
    if (!confirm(t("gov.vcontracts.confirmDelete"))) return;
    try {
      const res = await fetch(`/api/volunteer-contracts/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setRows((prev) => prev.filter((r) => r.id !== id));
      toast.success(t("gov.common.toastDeleted"));
    } catch {
      toast.error(t("gov.common.toastFailed"));
    }
  }

  return (
    <div className="space-y-4">
      {canWrite && (
        <div className="flex justify-end">
          <Button onClick={openCreate}>
            <Plus size={14} /> {t("gov.vcontracts.add")}
          </Button>
        </div>
      )}

      <div className="space-y-2">
        {rows.map((c) => (
          <div key={c.id} className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-4">
            <FileSignature size={16} className="text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-[220px]">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold">{c.volunteerName}</span>
                <Badge variant="outline">{c.missionTitle}</Badge>
                <Badge className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[c.status] ?? ""}`}>
                  {t(`gov.contractStatus.${c.status}`)}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground" dir="auto">
                📅 {fmtDate(c.startDate)} ← {fmtDate(c.endDate)}
                {c.weeklyHours !== null ? ` · ⏱️ ${c.weeklyHours}h/أسبوع` : ""}
                {c.insuranceRef ? ` · 🛡️ ${c.insuranceRef}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <Link href={`/bureau/volunteer-contracts/${c.id}/print`} target="_blank">
                <Button size="xs" variant="outline">
                  <Printer size={12} /> {t("gov.vcontracts.print")}
                </Button>
              </Link>
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
            </div>
          </div>
        ))}
        {rows.length === 0 && (
          <p className="py-10 text-center text-muted-foreground">{t("gov.vcontracts.none")}</p>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <form onSubmit={submit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>{t(editingId ? "gov.vcontracts.edit" : "gov.vcontracts.add")}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>{t("gov.vcontracts.volunteerName")}</Label>
                <Input value={form.volunteerName} onChange={(e) => setForm({ ...form, volunteerName: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <Label>CIN</Label>
                <Input dir="ltr" value={form.cin} onChange={(e) => setForm({ ...form, cin: e.target.value })} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>{t("gov.vcontracts.missionTitle")}</Label>
                <Input value={form.missionTitle} onChange={(e) => setForm({ ...form, missionTitle: e.target.value })} required />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>{t("gov.vcontracts.missionDetails")}</Label>
                <Input value={form.missionDetails} onChange={(e) => setForm({ ...form, missionDetails: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("gov.vcontracts.weeklyHours")}</Label>
                <Input type="number" min={1} max={40} value={form.weeklyHours} onChange={(e) => setForm({ ...form, weeklyHours: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("gov.mail.status")} — {t("gov.vcontracts.status")}</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v ?? "DRAFT" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>{t(`gov.contractStatus.${s}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:col-span-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">📅 {t("gov.mandates.startedAt")}</Label>
                  <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} required />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{t("gov.mandates.endedAt")}</Label>
                  <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">🛡️</Label>
                  <Input dir="ltr" placeholder="Police n°" value={form.insuranceRef} onChange={(e) => setForm({ ...form, insuranceRef: e.target.value })} />
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
