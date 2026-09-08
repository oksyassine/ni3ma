"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Plus, Trash2, Pencil, FileWarning, FileCheck2, Landmark } from "lucide-react";

type Tranche = {
  label: string;
  amount: number;
  expectedAt: string | null;
  receivedAt: string | null;
  reportDueAt: string | null;
  reportedAt: string | null;
  notes: string | null;
};

type Grant = {
  id: string;
  funderName: string;
  funderKind: string;
  projectName: string;
  reference: string | null;
  amount: number;
  status: string;
  signedAt: string | null;
  startDate: string | null;
  endDate: string | null;
  contactName: string | null;
  contactPhone: string | null;
  notes: string | null;
  tranches: Tranche[];
};

const FUNDER_KINDS = ["INDH", "COMMUNE", "MINISTRY", "INTERNATIONAL", "FOUNDATION", "OTHER"] as const;
const STATUSES = ["APPLIED", "APPROVED", "ACTIVE", "COMPLETED", "CANCELLED"] as const;

const STATUS_STYLES: Record<string, string> = {
  APPLIED: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  APPROVED: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  ACTIVE: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  COMPLETED: "bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  CANCELLED: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
};

function emptyTranche(): Tranche {
  return { label: "", amount: 0, expectedAt: null, receivedAt: null, reportDueAt: null, reportedAt: null, notes: null };
}

