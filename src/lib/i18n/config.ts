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
  misc,
  legal,
  errors,
};

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

export function translate(locale: Locale, key: string, vars?: Record<string, string | number>): string {
  let text = dictionaries[locale][key] ?? dictionaries.ar[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replaceAll(`{${k}}`, String(v));
    }
  }
  return text;
}
