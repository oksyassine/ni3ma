import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getT } from "@/lib/i18n/server";
import { prisma } from "@/lib/prisma";
import { canManageGovernance, canViewGovernance } from "@/lib/rbac";
import { CampaignsClient } from "./client";

export default async function CampaignsPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (!canViewGovernance(session.user.roles)) redirect("/unauthorized");
  const { t } = await getT();

  const [campaigns, projects] = await Promise.all([
    prisma.donationCampaign.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        project: { select: { id: true, name: true } },
        donations: { where: { isPaid: true }, select: { amount: true } },
        _count: { select: { donations: true } },
      },
    }),
    prisma.socialProject.findMany({
      where: { isPublic: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("gov.campaigns.title")}</h1>
        <p className="text-muted-foreground">{t("gov.campaigns.subtitle")}</p>
      </div>
      <CampaignsClient
        initial={campaigns.map((c) => ({
          ...c,
          targetAmount: c.targetAmount === null ? null : Number(c.targetAmount),
          raised: c.donations.reduce((s, d) => s + Number(d.amount), 0),
          donationsCount: c._count.donations,
          startDate: c.startDate?.toISOString().slice(0, 10) ?? null,
          endDate: c.endDate?.toISOString().slice(0, 10) ?? null,
          createdAt: c.createdAt.toISOString(),
        }))}
        projects={projects}
        canWrite={canManageGovernance(session.user.roles)}
      />
    </div>
  );
}
