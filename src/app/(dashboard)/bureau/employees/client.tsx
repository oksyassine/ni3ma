"use client";

import { useState } from "react";
import Link from "next/link";
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
import type { Employee, PayrollStatus } from "@prisma/client";
import { toast } from "sonner";
import { useT } from "@/components/i18n/provider";
import { Plus, Trash2, Pencil, Users, FileText, ChevronDown, ChevronUp } from "lucide-react";

type PayrollLite = {
  id: string;
  period: string;
  grossAmount: number;
  cnssAmount: number | null;
  netAmount: number;
  paidAt: string | null;
  status: PayrollStatus;
};

type EmployeeRow = Omit<Employee, "grossSalary" | "hireDate" | "endDate" | "createdAt"> & {
  grossSalary: number | null;
  hireDate: string;
  endDate: string | null;
  createdAt: string;
  payrolls: PayrollLite[];
};

const CONTRACT_TYPES = ["CDI", "CDD", "APPRENTICESHIP", "STAGE", "ANAPEC", "OTHER"] as const;
const STATUSES = ["ACTIVE", "ON_LEAVE", "TERMINATED"] as const;

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  ON_LEAVE: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  TERMINATED: "bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

const PAY_STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  PAID: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  CNSS_DECLARED: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
};

function emptyForm() {
  return {
    fullName: "",
    cin: "",
    cnssNumber: "",
    position: "",
    contractType: "CDI",
    status: "ACTIVE",
    hireDate: new Date().toISOString().slice(0, 10),
    endDate: "",
    grossSalary: "",
    bankName: "",
    bankRib: "",
    phone: "",
    email: "",
    contractDocUrl: "",
  };
}

function currentPeriod() {
  return new Date().toISOString().slice(0, 7);
}

