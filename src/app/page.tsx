import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getDefaultDashboard } from "@/lib/rbac";
import type { Role } from "@/lib/rbac";
import { PLANS } from "@/lib/plans";
import { getT } from "@/lib/i18n/server";

export default async function LandingPage() {
  const session = await auth();
  if (session) {
    redirect(getDefaultDashboard(session.user.roles as Role[]));
  }
  const { t } = await getT();

  const FEATURES = [
    { title: t("landing.features.members"), desc: t("landing.features.membersDesc") },
    { title: t("landing.features.attendance"), desc: t("landing.features.attendanceDesc") },
    { title: t("landing.features.finance"), desc: t("landing.features.financeDesc") },
    { title: t("landing.features.projects"), desc: t("landing.features.projectsDesc") },
    { title: t("landing.features.hifz"), desc: t("landing.features.hifzDesc") },
    { title: t("landing.features.permissions"), desc: t("landing.features.permissionsDesc") },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <span className="text-xl font-bold">{t("landing.brand")}</span>
          <nav className="flex items-center gap-2">
            <a href="#pricing" className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-muted">
              {t("landing.nav.pricing")}
            </a>
            <Link href="/login" className="inline-flex h-9 items-center justify-center rounded-lg border bg-background px-4 text-sm font-medium transition-colors hover:bg-muted">
              {t("landing.nav.login")}
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 py-20 text-center">
        <h1 className="mx-auto max-w-3xl text-4xl font-extrabold leading-tight md:text-5xl">
          {t("landing.hero.title")}
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          {t("landing.hero.subtitle")}
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/start"
            className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t("landing.hero.cta")}
          </Link>
          <a
            href="#features"
            className="inline-flex h-9 items-center justify-center rounded-lg border bg-background px-4 text-sm font-medium transition-colors hover:bg-muted"
          >
            {t("landing.hero.features")}
          </a>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">{t("landing.hero.trial")}</p>
      </section>

      {/* Features */}
      <section id="features" className="border-t bg-muted/40 py-20">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-3xl font-bold">{t("landing.features.title")}</h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-xl border bg-card p-6 shadow-sm">
                <h3 className="text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-3xl font-bold">{t("landing.pricing.title")}</h2>
          <p className="mt-3 text-center text-muted-foreground">{t("landing.pricing.subtitle")}</p>
          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {Object.values(PLANS)
              .filter((p) => p.key !== "CUSTOM")
              .map((plan, idx) => (
                <div key={plan.key} className={`relative rounded-xl border bg-card p-8 shadow-sm ${idx === 1 ? "ring-2 ring-primary" : ""}`}>
                  {idx === 1 && (
                    <span className="absolute -top-3 right-6 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                      {t("landing.pricing.popular")}
                    </span>
                  )}
                  <h3 className="text-xl font-bold">{t(`plan.${plan.key}.label`)}</h3>
                  <p className="mt-3">
                    <span className="text-3xl font-extrabold">
                      {plan.priceMad > 0 ? `${plan.priceMad} ${t("financial.mad")}` : `0 ${t("financial.mad")}`}
                    </span>{" "}
                    <span className="text-sm text-muted-foreground">
                      {plan.priceMad > 0 ? t("landing.pricing.perMonth") : t("landing.pricing.forever")}
                    </span>
                  </p>
                  <ul className="mt-6 space-y-3 text-sm">
                    {plan.features.map((_, fi) => (
                      <li key={fi} className="flex gap-2">
                        <span className="text-primary">✓</span>
                        <span>{t(`plan.${plan.key}.f${fi + 1}`)}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/start"
                    className={`${idx === 1 ? "bg-primary text-primary-foreground hover:bg-primary/90 border-transparent" : "hover:bg-muted"} mt-8 block w-full rounded-lg border px-4 py-2.5 text-center text-sm font-medium`}
                  >
                    {plan.priceMad > 0 ? t("landing.pricing.ctaTrial") : t("landing.pricing.ctaFree")}
                  </Link>
                </div>
              ))}
          </div>
          <p className="mt-8 text-center text-sm text-muted-foreground">{t("landing.pricing.federation")}</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{t("landing.brand")}</span>
          <div className="flex gap-4">
            <Link href="/terms" className="hover:text-foreground">{t("legal.terms.title")}</Link>
            <Link href="/privacy" className="hover:text-foreground">{t("legal.privacy.title")}</Link>
          </div>
          <span>© {new Date().getFullYear()} — {t("landing.footer.copyright")}</span>
        </div>
      </footer>
    </div>
  );
}
