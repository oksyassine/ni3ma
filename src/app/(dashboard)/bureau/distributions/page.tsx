import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getT } from "@/lib/i18n/server";
import { prisma } from "@/lib/prisma";
import { canManageGovernance, canViewGovernance } from "@/lib/rbac";
import { DistributionsClient } from "./client";

export default async function DistributionsPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (!canViewGovernance(session.user.roles)) redirect("/unauthorized");
  const { t } = await getT();

  const campaigns = await prisma.distributionCampaign.findMany({
    orderBy: { createdAt: "desc" },
    include: { entries: { orderBy: { createdAt: "asc" } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("gov.distributions.title")}</h1>
        <p className="text-muted-foreground">{t("gov.distributions.subtitle")}</p>
      </div>
      <DistributionsClient
        initial={campaigns.map((c) => ({
          id: c.id,
          kind: c.kind,
          name: c.name,
          yearLabel: c.yearLabel,
          unitLabel: c.unitLabel,
          plannedUnits: c.plannedUnits,
          budget: c.budget === null ? null : Number(c.budget),
          startDate: c.startDate?.toISOString().slice(0, 10) ?? null,
          endDate: c.endDate?.toISOString().slice(0, 10) ?? null,
          notes: c.notes,
          entries: c.entries.map((e) => ({
            beneficiaryName: e.beneficiaryName,
            quantity: e.quantity,
            note: e.note,
          })),
        }))}
        canWrite={canManageGovernance(session.user.roles)}
      />
    </div>
  );
}
