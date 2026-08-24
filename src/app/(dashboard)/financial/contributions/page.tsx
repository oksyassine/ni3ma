"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { startOfWeek, format, addWeeks, subWeeks } from "date-fns";
import { ar, fr } from "date-fns/locale";
import { useT } from "@/components/i18n/provider";

type MemberItem = {
  id: string;
  fullName: string;
  registrationNumber: number;
};

type ContributionItem = {
  id: string;
  memberId: string;
  amount: string;
};

export default function ContributionsPage() {
  const { t, locale } = useT();
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [contributions, setContributions] = useState<Map<string, { id: string; amount: string }>>(new Map());
  const [currentWeek, setCurrentWeek] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [amounts, setAmounts] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const weekStr = format(currentWeek, "yyyy-MM-dd");

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [membersRes, contribRes] = await Promise.all([
      fetch("/api/members?limit=200"),
      fetch(`/api/contributions?weekStart=${weekStr}`),
    ]);

    const membersData = await membersRes.json();
    const contribData = await contribRes.json();

    setMembers(
      membersData.members.map((m: MemberItem) => ({
        id: m.id,
        fullName: m.fullName,
        registrationNumber: m.registrationNumber,
      }))
    );

    const contribMap = new Map<string, { id: string; amount: string }>();
    const amountsMap = new Map<string, string>();
    for (const c of contribData as ContributionItem[]) {
      contribMap.set(c.memberId, { id: c.id, amount: c.amount });
      amountsMap.set(c.memberId, c.amount);
    }
    setContributions(contribMap);
    setAmounts(amountsMap);
    setLoading(false);
  }, [weekStr]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updateAmount = (memberId: string, value: string) => {
    setAmounts((prev) => new Map(prev).set(memberId, value));
  };

  const saveContribution = async (memberId: string) => {
    const amount = amounts.get(memberId);
    if (!amount || parseFloat(amount) <= 0) return;

    setSaving(true);
    const res = await fetch("/api/contributions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId, amount, weekStart: weekStr }),
    });

    if (res.ok) {
      const created = await res.json();
      setContributions((prev) => new Map(prev).set(memberId, { id: created.id, amount }));
      toast.success(t("financial.contributionSaved"));
    } else {
      toast.error(t("financial.saveError"));
    }
    setSaving(false);
  };

  const deleteContribution = async (memberId: string) => {
    const c = contributions.get(memberId);
    if (!c) return;
    if (!confirm(t("financial.deleteContributionConfirm"))) return;
    const r = await fetch(`/api/contributions/${c.id}`, { method: "DELETE" });
    if (r.ok) {
      setContributions((prev) => {
        const next = new Map(prev);
        next.delete(memberId);
        return next;
      });
      setAmounts((prev) => {
        const next = new Map(prev);
        next.delete(memberId);
        return next;
      });
      toast.success(t("financial.deleted"));
    } else {
      const data = await r.json().catch(() => ({}));
      toast.error(data.error ?? t("financial.deleteFailed"));
    }
  };

  const prevWeek = () => setCurrentWeek((w) => subWeeks(w, 1));
  const nextWeek = () => setCurrentWeek((w) => addWeeks(w, 1));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("financial.weeklyContributions")}</h1>
        <p className="text-muted-foreground">{t("financial.contributionsSubtitle")}</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("financial.totalMembers")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{members.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("financial.paidThisWeek")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{contributions.size}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("financial.notPaid")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{members.length - contributions.size}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle>
              {t("financial.weekOf", { date: format(currentWeek, "dd MMMM yyyy", { locale: locale === "fr" ? fr : ar }) })}
            </CardTitle>
            <div className="flex gap-2">
              <Link href="/admin/members/new">
                <Button variant="outline" size="sm">
                  {t("financial.addMember")}
                </Button>
              </Link>
              <Button variant="outline" size="sm" onClick={prevWeek}>
                {t("financial.prevWeek")}
              </Button>
              <Button variant="outline" size="sm" onClick={nextWeek}>
                {t("financial.nextWeek")}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">{t("common.loading")}</div>
          ) : (
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">{t("financial.regNumber")}</TableHead>
                    <TableHead>{t("common.name")}</TableHead>
                    <TableHead className="w-32">{t("financial.amountMad")}</TableHead>
                    <TableHead className="w-24">{t("common.status")}</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member) => {
                    const paid = contributions.has(member.id);
                    return (
                      <TableRow key={member.id} className={paid ? "bg-green-50" : ""}>
                        <TableCell className="font-mono">{member.registrationNumber}</TableCell>
                        <TableCell className="font-medium">{member.fullName}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={amounts.get(member.id) ?? ""}
                            onChange={(e) => updateAmount(member.id, e.target.value)}
                            placeholder="0"
                            className="h-8 w-24"
                            dir="ltr"
                            step="0.5"
                          />
                        </TableCell>
                        <TableCell>
                          {paid ? (
                            <span className="text-green-600 text-sm font-medium">{t("financial.paid")}</span>
                          ) : (
                            <span className="text-muted-foreground text-sm">{t("financial.unpaid")}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant={paid ? "outline" : "default"}
                              onClick={() => saveContribution(member.id)}
                              disabled={saving || !amounts.get(member.id)}
                              className="h-7 text-xs"
                            >
                              {paid ? t("common.edit") : t("common.save")}
                            </Button>
                            {paid && (
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => deleteContribution(member.id)}
                                title={t("common.delete")}
                                className="h-7 w-7 text-destructive hover:text-destructive"
                              >
                                <Trash2 size={13} />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
