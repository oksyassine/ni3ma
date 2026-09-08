import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import { fmtDate } from "@/lib/i18n/format";
import { prisma } from "@/lib/prisma";
import { canViewGovernance } from "@/lib/rbac";
import { normalizeHost, getTenantRecordForHost } from "@/lib/tenants";
import { ensureBeneficiaryReceipt } from "@/lib/receipts";
import { revalidateBureau } from "@/lib/revalidate";
import { PrintButton } from "../print-button";
import { DocFooter, DocHeader, DocSheet } from "../doc-shell";

function toArabicWords(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "صفر";
  const u = ["", "واحد", "اثنان", "ثلاثة", "أربعة", "خمسة", "ستة", "سبعة", "ثمانية", "تسعة", "عشرة"];
  if (n < 11) return u[n];
  return `${n}`;
}
function toFrenchWords(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "zéro";
  return n < 20 ? ["un","deux","trois","quatre","cinq","six","sept","huit","neuf","dix","onze","douze","treize","quatorze","quinze","seize","dix-sept","dix-huit","dix-neuf"][n-1] : `${n}`;
}

export default async function BeneficiaryReceiptPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");
  if (!canViewGovernance(session.user.roles)) redirect("/unauthorized");
  const { t, locale } = await getT();
  const dir = locale === "fr" ? "ltr" : "rtl";
  const { id } = await searchParams;

  if (!id) {
    return <Missing href="/bureau/bene-receipts" label={t("gov.paperwork.backToHub")} />;
  }
  const receipt = await prisma.beneficiaryReceipt.findUnique({
    where: { id },
    include: { socialCase: { select: { fullName: true, caseNumber: true } } },
  });
  if (!receipt) return <Missing href="/bureau/bene-receipts" label={t("gov.paperwork.backToHub")} />;

  const receiptNumber = await ensureBeneficiaryReceipt(receipt.id).catch((e: Error) => {
    console.error("ensureBeneficiaryReceipt failed", e);
    return null;
  });
  revalidateBureau("bene-receipts");

  const [associationInfo, tenant] = await Promise.all([
    prisma.associationInfo.findFirst(),
    associationNameFromHost(),
  ]);
  const name = associationInfo?.name ?? tenant?.name ?? "جمعية النعمة";
  const value = receipt.estimatedValue === null ? 0 : Number(receipt.estimatedValue);
  const intPart = Math.floor(value);
  const decimals = Math.round((value - intPart) * 100);
  const todayStr = fmtDate(new Date(), locale, { dateStyle: "long" });
  const handedStr = fmtDate(new Date(receipt.handedAt.getTime() + 43_200_000), locale, { dateStyle: "long" });
  const words = locale === "fr"
    ? `${toFrenchWords(intPart)}${decimals ? ` et ${decimals} centimes` : ""}`
    : `${toArabicWords(intPart)}${decimals ? ` و${decimals} سنتيما` : ""}`;
  const valueText = value > 0 ? t("gov.beneReceipt.amountWords", { words }) : "—";

  return (
    <div className="py-4">
      <PrintButton />
      <DocSheet>
        <DocHeader associationName={name} city={associationInfo?.city} />
        <h1 className="mt-8 text-center text-2xl font-extrabold underline" dir={dir}>
          {t("gov.beneReceipt.printTitle")}
        </h1>
        <p className="mx-auto mt-2 w-fit text-xs text-muted-foreground">
          N° {receiptNumber ?? "—"}
        </p>

        <p className="mt-10 text-lg leading-[2.4]" dir={dir} style={{ whiteSpace: "pre-line" }}>
          {t("gov.beneReceipt.printBody", {
            name,
            beneficiary: receipt.beneficiaryName,
            cin: receipt.recipientCin ?? "—",
            description: receipt.description,
            date: handedStr,
            value: valueText,
          })}
        </p>

        {receipt.socialCase && (
          <p className="mt-4 text-sm text-muted-foreground" dir="auto">
            ({t("gov.beneReceipt.caseNumber")} #{receipt.socialCase.caseNumber} — {receipt.socialCase.fullName})
          </p>
        )}

        <p className="mt-10 text-sm text-muted-foreground" dir={dir}>
          {t("gov.paperwork.certCityLine", { city: associationInfo?.city ?? "—", date: todayStr })}
        </p>

        <DocFooter
          left={t("gov.paperwork.signaturePresident")}
          right={t("gov.beneReceipt.recipientSign")}
        />
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

function Missing({ href, label }: { href: string; label: string }) {
  return (
    <div className="py-16 text-center">
      <Link href={href} className="text-primary underline">{label}</Link>
    </div>
  );
}
