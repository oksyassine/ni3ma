import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getT } from "@/lib/i18n/server";
import { prisma } from "@/lib/prisma";
import { canManageGovernance, canViewGovernance } from "@/lib/rbac";
import { BeneReceiptsClient } from "./client";

export default async function BeneReceiptsPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (!canViewGovernance(session.user.roles)) redirect("/unauthorized");
  const { t } = await getT();

  const [receipts, cases, campaigns] = await Promise.all([
    prisma.beneficiaryReceipt.findMany({
      orderBy: { handedAt: "desc" },
      include: {
        socialCase: { select: { id: true, fullName: true, caseNumber: true } },
        campaign: { select: { id: true, name: true } },
      },
    }),
    prisma.socialCase.findMany({
      select: { id: true, fullName: true, caseNumber: true },
      orderBy: { caseNumber: "asc" },
      take: 2000,
    }),
    prisma.distributionCampaign.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
      take: 200,
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("gov.beneReceipt.title")}</h1>
        <p className="text-muted-foreground">{t("gov.beneReceipt.subtitle")}</p>
      </div>
      <BeneReceiptsClient
        initial={receipts.map((r) => ({
          ...r,
          estimatedValue: r.estimatedValue === null ? null : Number(r.estimatedValue),
          handedAt: r.handedAt.toISOString().slice(0, 10),
          createdAt: r.createdAt.toISOString(),
        }))}
        cases={cases}
        campaigns={campaigns}
        canWrite={canManageGovernance(session.user.roles)}
      />
    </div>
  );
}
