import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

async function getBureauStats() {
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
  };
}

export default async function BureauDashboard() {
  const stats = await getBureauStats();
  const balance = stats.contributions + stats.donations - stats.expenses;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">المكتب المسير</h1>
        <p className="text-muted-foreground">نظرة عامة على أنشطة الجمعية</p>
      </div>

      {/* Members Overview */}
      <div>
        <h2 className="text-lg font-semibold mb-3">المنخرطين</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">الإجمالي</CardTitle>
            </CardHeader>
            <CardContent><div className="text-3xl font-bold">{stats.totalMembers}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">النشطون</CardTitle>
            </CardHeader>
            <CardContent><div className="text-3xl font-bold text-green-600">{stats.activeMembers}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">الأطفال</CardTitle>
            </CardHeader>
            <CardContent><div className="text-3xl font-bold">{stats.childMembers}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">الكبار</CardTitle>
            </CardHeader>
            <CardContent><div className="text-3xl font-bold">{stats.adultMembers}</div></CardContent>
          </Card>
        </div>
      </div>

      {/* Sections Overview */}
      <div>
        <h2 className="text-lg font-semibold mb-3">الأقسام</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">القسم التربوي</CardTitle>
            </CardHeader>
            <CardContent><div className="text-3xl font-bold">{stats.educationalCount}</div><p className="text-sm text-muted-foreground">منخرط</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">القسم الاجتماعي</CardTitle>
            </CardHeader>
            <CardContent><div className="text-3xl font-bold">{stats.socialCount}</div><p className="text-sm text-muted-foreground">منخرط</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">قسم القرآن الكريم</CardTitle>
            </CardHeader>
            <CardContent><div className="text-3xl font-bold">{stats.quranCount}</div><p className="text-sm text-muted-foreground">منخرط</p></CardContent>
          </Card>
        </div>
      </div>

      {/* Financial Overview */}
      <div>
        <h2 className="text-lg font-semibold mb-3">الوضعية المالية</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">المساهمات</CardTitle>
            </CardHeader>
            <CardContent><div className="text-2xl font-bold text-green-600">{stats.contributions.toFixed(2)} د.م</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">التبرعات</CardTitle>
            </CardHeader>
            <CardContent><div className="text-2xl font-bold text-blue-600">{stats.donations.toFixed(2)} د.م</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">المصاريف</CardTitle>
            </CardHeader>
            <CardContent><div className="text-2xl font-bold text-red-600">{stats.expenses.toFixed(2)} د.م</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">الرصيد</CardTitle>
            </CardHeader>
            <CardContent><div className={`text-2xl font-bold ${balance >= 0 ? "text-green-600" : "text-red-600"}`}>{balance.toFixed(2)} د.م</div></CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
