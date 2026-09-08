import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getT } from "@/lib/i18n/server";
import { prisma } from "@/lib/prisma";
import { canManageGovernance, canViewGovernance } from "@/lib/rbac";
import { InvRegisterClient } from "./client";

export default async function InvRegisterPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (!canViewGovernance(session.user.roles)) redirect("/unauthorized");
  const { t } = await getT();

  const [registers, assets] = await Promise.all([
    prisma.inventoryRegister.findMany({
      orderBy: { snapshotAt: "desc" },
      include: { closedByUser: { select: { id: true, fullName: true } } },
    }),
    prisma.asset.findMany({ orderBy: { createdAt: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("gov.invRegister.title")}</h1>
        <p className="text-muted-foreground">{t("gov.invRegister.subtitle")}</p>
      </div>
      <InvRegisterClient
        initial={registers.map((r) => ({
          ...r,
          totalValue: Number(r.totalValue),
          snapshotAt: r.snapshotAt.toISOString().slice(0, 10),
          closedAt: r.closedAt?.toISOString() ?? null,
          createdAt: r.createdAt.toISOString(),
        }))}
        assets={assets.map((a) => ({
          id: a.id,
          name: a.name,
          category: a.category,
          quantity: a.quantity,
          value: a.value === null ? null : Number(a.value),
          location: a.location,
          condition: a.condition,
          acquiredAt: a.acquiredAt?.toISOString().slice(0, 10) ?? null,
        }))}
        canWrite={canManageGovernance(session.user.roles)}
      />
    </div>
  );
}
