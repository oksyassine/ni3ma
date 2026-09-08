import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import { fmtDate } from "@/lib/i18n/format";
import { prisma } from "@/lib/prisma";
import { canViewGovernance } from "@/lib/rbac";
import { normalizeHost, getTenantRecordForHost } from "@/lib/tenants";
import { PrintButton } from "../print-button";
import { DocFooter, DocHeader, DocSheet } from "../doc-shell";

// Module-level: react-hooks/purity forbids impure calls inline.
function memberAge(dob: Date): number {
  return Math.floor((Date.now() - dob.getTime()) / (365.25 * 86_400_000));
}

export default async function CertificatePage({
  searchParams,
}: {
  searchParams: Promise<{ member?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");
  if (!canViewGovernance(session.user.roles)) redirect("/unauthorized");
  const { t, locale } = await getT();
  const { member: memberId } = await searchParams;

  if (!memberId) {
    return <MissingParam href="/bureau/paperwork" label={t("gov.paperwork.backToHub")} />;
  }

  const member = await prisma.member.findUnique({
    where: { id: memberId },
    select: { fullName: true, cin: true, dateOfBirth: true, registrationNumber: true, registrationDate: true },
  });
  if (!member) return <MissingParam href="/bureau/paperwork" label={t("gov.paperwork.backToHub")} />;

  const [associationInfo, tenant] = await Promise.all([
    prisma.associationInfo.findFirst(),
    associationNameFromHost(),
  ]);
  const name = associationInfo?.name ?? tenant?.name ?? "جمعية النعمة";

  const age = member.dateOfBirth ? memberAge(member.dateOfBirth) : null;
  const today = new Date(member.registrationDate.getTime() + 43_200_000);
  const todayStr = fmtDate(today, locale, { dateStyle: "long" });
  const regDate = fmtDate(today, locale, { dateStyle: "long" });
  const cinSuffix = member.cin
    ? (locale === "fr" ? ` (CIN : ${member.cin})` : ` (ب.ت.و: ${member.cin})`)
    : "";

  return (
    <div className="py-4">
      <PrintButton />
      <DocSheet>
        <DocHeader associationName={name} city={associationInfo?.city} />
        <h1 className="mt-8 text-center text-2xl font-extrabold underline" dir={locale === "fr" ? "ltr" : "rtl"}>
          {t("gov.paperwork.certTitle")}
        </h1>
        <p className="mx-auto mt-2 w-fit text-xs text-muted-foreground">
          {t("gov.paperwork.certSubtitle", { regNum: String(member.registrationNumber) })}
        </p>

        <p className="mt-12 text-lg leading-[2.6]" dir={locale === "fr" ? "ltr" : "rtl"}>
          {t("gov.paperwork.certBody", {
            name,
            member: member.fullName + cinSuffix,
            age: age !== null ? String(age) : "—",
            regNum: String(member.registrationNumber),
            regDate,
          })}
        </p>

        <p className="mt-10 text-sm text-muted-foreground" dir={locale === "fr" ? "ltr" : "rtl"}>
          {t("gov.paperwork.certFooter")}
        </p>
        <p className="mt-4 text-sm text-muted-foreground" dir={locale === "fr" ? "ltr" : "rtl"}>
          {t("gov.paperwork.certCityLine", {
            city: associationInfo?.city ?? "—",
            date: todayStr,
          })}
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
