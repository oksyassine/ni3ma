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
import type { Branch } from "@prisma/client";
import { toast } from "sonner";
import { useT } from "@/components/i18n/provider";
import { Plus, Trash2, Pencil, Network, MapPin, Phone, User } from "lucide-react";

type BranchRow = Omit<Branch, "openedAt" | "createdAt"> & {
  openedAt: string | null;
  createdAt: string;
};

function emptyForm() {
  return { name: "", city: "", address: "", phone: "", email: "", responsibleName: "", openedAt: "" };
}

export function BranchesClient({ initial, canWrite }: { initial: BranchRow[]; canWrite: boolean }) {
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

  function openEdit(b: BranchRow) {
    setEditingId(b.id);
    setForm({
      name: b.name,
      city: b.city ?? "",
      address: b.address ?? "",
      phone: b.phone ?? "",
      email: b.email ?? "",
      responsibleName: b.responsibleName ?? "",
      openedAt: b.openedAt ?? "",
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
      city: form.city || null,
      address: form.address || null,
      phone: form.phone || null,
      email: form.email || null,
      responsibleName: form.responsibleName || null,
      openedAt: form.openedAt || null,
      isActive: editingId ? (rows.find((r) => r.id === editingId)?.isActive ?? true) : true,
    };
    try {
      const res = await fetch(editingId ? `/api/branches/${editingId}` : "/api/branches", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      const saved = await res.json();
      setRows((prev) => (editingId ? prev.map((r) => (r.id === editingId ? saved : r)) : [saved, ...prev]));
      toast.success(t(editingId ? "gov.common.toastUpdated" : "gov.common.toastCreated"));
      setDialogOpen(false);
    } catch {
      toast.error(t("gov.common.toastFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(b: BranchRow) {
    setBusy(true);
    try {
      const res = await fetch(`/api/branches/${b.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !b.isActive }),
      });
      if (!res.ok) throw new Error();
      setRows((prev) => prev.map((r) => (r.id === b.id ? { ...r, isActive: !b.isActive } : r)));
      toast.success(t("gov.common.toastUpdated"));
    } catch {
      toast.error(t("gov.common.toastFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm(t("gov.branches.confirmDelete"))) return;
    try {
      const res = await fetch(`/api/branches/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setRows((prev) => prev.filter((r) => r.id !== id));
      toast.success(t("gov.common.toastDeleted"));
    } catch {
      toast.error(t("gov.common.toastFailed"));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-4">
        <Network size={18} className="text-muted-foreground" />
        <span className="text-sm">
          {t("gov.branches.active")}: <b>{rows.filter((r) => r.isActive).length}</b> / {rows.length}
        </span>
        {canWrite && (
          <Button size="sm" className="ms-auto" onClick={openCreate}>
            <Plus size={14} /> {t("gov.branches.add")}
          </Button>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {rows.map((b) => (
          <div key={b.id} className={`rounded-xl border bg-card p-4 ${!b.isActive ? "opacity-60" : ""}`}>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{b.isActive ? t("gov.branches.active") : t("gov.branches.closed")}</Badge>
              <span className="font-bold">{b.name}</span>
              <span className="ms-auto flex gap-1.5">
                {canWrite && (
                  <>
                    <Button size="xs" variant="outline" disabled={busy} onClick={() => toggleActive(b)}>
                      {b.isActive ? t("gov.branches.closed") : t("gov.branches.active")}
                    </Button>
                    <Button size="icon-sm" variant="ghost" onClick={() => openEdit(b)} title={t("gov.common.edit")}>
                      <Pencil size={13} />
                    </Button>
                    <Button size="icon-sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => remove(b.id)} title={t("gov.common.delete")}>
                      <Trash2 size={13} />
                    </Button>
                  </>
                )}
              </span>
            </div>
            <div className="mt-2 space-y-1 text-xs text-muted-foreground" dir="auto">
              {b.city && <p><MapPin size={11} className="inline" /> {b.city}{b.address ? ` · ${b.address}` : ""}</p>}
              {b.phone && <p dir="ltr"><Phone size={11} className="inline" /> {b.phone}</p>}
              {b.email && <p dir="ltr">✉️ {b.email}</p>}
              {b.responsibleName && <p><User size={11} className="inline" /> {b.responsibleName}</p>}
              <p>📅 {fmtDate(b.openedAt)}</p>
            </div>
            {b.notes && <p className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground" dir="auto">{b.notes}</p>}
          </div>
        ))}
      </div>
      {rows.length === 0 && (
        <p className="py-10 text-center text-muted-foreground">{t("gov.branches.none")}</p>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <form onSubmit={submit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>{t(editingId ? "gov.branches.edit" : "gov.branches.add")}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label>{t("gov.branches.name")}</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <Label>{t("gov.branches.city")}</Label>
                <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("gov.branches.phone")}</Label>
                <Input dir="ltr" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>{t("gov.branches.address")} 📍</Label>
                <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>✉️ Email</Label>
                <Input dir="ltr" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("gov.branches.responsibleName")}</Label>
                <Input value={form.responsibleName} onChange={(e) => setForm({ ...form, responsibleName: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("gov.branches.openedAt")}</Label>
                <Input type="date" value={form.openedAt} onChange={(e) => setForm({ ...form, openedAt: e.target.value })} />
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
