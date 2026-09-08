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
import { toast } from "sonner";
import { useT } from "@/components/i18n/provider";
import { Plus, Trash2, RefreshCw, Printer, Lock, CheckCircle2, Box } from "lucide-react";
import Link from "next/link";

type Register = {
  id: string;
  yearLabel: string;
  snapshotAt: string;
  totalValue: number;
  notes: string | null;
  closedAt: string | null;
  closedBy: string | null;
  closedByUser: { id: string; fullName: string } | null;
  createdAt: string;
};

type Asset = {
  id: string;
  name: string;
  category: string | null;
  quantity: number;
  value: number | null;
  location: string | null;
  condition: string;
  acquiredAt: string | null;
};

export function InvRegisterClient({
  initial,
  assets,
  canWrite,
}: {
  initial: Register[];
  assets: Asset[];
  canWrite: boolean;
}) {
  const { t, locale } = useT();
  const [rows, setRows] = useState(initial);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [busy, setBusy] = useState(false);
  const [confirmRegenId, setConfirmRegenId] = useState<string | null>(null);

  const fmtDate = (d: string) => new Date(d + "T12:00:00").toLocaleDateString(locale);
  const fmtMoney = (n: number) => n.toLocaleString(locale, { maximumFractionDigits: 2 });

  const assetsCount = assets.length;
  const assetsValue = assets.reduce((s, a) => s + (a.value ?? 0) * a.quantity, 0);

  async function createRegister(ev: React.FormEvent) {
    ev.preventDefault();
    if (!year.trim()) {
      toast.error(t("gov.common.toastFailed"));
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/inventory-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ yearLabel: year.trim() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (res.status === 409) {
          toast.error(t("gov.invRegister.alreadyExists"));
        } else {
          throw new Error(err.error ?? "failed");
        }
      } else {
        const saved = await res.json();
        const normalized: Register = {
          ...saved,
          totalValue: Number(saved.totalValue),
          snapshotAt: String(saved.snapshotAt).slice(0, 10),
          closedAt: null,
          closedBy: null,
          closedByUser: null,
          createdAt: String(saved.createdAt),
        };
        setRows((prev) => [normalized, ...prev]);
        toast.success(t("gov.common.toastCreated"));
        setDialogOpen(false);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("gov.common.toastFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function regenerate(id: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/inventory-register/${id}`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (err.error === "closed") toast.error(t("gov.invRegister.closed"));
        else throw new Error(err.error ?? "failed");
        return;
      }
      const saved = await res.json();
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, totalValue: Number(saved.totalValue), snapshotAt: String(saved.snapshotAt).slice(0, 10) } : r)));
      toast.success(t("gov.common.toastUpdated"));
      setConfirmRegenId(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("gov.common.toastFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function close(id: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/inventory-register/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ close: true }),
      });
      if (!res.ok) throw new Error();
      const saved = await res.json();
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, closedAt: String(saved.closedAt) } : r)));
      toast.success(t("gov.common.toastUpdated"));
    } catch {
      toast.error(t("gov.common.toastFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm(t("common.delete"))) return;
    try {
      const res = await fetch(`/api/inventory-register/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setRows((prev) => prev.filter((r) => r.id !== id));
      toast.success(t("gov.common.toastDeleted"));
    } catch {
      toast.error(t("gov.common.toastFailed"));
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">📦 {t("gov.assets.title")} {t("gov.invRegister.assetsCount")}</p>
          <p className="mt-1 text-2xl font-bold">{assetsCount}</p>
          <p className="mt-1 text-xs text-muted-foreground">💰 {t("gov.invRegister.totalValue")}: {fmtMoney(assetsValue)} MAD</p>
        </div>
        {canWrite && (
          <div className="flex flex-col items-stretch justify-center gap-2 rounded-xl border bg-card p-4">
            <Button onClick={() => setDialogOpen(true)}>
              <Plus size={14} /> {t("gov.invRegister.create")}
            </Button>
            <p className="text-xs text-muted-foreground">{t("gov.invRegister.subtitle")}</p>
          </div>
        )}
      </div>

      <div className="space-y-2">
        {rows.map((r) => {
          const isClosed = !!r.closedAt;
          const pct = assetsValue > 0 ? Math.min(999, Math.round((r.totalValue / assetsValue) * 100)) : 0;
          return (
            <div key={r.id} className={`rounded-xl border bg-card p-4 ${isClosed ? "ring-1 ring-emerald-200" : ""}`}>
              <div className="flex flex-wrap items-center gap-2">
                <Box size={16} className="text-muted-foreground" />
                <span className="font-bold">{r.yearLabel}</span>
                {isClosed ? (
                  <Badge className="gap-1 bg-emerald-100 text-emerald-800">
                    <Lock size={11} /> {t("gov.invRegister.closed")}
                  </Badge>
                ) : (
                  <Badge variant="outline">draft</Badge>
                )}
                <span className="ms-auto flex gap-1.5">
                  <Link href={`/bureau/inv-register/${r.id}/print`} target="_blank">
                    <Button size="xs" variant="outline" disabled={assetsCount === 0}>
                      <Printer size={12} /> {t("gov.invRegister.print")}
                    </Button>
                  </Link>
                  {!isClosed && canWrite && (
                    <>
                      <Button size="xs" variant="outline" disabled={busy} onClick={() => setConfirmRegenId(r.id)}>
                        <RefreshCw size={12} /> {t("gov.invRegister.regenerate")}
                      </Button>
                      <Button size="xs" variant="outline" disabled={busy} onClick={() => close(r.id)}>
                        <CheckCircle2 size={12} /> {t("gov.invRegister.close")}
                      </Button>
                    </>
                  )}
                  {canWrite && (
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => remove(r.id)}
                      title={t("common.delete")}
                    >
                      <Trash2 size={13} />
                    </Button>
                  )}
                </span>
              </div>
              <p className="mt-1 text-sm">
                💰 {t("gov.invRegister.totalValue")}: <b>{fmtMoney(r.totalValue)} MAD</b>{" "}
                <span className="text-xs text-muted-foreground">({pct}% {t("gov.invRegister.totalValue")})</span>
              </p>
              <p className="text-xs text-muted-foreground" dir="auto">
                📅 {fmtDate(r.snapshotAt)}
                {r.closedAt ? ` · ${t("gov.invRegister.closedAt")} ${fmtDate(r.closedAt)}` : ""}
                {r.closedByUser ? ` · ${r.closedByUser.fullName}` : ""}
              </p>
              {r.notes && <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground" dir="auto">{r.notes}</p>}

              {confirmRegenId === r.id && (
                <div className="mt-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
                  ⚠️ {t("gov.invRegister.regenerate")} — will replace snapshot with current assets.
                  <div className="mt-2 flex gap-2">
                    <Button size="xs" variant="destructive" disabled={busy} onClick={() => regenerate(r.id)}>
                      {t("gov.invRegister.regenerate")}
                    </Button>
                    <Button size="xs" variant="outline" onClick={() => setConfirmRegenId(null)}>
                      {t("gov.common.cancel")}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {rows.length === 0 && (
          <p className="py-10 text-center text-muted-foreground">{t("gov.invRegister.none")}</p>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <form onSubmit={createRegister} className="space-y-4">
            <DialogHeader>
              <DialogTitle>{t("gov.invRegister.create")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-1.5">
              <Label>{t("gov.invRegister.year")}</Label>
              <Input value={year} onChange={(e) => setYear(e.target.value)} required />
              <p className="text-xs text-muted-foreground">💡 {t("gov.invRegister.alreadyExists")}</p>
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
