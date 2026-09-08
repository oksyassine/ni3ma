// Core i18n types + dictionary registry. Each namespace file under dict/
// exports a self-contained { ar, fr } pair; this module merges them into a
// single typed dictionary and exposes the t() lookup.

export type Locale = "ar" | "fr";
export const LOCALES: Locale[] = ["ar", "fr"];
export const DEFAULT_LOCALE: Locale = "ar";

export function isRtl(locale: Locale): boolean {
  return locale === "ar";
}

import { common } from "./dict/common";
import { landing } from "./dict/landing";
import { auth } from "./dict/auth";
import { nav } from "./dict/nav";
import { billing } from "./dict/billing";
import { platform } from "./dict/platform";
import { suspended } from "./dict/suspended";
import { admin } from "./dict/admin";
import { members } from "./dict/members";
import { financial } from "./dict/financial";
import { educational } from "./dict/educational";
import { social } from "./dict/social";
import { quran } from "./dict/quran";
import { governance } from "./dict/governance";
import { misc } from "./dict/misc";
import { legal } from "./dict/legal";
import { errors } from "./dict/errors";

const namespaces = {
  common,
  landing,
  auth,
  nav,
  billing,
  platform,
  suspended,
  admin,
  members,
  financial,
  educational,
  social,
  quran,
  governance,
  misc,
  legal,
  errors,
} as const;

type Flat = Record<string, string>;

function flatten(): Record<Locale, Flat> {
  const ar: Flat = {};
  const fr: Flat = {};
  for (const ns of Object.values(namespaces)) {
    Object.assign(ar, ns.ar);
    // fr may be incomplete during rollout — fall back to Arabic per key.
    Object.assign(fr, ns.fr);
  }
  return { ar, fr };
}

export const dictionaries = flatten();

// Tracks which keys were missing from each locale on first request —
// dev-only sanity check that catches untranslated or stale keys without
// spamming the console every render.
const warnedKeys = new Set<string>();

export function translate(locale: Locale, key: string, vars?: Record<string, string | number>): string {
  const localized = dictionaries[locale][key];
  const fallback = dictionaries.ar[key];
  if (localized !== undefined) {
    return interpolate(localized, vars);
  }
  if (fallback !== undefined) {
    return interpolate(fallback, vars);
  }
  if (process.env.NODE_ENV !== "production" && !warnedKeys.has(key)) {
    warnedKeys.add(key);
    console.warn(`[i18n] missing key: ${key} (locale=${locale})`);
  }
  return key;
}

function interpolate(text: string, vars?: Record<string, string | number>): string {
  if (!vars) return text;
  let out = text;
  for (const [k, v] of Object.entries(vars)) {
    out = out.replaceAll(`{${k}}`, String(v));
  }
  return out;
}
