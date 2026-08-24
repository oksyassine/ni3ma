"use server";

import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  DEFAULT_LOCALE,
  isRtl,
  translate,
  type Locale,
} from "./config";
import { LOCALE_COOKIE_CLIENT } from "./locale-cookie";

/**
 * Locale for the current request:
 *   1. user cookie (?lang= / switcher)
 *   2. association default (AssociationInfo.defaultLocale of the current tenant)
 *   3. platform default ("ar")
 */
export async function getLocale(): Promise<Locale> {
  try {
    const store = await cookies();
    const cookieVal = store.get(LOCALE_COOKIE_CLIENT)?.value;
    if (cookieVal === "ar" || cookieVal === "fr") return cookieVal;

    const info = await prisma.associationInfo.findUnique({
      where: { id: 1 },
      select: { defaultLocale: true },
    });
    if (info?.defaultLocale === "ar" || info?.defaultLocale === "fr") {
      return info.defaultLocale;
    }
  } catch {
    // outside request scope or DB unavailable
  }
  return DEFAULT_LOCALE;
}

/** Server-side translator bound to the request locale. */
export async function getT() {
  const locale = await getLocale();
  return {
    locale,
    rtl: isRtl(locale),
    t: (key: string, vars?: Record<string, string | number>) => translate(locale, key, vars),
  };
}
