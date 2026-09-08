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
import { toast } from "sonner";
import { useT } from "@/components/i18n/provider";
import { Plus, Trash2, Pencil, HandHeart, Printer, ChevronDown, ChevronUp } from "lucide-react";
import type { BeneficiaryReceipt } from "@prisma/client";

type Receipt = Omit<BeneficiaryReceipt, "estimatedValue" | "handedAt" | "createdAt"> & {
  estimatedValue: number | null;
  handedAt: string;
  createdAt: string;
  socialCase: { id: string; fullName: string; caseNumber: number } | null;
  campaign: { id: string; name: string } | null;
};

function emptyForm() {
  return {
    socialCaseId: "",
    beneficiaryName: "",
    recipientCin: "",
    description: "",
    campaignId: "",
    estimatedValue: "",
    handedAt: new Date().toISOString().slice(0, 10),
    notes: "",
  };
}

export function BeneReceiptsClient({
  initial,
  cases,
  campaigns,
  canWrite,
}: {
  initial: Receipt[];
  cases: { id: string; fullName: string; caseNumber: number }[];
  campaigns: { id: string; name: string }[];
  canWrite: boolean;
}) {
  const { t, locale } = useT();
  const [rows, setRows] = useState(initial);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const fmtDate = (d: string) => new Date(d + "T12:00:00").toLocaleDateString(locale);
  const fmtMoney = (n: number) => n.toLocaleString(locale, { maximumFractionDigits: 2 });

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setDialogOpen(true);
  }

  function openEdit(r: Receipt) {
    setEditingId(r.id);
    setForm({
      socialCaseId: r.socialCaseId ?? "",
      beneficiaryName: r.beneficiaryName,
      recipientCin: r.recipientCin ?? "",
      description: r.description,
      campaignId: r.campaignId ?? "",
      estimatedValue: r.estimatedValue === null ? "" : String(r.estimatedValue),
      handedAt: r.handedAt,
      notes: r.notes ?? "",
    });
    setDialogOpen(true);
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!form.beneficiaryName.trim() || !form.description.trim()) {
      toast.error(t("gov.common.toastFailed"));
      return;
    }
    setBusy(true);
    const payload = {
      socialCaseId: form.socialCaseId || null,
      beneficiaryName: form.beneficiaryName.trim(),
      recipientCin: form.recipientCin || null,
      description: form.description.trim(),
      campaignId: form.campaignId || null,
      estimatedValue: form.estimatedValue === "" ? null : Number(form.estimatedValue),
      handedAt: form.handedAt,
      notes: form.notes || null,
    };
    try {
      const res = await fetch(editingId ? `/api/beneficiary-receipts/${editingId}` : "/api/beneficiary-receipts", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      const saved = await res.json();
      const normalized: Receipt = {
        ...saved,
        estimatedValue: saved.estimatedValue === null ? null : Number(saved.estimatedValue),
        handedAt: String(saved.handedAt).slice(0, 10),
        createdAt: String(saved.createdAt),
        socialCase: rows.find((r) => r.id === saved.id)?.socialCase ?? null,
        campaign: rows.find((r) => r.id === saved.id)?.campaign ?? null,
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
    if (!confirm(t("gov.beneReceipt.confirmDelete"))) return;
    try {
      const res = await fetch(`/api/beneficiary-receipts/${id}`, { method: "DELETE" });
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
            <Plus size={14} /> {t("gov.beneReceipt.add")}
          </Button>
        </div>
      )}

      <div className="space-y-2">
        {rows.map((r) => {
          const isExpanded = expanded === r.id;
          return (
            <div key={r.id} className="rounded-xl border bg-card p-4">
              <div className="flex flex-wrap items-center gap-2">
                <HandHeart size={16} className="text-muted-foreground" />
                <span className="font-bold">{r.beneficiaryName}</span>
                {r.receiptNumber && (
                  <Badge variant="outline" dir="ltr" className="text-[10px]">
                    {r.receiptNumber}
                  </Badge>
                )}
                {r.campaign && <Badge variant="secondary" className="text-[10px]">{r.campaign.name}</Badge>}
                <span className="ms-auto flex gap-1.5">
                  <Link href={`/bureau/paperwork/beneficiary-receipt?id=${r.id}`} target="_blank">
                    <Button size="xs" variant="outline">
                      <Printer size={12} /> {t("gov.receipt.allocate")}
                    </Button>
                  </Link>
                  <Button size="icon-sm" variant="ghost" onClick={() => setExpanded(isExpanded ? null : r.id)}>
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </Button>
                  {canWrite && (
                    <>
                      <Button size="icon-sm" variant="ghost" onClick={() => openEdit(r)} title={t("gov.common.edit")}>
                        <Pencil size={13} />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => remove(r.id)}
                        title={t("common.delete")}
                      >
                        <Trash2 size={13} />
                      </Button>
                    </>
                  )}
                </span>
              </div>
              <p className="mt-1 text-sm" dir="auto">
                {r.description.length > 140 && !isExpanded ? r.description.slice(0, 140) + "…" : r.description}
              </p>
              <p className="mt-1 text-xs text-muted-foreground" dir="auto">
                📅 {fmtDate(r.handedAt)}
                {r.estimatedValue !== null && ` · 💰 ${fmtMoney(r.estimatedValue)} MAD`}
                {r.socialCase && ` · #${r.socialCase.caseNumber} ${r.socialCase.fullName}`}
              </p>
              {isExpanded && r.notes && (
                <p className="mt-2 whitespace-pre-wrap rounded-md bg-muted/50 p-2 text-xs text-muted-foreground" dir="auto">
                  {r.notes}
                </p>
              )}
            </div>
          );
        })}
        {rows.length === 0 && (
          <p className="py-10 text-center text-muted-foreground">{t("gov.beneReceipt.none")}</p>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <form onSubmit={submit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>{t(editingId ? "gov.beneReceipt.add" : "gov.beneReceipt.add")}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label>{t("gov.beneReceipt.beneficiaryName")} *</Label>
                <Input value={form.beneficiaryName} onChange={(e) => setForm({ ...form, beneficiaryName: e.target.value })} required />
              </div>
              {cases.length > 0 && (
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs">{t("gov.beneReceipt.linkedCase")}</Label>
                  <Select value={form.socialCaseId} onValueChange={(v) => setForm({ ...form, socialCaseId: v ?? "" })}>
                    <SelectTrigger>
                      <SelectValue placeholder="—" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">—</SelectItem>
                      {cases.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          #{c.caseNumber} {c.fullName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-1.5">
                <Label className="text-xs">CIN</Label>
                <Input dir="ltr" value={form.recipientCin} onChange={(e) => setForm({ ...form, recipientCin: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("gov.beneReceipt.handedAt")}</Label>
                <Input type="date" value={form.handedAt} onChange={(e) => setForm({ ...form, handedAt: e.target.value })} required />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>{t("gov.beneReceipt.description")} *</Label>
                <textarea
                  rows={2}
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{t("gov.beneReceipt.estimatedValue")}</Label>
                <Input type="number" min={0} step="0.01" value={form.estimatedValue} onChange={(e) => setForm({ ...form, estimatedValue: e.target.value })} dir="ltr" className="text-right" />
              </div>
              {campaigns.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-xs">{t("gov.distributions.title")}</Label>
                  <Select value={form.campaignId} onValueChange={(v) => setForm({ ...form, campaignId: v ?? "" })}>
                    <SelectTrigger>
                      <SelectValue placeholder="—" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">—</SelectItem>
                      {campaigns.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
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
