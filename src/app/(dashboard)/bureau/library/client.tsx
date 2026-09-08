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
import type { BorrowingStatus, LibraryBook } from "@prisma/client";
import { toast } from "sonner";
import { useT } from "@/components/i18n/provider";
import { Plus, Trash2, Pencil, BookOpen, ChevronDown, ChevronUp, BookMarked, AlertTriangle } from "lucide-react";

type Borrowing = {
  id: string;
  bookId: string;
  borrowerName: string;
  memberId: string | null;
  borrowedAt: string;
  dueAt: string;
  returnedAt: string | null;
  status: BorrowingStatus;
};

type BookRow = Omit<LibraryBook, "acquiredAt" | "createdAt"> & {
  acquiredAt: string | null;
  createdAt: string;
  borrowings: Borrowing[];
};

type OpenBorrowing = {
  id: string;
  bookId: string;
  borrowerName: string;
  borrowedAt: string;
  dueAt: string;
};

const CATEGORIES = ["QURAN", "TAFSIR", "HADITH", "FIQH", "AQIDA", "ARABIC_LANGUAGE", "GENERAL", "CHILDREN", "OTHER"] as const;

const STATUS_STYLES: Record<string, string> = {
  OPEN: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  RETURNED: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  LATE: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  LOST: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
};

function emptyForm() {
  return { title: "", author: "", category: "OTHER", isbn: "", copiesTotal: "1", shelf: "", acquiredAt: "" };
}

function plusDays(d: string, days: number): string {
  const dt = new Date(d + "T12:00:00");
  dt.setDate(dt.getDate() + days);
  return dt.toISOString().slice(0, 10);
}