export function EmployeesClient({ initial, canWrite }: { initial: EmployeeRow[]; canWrite: boolean }) {
  const { t, locale } = useT();
  const [rows, setRows] = useState(initial);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const fmtMoney = (n: number) => n.toLocaleString(locale, { maximumFractionDigits: 2 });
  const fmtDate = (d: string | null) =>
    d ? new Date(d + "T12:00:00").toLocaleDateString(locale) : "—";

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setDialogOpen(true);
  }

  function openEdit(e: EmployeeRow) {
    setEditingId(e.id);
    setForm({
      fullName: e.fullName,
      cin: e.cin ?? "",
      cnssNumber: e.cnssNumber ?? "",
      position: e.position,
      contractType: e.contractType,
      status: e.status,
      hireDate: e.hireDate,
      endDate: e.endDate ?? "",
      grossSalary: e.grossSalary === null ? "" : String(e.grossSalary),
      bankName: e.bankName ?? "",
      bankRib: e.bankRib ?? "",
      phone: e.phone ?? "",
      email: e.email ?? "",
      contractDocUrl: e.contractDocUrl ?? "",
    });
    setDialogOpen(true);
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!form.fullName.trim() || !form.position.trim() || !form.hireDate) {
      toast.error(t("gov.common.toastFailed"));
      return;
    }
    setBusy(true);
    const payload = {
      fullName: form.fullName.trim(),
      cin: form.cin || null,
      cnssNumber: form.cnssNumber || null,
      position: form.position.trim(),
      contractType: form.contractType,
      status: form.status,
      hireDate: form.hireDate,
      endDate: form.endDate || null,
      grossSalary: form.grossSalary === "" ? null : Number(form.grossSalary),
      bankName: form.bankName || null,
      bankRib: form.bankRib || null,
      phone: form.phone || null,
      email: form.email || null,
      contractDocUrl: form.contractDocUrl || null,
    };
    try {
      const res = await fetch(editingId ? `/api/employees/${editingId}` : "/api/employees", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      const saved = await res.json();
      const normalized: EmployeeRow = {
        ...saved,
        grossSalary: saved.grossSalary === null ? null : Number(saved.grossSalary),
        hireDate: String(saved.hireDate).slice(0, 10),
        endDate: saved.endDate ? String(saved.endDate).slice(0, 10) : null,
        createdAt: String(saved.createdAt),
        payrolls: rows.find((r) => r.id === saved.id)?.payrolls ?? [],
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
    if (!confirm(t("gov.employees.confirmDelete"))) return;
    try {
      const res = await fetch(`/api/employees/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setRows((prev) => prev.filter((r) => r.id !== id));
      toast.success(t("gov.common.toastDeleted"));
    } catch {
      toast.error(t("gov.common.toastFailed"));
    }
  }

  async function issuePayroll(emp: EmployeeRow) {
    const period = currentPeriod();
    const gross = emp.grossSalary ?? 0;
    // CNSS employee contribution = 2.26 % of gross, capped at the CNSS ceiling
    // (MAD 6000/month for general scheme — capped at 135.60 MAD). We use a
    // safe default ceiling of MAD 6 000 here; if the association exceeds it,
    // the treasurer can override the netAmount afterwards via Edit.
    const CNSS_RATE = 0.0226;
    const CNSS_CEILING = 6000;
    const cnssBase = Math.min(gross, CNSS_CEILING);
    const cnss = Math.round(cnssBase * CNSS_RATE * 100) / 100;
    const net = Math.round((gross - cnss) * 100) / 100;
    setBusy(true);
    try {
      const res = await fetch("/api/payroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: emp.id,
          period,
          grossAmount: gross,
          cnssAmount: cnss,
          netAmount: net,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "failed");
      }
      const saved = await res.json();
      const lite: PayrollLite = {
        id: saved.id,
        period: saved.period,
        grossAmount: Number(saved.grossAmount),
        cnssAmount: saved.cnssAmount === null ? null : Number(saved.cnssAmount),
        netAmount: Number(saved.netAmount),
        paidAt: saved.paidAt ? String(saved.paidAt).slice(0, 10) : null,
        status: saved.status,
      };
      setRows((prev) =>
        prev.map((r) =>
          r.id === emp.id ? { ...r, payrolls: [lite, ...r.payrolls.filter((p) => p.id !== lite.id)].slice(0, 6) } : r
        )
      );
      toast.success(t("gov.common.toastCreated"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("gov.common.toastFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function setPayStatus(payId: string, status: "PENDING" | "PAID" | "CNSS_DECLARED") {
    setBusy(true);
    try {
      const res = await fetch(`/api/payroll/${payId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      const saved = await res.json();
      setRows((prev) =>
        prev.map((r) => ({
          ...r,
          payrolls: r.payrolls.map((p) =>
            p.id === payId
              ? {
                  ...p,
                  status: saved.status,
                  paidAt: saved.paidAt ? String(saved.paidAt).slice(0, 10) : null,
                }
              : p
          ),
        }))
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
      {canWrite && (
        <div className="flex justify-end">
          <Button onClick={openCreate}>
            <Plus size={14} /> {t("gov.employees.add")}
          </Button>
        </div>
      )}

      <div className="space-y-3">
        {rows.map((e) => {
          const isExpanded = expanded === e.id;
          return (
            <div key={e.id} className="rounded-xl border bg-card p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Users size={16} className="text-muted-foreground" />
                <span className="font-bold">{e.fullName}</span>
                <Badge variant="outline">{e.position}</Badge>
                <Badge className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[e.status] ?? ""}`}>
                  {t(`gov.employeeStatus.${e.status}`)}
                </Badge>
                {e.cnssNumber && <Badge variant="secondary" className="text-xs">🛡️ {e.cnssNumber}</Badge>}
                <span className="ms-auto flex gap-1.5">
                  <Button size="icon-sm" variant="ghost" onClick={() => setExpanded(isExpanded ? null : e.id)}>
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </Button>
                  {canWrite && (
                    <>
                      <Button size="icon-sm" variant="ghost" onClick={() => openEdit(e)} title={t("gov.common.edit")}>
                        <Pencil size={13} />
                      </Button>
                      <Button size="icon-sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => remove(e.id)} title={t("gov.common.delete")}>
                        <Trash2 size={13} />
                      </Button>
                    </>
                  )}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground" dir="auto">
                {t(`gov.contractType.${e.contractType}`)} · 📅 {fmtDate(e.hireDate)}
                {e.endDate ? ` → ${fmtDate(e.endDate)}` : ""}
                {e.grossSalary !== null ? ` · 💰 ${fmtMoney(e.grossSalary)} MAD / شهر` : ""}
              </p>

              {isExpanded && (
                <div className="mt-4 space-y-3 border-t pt-3">
                  <div className="flex items-center gap-2">
                    <p className="flex-1 text-sm font-bold">{t("gov.employees.payrolls")}</p>
                    {canWrite && (
                      <Button size="xs" variant="outline" disabled={busy || !e.grossSalary} onClick={() => issuePayroll(e)}>
                        <FileText size={12} /> {t("gov.employees.issuePayroll")} {currentPeriod()}
                      </Button>
                    )}
                  </div>
                  {e.payrolls.length === 0 ? (
                    <p className="text-xs text-muted-foreground">{t("gov.payroll.none")}</p>
                  ) : (
                    <div className="overflow-x-auto rounded-lg border">
                      <table className="w-full text-xs">
                        <thead className="bg-muted/60 text-muted-foreground">
                          <tr>
                            <th className="p-2 text-start">{t("gov.payroll.period")}</th>
                            <th className="p-2 text-start">{t("gov.payroll.gross")}</th>
                            <th className="p-2 text-start">{t("gov.payroll.cnss")}</th>
                            <th className="p-2 text-start">{t("gov.payroll.net")}</th>
                            <th className="p-2 text-start">{t("gov.payroll.paidAt")}</th>
                            <th className="p-2 text-start">{t("gov.payroll.status")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {e.payrolls.map((p) => (
                            <tr key={p.id} className="border-t">
                              <td className="p-2 font-medium" dir="ltr">{p.period}</td>
                              <td className="p-2">{fmtMoney(p.grossAmount)}</td>
                              <td className="p-2">{p.cnssAmount !== null ? fmtMoney(p.cnssAmount) : "—"}</td>
                              <td className="p-2 font-semibold">{fmtMoney(p.netAmount)}</td>
                              <td className="p-2">{fmtDate(p.paidAt)}</td>
                              <td className="p-2">
                                <Badge className={`rounded-full px-2 py-0.5 text-xs ${PAY_STATUS_STYLES[p.status] ?? ""}`}>
                                  {t(`gov.payrollStatus.${p.status}`)}
                                </Badge>
                                {canWrite && p.status === "PENDING" && (
                                  <Button size="xs" variant="outline" className="ms-1.5" disabled={busy} onClick={() => setPayStatus(p.id, "PAID")}>
                                    {t("gov.payroll.markPaid")}
                                  </Button>
                                )}
                                {canWrite && p.status === "PAID" && (
                                  <Button size="xs" variant="outline" className="ms-1.5" disabled={busy} onClick={() => setPayStatus(p.id, "CNSS_DECLARED")}>
                                    {t("gov.payroll.markCnss")}
                                  </Button>
                                )}
                                <Link href={`/bureau/employees/${p.id}/slip`} className="ms-1.5 text-xs underline text-muted-foreground">
                                  🧾 {t("gov.payroll.salarySlip")}
                                </Link>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {rows.length === 0 && (
          <p className="py-10 text-center text-muted-foreground">{t("gov.employees.none")}</p>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <form onSubmit={submit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>{t(editingId ? "gov.employees.edit" : "gov.employees.add")}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label>{t("gov.employees.fullName")}</Label>
                <Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <Label>{t("gov.employees.position")}</Label>
                <Input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <Label>{t("gov.employees.contractType")}</Label>
                <Select value={form.contractType} onValueChange={(v) => setForm({ ...form, contractType: v ?? "CDI" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CONTRACT_TYPES.map((c) => (
                      <SelectItem key={c} value={c}>{t(`gov.contractType.${c}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t("gov.employees.cin")}</Label>
                <Input dir="ltr" value={form.cin} onChange={(e) => setForm({ ...form, cin: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("gov.employees.cnssNumber")}</Label>
                <Input dir="ltr" value={form.cnssNumber} onChange={(e) => setForm({ ...form, cnssNumber: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("gov.employees.status")}</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v ?? "ACTIVE" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>{t(`gov.employeeStatus.${s}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:col-span-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">📅 {t("gov.employees.hireDate")}</Label>
                  <Input type="date" value={form.hireDate} onChange={(e) => setForm({ ...form, hireDate: e.target.value })} required />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{t("gov.employees.endDate")}</Label>
                  <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>{t("gov.employees.grossSalary")}</Label>
                <Input type="number" min={0} step="0.01" value={form.grossSalary} onChange={(e) => setForm({ ...form, grossSalary: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("gov.employees.bankName")}</Label>
                <Input value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>{t("gov.employees.bankRib")}</Label>
                <Input dir="ltr" value={form.bankRib} onChange={(e) => setForm({ ...form, bankRib: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>📱</Label>
                <Input dir="ltr" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>✉️</Label>
                <Input dir="ltr" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>{t("gov.employees.contractDocUrl")}</Label>
                <Input dir="ltr" value={form.contractDocUrl} onChange={(e) => setForm({ ...form, contractDocUrl: e.target.value })} />
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
