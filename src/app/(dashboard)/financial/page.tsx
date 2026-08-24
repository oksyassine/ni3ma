import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getT } from "@/lib/i18n/server";
import Link from "next/link";

async function getFinancialStats() {
  const [totalContributions, totalExpenses, totalDonations, recentContributions] =
    await Promise.all([
      prisma.weeklyContribution.aggregate({ _sum: { amount: true } }),
      prisma.expense.aggregate({ _sum: { amount: true } }),
      prisma.donation.aggregate({ _sum: { amount: true } }),
      prisma.weeklyContribution.count(),
    ]);

  return {
    contributions: Number(totalContributions._sum.amount ?? 0),
    expenses: Number(totalExpenses._sum.amount ?? 0),
    donations: Number(totalDonations._sum.amount ?? 0),
    contributionCount: recentContributions,
  };
}

export default async function FinancialDashboard() {
  const stats = await getFinancialStats();
  const balance = stats.contributions + stats.donations - stats.expenses;
  const { t } = await getT();

  const cards = [
    { title: t("financial.totalContributions"), value: `${stats.contributions.toFixed(2)} ${t("financial.mad")}`, href: "/financial/contributions", color: "text-green-600" },
    { title: t("financial.totalExpenses"), value: `${stats.expenses.toFixed(2)} ${t("financial.mad")}`, href: "/financial/expenses", color: "text-red-600" },
    { title: t("financial.totalDonations"), value: `${stats.donations.toFixed(2)} ${t("financial.mad")}`, href: "/financial/donations", color: "text-blue-600" },
    { title: t("financial.balance"), value: `${balance.toFixed(2)} ${t("financial.mad")}`, href: "#", color: balance >= 0 ? "text-green-600" : "text-red-600" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("financial.dashboardTitle")}</h1>
        <p className="text-muted-foreground">{t("financial.dashboardSubtitle")}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Link key={card.title} href={card.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/financial/contributions">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardHeader>
              <CardTitle className="text-lg">{t("financial.weeklyContributions")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">{t("financial.weeklyContributionsDesc")}</p>
              <p className="text-sm mt-2">{t("financial.recordedCount", { count: stats.contributionCount })}</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/financial/expenses">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardHeader>
              <CardTitle className="text-lg">{t("financial.expensesTitle")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">{t("financial.expensesDesc")}</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/financial/donations">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardHeader>
              <CardTitle className="text-lg">{t("financial.donationsTitle")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">{t("financial.donationsDesc")}</p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
