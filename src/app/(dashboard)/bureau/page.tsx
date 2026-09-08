import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getT } from "@/lib/i18n/server";
import { fmtMoney } from "@/lib/i18n/format";
import { hijriDate } from "@/lib/dates";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

async function getBureauStats() {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [
    totalMembers,
    activeMembers,
    childMembers,
    adultMembers,
    educationalCount,
    socialCount,
    quranCount,
    totalContributions,
    totalExpenses,
    totalDonations,
    monthlyDonations,
    monthlyContributions,
    openGrantTranches,
    activeCampaigns,
    recent,
  ] = await Promise.all([
    prisma.member.count(),
    prisma.member.count({ where: { isActive: true } }),
    prisma.member.count({ where: { memberType: "CHILD" } }),
    prisma.member.count({ where: { memberType: "ADULT" } }),
    prisma.memberSection.count({ where: { section: "EDUCATIONAL", isActive: true } }),
    prisma.memberSection.count({ where: { section: "SOCIAL", isActive: true } }),
    prisma.memberSection.count({ where: { section: "QURAN", isActive: true } }),
    prisma.weeklyContribution.aggregate({ _sum: { amount: true } }),
    prisma.expense.aggregate({ _sum: { amount: true } }),
    prisma.donation.aggregate({ _sum: { amount: true } }),
    prisma.donation.aggregate({ _sum: { amount: true }, where: { isPaid: true, donationDate: { gte: startOfMonth } } }),
    prisma.weeklyContribution.aggregate({ _sum: { amount: true }, where: { paidAt: { gte: startOfMonth } } }),
    prisma.grantTranche.count({ where: { receivedAt: null, grant: { status: { in: ["APPROVED", "ACTIVE"] } } } }),
    prisma.donationCampaign.count({ where: { isClosed: false } }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { user: { select: { fullName: true } } },
    }),
  ]);

  return {
    totalMembers,
    activeMembers,
    childMembers,
    adultMembers,
    educationalCount,
    socialCount,
    quranCount,
    contributions: Number(totalContributions._sum.amount ?? 0),
    expenses: Number(totalExpenses._sum.amount ?? 0),
    donations: Number(totalDonations._sum.amount ?? 0),
    monthlyDonations: Number(monthlyDonations._sum.amount ?? 0),
    monthlyContributions: Number(monthlyContributions._sum.amount ?? 0),
    openGrantTranches,
    activeCampaigns,
    recent: recent.map((r) => ({
      id: r.id,
      action: r.action,
      entity: r.entity,
      userName: r.user?.fullName ?? "—",
      at: r.createdAt,
    })),
  };
}

export default async function BureauDashboard() {
  const { t, locale } = await getT();
  const stats = await getBureauStats();
  const balance = stats.contributions + stats.donations - stats.expenses;
  const today = new Date();
  const todayStr = today.toLocaleDateString(locale, { dateStyle: "long" });
  const todayHijri = hijriDate(today, locale === "fr" ? "fr" : "ar");
  const fmt = (d: Date) => `${d.toLocaleDateString(locale)} ${d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("bureau.title")}</h1>
        <p className="text-muted-foreground">{t("bureau.subtitle")}</p>
        <p className="text-xs text-muted-foreground" dir="auto">📅 {todayStr}{todayHijri ? ` — ${todayHijri}` : ""}</p>
      </div>

      {/* Members Overview */}
      <div>
        <h2 className="text-lg font-semibold mb-3">{t("bureau.members")}</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t("bureau.total")}</CardTitle>
            </CardHeader>
            <CardContent><div className="text-3xl font-bold">{stats.totalMembers}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t("bureau.active")}</CardTitle>
            </CardHeader>
            <CardContent><div className="text-3xl font-bold text-green-600">{stats.activeMembers}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t("bureau.children")}</CardTitle>
            </CardHeader>
            <CardContent><div className="text-3xl font-bold">{stats.childMembers}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t("bureau.adults")}</CardTitle>
            </CardHeader>
            <CardContent><div className="text-3xl font-bold">{stats.adultMembers}</div></CardContent>
          </Card>
        </div>
      </div>

      {/* Sections Overview */}
      <div>
        <h2 className="text-lg font-semibold mb-3">{t("bureau.sectionsHeading")}</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t("bureau.sectionEducational")}</CardTitle>
            </CardHeader>
            <CardContent><div className="text-3xl font-bold">{stats.educationalCount}</div><p className="text-sm text-muted-foreground">{t("bureau.memberUnit")}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t("bureau.sectionSocial")}</CardTitle>
            </CardHeader>
            <CardContent><div className="text-3xl font-bold">{stats.socialCount}</div><p className="text-sm text-muted-foreground">{t("bureau.memberUnit")}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t("bureau.sectionQuran")}</CardTitle>
            </CardHeader>
            <CardContent><div className="text-3xl font-bold">{stats.quranCount}</div><p className="text-sm text-muted-foreground">{t("bureau.memberUnit")}</p></CardContent>
          </Card>
        </div>
      </div>

      {/* Financial Overview */}
      <div>
        <h2 className="text-lg font-semibold mb-3">{t("bureau.financeHeading")}</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t("bureau.contributions")}</CardTitle>
            </CardHeader>
            <CardContent><div className="text-2xl font-bold text-green-600">{fmtMoney(stats.contributions, locale)} {t("bureau.currencyMad")}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t("bureau.donations")}</CardTitle>
            </CardHeader>
            <CardContent><div className="text-2xl font-bold text-blue-600">{fmtMoney(stats.donations, locale)} {t("bureau.currencyMad")}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t("bureau.expenses")}</CardTitle>
            </CardHeader>
            <CardContent><div className="text-2xl font-bold text-red-600">{fmtMoney(stats.expenses, locale)} {t("bureau.currencyMad")}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t("bureau.balance")}</CardTitle>
            </CardHeader>
            <CardContent><div className={`text-2xl font-bold ${balance >= 0 ? "text-green-600" : "text-red-600"}`}>{fmtMoney(balance, locale)} {t("bureau.currencyMad")}</div></CardContent>
          </Card>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3">{t("gov.dashboard.recentActivity")}</h2>
        <div className="space-y-1">
          {stats.recent.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">—</p>
          )}
          {stats.recent.map((r) => (
            <div key={r.id} className="flex items-center gap-2 rounded-md border bg-card px-3 py-1.5 text-xs">
              <span className="font-mono text-[10px] uppercase text-muted-foreground">{r.action}</span>
              <span className="font-medium">{r.entity}</span>
              <span className="ms-auto text-muted-foreground" dir="auto">👤 {r.userName} · {fmt(r.at)}</span>
            </div>
          ))}
        </div>
        <Link
          href="/bureau/audit"
          className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
        >
          {t("gov.dashboard.viewAuditLog")} <ChevronLeft size={11} />
        </Link>
      </div>
    </div>
  );
}