export function LibraryClient({
  initial,
  openBorrowings,
  canWrite,
}: {
  initial: BookRow[];
  openBorrowings: OpenBorrowing[];
  canWrite: boolean;
}) {
  const { t, locale } = useT();
  const [rows, setRows] = useState(initial);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [borrowDialogOpen, setBorrowDialogOpen] = useState(false);
  const [borrowForBook, setBorrowForBook] = useState<{ id: string; title: string } | null>(null);
  const [borrowForm, setBorrowForm] = useState({ borrowerName: "", borrowedAt: new Date().toISOString().slice(0, 10), dueAt: "" });

  const fmtDate = (d: string | null) =>
    d ? new Date(d + "T12:00:00").toLocaleDateString(locale) : "—";

  const today = new Date();
  const overdueCount = openBorrowings.filter((b) => new Date(b.dueAt + "T23:59:59") < today).length;

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setDialogOpen(true);
  }

  function openEdit(b: BookRow) {
    setEditingId(b.id);
    setForm({
      title: b.title,
      author: b.author ?? "",
      category: b.category,
      isbn: b.isbn ?? "",
      copiesTotal: String(b.copiesTotal),
      shelf: b.shelf ?? "",
      acquiredAt: b.acquiredAt ?? "",
    });
    setDialogOpen(true);
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!form.title.trim()) {
      toast.error(t("gov.common.toastFailed"));
      return;
    }
    setBusy(true);
    const payload = {
      title: form.title.trim(),
      author: form.author || null,
      category: form.category,
      isbn: form.isbn || null,
      copiesTotal: Number(form.copiesTotal) || 1,
      shelf: form.shelf || null,
      acquiredAt: form.acquiredAt || null,
    };
    try {
      const res = await fetch(editingId ? `/api/library-books/${editingId}` : "/api/library-books", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "failed");
      }
      const saved = await res.json();
      const normalized: BookRow = {
        ...saved,
        acquiredAt: saved.acquiredAt ? String(saved.acquiredAt).slice(0, 10) : null,
        createdAt: String(saved.createdAt),
        borrowings: rows.find((r) => r.id === saved.id)?.borrowings ?? [],
      };
      setRows((prev) => (editingId ? prev.map((r) => (r.id === editingId ? normalized : r)) : [normalized, ...prev]));
      toast.success(t(editingId ? "gov.common.toastUpdated" : "gov.common.toastCreated"));
      setDialogOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("gov.common.toastFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm(t("gov.library.confirmDelete"))) return;
    try {
      const res = await fetch(`/api/library-books/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setRows((prev) => prev.filter((r) => r.id !== id));
      toast.success(t("gov.common.toastDeleted"));
    } catch {
      toast.error(t("gov.common.toastFailed"));
    }
  }

  function openBorrowDialog(book: BookRow) {
    setBorrowForBook({ id: book.id, title: book.title });
    const today = new Date().toISOString().slice(0, 10);
    setBorrowForm({ borrowerName: "", borrowedAt: today, dueAt: plusDays(today, 14) });
    setBorrowDialogOpen(true);
  }

  async function submitBorrow(ev: React.FormEvent) {
    ev.preventDefault();
    if (!borrowForBook || !borrowForm.borrowerName.trim()) {
      toast.error(t("gov.common.toastFailed"));
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/book-borrowings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookId: borrowForBook.id,
          borrowerName: borrowForm.borrowerName.trim(),
          borrowedAt: borrowForm.borrowedAt,
          dueAt: borrowForm.dueAt,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "failed");
      }
      const saved = await res.json();
      const normalized: Borrowing = {
        id: saved.id,
        bookId: saved.bookId,
        borrowerName: saved.borrowerName,
        memberId: saved.memberId,
        borrowedAt: String(saved.borrowedAt).slice(0, 10),
        dueAt: String(saved.dueAt).slice(0, 10),
        returnedAt: null,
        status: "OPEN",
      };
      setRows((prev) =>
        prev.map((r) => (r.id === borrowForBook.id ? { ...r, borrowings: [normalized, ...r.borrowings] } : r))
      );
      toast.success(t("gov.common.toastCreated"));
      setBorrowDialogOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("gov.common.toastFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function setBorrowStatus(b: Borrowing, status: "RETURNED" | "LOST") {
    setBusy(true);
    try {
      const res = await fetch(`/api/book-borrowings/${b.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      const saved = await res.json();
      setRows((prev) =>
        prev.map((r) =>
          r.id === b.bookId
            ? {
                ...r,
                borrowings: r.borrowings.map((x) =>
                  x.id === b.id
                    ? {
                        ...x,
                        status: saved.status,
                        returnedAt: saved.returnedAt ? String(saved.returnedAt).slice(0, 10) : null,
                      }
                    : x
                ),
              }
            : r
        )
      );
      toast.success(t("gov.common.toastUpdated"));
    } catch {
      toast.error(t("gov.common.toastFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {overdueCount > 0 && (
        <div role="alert" className="rounded-xl border border-$1-300 bg-$1-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
          <p className="flex items-center gap-1.5 font-semibold">
            <AlertTriangle size={14} /> {overdueCount} — {t("gov.borrowingStatus.LATE")}
          </p>
        </div>
      )}

      {canWrite && (
        <div className="flex justify-end">
          <Button onClick={openCreate}>
            <Plus size={14} /> {t("gov.library.add")}
          </Button>
        </div>
      )}

      <div className="space-y-2">
        {rows.map((b) => {
          const active = b.borrowings.filter((x) => x.status === "OPEN").length;
          const available = Math.max(0, b.copiesTotal - active);
          const isExpanded = expanded === b.id;
          return (
            <div key={b.id} className="rounded-xl border bg-card p-4">
              <div className="flex flex-wrap items-center gap-2">
                <BookOpen size={16} className="text-muted-foreground" />
                <span className="font-bold">{b.title}</span>
                {b.author && <span className="text-sm text-muted-foreground">— {b.author}</span>}
                <Badge variant="outline">{t(`gov.bookCat.${b.category}`)}</Badge>
                <Badge variant={available > 0 ? "secondary" : "destructive"}>
                  {t("gov.library.availableOf", { av: available, total: b.copiesTotal })}
                </Badge>
                <span className="ms-auto flex gap-1.5">
                  {canWrite && available > 0 && (
                    <Button size="xs" variant="outline" disabled={busy} onClick={() => openBorrowDialog(b)}>
                      <BookMarked size={12} /> {t("gov.library.borrow")}
                    </Button>
                  )}
                  <Button size="icon-sm" variant="ghost" onClick={() => setExpanded(isExpanded ? null : b.id)}>
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </Button>
                  {canWrite && (
                    <>
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
              {b.isbn && <p className="mt-1 text-xs text-muted-foreground" dir="ltr">ISBN: {b.isbn}</p>}
              {b.shelf && <p className="text-xs text-muted-foreground">📍 {b.shelf}</p>}

              {isExpanded && (
                <div className="mt-3 space-y-2 border-t pt-3">
                  <p className="text-xs font-bold">{t("gov.library.borrowings")}</p>
                  {b.borrowings.length === 0 ? (
                    <p className="text-xs text-muted-foreground">{t("gov.library.noBorrowings")}</p>
                  ) : (
                    <table className="w-full text-xs">
                      <thead className="bg-muted/60 text-muted-foreground">
                        <tr>
                          <th className="p-1.5 text-start">{t("gov.library.borrowerName")}</th>
                          <th className="p-1.5 text-start">{t("gov.library.borrowedAt")}</th>
                          <th className="p-1.5 text-start">{t("gov.library.dueAt")}</th>
                          <th className="p-1.5 text-start">{t("gov.library.returnedAt")}</th>
                          <th className="p-1.5 text-start">{t("gov.library.borrowingStatus")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {b.borrowings.map((br) => {
                          const overdue = br.status === "OPEN" && new Date(br.dueAt + "T23:59:59") < today;
                          const effectiveStatus = overdue ? "LATE" : br.status;
                          return (
                            <tr key={br.id} className={`border-t ${overdue ? "bg-amber-50/40 dark:bg-amber-950/20" : ""}`}>
                              <td className="p-1.5" dir="auto">{br.borrowerName}</td>
                              <td className="p-1.5">{fmtDate(br.borrowedAt)}</td>
                              <td className="p-1.5">{fmtDate(br.dueAt)}</td>
                              <td className="p-1.5">{fmtDate(br.returnedAt)}</td>
                              <td className="p-1.5">
                                <Badge className={`rounded-full px-2 py-0.5 text-xs ${STATUS_STYLES[effectiveStatus] ?? ""}`}>
                                  {t(`gov.borrowingStatus.${effectiveStatus}`)}
                                </Badge>
                                {canWrite && br.status === "OPEN" && (
                                  <span className="ms-1.5 inline-flex gap-1">
                                    <Button size="xs" variant="outline" disabled={busy} onClick={() => setBorrowStatus(br, "RETURNED")}>
                                      {t("gov.library.return")}
                                    </Button>
                                    <Button size="xs" variant="ghost" disabled={busy} onClick={() => setBorrowStatus(br, "LOST")}>
                                      {t("gov.borrowingStatus.LOST")}
                                    </Button>
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {rows.length === 0 && (
          <p className="py-10 text-center text-muted-foreground">{t("gov.library.none")}</p>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={submit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>{t(editingId ? "gov.library.edit" : "gov.library.add")}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label>{t("gov.library.titleField")}</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <Label>{t("gov.library.author")}</Label>
                <Input value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("gov.library.isbn")}</Label>
                <Input dir="ltr" value={form.isbn} onChange={(e) => setForm({ ...form, isbn: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("gov.library.category")}</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v ?? "OTHER" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{t(`gov.bookCat.${c}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t("gov.library.copiesTotal")}</Label>
                <Input type="number" min={1} value={form.copiesTotal} onChange={(e) => setForm({ ...form, copiesTotal: e.target.value })} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>{t("gov.library.shelf")}</Label>
                <Input value={form.shelf} onChange={(e) => setForm({ ...form, shelf: e.target.value })} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>{t("gov.library.acquiredAt")}</Label>
                <Input type="date" value={form.acquiredAt} onChange={(e) => setForm({ ...form, acquiredAt: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>{t("gov.common.cancel")}</Button>
              <Button type="submit" disabled={busy}>{t("gov.common.save")}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={borrowDialogOpen} onOpenChange={setBorrowDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={submitBorrow} className="space-y-4">
            <DialogHeader>
              <DialogTitle>{t("gov.library.openBorrowing")} — {borrowForBook?.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>{t("gov.library.borrowerName")}</Label>
                <Input
                  value={borrowForm.borrowerName}
                  onChange={(e) => setBorrowForm({ ...borrowForm, borrowerName: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">{t("gov.library.borrowedAt")}</Label>
                  <Input
                    type="date"
                    value={borrowForm.borrowedAt}
                    onChange={(e) => setBorrowForm({ ...borrowForm, borrowedAt: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{t("gov.library.dueAt")}</Label>
                  <Input
                    type="date"
                    value={borrowForm.dueAt}
                    onChange={(e) => setBorrowForm({ ...borrowForm, dueAt: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setBorrowDialogOpen(false)}>{t("gov.common.cancel")}</Button>
              <Button type="submit" disabled={busy}>{t("gov.common.save")}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
