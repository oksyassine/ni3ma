"use client";

import { useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { LOCALE_COOKIE_CLIENT } from "@/lib/i18n/locale-cookie";
import { useT } from "./provider";
import type { Locale } from "@/lib/i18n/config";

// Sets the lang cookie then refreshes so server components re-render in the
// chosen language. The cookie is scoped to the root domain (when configured)
// so the choice follows the user across tenant subdomains.
export function LocaleSwitcher({ locale }: { locale: Locale }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const { t } = useT();
  // Optimistic locale flips immediately so consumers (sidebar direction,
  // rtl-aware CSS) update without waiting for the router.refresh().
  const [optimisticLocale, setOptimisticLocale] = useOptimistic(locale);

  function switchTo(next: Locale) {
    if (next === locale) return;
    const root = (process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "").toLowerCase().replace(/^www\./, "");
    const domainAttr = root ? `;domain=.${root}` : "";
    document.cookie = `${LOCALE_COOKIE_CLIENT}=${next};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax${domainAttr}`;
    startTransition(() => {
      setOptimisticLocale(next);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-1" aria-label={t("common.language")}>
      <Button
        size="xs"
        variant={locale === "ar" ? "default" : "ghost"}
        disabled={pending}
        onClick={() => switchTo("ar")}
      >
        ع
      </Button>
      <Button
        size="xs"
        variant={locale === "fr" ? "default" : "ghost"}
        disabled={pending}
        onClick={() => switchTo("fr")}
      >
        <span dir="ltr">Fr</span>
      </Button>
    </div>
  );
}
