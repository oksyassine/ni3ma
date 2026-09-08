import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getT } from "@/lib/i18n/server";
import { prisma } from "@/lib/prisma";
import { canManageGovernance, canViewGovernance } from "@/lib/rbac";
import { BranchesClient } from "./client";

export default async function BranchesPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (!canViewGovernance(session.user.roles)) redirect("/unauthorized");
  const { t } = await getT();

  const branches = await prisma.branch.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("gov.branches.title")}</h1>
        <p className="text-muted-foreground">{t("gov.branches.subtitle")}</p>
      </div>
      <BranchesClient
        initial={branches.map((b) => ({
          ...b,
          openedAt: b.openedAt?.toISOString().slice(0, 10) ?? null,
          createdAt: b.createdAt.toISOString(),
        }))}
        canWrite={canManageGovernance(session.user.roles)}
      />
    </div>
  );
}
