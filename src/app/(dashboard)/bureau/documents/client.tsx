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
import { Plus, Trash2, Pencil, FileWarning, FileClock, FileCheck2 } from "lucide-react";

type DocumentRow = {
  id: string;
  kind: string;
  title: string;
  reference: string | null;
  issuedAt: string | null;
  expiresAt: string | null;
  reminderDays: number;
  fileUrl: string | null;
  notes: string | null;
};

const KINDS = [
  "STATUTES", "INTERNAL_RULES", "RECEIPT", "DECLARATION", "PV",
  "BANK", "CNSS", "AGREEMENT", "INSURANCE", "OTHER",
] as const;

function emptyForm() {
  return {
    kind: "STATUTES",
    title: "",
    reference: "",
    issuedAt: "",
    expiresAt: "",
    reminderDays: "30",
    fileUrl: "",
    notes: "",
  };
}

export function DocumentsClient({ initial, canWrite }: { initial: DocumentRow[]; canWrite: boolean }) {
  const { t, locale } = useT();
  const [rows, setRows] = useState(initial);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [busy, setBusy] = useState(false);

  const fmtDate = (d: string | null) =>
    d ? new Date(d + "T12:00:00").toLocaleDateString(locale) : "—";

  const today = new Date();
  const alerts = rows
    .filter((r) => r.expiresAt)
    .map((r) => ({
      row: r,
      daysLeft: Math.ceil((new Date(r.expiresAt! + "T23:59:59").getTime() - today.getTime()) / 86_400_000),
    }))
    .filter((a) => a.daysLeft <= a.row.reminderDays);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setDialogOpen(true);
  }

  function openEdit(d: DocumentRow) {
    setEditingId(d.id);
    setForm({
      kind: d.kind,
      title: d.title,
      reference: d.reference ?? "",
      issuedAt: d.issuedAt ?? "",
      expiresAt: d.expiresAt ?? "",
      reminderDays: String(d.reminderDays),
      fileUrl: d.fileUrl ?? "",
      notes: d.notes ?? "",
    });
    setDialogOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error(t("gov.common.toastFailed"));
      return;
    }
    setBusy(true);
    const payload = {
      kind: form.kind,
      title: form.title.trim(),
      reference: form.reference || null,
      issuedAt: form.issuedAt || null,
      expiresAt: form.expiresAt || null,
      reminderDays: Number(form.reminderDays) || 30,
      fileUrl: form.fileUrl || null,
      notes: form.notes || null,
    };
    try {
      const res = await fetch(editingId ? `/api/documents/${editingId}` : "/api/documents", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      const saved = await res.json();
      setRows((prev) =>
        editingId ? prev.map((r) => (r.id === editingId ? saved : r)) : [saved, ...prev]
      );
      toast.success(t(editingId ? "gov.common.toastUpdated" : "gov.common.toastCreated"));
      setDialogOpen(false);
    } catch {
      toast.error(t("gov.common.toastFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm(t("gov.documents.confirmDelete"))) return;
    try {
      const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setRows((prev) => prev.filter((r) => r.id !== id));
      toast.success(t("gov.common.toastDeleted"));
    } catch {
      toast.error(t("gov.common.toastFailed"));
    }
  }

  return (
    <div className="space-y-4">
      {alerts.filter((a) => a.daysLeft < 0).length > 0 && (
        <div role="alert" className="rounded-xl border border-$1-300 bg-$1-50 p-4 text-sm text-red-900 dark:border-red-800 dark:bg-red-950/50 dark:text-red-200">
          <p className="mb-2 flex items-center gap-1.5 font-semibold">
            <FileWarning size={14} /> {t("gov.documents.expired")}
          </p>
          <ul className="space-y-1 text-xs">
            {alerts
              .filter((a) => a.daysLeft < 0)
              .map((a) => (
                <li key={a.row.id}>
                  ⛔ {a.row.title} — {fmtDate(a.row.expiresAt)}
                </li>
              ))}
          </ul>
        </div>
      )}

      {canWrite && (
        <div className="flex justify-end">
          <Button onClick={openCreate}>
            <Plus size={14} /> {t("gov.documents.add")}
          </Button>
        </div>
      )}

      <div className="space-y-2">
        {rows.map((d) => {
          const daysLeft = d.expiresAt
            ? Math.ceil((new Date(d.expiresAt + "T23:59:59").getTime() - today.getTime()) / 86_400_000)
            : null;
          const expiringSoon =
            daysLeft !== null && daysLeft >= 0 && daysLeft <= d.reminderDays;
          const expired = daysLeft !== null && daysLeft < 0;
          return (
            <div key={d.id} className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-4">
              <div className="flex-1 min-w-[220px]">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold">{d.title}</span>
                  <Badge variant="outline">{t(`gov.docKind.${d.kind}`)}</Badge>
                  {expired ? (
                    <Badge className="gap-1 bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300">
                      <FileWarning size={12} /> {t("gov.documents.expired")}
                    </Badge>
                  ) : expiringSoon ? (
                    <Badge className="gap-1 bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                      <FileClock size={12} /> {t("gov.documents.expiresSoon")}
                    </Badge>
                  ) : d.expiresAt === null ? (
                    <Badge variant="outline" className="gap-1">
                      <FileCheck2 size={12} /> {t("gov.documents.noExpiry")}
                    </Badge>
                  ) : null}
                </div>
                <p className="mt-1 text-xs text-muted-foreground" dir="auto">
                  📅 {fmtDate(d.issuedAt)} ← {fmtDate(d.expiresAt)}
                  {d.reference ? ` · ${d.reference}` : ""}
                </p>
                {d.notes && <p className="mt-1 text-xs text-muted-foreground" dir="auto">{d.notes}</p>}
              </div>
              <div className="flex items-center gap-1.5">
                {d.fileUrl && (
                  <a href={d.fileUrl} target="_blank" rel="noreferrer" className="text-xs text-primary underline" dir="ltr">
                    📎
                  </a>
                )}
                {canWrite && (
                  <>
                    <Button size="icon-sm" variant="ghost" onClick={() => openEdit(d)} title={t("gov.common.edit")}>
                      <Pencil size={13} />
                    </Button>
                    <Button size="icon-sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => remove(d.id)} title={t("gov.common.delete")}>
                      <Trash2 size={13} />
                    </Button>
                  </>
                )}
              </div>
            </div>
          );
        })}
        {rows.length === 0 && (
          <p className="py-10 text-center text-muted-foreground">{t("gov.documents.none")}</p>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <form onSubmit={submit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>{t(editingId ? "gov.documents.edit" : "gov.documents.add")}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label>{t("gov.documents.titleField")}</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <Label>{t("gov.documents.kind")}</Label>
                <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v ?? "OTHER" })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {KINDS.map((k) => (
                      <SelectItem key={k} value={k}>
                        {t(`gov.docKind.${k}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t("gov.documents.reference")}</Label>
                <Input dir="ltr" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("gov.documents.issuedAt")}</Label>
                <Input type="date" value={form.issuedAt} onChange={(e) => setForm({ ...form, issuedAt: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("gov.documents.expiresAt")}</Label>
                <Input type="date" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("gov.documents.reminderDays")}</Label>
                <Input type="number" min={0} max={365} value={form.reminderDays} onChange={(e) => setForm({ ...form, reminderDays: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("gov.documents.fileUrl")}</Label>
                <Input dir="ltr" value={form.fileUrl} onChange={(e) => setForm({ ...form, fileUrl: e.target.value })} />
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
