"use client";

import { createContext, useContext } from "react";
import { translate } from "@/lib/i18n/config";

type Ctx = { locale: string };

const I18nContext = createContext<Ctx>({ locale: "ar" });

// Provided once from the root layout with the request locale. Client
// components call useT() to translate keys against the merged dictionaries
// (bundled — small, plain string maps).
export function I18nProvider({
  locale,
  children,
}: {
  locale: string;
  children: React.ReactNode;
}) {
  return <I18nContext.Provider value={{ locale }}>{children}</I18nContext.Provider>;
}

export function useT() {
  const { locale } = useContext(I18nContext);
  const rtl = locale === "ar";
  return {
    locale,
    rtl,
    t: (key: string, vars?: Record<string, string | number>) => translate(locale as "ar" | "fr", key, vars),
  };
}
