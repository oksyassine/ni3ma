"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { LOCALE_COOKIE_CLIENT } from "@/lib/i18n/locale-cookie";
import { useT } from "./provider";

// Sets the lang cookie then refreshes so server components re-render in the
// chosen language.
export function LocaleSwitcher({ locale }: { locale: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const { t } = useT();

  function switchTo(next: "ar" | "fr") {
    if (next === locale) return;
    document.cookie = `${LOCALE_COOKIE_CLIENT}=${next};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`;
    startTransition(() => router.refresh());
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
