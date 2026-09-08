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
import { Plus, Trash2, Pencil, Boxes } from "lucide-react";

type Asset = {
  id: string;
  name: string;
  category: string | null;
  quantity: number;
  value: number | null;
  serialNumber: string | null;
  location: string | null;
  condition: string;
  acquiredAt: string | null;
  source: string | null;
  notes: string | null;
};

const CONDITIONS = ["GOOD", "NEEDS_REPAIR", "OUT_OF_SERVICE"] as const;

const CONDITION_STYLES: Record<string, string> = {
  GOOD: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  NEEDS_REPAIR: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  OUT_OF_SERVICE: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
};

function emptyForm() {
  return {
    name: "",
    category: "",
    quantity: "1",
    value: "",
    serialNumber: "",
    location: "",
    condition: "GOOD",
    acquiredAt: "",
    source: "",
    notes: "",
  };
}

export function AssetsClient({ initial, canWrite }: { initial: Asset[]; canWrite: boolean }) {
  const { t, locale } = useT();
  const [rows, setRows] = useState(initial);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [busy, setBusy] = useState(false);

  const fmtDate = (d: string | null) =>
    d ? new Date(d + "T12:00:00").toLocaleDateString(locale) : "—";

  const totalValue = rows.reduce((s, a) => s + (a.value ?? 0) * a.quantity, 0);
  const fmtMoney = (n: number) => n.toLocaleString(locale);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setDialogOpen(true);
  }

  function openEdit(a: Asset) {
    setEditingId(a.id);
    setForm({
      name: a.name,
      category: a.category ?? "",
      quantity: String(a.quantity),
      value: a.value === null ? "" : String(a.value),
      serialNumber: a.serialNumber ?? "",
      location: a.location ?? "",
      condition: a.condition,
      acquiredAt: a.acquiredAt ?? "",
      source: a.source ?? "",
      notes: a.notes ?? "",
    });
    setDialogOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error(t("gov.common.toastFailed"));
      return;
    }
    setBusy(true);
    const payload = {
      name: form.name.trim(),
      category: form.category || null,
      quantity: Number(form.quantity) || 1,
      value: form.value === "" ? null : Number(form.value),
      serialNumber: form.serialNumber || null,
      location: form.location || null,
      condition: form.condition,
      acquiredAt: form.acquiredAt || null,
      source: form.source || null,
      notes: form.notes || null,
    };
    try {
      const res = await fetch(editingId ? `/api/assets/${editingId}` : "/api/assets", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      const saved = await res.json();
      const normalized: Asset = {
        ...saved,
        value: saved.value === null ? null : Number(saved.value),
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
    if (!confirm(t("gov.assets.confirmDelete"))) return;
    try {
      const res = await fetch(`/api/assets/${id}`, { method: "DELETE" });
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
        <Boxes size={20} className="text-muted-foreground" />
        <span className="text-sm">
          {t("gov.assets.itemsCount")}: <b>{rows.reduce((s, a) => s + a.quantity, 0)}</b>
        </span>
        <span className="text-sm">
          {t("gov.assets.totalValue")}:{" "}
          <b>{fmtMoney(totalValue)} MAD</b>
        </span>
        {canWrite && (
          <Button size="sm" className="ms-auto" onClick={openCreate}>
            <Plus size={14} /> {t("gov.assets.add")}
          </Button>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-xs text-muted-foreground">
            <tr>
              <th className="p-3 text-start">{t("gov.assets.name")}</th>
              <th className="p-3 text-start">{t("gov.assets.category")}</th>
              <th className="p-3 text-start">{t("gov.assets.quantity")}</th>
              <th className="p-3 text-start">{t("gov.assets.value")}</th>
              <th className="p-3 text-start">{t("gov.assets.location")}</th>
              <th className="p-3 text-start">{t("gov.assets.acquiredAt")}</th>
              <th className="p-3 text-start">{t("gov.assets.condition")}</th>
              {canWrite && <th className="p-3"></th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.id} className="border-t">
                <td className="p-3 font-medium" dir="auto">
                  {a.name}
                  {a.serialNumber && <div className="text-[10px] text-muted-foreground" dir="ltr">{a.serialNumber}</div>}
                </td>
                <td className="p-3" dir="auto">{a.category ?? "—"}</td>
                <td className="p-3">{a.quantity}</td>
                <td className="p-3">{a.value === null ? "—" : `${fmtMoney(a.value * a.quantity)}`}</td>
                <td className="p-3" dir="auto">{a.location ?? "—"}</td>
                <td className="p-3 text-xs">{fmtDate(a.acquiredAt)}</td>
                <td className="p-3">
                  <Badge className={`rounded-full px-2 py-0.5 text-xs font-semibold ${CONDITION_STYLES[a.condition] ?? ""}`}>
                    {t(`gov.assetCondition.${a.condition}`)}
                  </Badge>
                  {a.source && <div className="mt-0.5 text-[10px] text-muted-foreground" dir="auto">{a.source}</div>}
                </td>
                {canWrite && (
                  <td className="p-3">
                    <div className="flex gap-1.5">
                      <Button size="icon-sm" variant="ghost" onClick={() => openEdit(a)} title={t("gov.common.edit")}>
                        <Pencil size={13} />
                      </Button>
                      <Button size="icon-sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => remove(a.id)} title={t("gov.common.delete")}>
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={canWrite ? 8 : 7} className="py-10 text-center text-muted-foreground">
                  {t("gov.assets.none")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <form onSubmit={submit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>{t(editingId ? "gov.common.edit" : "gov.assets.add")}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label>{t("gov.assets.name")}</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <Label>{t("gov.assets.category")}</Label>
                <Input placeholder="أثاث / عتاد / وسائل بيداغوجية" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("gov.assets.serial")}</Label>
                <Input dir="ltr" value={form.serialNumber} onChange={(e) => setForm({ ...form, serialNumber: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("gov.assets.quantity")}</Label>
                <Input type="number" min={1} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("gov.assets.value")}</Label>
                <Input type="number" min={0} step="0.01" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("gov.assets.location")}</Label>
                <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("gov.assets.condition")}</Label>
                <Select value={form.condition} onValueChange={(v) => setForm({ ...form, condition: v ?? "GOOD" })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONDITIONS.map((c) => (
                      <SelectItem key={c} value={c}>
                        {t(`gov.assetCondition.${c}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t("gov.assets.acquiredAt")}</Label>
                <Input type="date" value={form.acquiredAt} onChange={(e) => setForm({ ...form, acquiredAt: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("gov.assets.source")}</Label>
                <Input placeholder="شراء / تبرع / منحة" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} />
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
