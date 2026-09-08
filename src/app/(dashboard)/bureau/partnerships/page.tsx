import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getT } from "@/lib/i18n/server";
import { prisma } from "@/lib/prisma";
import { canManageGovernance, canViewGovernance } from "@/lib/rbac";
import { PartnershipsClient } from "./client";

export default async function PartnershipsPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (!canViewGovernance(session.user.roles)) redirect("/unauthorized");
  const { t } = await getT();

  const partnerships = await prisma.partnership.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("gov.partnerships.title")}</h1>
        <p className="text-muted-foreground">{t("gov.partnerships.subtitle")}</p>
      </div>
      <PartnershipsClient
        initial={partnerships.map((p) => ({
          ...p,
          signedAt: p.signedAt?.toISOString().slice(0, 10) ?? null,
          startDate: p.startDate?.toISOString().slice(0, 10) ?? null,
          endDate: p.endDate?.toISOString().slice(0, 10) ?? null,
          createdAt: p.createdAt.toISOString(),
        }))}
        canWrite={canManageGovernance(session.user.roles)}
      />
    </div>
  );
}
