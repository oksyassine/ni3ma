"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

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

function fmt(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("ar-MA");
}

export function PlatformTenantsTable({ initial }: { initial: TenantRow[] }) {
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
      if (!res.ok) throw new Error(json.error ?? "فشل تنفيذ العملية");
      setRows((prev) => prev.map((r) => (r.id === tenantId ? { ...r, ...json.tenant } : r)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ غير متوقع");
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
              <th className="p-3">الجمعية</th>
              <th className="p-3">العنوان</th>
              <th className="p-3">الخطة</th>
              <th className="p-3">الحالة</th>
              <th className="p-3">التجربة</th>
              <th className="p-3">الاشتراك حتى</th>
              <th className="p-3">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.id} className="border-t align-top">
                <td className="p-3">
                  <div className="font-semibold">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.city}</div>
                  {(t.contactName || t.contactPhone) && (
                    <div className="mt-1 text-xs text-muted-foreground">
                      {t.contactName} {t.contactPhone ? `· ${t.contactPhone}` : ""}
                    </div>
                  )}
                </td>
                <td dir="ltr" className="p-3 text-left text-xs">{t.slug}</td>
                <td className="p-3">{t.plan}</td>
                <td className="p-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[t.status] ?? ""}`}>
                    {t.status}
                  </span>
                  {t.lastProvisionError && (
                    <div dir="ltr" className="mt-1 max-w-[220px] truncate text-left text-[10px] text-red-500" title={t.lastProvisionError}>
                      {t.lastProvisionError}
                    </div>
                  )}
                </td>
                <td className="p-3 text-xs">{fmt(t.trialEndsAt)}</td>
                <td className="p-3 text-xs">{fmt(t.currentPeriodEnd)}</td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-1.5">
                    {t.status !== "ACTIVE" && (
                      <Button size="xs" disabled={busy !== null} onClick={() => act(t.id, "activate")}>
                        تفعيل
                      </Button>
                    )}
                    {t.status === "ACTIVE" && (
                      <Button size="xs" variant="destructive" disabled={busy !== null} onClick={() => act(t.id, "suspend")}>
                        إيقاف
                      </Button>
                    )}
                    {(t.status === "PENDING_PROVISIONING" || t.status === "PROVISION_FAILED") && (
                      <Button size="xs" variant="outline" disabled={busy !== null} onClick={() => act(t.id, "retry-provision")}>
                        إعادة المحاولة
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
