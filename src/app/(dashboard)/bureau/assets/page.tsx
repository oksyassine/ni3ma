import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getT } from "@/lib/i18n/server";
import { prisma } from "@/lib/prisma";
import { canManageGovernance, canViewGovernance } from "@/lib/rbac";
import { AssetsClient } from "./client";

export default async function AssetsPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (!canViewGovernance(session.user.roles)) redirect("/unauthorized");
  const { t } = await getT();

  const assets = await prisma.asset.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("gov.assets.title")}</h1>
        <p className="text-muted-foreground">{t("gov.assets.subtitle")}</p>
      </div>
      <AssetsClient
        initial={assets.map((a) => ({
          id: a.id,
          name: a.name,
          category: a.category,
          quantity: a.quantity,
          value: a.value === null ? null : Number(a.value),
          serialNumber: a.serialNumber,
          location: a.location,
          condition: a.condition,
          acquiredAt: a.acquiredAt?.toISOString().slice(0, 10) ?? null,
          source: a.source,
          notes: a.notes,
        }))}
        canWrite={canManageGovernance(session.user.roles)}
      />
    </div>
  );
}
