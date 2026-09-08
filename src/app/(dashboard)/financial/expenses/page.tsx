"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/components/i18n/provider";
import { fmtDate, fmtMoney } from "@/lib/i18n/format";

const CATEGORY_KEYS: Record<string, string> = {
  EDUCATIONAL: "financial.cat.educational",
  SOCIAL: "financial.cat.social",
  QURAN: "financial.cat.quran",
  ADMINISTRATIVE: "financial.cat.administrative",
  MAINTENANCE: "financial.cat.maintenance",
  OTHER: "financial.cat.other",
};

const SECTION_KEYS: Record<string, string> = {
  EDUCATIONAL: "financial.cat.educational",
  SOCIAL: "financial.cat.social",
  QURAN: "financial.cat.quran",
};

type ExpenseItem = {
  id: string;
  category: string;
  section: string | null;
  description: string;
  amount: string;
  expenseDate: string;
  projectId: string | null;
  planId: string | null;
  planLineItemId: string | null;
  recorder: { fullName: string } | null;
};

type ProjectLite = {
  id: string;
  name: string;
  plans: { id: string; name: string; lineItems: { id: string; name: string }[] }[];
};

export default function ExpensesPage() {
  const { t, locale } = useT();
  const categoryLabel = (value: string) => t(CATEGORY_KEYS[value] ?? "financial.cat.other");
  const sectionLabel = (value: string) => t(SECTION_KEYS[value] ?? "financial.cat.other");
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [projects, setProjects] = useState<ProjectLite[]>([]);
  const [form, setForm] = useState({
    category: "",
    section: "",
    description: "",
    amount: "",
    expenseDate: new Date().toISOString().split("T")[0],
    projectId: "",
    planId: "",
    planLineItemId: "",
  });

  const resetForm = () => {
    setEditingId(null);
    setForm({ category: "", section: "", description: "", amount: "", expenseDate: new Date().toISOString().split("T")[0], projectId: "", planId: "", planLineItemId: "" });
  };

  const openEdit = (e: ExpenseItem) => {
    setEditingId(e.id);
    setForm({
      category: e.category,
      section: e.section ?? "",
      description: e.description,
      amount: e.amount,
      expenseDate: new Date(e.expenseDate).toISOString().split("T")[0],
      projectId: e.projectId ?? "",
      planId: e.planId ?? "",
      planLineItemId: e.planLineItemId ?? "",
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("financial.deleteExpenseConfirm"))) return;
    const r = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
    if (r.ok) {
      toast.success(t("financial.deleted"));
      fetchExpenses();
    } else {
      const data = await r.json().catch(() => ({}));
      toast.error(data.error ?? t("financial.deleteFailed"));
    }
  };

  const fetchExpenses = async () => {
    const res = await fetch("/api/expenses");
    const data = await res.json();
    setExpenses(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchExpenses();
    fetch("/api/social-projects")
      .then((r) => r.json())
      .then(async (list: { id: string; name: string }[]) => {
        // Fetch each project to get plans + line items
        const detailed = await Promise.all(
          list.map(async (p) => {
            const r = await fetch(`/api/social-projects/${p.id}`);
            if (r.ok) {
              const d = await r.json();
              return {
                id: d.id,
                name: d.name,
                plans: (d.plans ?? []).map((pl: { id: string; name: string; lineItems: { id: string; name: string }[] }) => ({
                  id: pl.id,
                  name: pl.name,
                  lineItems: pl.lineItems ?? [],
                })),
              };
            }
            return null;
          })
        );
        setProjects(detailed.filter(Boolean) as ProjectLite[]);
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.category || !form.description || !form.amount || !form.expenseDate) {
      toast.error(t("financial.fillRequired"));
      return;
    }

    setSubmitting(true);
    const res = editingId
      ? await fetch(`/api/expenses/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, section: form.section || null }),
        })
      : await fetch("/api/expenses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, section: form.section || null }),
        });

    if (res.ok) {
      toast.success(editingId ? t("financial.expenseUpdated") : t("financial.expenseCreated"));
      setDialogOpen(false);
      resetForm();
      fetchExpenses();
    } else {
      toast.error(t("common.error"));
    }
    setSubmitting(false);
  };

  const total = expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("financial.expensesTitle")}</h1>
          <p className="text-muted-foreground">
            {t("financial.totalWithAmount", { total: fmtMoney(total, locale) })}
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) resetForm(); setDialogOpen(o); }}>
          <DialogTrigger>
            <Button>{t("financial.addExpense")}</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingId ? t("financial.editExpense") : t("financial.newExpense")}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>{t("financial.category")} *</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v ?? "" })}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("financial.selectCategory")}>
                      {form.category ? categoryLabel(form.category) : t("financial.selectCategory")}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_KEYS).map(([value, key]) => (
                      <SelectItem key={value} value={value}>{t(key)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("common.section")}</Label>
                <Select value={form.section} onValueChange={(v) => setForm({ ...form, section: v ?? "" })}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("financial.selectSectionOptional")}>
                      {form.section ? sectionLabel(form.section) : t("financial.selectSectionOptional")}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(SECTION_KEYS).map(([value, key]) => (
                      <SelectItem key={value} value={value}>{t(key)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("common.description")} *</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder={t("financial.expenseDescPlaceholder")}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>{t("financial.amountMadRequired")}</Label>
                <Input
                  type="number"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="0.00"
                  dir="ltr"
                  className="text-right"
                  step="0.01"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>{t("common.date")} *</Label>
                <Input
                  type="date"
                  value={form.expenseDate}
                  onChange={(e) => setForm({ ...form, expenseDate: e.target.value })}
                  dir="ltr"
                  required
                />
              </div>
              <div className="space-y-2 border-t pt-3">
                <Label className="text-sm font-bold">{t("financial.linkProject")}</Label>
                <p className="text-[11px] text-muted-foreground">{t("financial.linkProjectHint")}</p>
                <select
                  value={form.projectId}
                  onChange={(e) => setForm({ ...form, projectId: e.target.value, planId: "", planLineItemId: "" })}
                  className="w-full h-9 px-3 rounded-md border bg-background text-sm"
                >
                  <option value="">{t("financial.unlinked")}</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                {form.projectId && (() => {
                  const project = projects.find((p) => p.id === form.projectId);
                  if (!project || project.plans.length === 0) return null;
                  return (
                    <select
                      value={form.planId}
                      onChange={(e) => setForm({ ...form, planId: e.target.value, planLineItemId: "" })}
                      className="w-full h-9 px-3 rounded-md border bg-background text-sm"
                    >
                      <option value="">{t("financial.planOptional")}</option>
                      {project.plans.map((pl) => (
                        <option key={pl.id} value={pl.id}>{pl.name}</option>
                      ))}
                    </select>
                  );
                })()}
                {form.planId && (() => {
                  const project = projects.find((p) => p.id === form.projectId);
                  const plan = project?.plans.find((pl) => pl.id === form.planId);
                  if (!plan || plan.lineItems.length === 0) return null;
                  return (
                    <select
                      value={form.planLineItemId}
                      onChange={(e) => setForm({ ...form, planLineItemId: e.target.value })}
                      className="w-full h-9 px-3 rounded-md border bg-background text-sm"
                    >
                      <option value="">{t("financial.lineItemOptional")}</option>
                      {plan.lineItems.map((li) => (
                        <option key={li.id} value={li.id}>{li.name}</option>
                      ))}
                    </select>
                  );
                })()}
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? t("common.saving") : editingId ? t("financial.savingChanges") : t("financial.saveExpense")}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("common.date")}</TableHead>
              <TableHead>{t("financial.category")}</TableHead>
              <TableHead>{t("common.section")}</TableHead>
              <TableHead>{t("common.description")}</TableHead>
              <TableHead>{t("common.amount")}</TableHead>
              <TableHead>{t("financial.recordedBy")}</TableHead>
              <TableHead className="w-24">{t("common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">{t("common.loading")}</TableCell>
              </TableRow>
            ) : expenses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  {t("financial.noExpenses")}
                </TableCell>
              </TableRow>
            ) : (
              expenses.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell>{fmtDate(expense.expenseDate, locale)}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{categoryLabel(expense.category)}</Badge>
                  </TableCell>
                  <TableCell>
                    {expense.section ? (
                      <Badge variant="secondary">{sectionLabel(expense.section)}</Badge>
                    ) : "-"}
                  </TableCell>
                  <TableCell className="max-w-xs truncate">{expense.description}</TableCell>
                  <TableCell className="font-medium">{fmtMoney(parseFloat(expense.amount), locale)} {t("financial.mad")}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {expense.recorder?.fullName ?? "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(expense)} title={t("common.edit")}>
                        <Pencil size={13} />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(expense.id)} title={t("common.delete")}>
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
