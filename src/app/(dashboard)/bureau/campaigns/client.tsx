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
import { Plus, Trash2, Pencil, Heart, Globe, ExternalLink, ChevronUp, ChevronDown } from "lucide-react";

type CampaignRow = {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  targetAmount: number | null;
  raised: number;
  donationsCount: number;
  startDate: string | null;
  endDate: string | null;
  isPublic: boolean;
  isClosed: boolean;
  coverImageUrl: string | null;
  projectId: string | null;
  project: { id: string; name: string } | null;
  createdAt: string;
};

function emptyForm() {
  return {
    name: "",
    slug: "",
    description: "",
    targetAmount: "",
    startDate: "",
    endDate: "",
    isPublic: false,
    isClosed: false,
    projectId: "",
  };
}

export function CampaignsClient({
  initial,
  projects,
  canWrite,
}: {
  initial: CampaignRow[];
  projects: { id: string; name: string }[];
  canWrite: boolean;
}) {
  const { t, locale } = useT();
  const [rows, setRows] = useState(initial);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const fmtDate = (d: string | null) => (d ? new Date(d + "T12:00:00").toLocaleDateString(locale) : "—");
  const fmtMoney = (n: number) => n.toLocaleString(locale, { maximumFractionDigits: 2 });

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setDialogOpen(true);
  }

  function openEdit(c: CampaignRow) {
    setEditingId(c.id);
    setForm({
      name: c.name,
      slug: c.slug ?? "",
      description: c.description ?? "",
      targetAmount: c.targetAmount === null ? "" : String(c.targetAmount),
      startDate: c.startDate ?? "",
      endDate: c.endDate ?? "",
      isPublic: c.isPublic,
      isClosed: c.isClosed,
      projectId: c.projectId ?? "",
    });
    setDialogOpen(true);
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!form.name.trim()) {
      toast.error(t("gov.common.toastFailed"));
      return;
    }
    setBusy(true);
    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim() || null,
      description: form.description || null,
      targetAmount: form.targetAmount === "" ? null : Number(form.targetAmount),
      startDate: form.startDate || null,
      endDate: form.endDate || null,
      isPublic: form.isPublic,
      isClosed: form.isClosed,
      projectId: form.projectId || null,
    };
    try {
      const res = await fetch(editingId ? `/api/donation-campaigns/${editingId}` : "/api/donation-campaigns", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "failed");
      }
      const saved = await res.json();
      const normalized: CampaignRow = {
        ...saved,
        targetAmount: saved.targetAmount === null ? null : Number(saved.targetAmount),
        raised: rows.find((r) => r.id === saved.id)?.raised ?? 0,
        donationsCount: rows.find((r) => r.id === saved.id)?.donationsCount ?? 0,
        startDate: saved.startDate ? String(saved.startDate).slice(0, 10) : null,
        endDate: saved.endDate ? String(saved.endDate).slice(0, 10) : null,
        createdAt: String(saved.createdAt),
        project: saved.projectId ? { id: saved.projectId, name: rows.find((r) => r.id === saved.id)?.project?.name ?? "" } : null,
      };
      setRows((prev) =>
        editingId ? prev.map((r) => (r.id === editingId ? normalized : r)) : [normalized, ...prev]
      );
      toast.success(t(editingId ? "gov.common.toastUpdated" : "gov.common.toastCreated"));
      setDialogOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("gov.common.toastFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm(t("gov.campaigns.confirmDelete"))) return;
    try {
      const res = await fetch(`/api/donation-campaigns/${id}`, { method: "DELETE" });
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
            <Plus size={14} /> {t("gov.campaigns.add")}
          </Button>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {rows.map((c) => {
          const pct = c.targetAmount && c.targetAmount > 0 ? Math.min(100, Math.round((c.raised / c.targetAmount) * 100)) : null;
          const isExpanded = expanded === c.id;
          return (
            <div key={c.id} className="rounded-xl border bg-card p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Heart size={16} className="text-muted-foreground" />
                <span className="font-bold">{c.name}</span>
                {c.isPublic && (
                  <Badge variant="outline" className="gap-1">
                    <Globe size={11} /> public
                  </Badge>
                )}
                {c.isClosed ? (
                  <Badge variant="destructive">closed</Badge>
                ) : (
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300">active</Badge>
                )}
                {c.project && (
                  <Badge variant="secondary" className="text-[10px]">
                    {c.project.name}
                  </Badge>
                )}
                <span className="ms-auto flex gap-1.5">
                  {c.slug && c.isPublic && (
                    <a
                      href={`/p/${c.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-6 items-center gap-1 rounded px-1.5 text-xs text-primary hover:bg-muted"
                      title={t("gov.campaigns.publicLink")}
                    >
                      <ExternalLink size={11} />
                    </a>
                  )}
                  <Button size="icon-sm" variant="ghost" onClick={() => setExpanded(isExpanded ? null : c.id)}>
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </Button>
                  {canWrite && (
                    <>
                      <Button size="icon-sm" variant="ghost" onClick={() => openEdit(c)} title={t("gov.common.edit")}>
                        <Pencil size={13} />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => remove(c.id)}
                        title={t("common.delete")}
                      >
                        <Trash2 size={13} />
                      </Button>
                    </>
                  )}
                </span>
              </div>
              {c.description && <p className="mt-1 text-sm text-muted-foreground" dir="auto">{c.description}</p>}

              <div className="mt-3">
                <div className="mb-1 flex justify-between text-xs">
                  <span className="text-muted-foreground">
                    💰 {c.targetAmount ? fmtMoney(c.raised) + " / " + fmtMoney(c.targetAmount) : fmtMoney(c.raised) + " MAD"}
                  </span>
                  <span className="font-medium">
                    {c.targetAmount
                      ? t("gov.campaigns.progress", {
                          raised: fmtMoney(c.raised),
                          target: fmtMoney(c.targetAmount),
                        })
                      : t("gov.campaigns.unlimited")}
                  </span>
                </div>
                {pct !== null && (
                  <div className="h-1.5 w-full rounded-full bg-muted">
                    <div
                      className={`h-1.5 rounded-full ${pct >= 100 ? "bg-green-500" : "bg-primary"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                )}
              </div>

              <p className="mt-2 text-xs text-muted-foreground" dir="auto">
                📅 {fmtDate(c.startDate)} ← {fmtDate(c.endDate)} · 👥 {c.donationsCount} {t("gov.campaigns.donationsCount")}
              </p>

              {isExpanded && c.isPublic && c.slug && (
                <p className="mt-2 text-xs">
                  <span className="text-muted-foreground">{t("gov.campaigns.publicLink")}:</span>{" "}
                  <code dir="ltr" className="rounded bg-muted px-1.5 py-0.5">/p/{c.slug}</code>
                </p>
              )}
            </div>
          );
        })}
        {rows.length === 0 && (
          <p className="py-10 text-center text-muted-foreground md:col-span-2">{t("gov.campaigns.none")}</p>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <form onSubmit={submit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>{t(editingId ? "gov.campaigns.edit" : "gov.campaigns.add")}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label>{t("gov.campaigns.name")} *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <Label>{t("gov.campaigns.slug")}</Label>
                <Input dir="ltr" placeholder="ramadan-2026" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value.replace(/[^a-z0-9-]/g, "").toLowerCase() })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("gov.campaigns.targetAmount")}</Label>
                <Input type="number" min={0} step="0.01" value={form.targetAmount} onChange={(e) => setForm({ ...form, targetAmount: e.target.value })} dir="ltr" className="text-right" />
              </div>
              <div className="grid grid-cols-2 gap-2 sm:col-span-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">📅 {t("gov.campaigns.startDate")}</Label>
                  <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">→ {t("gov.campaigns.endDate")}</Label>
                  <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>{t("gov.campaigns.description")}</Label>
                <TextareaStyled value={form.description} onChange={(v) => setForm({ ...form, description: v })} />
              </div>
              {projects.length > 0 && (
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>{t("gov.campaigns.linkedProject")}</Label>
                  <Select value={form.projectId} onValueChange={(v) => setForm({ ...form, projectId: v ?? "" })}>
                    <SelectTrigger>
                      <SelectValue placeholder="—" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">—</SelectItem>
                      {projects.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="flex items-center gap-2 sm:col-span-2">
                <input
                  id="campaign-public"
                  type="checkbox"
                  className="size-3.5 accent-[var(--primary)]"
                  checked={form.isPublic}
                  onChange={(e) => setForm({ ...form, isPublic: e.target.checked })}
                />
                <Label htmlFor="campaign-public" className="cursor-pointer font-normal">
                  {t("gov.campaigns.isPublic")}
                </Label>
                <input
                  id="campaign-closed"
                  type="checkbox"
                  className="ms-4 size-3.5 accent-[var(--primary)]"
                  checked={form.isClosed}
                  onChange={(e) => setForm({ ...form, isClosed: e.target.checked })}
                />
                <Label htmlFor="campaign-closed" className="cursor-pointer font-normal">
                  {t("gov.campaigns.isClosed")}
                </Label>
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

function TextareaStyled({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <textarea
      rows={3}
      className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
