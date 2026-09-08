import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getT } from "@/lib/i18n/server";
import { prisma } from "@/lib/prisma";
import { canManageGovernance, canViewGovernance } from "@/lib/rbac";
import { MandatesClient } from "./client";

export default async function MandatesPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (!canViewGovernance(session.user.roles)) redirect("/unauthorized");
  const { t } = await getT();

  const [active, past] = await Promise.all([
    prisma.bureauMandate.findMany({
      where: { isActive: true },
      orderBy: [{ positionOrder: "asc" }, { startedAt: "desc" }],
    }),
    prisma.bureauMandate.findMany({
      where: { isActive: false },
      orderBy: { endedAt: "desc" },
      take: 100,
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("gov.mandates.title")}</h1>
        <p className="text-muted-foreground">{t("gov.mandates.subtitle")}</p>
      </div>
      <MandatesClient
        initialActive={active.map(serializeMandate)}
        initialPast={past.map(serializeMandate)}
        canWrite={canManageGovernance(session.user.roles)}
      />
    </div>
  );
}

function serializeMandate(m: {
  id: string;
  memberName: string;
  position: string;
  positionOrder: number;
  startedAt: Date;
  endedAt: Date | null;
  declaredAt: Date | null;
  isActive: boolean;
  notes: string | null;
}) {
  return {
    id: m.id,
    memberName: m.memberName,
    position: m.position,
    positionOrder: m.positionOrder,
    startedAt: m.startedAt.toISOString().slice(0, 10),
    endedAt: m.endedAt?.toISOString().slice(0, 10) ?? null,
    declaredAt: m.declaredAt?.toISOString().slice(0, 10) ?? null,
    isActive: m.isActive,
    notes: m.notes,
  };
}
