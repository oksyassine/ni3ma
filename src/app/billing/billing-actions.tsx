"use client";

import { useState } from "react";
import { useT } from "@/components/i18n/provider";

type PlanCard = { key: string; label: string; priceMad: number; features: string[] };

export function BillingActions({
  plans,
  currentPlan,
  youcanConfigured,
}: {
  plans: PlanCard[];
  currentPlan: string;
  youcanConfigured: boolean;
}) {
  const { t } = useT();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function checkout(planKey: string, months: 1 | 12) {
    setBusy(planKey + months);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planKey, months }),
      });
      const json = await res.json();
      if (json.payUrl) {
        window.location.href = json.payUrl;
        return;
      }
      if (json.manual) setNotice(t("billing.manualNotice"));
      else setError(t("billing.checkoutFail"));
    } catch {
      setError(t("common.error"));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {plans
        .filter((p) => p.key !== "FREE")
        .map((p) => (
          <div key={p.key} className={`rounded-xl border bg-card p-6 ${p.key === currentPlan ? "ring-2 ring-primary" : ""}`}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">{p.label}</h3>
              {p.key === currentPlan && (
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{t("billing.currentBadge")}</span>
              )}
            </div>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              {p.features.map((f) => (
                <li key={f}>• {f}</li>
              ))}
            </ul>
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => checkout(p.key, 1)}
                disabled={busy !== null}
                className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {busy === p.key + "1" ? "..." : t("billing.payMonthly", { price: p.priceMad })}
              </button>
              <button
                onClick={() => checkout(p.key, 12)}
                disabled={busy !== null}
                className="flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium hover:bg-muted disabled:opacity-50"
              >
                {busy === p.key + "12" ? "..." : t("billing.payAnnual", { price: p.priceMad * 10 })}
              </button>
            </div>
          </div>
        ))}

      {!youcanConfigured && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 lg:col-span-2">
          {t("billing.manualNotice")}
        </div>
      )}
      {error && <p className="text-sm text-red-600 lg:col-span-2">{error}</p>}
      {notice && <p className="text-sm text-muted-foreground lg:col-span-2">{notice}</p>}
    </div>
  );
}
