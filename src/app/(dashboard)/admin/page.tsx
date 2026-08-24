import { prisma } from "@/lib/prisma";
import { getT } from "@/lib/i18n/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

async function getStats() {
  const [totalMembers, activeMembers, childMembers, adultMembers] =
    await Promise.all([
      prisma.member.count(),
      prisma.member.count({ where: { isActive: true } }),
      prisma.member.count({ where: { memberType: "CHILD" } }),
      prisma.member.count({ where: { memberType: "ADULT" } }),
    ]);

  return { totalMembers, activeMembers, childMembers, adultMembers };
}

export default async function AdminDashboard() {
  const stats = await getStats();
  const { t } = await getT();

  const cards = [
    { title: t("admin.dashboard.totalMembers"), value: stats.totalMembers },
    { title: t("admin.dashboard.activeMembers"), value: stats.activeMembers },
    { title: t("admin.dashboard.children"), value: stats.childMembers },
    { title: t("admin.dashboard.adults"), value: stats.adultMembers },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("admin.dashboard.title")}</h1>
        <p className="text-muted-foreground">{t("admin.dashboard.overview")}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
