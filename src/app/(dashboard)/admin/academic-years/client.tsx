"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useT } from "@/components/i18n/provider";
import { CheckCircle2, Lock, Trash2 } from "lucide-react";

type Year = {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  isClosed: boolean;
};

export function AcademicYearsManager({ initialYears }: { initialYears: Year[] }) {
  const router = useRouter();
  const { t } = useT();
  const [years, setYears] = useState(initialYears);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ label: "", startDate: "", endDate: "" });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.label || !form.startDate || !form.endDate) {
      toast.error(t("admin.academicYears.toastFieldsRequired"));
      return;
    }
    setCreating(true);
    const res = await fetch("/api/academic-years", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const created = await res.json();
      setYears((prev) => [
        { ...created, startDate: created.startDate.slice(0, 10), endDate: created.endDate.slice(0, 10) },
        ...prev,
      ]);
      setForm({ label: "", startDate: "", endDate: "" });
      toast.success(t("admin.academicYears.toastCreated"));
      router.refresh();
    } else {
      toast.error(t("admin.academicYears.toastCreateFailed"));
    }
    setCreating(false);
  };

  const handleSetCurrent = async (id: string) => {
    const res = await fetch(`/api/academic-years/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ setCurrent: true }),
    });
    if (res.ok) {
      setYears((prev) => prev.map((y) => ({ ...y, isCurrent: y.id === id })));
      toast.success(t("admin.academicYears.toastCurrentSet"));
      router.refresh();
    } else toast.error(t("admin.academicYears.toastUpdateFailed"));
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("admin.academicYears.confirmDelete"))) return;
    const res = await fetch(`/api/academic-years/${id}`, { method: "DELETE" });
    if (res.ok) {
      setYears((prev) => prev.filter((y) => y.id !== id));
      toast.success(t("admin.academicYears.toastDeleted"));
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? t("admin.academicYears.toastDeleteFailed"));
    }
  };

  const handleToggleClosed = async (id: string, isClosed: boolean) => {
    const res = await fetch(`/api/academic-years/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isClosed: !isClosed }),
    });
    if (res.ok) {
      setYears((prev) => prev.map((y) => (y.id === id ? { ...y, isClosed: !isClosed } : y)));
      toast.success(!isClosed ? t("admin.academicYears.toastClosed") : t("admin.academicYears.toastOpened"));
    } else toast.error(t("admin.academicYears.toastUpdateFailed"));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("admin.academicYears.addYear")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="grid gap-4 md:grid-cols-4">
            <div>
              <Label>{t("admin.academicYears.labelLabel")}</Label>
              <Input
                placeholder="2026-2027"
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
              />
            </div>
            <div>
              <Label>{t("admin.academicYears.startDate")}</Label>
              <Input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              />
            </div>
            <div>
              <Label>{t("admin.academicYears.endDate")}</Label>
              <Input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              />
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={creating} className="w-full">
                {creating ? "..." : t("admin.academicYears.add")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {years.map((y) => (
          <Card key={y.id} className={y.isCurrent ? "border-primary" : ""}>
            <CardContent className="flex flex-wrap items-center gap-3 py-4">
              <div className="flex-1 min-w-[200px]">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-lg">{y.label}</span>
                  {y.isCurrent && (
                    <Badge variant="default" className="gap-1">
                      <CheckCircle2 size={12} /> {t("admin.academicYears.current")}
                    </Badge>
                  )}
                  {y.isClosed && (
                    <Badge variant="outline" className="gap-1">
                      <Lock size={12} /> {t("admin.academicYears.closed")}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {y.startDate} ← {y.endDate}
                </p>
              </div>
              <div className="flex gap-2">
                {!y.isCurrent && (
                  <Button size="sm" variant="outline" onClick={() => handleSetCurrent(y.id)}>
                    {t("admin.academicYears.makeCurrent")}
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => handleToggleClosed(y.id, y.isClosed)}>
                  {y.isClosed ? t("admin.academicYears.open") : t("admin.academicYears.closeYear")}
                </Button>
                {!y.isCurrent && (
                  <Button size="icon" variant="ghost" onClick={() => handleDelete(y.id)} title={t("admin.academicYears.deleteTitle")} className="text-destructive hover:text-destructive">
                    <Trash2 size={14} />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {years.length === 0 && (
          <p className="text-center text-muted-foreground py-8">{t("admin.academicYears.none")}</p>
        )}
      </div>
    </div>
  );
}
