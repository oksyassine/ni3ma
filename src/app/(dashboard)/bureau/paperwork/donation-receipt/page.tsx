import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import { fmtDate, fmtMoney } from "@/lib/i18n/format";
import { prisma } from "@/lib/prisma";
import { canViewGovernance } from "@/lib/rbac";
import { normalizeHost, getTenantRecordForHost } from "@/lib/tenants";
import { ensureDonationReceipt } from "@/lib/receipts";
import { revalidateBureau } from "@/lib/revalidate";
import { PrintButton } from "../print-button";
import { DocFooter, DocHeader, DocSheet } from "../doc-shell";

// Spelled-out amounts in French & Arabic (the law requires cheques and
// receipts to write the amount in words as well as digits). Limited to
// the typical Moroccan association range; falls back to "{n} MAD" beyond.
function toArabicWords(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "صفر";
  const units = ["", "واحد", "اثنان", "ثلاثة", "أربعة", "خمسة", "ستة", "سبعة", "ثمانية", "تسعة", "عشرة"];
  const tens = ["", "عشرة", "عشرون", "ثلاثون", "أربعون", "خمسون", "ستون", "سبعون", "ثمانون", "تسعون"];
  const hundreds = ["", "مائة", "مائتان", "ثلاثمائة", "أربعمائة", "خمسمائة", "ستمائة", "سبعمائة", "ثمانمائة", "تسعمائة"];
  if (n < 11) return units[n];
  if (n < 20) return units[n - 10] + " عشر";
  if (n < 100) {
    const u = n % 10;
    return (u ? units[u] + " و" : "") + tens[Math.floor(n / 10)];
  }
  if (n < 1000) {
    const h = Math.floor(n / 100);
    const r = n % 100;
    return hundreds[h] + (r ? " و" + toArabicWords(r) : "");
  }
  if (n < 1_000_000) {
    const k = Math.floor(n / 1000);
    const r = n % 1000;
    return (k === 1 ? "ألف" : toArabicWords(k) + " آلاف") + (r ? " و" + toArabicWords(r) : "");
  }
  return String(n);
}

function toFrenchWords(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "zéro";
  const units = ["", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix",
    "onze", "douze", "treize", "quatorze", "quinze", "seize", "dix-sept", "dix-huit", "dix-neuf"];
  const tens = ["", "", "vingt", "trente", "quarante", "cinquante", "soixante", "soixante", "quatre-vingt", "quatre-vingt"];
  if (n < 20) return units[n];
  if (n < 100) {
    const t = Math.floor(n / 10), u = n % 10;
    if (t === 7 || t === 9) {
      const base = t === 7 ? "soixante" : "quatre-vingt";
      return base + (u === 1 && t === 7 ? "-et-onze" : "-" + (u ? units[u] : "dix"));
    }
    return tens[t] + (u ? "-" + units[u] : "");
  }
  if (n < 1000) {
    const h = Math.floor(n / 100), r = n % 100;
    return (h === 1 ? "cent" : units[h] + " cent" + (h > 1 ? "s" : "")) + (r ? " " + toFrenchWords(r) : "");
  }
  if (n < 1_000_000) {
    const k = Math.floor(n / 1000), r = n % 1000;
    return (k === 1 ? "mille" : toFrenchWords(k) + " mille") + (r ? " " + toFrenchWords(r) : "");
  }
  return String(n);
}

