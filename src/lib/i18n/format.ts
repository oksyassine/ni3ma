import type { Locale } from "./config";

// Locale-tag helper used by every locale-aware formatter. Falls back to
// "ar-MA" for any unrecognized locale (including future locales that
// haven't been translated yet).
export function localeTag(locale: string): string {
  if (locale === "fr") return "fr-MA";
  if (locale === "ar") return "ar-MA";
  return locale;
}

export function dirFor(locale: string): "ltr" | "rtl" {
  return locale === "fr" ? "ltr" : "rtl";
}

export function fmtMoney(n: number | null | undefined, locale: string, fractionDigits = 2): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "0";
  return n.toLocaleString(localeTag(locale), {
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits,
  });
}

export function fmtDate(d: Date | string | number | null | undefined, locale: string, opts?: Intl.DateTimeFormatOptions): string {
  if (d === null || d === undefined) return "";
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(localeTag(locale), opts);
}

export function fmtTime(d: Date | string | number | null | undefined, locale: string, opts?: Intl.DateTimeFormatOptions): string {
  if (d === null || d === undefined) return "";
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString(localeTag(locale), opts);
}

export function fmtMonthYear(year: number, month: number, locale: string): string {
  // month is 1-based (1=Jan). Intl uses 0-based.
  return new Date(year, month - 1, 1).toLocaleDateString(localeTag(locale), {
    year: "numeric",
    month: "long",
  });
}

export function currencyLabel(locale: Locale): string {
  return locale === "fr" ? "MAD" : "درهم";
}
