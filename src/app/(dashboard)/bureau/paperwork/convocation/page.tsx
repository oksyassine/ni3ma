import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getT } from "@/lib/i18n/server";
import { fmtDate } from "@/lib/i18n/format";
import { prisma } from "@/lib/prisma";
import { canViewGovernance } from "@/lib/rbac";
import { normalizeHost, getTenantRecordForHost } from "@/lib/tenants";
import { PrintButton } from "../print-button";
import { DocFooter, DocHeader, DocSheet } from "../doc-shell";

// Official convocation letter for a recorded meeting (AGO/AGE/bureau).
export default async function ConvocationPage({
  searchParams,
}: {
  searchParams: Promise<{ meeting?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");
  if (!canViewGovernance(session.user.roles)) redirect("/unauthorized");
  const { t, locale } = await getT();
  const { meeting: meetingId } = await searchParams;

  if (!meetingId) {
    return <Missing href="/bureau/paperwork" label={t("gov.paperwork.backToHub")} />;
  }

  const meeting = await prisma.meeting.findUnique({ where: { id: meetingId } });
  if (!meeting) return <Missing href="/bureau/paperwork" label={t("gov.paperwork.backToHub")} />;

  const [associationInfo, tenant] = await Promise.all([
    prisma.associationInfo.findFirst(),
    associationNameFromHost(),
  ]);
  const name = associationInfo?.name ?? tenant?.name ?? "جمعية النعمة";

  const heldAt = new Date(meeting.heldAt.getTime() + 43_200_000);
  const dateStr = fmtDate(heldAt, locale, { dateStyle: "long" });
  const todayStr = fmtDate(new Date(), locale, { dateStyle: "long" });

  return (
    <div className="py-4">
      <PrintButton />
      <DocSheet>
        <DocHeader associationName={name} city={associationInfo?.city} />

        <p className="text-left text-sm text-muted-foreground" dir={locale === "fr" ? "ltr" : "rtl"}>
          {t("gov.paperwork.convocCityLine", { city: associationInfo?.city ?? "—", date: todayStr })}
        </p>

        <h1 className="mt-8 text-center text-xl font-extrabold underline" dir={locale === "fr" ? "ltr" : "rtl"}>
          {t("gov.paperwork.convocTitle")}
        </h1>

        <p className="mt-4 text-center font-bold" dir={locale === "fr" ? "ltr" : "rtl"}>
          {t("gov.paperwork.convocTo")}
        </p>

        <p className="mt-8 text-lg leading-[2.4]" dir={locale === "fr" ? "ltr" : "rtl"}>
          {t("gov.paperwork.convocBody", {
            name,
            kind: t(`gov.meetingKind.${meeting.kind}`),
            date: dateStr,
            time: "15:00",
            location: meeting.location ?? "مقر الجمعية",
          })}
        </p>

        {meeting.agenda && (
          <div className="mt-6" dir={locale === "fr" ? "ltr" : "rtl"}>
            <h2 className="font-bold">{t("gov.paperwork.agendaLabel")}</h2>
            <pre className="mt-2 whitespace-pre-wrap font-sans text-base leading-relaxed">{meeting.agenda}</pre>
          </div>
        )}

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

function Missing({ href, label }: { href: string; label: string }) {
  return (
    <div className="py-16 text-center">
      <a href={href} className="text-primary underline">{label}</a>
    </div>
  );
}
