import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import { fmtDate, fmtMoney } from "@/lib/i18n/format";
import { prisma } from "@/lib/prisma";
import { canViewGovernance } from "@/lib/rbac";
import { normalizeHost, getTenantRecordForHost } from "@/lib/tenants";
import { ensureContributionReceipt } from "@/lib/receipts";
import { revalidateBureau } from "@/lib/revalidate";
import { PrintButton } from "../print-button";
import { DocFooter, DocHeader, DocSheet } from "../doc-shell";

export default async function ContributionReceiptPage({
  searchParams,
}: {
  searchParams: Promise<{ contribution?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");
  if (!canViewGovernance(session.user.roles)) redirect("/unauthorized");
  const { t, locale } = await getT();
  const dir = locale === "fr" ? "ltr" : "rtl";
  const { contribution: contributionId } = await searchParams;

  if (!contributionId) {
    return <MissingParam href="/bureau/paperwork" label={t("gov.paperwork.backToHub")} />;
  }

  const contribution = await prisma.weeklyContribution.findUnique({
    where: { id: contributionId },
    include: { member: { select: { fullName: true, registrationNumber: true } } },
  });
  if (!contribution) return <MissingParam href="/bureau/paperwork" label={t("gov.paperwork.backToHub")} />;

  const quittanceNumber = await ensureContributionReceipt(contribution.id).catch((e: Error) => {
    console.error("ensureContributionReceipt failed", e);
    return null;
  });
  revalidateBureau("paperwork");

  const [associationInfo, tenant] = await Promise.all([
    prisma.associationInfo.findFirst(),
    associationNameFromHost(),
  ]);
  const name = associationInfo?.name ?? tenant?.name ?? "جمعية النعمة";

  const amount = Number(contribution.amount);
  const intPart = Math.floor(amount);
  const decimals = Math.round((amount - intPart) * 100);
  const todayStr = fmtDate(new Date(), locale, { dateStyle: "long" });

  // Period: render as ISO week label.
  const periodStr = contribution.weekStart.toISOString().slice(0, 10);

  // Reuse the FR words helper (smaller) inline. AR words are simpler here.
  const wordsAr = (n: number) => n === 0 ? "صفر" : n === 1 ? "واحد" : n === 2 ? "اثنان" : n < 11 ? ["ثلاثة","أربعة","خمسة","ستة","سبعة","ثمانية","تسعة","عشرة"][n-3] : `${n}`;
  const wordsFr = (n: number) => n === 0 ? "zéro" : n < 20 ? ["un","deux","trois","quatre","cinq","six","sept","huit","neuf","dix","onze","douze","treize","quatorze","quinze","seize","dix-sept","dix-huit","dix-neuf"][n-1] : `${n}`;
  const amountWords = locale === "fr"
    ? `${wordsFr(intPart)}${decimals ? ` et ${decimals} centimes` : ""}`
    : `${wordsAr(intPart)}${decimals ? ` و${decimals} سنتيما` : ""}`;

  return (
    <div className="py-4">
      <PrintButton />
      <DocSheet>
        <DocHeader associationName={name} city={associationInfo?.city} />
        <h1 className="mt-8 text-center text-2xl font-extrabold underline" dir={dir}>
          {t("gov.receipt.contributionHeader")}
        </h1>
        <p className="mx-auto mt-2 w-fit text-xs text-muted-foreground">
          {t("gov.receipt.contributionSubtitle", { num: quittanceNumber ?? "—" })}
        </p>

        <p className="mt-10 text-lg leading-[2.4]" dir={dir}>
          {t("gov.receipt.contributionBody", {
            name,
            member: contribution.member.fullName,
            amount: fmtMoney(amount, locale),
            words: amountWords,
            period: periodStr,
          })}
        </p>

        <table className="mt-6 w-full border-collapse text-sm" dir={dir}>
          <tbody>
            <tr>
              <td className="border-b border-black/40 py-1.5 align-top font-semibold">{t("gov.receipt.registrationNumber")}</td>
              <td className="border-b border-black/40 py-1.5" dir="ltr">{contribution.member.registrationNumber}</td>
            </tr>
            <tr>
              <td className="border-b border-black/40 py-1.5 align-top font-semibold">{t("gov.receipt.contributionPeriod")}</td>
              <td className="border-b border-black/40 py-1.5" dir="ltr">{periodStr}</td>
            </tr>
          </tbody>
        </table>

        <p className="mt-10 text-sm text-muted-foreground" dir={dir}>
          {t("gov.receipt.contributionSignedAt", { city: associationInfo?.city ?? "—", date: todayStr })}
        </p>

        <DocFooter left={t("gov.paperwork.signaturePresident")} right="" />
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
