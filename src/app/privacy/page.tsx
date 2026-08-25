import { getT } from "@/lib/i18n/server";
import Link from "next/link";

export default async function PrivacyPage() {
  const { t, locale } = await getT();
  const ar = locale !== "fr";
  const date = new Intl.DateTimeFormat(ar ? "ar-MA" : "fr-MA", { dateStyle: "long" }).format(new Date());
  const sections = ["collect", "use", "isolation", "security", "rights"] as const;

  return (
    <div className="mx-auto max-w-2xl px-4 py-14">
      <h1 className="text-3xl font-extrabold">{t("legal.privacy.title")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("legal.updated", { date })}</p>
      <p className="mt-6 leading-relaxed">{t("legal.privacy.intro")}</p>
      <div className="mt-8 space-y-8">
        {sections.map((s) => (
          <section key={s}>
            <h2 className="text-lg font-bold">{t(`legal.privacy.${s}`)}</h2>
            <p className="mt-2 leading-relaxed text-muted-foreground">{t(`legal.privacy.${s}Body`)}</p>
          </section>
        ))}
        <section>
          <h2 className="text-lg font-bold">{t("legal.privacy.contact")}</h2>
          {/* TODO: replace with the official contact before launch */}
          <p className="mt-2 leading-relaxed text-muted-foreground">contact@neimaa.ma</p>
        </section>
      </div>
      <Link href="/" className="mt-12 inline-block text-sm text-muted-foreground underline">
        {t("legal.backHome")}
      </Link>
    </div>
  );
}
