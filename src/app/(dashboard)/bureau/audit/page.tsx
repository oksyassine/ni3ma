import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getT } from "@/lib/i18n/server";
import { prisma } from "@/lib/prisma";
import { canViewGovernance } from "@/lib/rbac";
import { AuditClient } from "./client";

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ entity?: string; action?: string; page?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");
  if (!canViewGovernance(session.user.roles)) redirect("/unauthorized");
  const { t } = await getT();

  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const where: Record<string, unknown> = {};
  if (sp.entity) where.entity = sp.entity;
  if (sp.action) where.action = sp.action;
  const PAGE = 100;

  const [logs, total, entityValues, actionValues] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { id: true, fullName: true, username: true } } },
      orderBy: { createdAt: "desc" },
      take: PAGE,
      skip: (page - 1) * PAGE,
    }),
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({ select: { entity: true }, distinct: ["entity"], orderBy: { entity: "asc" } }),
    prisma.auditLog.findMany({ select: { action: true }, distinct: ["action"], orderBy: { action: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("gov.audit.title")}</h1>
        <p className="text-muted-foreground">{t("gov.audit.subtitle")}</p>
      </div>
      <AuditClient
        initial={{
          logs: logs.map((l) => ({
            id: l.id,
            entity: l.entity,
            entityId: l.entityId,
            action: l.action,
            userId: l.userId,
            before: l.before,
            after: l.after,
            ip: l.ip,
            createdAt: l.createdAt.toISOString(),
            user: l.user ? { id: l.user.id, fullName: l.user.fullName, username: l.user.username } : null,
          })),
          total,
          page,
          pageSize: PAGE,
        }}
        entityOptions={entityValues.map((v) => v.entity).filter(Boolean)}
        actionOptions={actionValues.map((v) => v.action).filter(Boolean)}
        currentEntity={sp.entity ?? ""}
        currentAction={sp.action ?? ""}
      />
    </div>
  );
}
