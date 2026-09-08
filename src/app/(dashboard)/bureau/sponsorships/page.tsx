import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getT } from "@/lib/i18n/server";
import { prisma } from "@/lib/prisma";
import { canManageGovernance, canViewGovernance } from "@/lib/rbac";
import { SponsorshipsClient } from "./client";

export default async function SponsorshipsPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (!canViewGovernance(session.user.roles)) redirect("/unauthorized");
  const { t } = await getT();

  const sponsorships = await prisma.sponsorship.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("gov.sponsorships.title")}</h1>
        <p className="text-muted-foreground">{t("gov.sponsorships.subtitle")}</p>
      </div>
      <SponsorshipsClient
        initial={sponsorships.map((s) => ({
          id: s.id,
          kind: s.kind,
          beneficiaryName: s.beneficiaryName,
          sponsorName: s.sponsorName,
          sponsorPhone: s.sponsorPhone,
          monthlyAmount: Number(s.monthlyAmount),
          dayOfMonth: s.dayOfMonth,
          startedAt: s.startedAt.toISOString().slice(0, 10),
          endedAt: s.endedAt?.toISOString().slice(0, 10) ?? null,
          status: s.status,
          notes: s.notes,
        }))}
        canWrite={canManageGovernance(session.user.roles)}
      />
    </div>
  );
}
