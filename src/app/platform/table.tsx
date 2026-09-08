"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useT } from "@/components/i18n/provider";
import { fmtDate } from "@/lib/i18n/format";

export type TenantRow = {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  plan: string;
  status: string;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  lastProvisionError: string | null;
  createdAt: string;
};

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-800",
  PENDING_PROVISIONING: "bg-amber-100 text-amber-800",
  PROVISION_FAILED: "bg-red-100 text-red-800",
  SUSPENDED: "bg-gray-200 text-gray-700",
};

function fmt(d: string | null, locale: string): string {
  if (!d) return "—";
  return fmtDate(d, locale);
}

export function PlatformTenantsTable({ initial }: { initial: TenantRow[] }) {
  const { t, locale } = useT();
  const [rows, setRows] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function act(tenantId: string, action: string) {
    setBusy(tenantId + action);
    setError(null);
    try {
      const res = await fetch("/api/platform/tenants", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId, action }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? t("platform.actionFailed"));
      setRows((prev) => prev.map((r) => (r.id === tenantId ? { ...r, ...json.tenant } : r)));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("common.error"));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-6">
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-right text-xs text-muted-foreground">
            <tr>
              <th className="p-3">{t("platform.table.association")}</th>
              <th className="p-3">{t("platform.table.slug")}</th>
              <th className="p-3">{t("platform.table.plan")}</th>
              <th className="p-3">{t("platform.table.status")}</th>
              <th className="p-3">{t("platform.table.trial")}</th>
              <th className="p-3">{t("platform.table.paidUntil")}</th>
              <th className="p-3">{t("platform.table.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((tr) => (
              <tr key={tr.id} className="border-t align-top">
                <td className="p-3">
                  <div className="font-semibold">{tr.name}</div>
                  <div className="text-xs text-muted-foreground">{tr.city}</div>
                  {(tr.contactName || tr.contactPhone) && (
                    <div className="mt-1 text-xs text-muted-foreground">
                      {tr.contactName} {tr.contactPhone ? `· ${tr.contactPhone}` : ""}
                    </div>
                  )}
                </td>
                <td dir="ltr" className="p-3 text-left text-xs">{tr.slug}</td>
                <td className="p-3">{tr.plan}</td>
                <td className="p-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[tr.status] ?? ""}`}>
                    {tr.status}
                  </span>
                  {tr.lastProvisionError && (
                    <div dir="ltr" className="mt-1 max-w-[220px] truncate text-left text-[10px] text-red-500" title={tr.lastProvisionError}>
                      {tr.lastProvisionError}
                    </div>
                  )}
                </td>
                <td className="p-3 text-xs">{fmt(tr.trialEndsAt, locale)}</td>
                <td className="p-3 text-xs">{fmt(tr.currentPeriodEnd, locale)}</td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-1.5">
                    {tr.status !== "ACTIVE" && (
                      <Button size="xs" disabled={busy !== null} onClick={() => act(tr.id, "activate")}>
                        {t("platform.action.activate")}
                      </Button>
                    )}
                    {tr.status === "ACTIVE" && (
                      <Button size="xs" variant="destructive" disabled={busy !== null} onClick={() => act(tr.id, "suspend")}>
                        {t("platform.action.suspend")}
                      </Button>
                    )}
                    {(tr.status === "PENDING_PROVISIONING" || tr.status === "PROVISION_FAILED") && (
                      <Button size="xs" variant="outline" disabled={busy !== null} onClick={() => act(tr.id, "retry-provision")}>
                        {t("platform.action.retryProvision")}
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
