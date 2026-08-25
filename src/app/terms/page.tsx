import { getT } from "@/lib/i18n/server";
import Link from "next/link";

export default async function TermsPage() {
  const { t, locale } = await getT();
  const ar = locale !== "fr";
  const date = new Intl.DateTimeFormat(ar ? "ar-MA" : "fr-MA", { dateStyle: "long" }).format(new Date());
  const sections = ["intro", "account", "data", "availability", "billing", "law"] as const;

  return (
    <div className="mx-auto max-w-2xl px-4 py-14">
      <h1 className="text-3xl font-extrabold">{t("legal.terms.title")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("legal.updated", { date })}</p>
      <div className="mt-8 space-y-8">
        {sections.map((s) => (
          <section key={s}>
            <h2 className="text-lg font-bold">{t(`legal.terms.${s}`)}</h2>
            <p className="mt-2 leading-relaxed text-muted-foreground">{t(`legal.terms.${s}Body`)}</p>
          </section>
        ))}
      </div>
      <p className="mt-10">
        <Link href="/privacy" className="text-sm underline">
          {t("legal.privacy.title")}
        </Link>
      </p>
      <Link href="/" className="mt-4 inline-block text-sm text-muted-foreground underline">
        {t("legal.backHome")}
      </Link>
    </div>
  );
}