export function GrantsClient({ initial, canWrite }: { initial: Grant[]; canWrite: boolean }) {
  const { t, locale } = useT();
  const [rows, setRows] = useState(initial);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [form, setForm] = useState({
    funderName: "",
    funderKind: "OTHER",
    projectName: "",
    reference: "",
    amount: "",
    status: "APPLIED",
    signedAt: "",
    startDate: "",
    endDate: "",
    contactName: "",
    contactPhone: "",
    notes: "",
  });
  const [formTranches, setFormTranches] = useState<Tranche[]>([]);

  const fmtDate = (d: string | null) =>
    d ? new Date(d + "T12:00:00").toLocaleDateString(locale) : "—";

  // Report alerts across all grants: overdue or due within 30 days.
  const today = new Date();
  const soonCutoff = new Date(today.getTime() + 30 * 86_400_000);
  const reportAlerts = rows.flatMap((g) =>
    g.tranches
      .filter((tr) => tr.reportDueAt && !tr.reportedAt)
      .map((tr) => {
        const due = new Date(tr.reportDueAt! + "T23:59:59");
        return {
          grant: g.funderName,
          project: g.projectName,
          due: tr.reportDueAt!,
          overdue: due < today,
          soon: due <= soonCutoff,
        };
      })
  );

  function openCreate() {
    setEditingId(null);
    setForm({ funderName: "", funderKind: "OTHER", projectName: "", reference: "", amount: "", status: "APPLIED", signedAt: "", startDate: "", endDate: "", contactName: "", contactPhone: "", notes: "" });
    setFormTranches([]);
    setDialogOpen(true);
  }

  function openEdit(g: Grant) {
    setEditingId(g.id);
    setForm({
      funderName: g.funderName,
      funderKind: g.funderKind,
      projectName: g.projectName,
      reference: g.reference ?? "",
      amount: String(g.amount),
      status: g.status,
      signedAt: g.signedAt ?? "",
      startDate: g.startDate ?? "",
      endDate: g.endDate ?? "",
      contactName: g.contactName ?? "",
      contactPhone: g.contactPhone ?? "",
      notes: g.notes ?? "",
    });
    setFormTranches(g.tranches.map((tr) => ({ ...tr })));
    setDialogOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.funderName.trim() || !form.projectName.trim() || !form.amount) {
      toast.error(t("gov.common.toastFailed"));
      return;
    }
    setBusy(true);
    const payload = {
      funderName: form.funderName.trim(),
      funderKind: form.funderKind,
      projectName: form.projectName.trim(),
      reference: form.reference || null,
      amount: Number(form.amount),
      status: form.status,
      signedAt: form.signedAt || null,
      startDate: form.startDate || null,
      endDate: form.endDate || null,
      contactName: form.contactName || null,
      contactPhone: form.contactPhone || null,
      notes: form.notes || null,
      tranches: formTranches.length > 0
        ? formTranches.map((tr) => ({
            label: tr.label || "شطر",
            amount: tr.amount,
            expectedAt: tr.expectedAt,
            receivedAt: tr.receivedAt,
            reportDueAt: tr.reportDueAt,
            reportedAt: tr.reportedAt,
          }))
        : undefined,
    };
    try {
      const res = await fetch(editingId ? `/api/grants/${editingId}` : "/api/grants", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      const saved = await res.json();
      const normalized: Grant = {
        ...saved,
        amount: Number(saved.amount),
        tranches: (saved.tranches ?? []).map((tr: Record<string, unknown>) => ({
          label: tr.label as string,
          amount: Number(tr.amount),
          expectedAt: (tr.expectedAt as string | null)?.slice(0, 10) ?? null,
          receivedAt: (tr.receivedAt as string | null)?.slice(0, 10) ?? null,
          reportDueAt: (tr.reportDueAt as string | null)?.slice(0, 10) ?? null,
          reportedAt: (tr.reportedAt as string | null)?.slice(0, 10) ?? null,
          notes: (tr.notes as string | null) ?? null,
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
    if (!confirm(t("gov.grants.confirmDelete"))) return;
    try {
      const res = await fetch(`/api/grants/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setRows((prev) => prev.filter((r) => r.id !== id));
      toast.success(t("gov.common.toastDeleted"));
    } catch {
      toast.error(t("gov.common.toastFailed"));
    }
  }

  return (
    <div className="space-y-4">
      {reportAlerts.length > 0 && (
        <div role="alert" className="rounded-xl border border-$1-300 bg-$1-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
          <p className="mb-2 flex items-center gap-1.5 font-semibold">
            <FileWarning size={14} /> {t("gov.tranches.title")}
          </p>
          <ul className="space-y-1 text-xs">
            {reportAlerts
              .filter((a) => a.overdue || a.soon)
              .map((a, i) => (
                <li key={i} className={a.overdue ? "font-bold text-red-700 dark:text-red-400" : ""}>
                  {a.overdue ? `⛔ ${t("gov.tranches.reportOverdue")}` : `⏰ ${t("gov.tranches.reportDueSoon")}`}
                  {" — "}
                  {a.grant} · {a.project} · {fmtDate(a.due)}
                </li>
              ))}
          </ul>
        </div>
      )}

      {canWrite && (
        <div className="flex justify-end">
          <Button onClick={openCreate}>
            <Plus size={14} /> {t("gov.grants.add")}
          </Button>
        </div>
      )}

      <div className="space-y-3">
        {rows.map((g) => {
          const planned = g.amount;
          const received = g.tranches.reduce((s, tr) => s + (tr.receivedAt ? tr.amount : 0), 0);
          return (
            <div key={g.id} className="rounded-xl border bg-card p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Landmark size={16} className="text-muted-foreground" />
                <span className="font-bold">{g.funderName}</span>
                <Badge variant="outline">{t(`gov.funderKind.${g.funderKind}`)}</Badge>
                <Badge className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[g.status] ?? ""}`}>
                  {t(`gov.grantStatus.${g.status}`)}
                </Badge>
                {g.reference && <span className="text-xs text-muted-foreground" dir="auto">#{g.reference}</span>}
                {canWrite && (
                  <span className="ms-auto flex gap-1.5">
                    <Button size="icon-sm" variant="ghost" onClick={() => openEdit(g)} title={t("gov.common.edit")}>
                      <Pencil size={14} />
                    </Button>
                    <Button size="icon-sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => remove(g.id)} title={t("gov.common.delete")}>
                      <Trash2 size={14} />
                    </Button>
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm font-medium">{g.projectName}</p>
              <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
                <span>
                  💰 {t("gov.grants.totalPlanned")}: <b className="text-foreground">{planned.toLocaleString(locale, { maximumFractionDigits: 2 })}</b> MAD
                </span>
                <span>
                  ✅ {t("gov.grants.totalReceived")}: <b className="text-foreground">{received.toLocaleString(locale, { maximumFractionDigits: 2 })}</b> MAD
                </span>
                {g.signedAt && <span>✍️ {fmtDate(g.signedAt)}</span>}
                {g.endDate && <span>📅 {fmtDate(g.endDate)}</span>}
                {(g.contactName || g.contactPhone) && (
                  <span dir="auto">
                    👤 {g.contactName} {g.contactPhone ? `· ${g.contactPhone}` : ""}
                  </span>
                )}
              </div>
              {g.tranches.length > 0 && (
                <div className="mt-3 overflow-x-auto rounded-lg border">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/60 text-start text-muted-foreground">
                      <tr>
                        <th className="p-2 text-start">{t("gov.tranches.label")}</th>
                        <th className="p-2 text-start">{t("gov.tranches.amount")}</th>
                        <th className="p-2 text-start">{t("gov.tranches.expectedAt")}</th>
                        <th className="p-2 text-start">{t("gov.tranches.receivedAt")}</th>
                        <th className="p-2 text-start">{t("gov.tranches.reportDueAt")}</th>
                        <th className="p-2 text-start">📄</th>
                      </tr>
                    </thead>
                    <tbody>
                      {g.tranches.map((tr, i) => {
                        const dueSoon =
                          tr.reportDueAt && !tr.reportedAt &&
                          new Date(tr.reportDueAt + "T23:59:59").getTime() - today.getTime() < 30 * 86_400_000;
                        const overdue =
                          tr.reportDueAt && !tr.reportedAt && new Date(tr.reportDueAt + "T23:59:59") < today;
                        return (
                          <tr key={i} className="border-t">
                            <td className="p-2 font-medium">{tr.label}</td>
                            <td className="p-2">{Number(tr.amount).toLocaleString(locale, { maximumFractionDigits: 2 })}</td>
                            <td className="p-2">{fmtDate(tr.expectedAt)}</td>
                            <td className="p-2">{fmtDate(tr.receivedAt)}</td>
                            <td className={`p-2 ${overdue ? "font-bold text-red-600" : dueSoon ? "text-amber-600" : ""}`}>
                              {fmtDate(tr.reportDueAt)}
                            </td>
                            <td className="p-2">
                              {tr.reportedAt ? (
                                <span className="flex items-center gap-1 text-green-700 dark:text-green-400">
                                  <FileCheck2 size={12} /> {fmtDate(tr.reportedAt)}
                                </span>
                              ) : tr.reportDueAt ? (
                                <span className="text-muted-foreground">—</span>
                              ) : (
                                "—"
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              {g.notes && <p className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground" dir="auto">{g.notes}</p>}
            </div>
          );
        })}
        {rows.length === 0 && (
          <p className="py-10 text-center text-muted-foreground">{t("gov.grants.none")}</p>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <form onSubmit={submit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>{t(editingId ? "gov.grants.edit" : "gov.grants.add")}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>{t("gov.grants.funderName")}</Label>
                <Input value={form.funderName} onChange={(e) => setForm({ ...form, funderName: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <Label>{t("gov.grants.funderKind")}</Label>
                <Select value={form.funderKind} onValueChange={(v) => setForm({ ...form, funderKind: v ?? "OTHER" })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FUNDER_KINDS.map((k) => (
                      <SelectItem key={k} value={k}>
                        {t(`gov.funderKind.${k}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>{t("gov.grants.projectName")}</Label>
                <Input value={form.projectName} onChange={(e) => setForm({ ...form, projectName: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <Label>{t("gov.grants.reference")}</Label>
                <Input dir="ltr" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("gov.grants.amount")}</Label>
                <Input type="number" min={0} step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <Label>{t("gov.grants.status")}</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v ?? "APPLIED" })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {t(`gov.grantStatus.${s}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">{t("gov.grants.signedAt")}</Label>
                  <Input type="date" value={form.signedAt} onChange={(e) => setForm({ ...form, signedAt: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{t("gov.grants.startDate")}</Label>
                  <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{t("gov.grants.endDate")}</Label>
                  <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label>{t("gov.grants.contactName")}</Label>
                  <Input value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("gov.grants.contactPhone")}</Label>
                  <Input dir="ltr" value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>{t("gov.common.notes")}</Label>
                <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>

              {editingId ? (
                <div className="space-y-3 sm:col-span-2">
                  <p className="text-sm font-bold">{t("gov.tranches.title")}</p>
                  {formTranches.map((tr, i) => (
                    <div key={i} className="grid items-end gap-2 rounded-lg border p-3 md:grid-cols-[1fr_110px_140px_140px_150px_auto]">
                      <div className="space-y-1.5">
                        <Label className="text-xs">{t("gov.tranches.label")}</Label>
                        <Input
                          value={tr.label}
                          placeholder="شطر 1"
                          onChange={(e) =>
                            setFormTranches((prev) => prev.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">{t("gov.tranches.amount")}</Label>
                        <Input
                          type="number"
                          min={0}
                          value={String(tr.amount)}
                          onChange={(e) =>
                            setFormTranches((prev) => prev.map((x, j) => (j === i ? { ...x, amount: Number(e.target.value) || 0 } : x)))
                          }
                        />
                      </div>
                      {(["expectedAt", "receivedAt", "reportDueAt"] as const).map((k) => (
                        <div key={k} className="space-y-1.5">
                          <Label className="text-xs">
                            {t(
                              k === "expectedAt"
                                ? "gov.tranches.expectedAt"
                                : k === "receivedAt"
                                  ? "gov.tranches.receivedAt"
                                  : "gov.tranches.reportDueAt"
                            )}
                          </Label>
                          <Input
                            type="date"
                            value={tr[k] ?? ""}
                            onChange={(e) =>
                              setFormTranches((prev) => prev.map((x, j) => (j === i ? { ...x, [k]: e.target.value || null } : x)))
                            }
                          />
                        </div>
                      ))}
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setFormTranches((prev) => prev.filter((_, j) => j !== i))}
                      >
                        <Trash2 size={13} />
                      </Button>
                      <div className="md:col-span-6 flex items-center gap-2">
                        <input
                          id={`reported-${i}`}
                          type="checkbox"
                          className="size-3.5 accent-[var(--primary)]"
                          checked={tr.reportedAt !== null}
                          onChange={(e) =>
                            setFormTranches((prev) =>
                              prev.map((x, j) =>
                                j === i
                                  ? { ...x, reportedAt: e.target.checked ? new Date().toISOString().slice(0, 10) : null }
                                  : x
                              )
                            )
                          }
                        />
                        <Label htmlFor={`reported-${i}`} className="text-xs font-normal cursor-pointer">
                          {t("gov.tranches.reportedAt")}
                          {tr.reportedAt ? ` (${fmtDate(tr.reportedAt)})` : ""}
                        </Label>
                      </div>
                    </div>
                  ))}
                  <Button type="button" size="sm" variant="outline" onClick={() => setFormTranches((prev) => [...prev, emptyTranche()])}>
                    <Plus size={13} /> {t("gov.tranches.add")}
                  </Button>
                </div>
              ) : null}
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
