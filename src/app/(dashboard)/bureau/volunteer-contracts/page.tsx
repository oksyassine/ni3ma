import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getT } from "@/lib/i18n/server";
import { prisma } from "@/lib/prisma";
import { canManageGovernance, canViewGovernance } from "@/lib/rbac";
import { ContractsClient } from "./client";

export default async function VolunteerContractsPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (!canViewGovernance(session.user.roles)) redirect("/unauthorized");
  const { t } = await getT();

  const contracts = await prisma.volunteerContract.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("gov.vcontracts.title")}</h1>
        <p className="text-muted-foreground">{t("gov.vcontracts.subtitle")}</p>
      </div>
      <ContractsClient
        initial={contracts.map((c) => ({
          ...c,
          birthDate: c.birthDate?.toISOString().slice(0, 10) ?? null,
          weeklyHours: c.weeklyHours === null ? null : Number(c.weeklyHours),
          startDate: c.startDate.toISOString().slice(0, 10),
          endDate: c.endDate?.toISOString().slice(0, 10) ?? null,
          signedAt: c.signedAt?.toISOString().slice(0, 10) ?? null,
          createdAt: c.createdAt.toISOString(),
        }))}
        canWrite={canManageGovernance(session.user.roles)}
      />
    </div>
  );
}
