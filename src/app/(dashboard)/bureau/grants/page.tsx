import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getT } from "@/lib/i18n/server";
import { prisma } from "@/lib/prisma";
import { canManageGovernance, canViewGovernance } from "@/lib/rbac";
import { GrantsClient } from "./client";

export default async function GrantsPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (!canViewGovernance(session.user.roles)) redirect("/unauthorized");
  const { t } = await getT();

  const grants = await prisma.grant.findMany({
    orderBy: { createdAt: "desc" },
    include: { tranches: true },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("gov.grants.title")}</h1>
        <p className="text-muted-foreground">{t("gov.grants.subtitle")}</p>
      </div>
      <GrantsClient
        initial={grants.map((g) => ({
          id: g.id,
          funderName: g.funderName,
          funderKind: g.funderKind,
          projectName: g.projectName,
          reference: g.reference,
          amount: Number(g.amount),
          status: g.status,
          signedAt: g.signedAt?.toISOString().slice(0, 10) ?? null,
          startDate: g.startDate?.toISOString().slice(0, 10) ?? null,
          endDate: g.endDate?.toISOString().slice(0, 10) ?? null,
          contactName: g.contactName,
          contactPhone: g.contactPhone,
          notes: g.notes,
          tranches: g.tranches.map((tr) => ({
            label: tr.label,
            amount: Number(tr.amount),
            expectedAt: tr.expectedAt?.toISOString().slice(0, 10) ?? null,
            receivedAt: tr.receivedAt?.toISOString().slice(0, 10) ?? null,
            reportDueAt: tr.reportDueAt?.toISOString().slice(0, 10) ?? null,
            reportedAt: tr.reportedAt?.toISOString().slice(0, 10) ?? null,
            notes: tr.notes,
          })),
        }))}
        canWrite={canManageGovernance(session.user.roles)}
      />
    </div>
  );
}
