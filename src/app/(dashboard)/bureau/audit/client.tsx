"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useT } from "@/components/i18n/provider";
import { ChevronLeft, ChevronRight, ShieldCheck } from "lucide-react";

export type AuditEntry = {
  id: string;
  entity: string;
  entityId: string | null;
  action: string;
  userId: string | null;
  before: unknown;
  after: unknown;
  ip: string | null;
  createdAt: string;
  user: { id: string; fullName: string; username: string } | null;
};

const ACTION_STYLES: Record<string, string> = {
  CREATE: "bg-green-100 text-green-800",
  UPDATE: "bg-blue-100 text-blue-800",
  DELETE: "bg-red-100 text-red-800",
  APPROVE: "bg-emerald-100 text-emerald-800",
  REJECT: "bg-amber-100 text-amber-800",
  LOGIN: "bg-slate-100 text-slate-700",
  LOGOUT: "bg-slate-100 text-slate-700",
};

export function AuditClient({
  initial,
  entityOptions,
  actionOptions,
  currentEntity,
  currentAction,
}: {
  initial: { logs: AuditEntry[]; total: number; page: number; pageSize: number };
  entityOptions: string[];
  actionOptions: string[];
  currentEntity: string;
  currentAction: string;
}) {
  const { t, locale } = useT();
  const [data] = useState(initial);
  const [entity, setEntity] = useState(currentEntity);
  const [action, setAction] = useState(currentAction);

  const fmt = (d: string) => new Date(d + "T12:00:00").toLocaleString(locale);
  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));

  function urlFor(p: number): string {
    const params = new URLSearchParams();
    if (entity) params.set("entity", entity);
    if (action) params.set("action", action);
    if (p > 1) params.set("page", String(p));
    return "/bureau/audit" + (params.toString() ? `?${params.toString()}` : "");
  }

  return (
    <div className="space-y-4">
      <form action="/bureau/audit" method="get" className="flex flex-wrap items-end gap-2">
        <div className="space-y-1.5">
          <label className="text-xs">{t("gov.audit.filterEntity")}</label>
          <select
            name="entity"
            value={entity}
            onChange={(e) => setEntity(e.target.value)}
            className="h-9 rounded-lg border bg-transparent px-2 text-sm"
          >
            <option value="">{t("members.all")}</option>
            {entityOptions.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs">{t("gov.audit.filterAction")}</label>
          <select
            name="action"
            value={action}
            onChange={(e) => setAction(e.target.value)}
            className="h-9 rounded-lg border bg-transparent px-2 text-sm"
          >
            <option value="">{t("members.all")}</option>
            {actionOptions.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit">{t("common.save")}</Button>
        <span className="ms-auto text-sm text-muted-foreground">
          {data.total} {t("gov.audit.title").toLowerCase()}
        </span>
      </form>

      <div className="space-y-2">
        {data.logs.length === 0 && (
          <p className="py-10 text-center text-muted-foreground">{t("gov.audit.none")}</p>
        )}
        {data.logs.map((l) => (
          <details key={l.id} className="rounded-xl border bg-card p-3">
            <summary className="flex flex-wrap cursor-pointer items-center gap-2">
              <ShieldCheck size={14} className="text-muted-foreground" />
              <Badge className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${ACTION_STYLES[l.action] ?? ""}`}>
                {l.action}
              </Badge>
              <span className="text-sm font-medium">{l.entity}</span>
              {l.entityId && <span className="text-[10px] text-muted-foreground" dir="ltr">#{l.entityId.slice(-8)}</span>}
              <span className="ms-auto text-xs text-muted-foreground" dir="ltr">{fmt(l.createdAt)}</span>
              {l.user && <span className="text-xs" dir="auto">👤 {l.user.fullName}</span>}
              {l.ip && <span className="text-[10px] text-muted-foreground" dir="ltr">{l.ip}</span>}
            </summary>
            <div className="mt-2 grid gap-2 text-xs md:grid-cols-2">
              {l.before !== null && (
                <pre className="rounded-md bg-red-50/40 p-2 dark:bg-red-950/20">
                  <span className="font-semibold text-red-700 dark:text-red-400">{t("gov.audit.before")}:</span>{"\n"}
                  {JSON.stringify(l.before, null, 2)}
                </pre>
              )}
              {l.after !== null && (
                <pre className="rounded-md bg-green-50/40 p-2 dark:bg-green-950/20">
                  <span className="font-semibold text-green-700 dark:text-green-400">{t("gov.audit.after")}:</span>{"\n"}
                  {JSON.stringify(l.after, null, 2)}
                </pre>
              )}
            </div>
          </details>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {data.page > 1 && (
            <Link href={urlFor(data.page - 1)}>
              <Button size="sm" variant="outline">
                <ChevronRight size={12} /> {locale === "fr" ? "Précédent" : "السابق"}
              </Button>
            </Link>
          )}
          <span className="text-sm text-muted-foreground">
            {data.page} / {totalPages}
          </span>
          {data.page < totalPages && (
            <Link href={urlFor(data.page + 1)}>
              <Button size="sm" variant="outline">
                {locale === "fr" ? "Suivant" : "التالي"} <ChevronLeft size={12} />
              </Button>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
