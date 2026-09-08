import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTenantContext } from "@/lib/tenants";
import { prisma } from "@/lib/prisma";
import { PLANS } from "@/lib/plans";
import { youcanPayConfigured } from "@/lib/payments/youcan";
import { BillingActions } from "./billing-actions";
import { getT } from "@/lib/i18n/server";

export default async function BillingPage() {
  const session = await auth();
  if (!session) redirect("/login");
  const { t, locale } = await getT();

  const tenant = await getTenantContext();

  // Usage comes from the current request's tenant DB via the facade.
  const memberCount = await prisma.member.count({ where: { isActive: true } });

  const planKey = tenant?.plan ?? "FREE";
  const plan = PLANS[planKey];
  const cap = plan.memberCap;
  const paidUntil = tenant?.currentPeriodEnd ?? null;
  // eslint-disable-next-line react-hooks/purity -- server component; evaluated per request
  const trialLeft = tenant?.trialEndsAt ? Math.max(0, Math.ceil((tenant.trialEndsAt.getTime() - Date.now()) / 86_400_000)) : null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-extrabold">{t("billing.title")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {tenant ? `${t("billing.space")}: ${tenant.name} (${tenant.slug})` : t("billing.tenantsOnly")}
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-5">
          <p className="text-sm text-muted-foreground">{t("billing.currentPlan")}</p>
          <p className="mt-1 text-xl font-bold">{t(`plan.${planKey}.label`)}</p>
          {!tenant && <p className="mt-1 text-xs text-muted-foreground">{t("billing.mainPlatform")}</p>}
        </div>
        <div className="rounded-xl border bg-card p-5">
          <p className="text-sm text-muted-foreground">{t("billing.activeMembers")}</p>
          <p className="mt-1 text-xl font-bold">
            {memberCount}
            {cap !== null ? <span className="text-sm font-normal text-muted-foreground"> / {cap}</span> : null}
          </p>
          {cap !== null && (
            <div className="mt-2 h-1.5 w-full rounded-full bg-muted">
              <div
                className={`h-1.5 rounded-full ${memberCount / cap > 0.9 ? "bg-red-500" : "bg-primary"}`}
                style={{ width: `${Math.min(100, (memberCount / cap) * 100)}%` }}
              />
            </div>
          )}
        </div>
        <div className="rounded-xl border bg-card p-5">
          <p className="text-sm text-muted-foreground">{t("billing.validUntil")}</p>
          <p className="mt-1 font-bold">
            {paidUntil ? new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(paidUntil) : "—"}
          </p>
          {trialLeft !== null && !paidUntil && (
            <p className="mt-1 text-xs text-muted-foreground">{t("billing.trialLeft", { days: trialLeft ?? 0 })}</p>
          )}
        </div>
      </div>

      <h2 className="mt-12 text-lg font-bold">{t("billing.changePlan")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {t("billing.changeNote")}
      </p>
      <div className="mt-6">
        <BillingActions
          plans={Object.values(PLANS).map((p) => ({
            key: p.key,
            label: t(`plan.${p.key}.label`),
            priceMad: p.priceMad,
            features: p.features.map((_, i) => t(`plan.${p.key}.f${i + 1}`)),
          }))}
          currentPlan={planKey}
          youcanConfigured={youcanPayConfigured()}
        />
      </div>
    </div>
  );
}
