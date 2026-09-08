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
import type { Partnership } from "@prisma/client";
import { toast } from "sonner";
import { useT } from "@/components/i18n/provider";
import { Plus, Trash2, Pencil, Handshake, FileWarning, Calendar } from "lucide-react";

type PartnershipRow = Omit<Partnership, "signedAt" | "startDate" | "endDate" | "createdAt"> & {
  signedAt: string | null;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
};

const KINDS = ["PUBLIC_INSTITUTION", "PRIVATE_COMPANY", "NGO", "SCHOOL", "HEALTH", "INTERNATIONAL", "OTHER"] as const;
const STATUSES = ["DRAFT", "SIGNED", "ACTIVE", "EXPIRED", "TERMINATED"] as const;

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  SIGNED: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  ACTIVE: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  EXPIRED: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  TERMINATED: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
};

function emptyForm() {
  return {
    partnerName: "",
    kind: "NGO",
    contactName: "",
    contactPhone: "",
    contactEmail: "",
    object: "",
    signedAt: "",
    startDate: "",
    endDate: "",
    status: "DRAFT",
    fileUrl: "",
  };
}

export function PartnershipsClient({ initial, canWrite }: { initial: PartnershipRow[]; canWrite: boolean }) {
  const { t, locale } = useT();
  const [rows, setRows] = useState(initial);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [busy, setBusy] = useState(false);

  const fmtDate = (d: string | null) =>
    d ? new Date(d + "T12:00:00").toLocaleDateString(locale) : "—";

  const now = Date.now();
  const expiringSoon = rows.filter((r) => {
    if (!r.endDate || r.status === "EXPIRED" || r.status === "TERMINATED") return false;
    const days = (new Date(r.endDate + "T23:59:59").getTime() - now) / 86_400_000;
    return days >= 0 && days <= 60;
  });

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setDialogOpen(true);
  }

  function openEdit(p: PartnershipRow) {
    setEditingId(p.id);
    setForm({
      partnerName: p.partnerName,
      kind: p.kind,
      contactName: p.contactName ?? "",
      contactPhone: p.contactPhone ?? "",
      contactEmail: p.contactEmail ?? "",
      object: p.object,
      signedAt: p.signedAt ?? "",
      startDate: p.startDate ?? "",
      endDate: p.endDate ?? "",
      status: p.status,
      fileUrl: p.fileUrl ?? "",
    });
    setDialogOpen(true);
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!form.partnerName.trim() || !form.object.trim()) {
      toast.error(t("gov.common.toastFailed"));
      return;
    }
    setBusy(true);
    const payload = {
      partnerName: form.partnerName.trim(),
      kind: form.kind,
      contactName: form.contactName || null,
      contactPhone: form.contactPhone || null,
      contactEmail: form.contactEmail || null,
      object: form.object.trim(),
      signedAt: form.signedAt || null,
      startDate: form.startDate || null,
      endDate: form.endDate || null,
      status: form.status,
      fileUrl: form.fileUrl || null,
    };
    try {
      const res = await fetch(editingId ? `/api/partnerships/${editingId}` : "/api/partnerships", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      const saved = await res.json();
      const normalized: PartnershipRow = {
        ...saved,
        signedAt: saved.signedAt ? String(saved.signedAt).slice(0, 10) : null,
        startDate: saved.startDate ? String(saved.startDate).slice(0, 10) : null,
        endDate: saved.endDate ? String(saved.endDate).slice(0, 10) : null,
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
    if (!confirm(t("gov.partnerships.confirmDelete"))) return;
    try {
      const res = await fetch(`/api/partnerships/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setRows((prev) => prev.filter((r) => r.id !== id));
      toast.success(t("gov.common.toastDeleted"));
    } catch {
      toast.error(t("gov.common.toastFailed"));
    }
  }

  return (
    <div className="space-y-4">
      {expiringSoon.length > 0 && (
        <div role="alert" className="rounded-xl border border-$1-300 bg-$1-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
          <p className="flex items-center gap-1.5 font-semibold">
            <FileWarning size={14} /> {t("gov.partnerships.expiringSoon")}
          </p>
          <ul className="mt-2 space-y-1 text-xs">
            {expiringSoon.map((r) => (
              <li key={r.id}>⏰ {r.partnerName} — {fmtDate(r.endDate)}</li>
            ))}
          </ul>
        </div>
      )}

      {canWrite && (
        <div className="flex justify-end">
          <Button onClick={openCreate}>
            <Plus size={14} /> {t("gov.partnerships.add")}
          </Button>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {rows.map((p) => (
          <div key={p.id} className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-2">
              <Handshake size={16} className="text-muted-foreground" />
              <span className="font-bold">{p.partnerName}</span>
              <Badge variant="outline">{t(`gov.partnerKind.${p.kind}`)}</Badge>
              <Badge className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[p.status] ?? ""}`}>
                {t(`gov.partnerStatus.${p.status}`)}
              </Badge>
              <span className="ms-auto flex gap-1.5">
                {p.fileUrl && (
                  <a href={p.fileUrl} target="_blank" rel="noreferrer" className="px-1">📎</a>
                )}
                {canWrite && (
                  <>
                    <Button size="icon-sm" variant="ghost" onClick={() => openEdit(p)} title={t("gov.common.edit")}>
                      <Pencil size={13} />
                    </Button>
                    <Button size="icon-sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => remove(p.id)} title={t("gov.common.delete")}>
                      <Trash2 size={13} />
                    </Button>
                  </>
                )}
              </span>
            </div>
            <p className="mt-1 text-sm" dir="auto">{p.object}</p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground" dir="auto">
              {(p.contactName || p.contactPhone || p.contactEmail) && (
                <p>👤 {p.contactName} {p.contactPhone ? `· ${p.contactPhone}` : ""} {p.contactEmail ? `· ${p.contactEmail}` : ""}</p>
              )}
              {(p.startDate || p.endDate) && (
                <p>
                  <Calendar size={11} className="inline" /> {fmtDate(p.startDate)} ← {fmtDate(p.endDate)}
                </p>
              )}
            </div>
            {p.notes && <p className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground" dir="auto">{p.notes}</p>}
          </div>
        ))}
        {rows.length === 0 && (
          <p className="py-10 text-center text-muted-foreground md:col-span-2">{t("gov.partnerships.none")}</p>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <form onSubmit={submit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>{t(editingId ? "gov.partnerships.edit" : "gov.partnerships.add")}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label>{t("gov.partnerships.partnerName")}</Label>
                <Input value={form.partnerName} onChange={(e) => setForm({ ...form, partnerName: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <Label>{t("gov.partnerships.kind")}</Label>
                <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v ?? "OTHER" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {KINDS.map((k) => (
                      <SelectItem key={k} value={k}>{t(`gov.partnerKind.${k}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t("gov.partnerships.status")}</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v ?? "DRAFT" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>{t(`gov.partnerStatus.${s}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>{t("gov.partnerships.object")}</Label>
                <Input value={form.object} onChange={(e) => setForm({ ...form, object: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <Label>{t("gov.partnerships.contactName")}</Label>
                <Input value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("gov.partnerships.contactPhone")}</Label>
                <Input dir="ltr" value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>{t("gov.partnerships.contactEmail")}</Label>
                <Input dir="ltr" type="email" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("gov.partnerships.startDate")}</Label>
                <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("gov.partnerships.endDate")}</Label>
                <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>{t("gov.partnerships.fileUrl")}</Label>
                <Input dir="ltr" value={form.fileUrl} onChange={(e) => setForm({ ...form, fileUrl: e.target.value })} />
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
