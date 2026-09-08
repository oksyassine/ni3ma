// Date utilities — Hijri (Umm al-Qura) conversion via Intl, available in
// Node 20+ and all modern browsers. Morocco uses the same civil-Islamic
// calendar for official communications (Ramadan, Aïd, Aïd al-Adha).
//
// `hijriDate(d)` returns the short Hijri string for a given Date, e.g.
// "13 ربيع الأول 1448 هـ" or "13 Rab. I 1448 AH" depending on locale.

const ARABIC_HIJRI = new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const FRENCH_HIJRI = new Intl.DateTimeFormat("fr-FR-u-ca-islamic-umalqura", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export function hijriDate(d: Date | string, locale: "ar" | "fr" = "ar"): string {
  const date = typeof d === "string" ? new Date(d + "T12:00:00") : d;
  try {
    return (locale === "fr" ? FRENCH_HIJRI : ARABIC_HIJRI).format(date);
  } catch {
    return "";
  }
}

export function hijriYear(d: Date | string): number {
  const date = typeof d === "string" ? new Date(d + "T12:00:00") : d;
  try {
    const parts = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", {
      year: "numeric",
    }).formatToParts(date);
    const yearPart = parts.find((p) => p.type === "year");
    return yearPart ? parseInt(yearPart.value, 10) : 0;
  } catch {
    return 0;
  }
}
