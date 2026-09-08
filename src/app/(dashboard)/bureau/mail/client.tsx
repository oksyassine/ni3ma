"use client";

import { useMemo, useState } from "react";
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
import type { MailItem } from "@prisma/client";
import { toast } from "sonner";
import { useT } from "@/components/i18n/provider";
import { Plus, Trash2, Pencil, Inbox, Send, FileWarning, MailCheck } from "lucide-react";

type MailRow = Omit<MailItem, "mailDate" | "responseDueAt" | "respondedAt" | "createdAt"> & {
  mailDate: string;
  responseDueAt: string | null;
  respondedAt: string | null;
  createdAt: string;
};

function emptyForm() {
  return {
    direction: "INCOMING",
    reference: "",
    subject: "",
    correspondent: "",
    mailDate: new Date().toISOString().slice(0, 10),
    channel: "",
    status: "PENDING",
    responseDueAt: "",
    respondedAt: "",
    fileUrl: "",
    notes: "",
  };
}

export function MailClient({ initial, canWrite }: { initial: MailRow[]; canWrite: boolean }) {
  const { t, locale } = useT();
  const [rows, setRows] = useState(initial);
  const [filterDir, setFilterDir] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [busy, setBusy] = useState(false);

  const fmtDate = (d: string | null) =>
    d ? new Date(d + "T12:00:00").toLocaleDateString(locale) : "—";

  const now = Date.now();
  const overdueCount = rows.filter(
    (r) => r.direction === "INCOMING" && r.status === "PENDING" && r.responseDueAt &&
      new Date(r.responseDueAt + "T23:59:59").getTime() < now
  ).length;

  const filtered = useMemo(
    () => (filterDir === "all" ? rows : rows.filter((r) => r.direction === filterDir)),
    [rows, filterDir]
  );

  async function nextReference(direction: "INCOMING" | "OUTGOING") {
    // Serial numbering: و/2026/001 for incoming, ص/2026/001 for outgoing.
    const prefix = direction === "INCOMING" ? "و" : "ص";
    const year = new Date().getFullYear();
    const existing = rows.filter(
      (r) => r.direction === direction && r.reference.startsWith(`${prefix}/${year}/`)
    );
    const maxNum = existing.reduce((m, r) => {
      const n = parseInt(r.reference.split("/")[2] ?? "0", 10);
      return Number.isFinite(n) ? Math.max(m, n) : m;
    }, 0);
    return `${prefix}/${year}/${String(maxNum + 1).padStart(3, "0")}`;
  }

  async function openCreate() {
    setEditingId(null);
    const base = emptyForm();
    setForm({ ...base, reference: await nextReference("INCOMING") });
    setDialogOpen(true);
  }

  async function onDirectionChange(v: string | null) {
    if (!v) return;
    if (editingId) {
      setForm((f) => ({ ...f, direction: v }));
      return;
    }
    const reference = await nextReference(v === "OUTGOING" ? "OUTGOING" : "INCOMING");
    setForm((f) => ({ ...f, direction: v, reference }));
  }

  function openEdit(r: MailRow) {
    setEditingId(r.id);
    setForm({
      direction: r.direction,
      reference: r.reference,
      subject: r.subject,
      correspondent: r.correspondent,
      mailDate: r.mailDate,
      channel: r.channel ?? "",
      status: r.status,
      responseDueAt: r.responseDueAt ?? "",
      respondedAt: r.respondedAt ?? "",
      fileUrl: r.fileUrl ?? "",
      notes: r.notes ?? "",
    });
    setDialogOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.subject.trim() || !form.correspondent.trim() || !form.reference.trim()) {
      toast.error(t("gov.common.toastFailed"));
      return;
    }
    setBusy(true);
    const payload = {
      direction: form.direction,
      reference: form.reference.trim(),
      subject: form.subject.trim(),
      correspondent: form.correspondent.trim(),
      mailDate: form.mailDate,
      channel: form.channel || null,
      status: form.status,
      responseDueAt: form.responseDueAt || null,
      respondedAt: form.respondedAt || null,
      fileUrl: form.fileUrl || null,
      notes: form.notes || null,
    };
    try {
      const res = await fetch(editingId ? `/api/mail/${editingId}` : "/api/mail", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      const saved = await res.json();
      const normalized: MailRow = {
        ...saved,
        mailDate: String(saved.mailDate).slice(0, 10),
        responseDueAt: saved.responseDueAt ? String(saved.responseDueAt).slice(0, 10) : null,
        respondedAt: saved.respondedAt ? String(saved.respondedAt).slice(0, 10) : null,
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

  async function markProcessed(r: MailRow) {
    setBusy(true);
    try {
      const res = await fetch(`/api/mail/${r.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "PROCESSED", respondedAt: new Date().toISOString().slice(0, 10) }),
      });
      if (!res.ok) throw new Error();
      const saved = await res.json();
      setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, status: saved.status, respondedAt: saved.respondedAt ? String(saved.respondedAt).slice(0, 10) : null } : x)));
      toast.success(t("gov.common.toastUpdated"));
    } catch {
      toast.error(t("gov.common.toastFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm(t("gov.mail.confirmDelete"))) return;
    try {
      const res = await fetch(`/api/mail/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setRows((prev) => prev.filter((r) => r.id !== id));
      toast.success(t("gov.common.toastDeleted"));
    } catch {
      toast.error(t("gov.common.toastFailed"));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button size={filterDir === "all" ? "sm" : "xs"} variant={filterDir === "all" ? "default" : "outline"} onClick={() => setFilterDir("all")}>
          {t("members.all")} ({rows.length})
        </Button>
        <Button size={filterDir === "INCOMING" ? "sm" : "xs"} variant={filterDir === "INCOMING" ? "default" : "outline"} onClick={() => setFilterDir("INCOMING")}>
          <Inbox size={13} /> {t("gov.mailDirection.INCOMING")}
        </Button>
        <Button size={filterDir === "OUTGOING" ? "sm" : "xs"} variant={filterDir === "OUTGOING" ? "default" : "outline"} onClick={() => setFilterDir("OUTGOING")}>
          <Send size={13} /> {t("gov.mailDirection.OUTGOING")}
        </Button>
        {canWrite && (
          <Button className="ms-auto" onClick={openCreate}>
            <Plus size={14} /> {t("gov.mail.add")}
          </Button>
        )}
      </div>

      {overdueCount > 0 && (
        <div role="alert" className="rounded-xl border border-$1-300 bg-$1-50 p-4 text-sm text-red-900 dark:border-red-800 dark:bg-red-950/50 dark:text-red-200">
          <p className="flex items-center gap-1.5 font-semibold">
            <FileWarning size={14} /> {overdueCount} — {t("gov.mail.overdue")}
          </p>
        </div>
      )}

      <div className="space-y-2">
        {filtered.map((r) => {
          const isOverdue =
            r.direction === "INCOMING" && r.status === "PENDING" && r.responseDueAt &&
            new Date(r.responseDueAt + "T23:59:59").getTime() < now;
          return (
            <div key={r.id} className={`flex flex-wrap items-center gap-3 rounded-xl border bg-card p-4 ${isOverdue ? "border-red-300 dark:border-red-800" : ""}`}>
              <div className="flex-1 min-w-[240px]">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{t(`gov.mailDirection.${r.direction}`)}</Badge>
                  <span dir="ltr" className="text-xs font-bold text-primary">{r.reference}</span>
                  <span className="font-medium">{r.subject}</span>
                  {r.status === "PENDING" ? (
                    <Badge className="gap-1 bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                      <FileWarning size={11} /> {t("gov.mailStatus.PENDING")}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1">
                      <MailCheck size={11} /> {t(`gov.mailStatus.${r.status}`)}
                    </Badge>
                  )}
                </div>
                <p className="mt-1 text-xs text-muted-foreground" dir="auto">
                  🏛️ {r.correspondent} · 📅 {fmtDate(r.mailDate)}
                  {r.channel ? ` · ${r.channel}` : ""}
                  {r.responseDueAt ? ` · ⏳ ${fmtDate(r.responseDueAt)}` : ""}
                </p>
                {r.notes && <p className="mt-1 text-xs text-muted-foreground" dir="auto">{r.notes}</p>}
              </div>
              <div className="flex items-center gap-1.5">
                {r.fileUrl && (
                  <a href={r.fileUrl} target="_blank" rel="noreferrer" title={t("gov.mail.fileUrl")} className="px-1">📎</a>
                )}
                {canWrite && (
                  <>
                    {r.status === "PENDING" && (
                      <Button size="xs" variant="outline" disabled={busy} onClick={() => markProcessed(r)}>
                        {t("gov.mail.markProcessed")}
                      </Button>
                    )}
                    <Button size="icon-sm" variant="ghost" onClick={() => openEdit(r)} title={t("gov.common.edit")}>
                      <Pencil size={13} />
                    </Button>
                    <Button size="icon-sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => remove(r.id)} title={t("gov.common.delete")}>
                      <Trash2 size={13} />
                    </Button>
                  </>
                )}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <p className="py-10 text-center text-muted-foreground">{t("gov.mail.none")}</p>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <form onSubmit={submit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>{t(editingId ? "gov.mail.edit" : "gov.mail.add")}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>{t("gov.mail.direction")}</Label>
                <Select value={form.direction} onValueChange={onDirectionChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INCOMING">{t("gov.mailDirection.INCOMING")}</SelectItem>
                    <SelectItem value="OUTGOING">{t("gov.mailDirection.OUTGOING")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t("gov.mail.reference")}</Label>
                <Input dir="ltr" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} required />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>{t("gov.mail.subject")}</Label>
                <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <Label>{t("gov.mail.correspondent")}</Label>
                <Input value={form.correspondent} onChange={(e) => setForm({ ...form, correspondent: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <Label>{t("gov.mail.mailDate")}</Label>
                <Input type="date" value={form.mailDate} onChange={(e) => setForm({ ...form, mailDate: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <Label>{t("gov.mail.channel")}</Label>
                <Input placeholder="مُوصى عليه / إلكتروني" value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("gov.mail.status")}</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v ?? "PENDING" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(["PENDING", "PROCESSED", "ARCHIVED"] as const).map((s) => (
                      <SelectItem key={s} value={s}>{t(`gov.mailStatus.${s}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {form.status !== "PENDING" && (
                <div className="space-y-1.5">
                  <Label>{t("gov.mail.respondedAt")}</Label>
                  <Input
                    type="date"
                    value={form.respondedAt ?? ""}
                    onChange={(e) => setForm({ ...form, respondedAt: e.target.value })}
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <Label>{t("gov.mail.responseDueAt")}</Label>
                <Input type="date" value={form.responseDueAt} onChange={(e) => setForm({ ...form, responseDueAt: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("gov.mail.fileUrl")}</Label>
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
              <Button type="submit" disabled={busy}>{t("gov.common.save")}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
