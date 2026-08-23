import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  const cards = [
    { title: "إجمالي المساهمات", value: `${stats.contributions.toFixed(2)} د.م`, href: "/financial/contributions", color: "text-green-600" },
    { title: "إجمالي المصاريف", value: `${stats.expenses.toFixed(2)} د.م`, href: "/financial/expenses", color: "text-red-600" },
    { title: "إجمالي التبرعات", value: `${stats.donations.toFixed(2)} د.م`, href: "/financial/donations", color: "text-blue-600" },
    { title: "الرصيد", value: `${balance.toFixed(2)} د.م`, href: "#", color: balance >= 0 ? "text-green-600" : "text-red-600" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">لوحة المالية</h1>
        <p className="text-muted-foreground">تتبع المساهمات والمصاريف والتبرعات</p>
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
              <CardTitle className="text-lg">المساهمات الأسبوعية</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">تسجيل ومتابعة المساهمات الأسبوعية للمنخرطين</p>
              <p className="text-sm mt-2">{stats.contributionCount} مساهمة مسجلة</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/financial/expenses">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardHeader>
              <CardTitle className="text-lg">المصاريف</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">تسجيل مصاريف الجمعية حسب القسم والصنف</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/financial/donations">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardHeader>
              <CardTitle className="text-lg">التبرعات</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">تسجيل التبرعات والمحسنين</p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