export default async function DonationReceiptPage({
  searchParams,
}: {
  searchParams: Promise<{ donation?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");
  if (!canViewGovernance(session.user.roles)) redirect("/unauthorized");
  const { t, locale } = await getT();
  const dir = locale === "fr" ? "ltr" : "rtl";
  const { donation: donationId } = await searchParams;

  if (!donationId) {
    return <MissingParam href="/bureau/paperwork" label={t("gov.paperwork.backToHub")} />;
  }

  const donation = await prisma.donation.findUnique({
    where: { id: donationId },
    include: { project: { select: { name: true } } },
  });
  if (!donation) return <MissingParam href="/bureau/paperwork" label={t("gov.paperwork.backToHub")} />;
  if (!donation.isPaid) {
    return <MissingParam href="/bureau/paperwork" label={t("gov.receipt.notFound")} />;
  }

  // Idempotently allocate a serial number.
  const receiptNumber = await ensureDonationReceipt(donation.id).catch((e: Error) => {
    console.error("ensureDonationReceipt failed", e);
    return null;
  });
  revalidateBureau("paperwork");

  const [associationInfo, tenant] = await Promise.all([
    prisma.associationInfo.findFirst(),
    associationNameFromHost(),
  ]);
  const name = associationInfo?.name ?? tenant?.name ?? "جمعية النعمة";

  const refDate = donation.paidAt ?? donation.donationDate;
  const amount = Number(donation.amount);
  const intPart = Math.floor(amount);
  const decimals = Math.round((amount - intPart) * 100);
  const dateStr = fmtDate(new Date(refDate.getTime() + 43_200_000), locale, { dateStyle: "long" });
  const todayStr = fmtDate(new Date(), locale, { dateStyle: "long" });
  const donorName = donation.isAnonymous ? (locale === "fr" ? "Anonyme" : "مجهول") : (donation.donorName ?? "—");
  const amountWords =
    locale === "fr"
      ? `${toFrenchWords(intPart)}${decimals ? ` et ${decimals} centimes` : ""}`
      : `${toArabicWords(intPart)}${decimals ? ` و${decimals} سنتيما` : ""}`;

  const purpose = donation.project
    ? t("gov.receipt.donationPurposeProject", { project: donation.project.name })
    : t("gov.receipt.donationPurposeGeneral");

  return (
    <div className="py-4">
      <PrintButton />
      <DocSheet>
        <DocHeader associationName={name} city={associationInfo?.city} />
        <h1 className="mt-8 text-center text-2xl font-extrabold underline" dir={dir}>
          {t("gov.receipt.donationHeader")}
        </h1>
        <p className="mx-auto mt-2 w-fit text-xs text-muted-foreground">
          {t("gov.receipt.donationSubtitle", { num: receiptNumber ?? "—" })}
        </p>

        <p className="mt-10 text-lg leading-[2.4]" dir={dir}>
          {t("gov.receipt.donationBody", {
            name,
            donor: donorName,
            amount: fmtMoney(amount, locale),
            words: amountWords,
            date: dateStr,
          })}
        </p>

        <table className="mt-6 w-full border-collapse text-sm" dir={dir}>
          <tbody>
            <tr>
              <td className="border-b border-black/40 py-1.5 align-top font-semibold">{t("gov.receipt.donationCIN")}</td>
              <td className="border-b border-black/40 py-1.5" dir="ltr">{donation.donorCin ?? "—"}</td>
            </tr>
            <tr>
              <td className="border-b border-black/40 py-1.5 align-top font-semibold">{t("gov.receipt.donationAddress")}</td>
              <td className="border-b border-black/40 py-1.5">{donation.donorAddress ?? "—"}</td>
            </tr>
            <tr>
              <td className="border-b border-black/40 py-1.5 align-top font-semibold">{t("gov.receipt.donationSubject")}</td>
              <td className="border-b border-black/40 py-1.5">{purpose}</td>
            </tr>
          </tbody>
        </table>

        <p className="mt-10 text-sm text-muted-foreground" dir={dir}>
          {t("gov.receipt.donationSignedAt", { city: associationInfo?.city ?? "—", date: todayStr })}
        </p>

        <DocFooter left={t("gov.receipt.donationTreasurer")} right="" />
      </DocSheet>
    </div>
  );
}

async function associationNameFromHost() {
  try {
    const h = await headers();
    const host = normalizeHost(h.get("host"));
    const tenant = host ? await getTenantRecordForHost(host) : null;
    return tenant;
  } catch {
    return null;
  }
}

function MissingParam({ href, label }: { href: string; label: string }) {
  return (
    <div className="py-16 text-center">
      <Link href={href} className="text-primary underline">{label}</Link>
    </div>
  );
}
