import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AUDIT_ACTION_LABELS, AUDIT_ENTITY_LABELS } from "@/lib/audit";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getT } from "@/lib/i18n/server";

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ entity?: string; action?: string; page?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");
  if (!session.user.roles.includes("ADMIN")) redirect("/unauthorized");
  const { t } = await getT();

  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1") || 1);
  const pageSize = 50;
  const where: Record<string, unknown> = {};
  if (sp.entity) where.entity = sp.entity;
  if (sp.action) where.action = sp.action;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { fullName: true, username: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("admin.audit.title")}</h1>
        <p className="text-muted-foreground">{t("admin.audit.subtitle", { count: total })}</p>
      </div>

      <form className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="text-xs text-muted-foreground">{t("admin.audit.entity")}</label>
          <select
            name="entity"
            defaultValue={sp.entity ?? ""}
            className="w-full h-9 px-3 rounded-md border bg-background text-sm"
          >
            <option value="">{t("admin.audit.all")}</option>
            {Object.entries(AUDIT_ENTITY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="text-xs text-muted-foreground">{t("admin.audit.action")}</label>
          <select
            name="action"
            defaultValue={sp.action ?? ""}
            className="w-full h-9 px-3 rounded-md border bg-background text-sm"
          >
            <option value="">{t("admin.audit.all")}</option>
            {Object.entries(AUDIT_ACTION_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <button type="submit" className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm">
          {t("admin.audit.filter")}
        </button>
      </form>

      <div className="space-y-2">
        {logs.map((log) => (
          <Card key={log.id}>
            <CardContent className="py-3 flex flex-wrap items-center gap-3 text-sm">
              <Badge variant={log.action === "DELETE" ? "destructive" : "secondary"}>
                {AUDIT_ACTION_LABELS[log.action]}
              </Badge>
              <Badge variant="outline">
                {AUDIT_ENTITY_LABELS[log.entity] ?? log.entity}
              </Badge>
              <span className="text-muted-foreground">
                {log.user?.fullName ?? "—"}
              </span>
              {log.entityId && (
                <code className="text-xs text-muted-foreground">{log.entityId.slice(0, 10)}...</code>
              )}
              <span className="text-xs text-muted-foreground ms-auto">
                {new Date(log.createdAt).toLocaleString("ar-MA")}
              </span>
            </CardContent>
          </Card>
        ))}
        {logs.length === 0 && (
          <p className="text-center text-muted-foreground py-8">{t("admin.audit.empty")}</p>
        )}
      </div>

      {total > pageSize && (
        <div className="flex justify-center gap-2">
          {page > 1 && (
            <a
              href={`?${new URLSearchParams({ ...sp, page: String(page - 1) }).toString()}`}
              className="px-3 py-1 border rounded-md text-sm"
            >
              {t("admin.audit.prev")}
            </a>
          )}
          <span className="text-sm text-muted-foreground">{page} / {Math.ceil(total / pageSize)}</span>
          {page * pageSize < total && (
            <a
              href={`?${new URLSearchParams({ ...sp, page: String(page + 1) }).toString()}`}
              className="px-3 py-1 border rounded-md text-sm"
            >
              {t("admin.audit.next")}
            </a>
          )}
        </div>
      )}
    </div>
  );
}
