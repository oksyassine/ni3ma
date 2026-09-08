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

// Sign-in sheet with signature boxes used at the AG to establish quorum.
export default async function AttendanceSheetPage({
  searchParams,
}: {
  searchParams: Promise<{ meeting?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");
  if (!canViewGovernance(session.user.roles)) redirect("/unauthorized");
  const { t, locale } = await getT();
  const { meeting: meetingId } = await searchParams;

  const [members, meeting, associationInfo, tenant] = await Promise.all([
    prisma.member.findMany({
      where: { isActive: true, memberType: "ADULT" },
      select: { fullName: true, registrationNumber: true },
      orderBy: { registrationNumber: "asc" },
      take: 120,
    }),
    meetingId ? prisma.meeting.findUnique({ where: { id: meetingId } }) : null,
    prisma.associationInfo.findFirst(),
    associationNameFromHost(),
  ]);
  const name = associationInfo?.name ?? tenant?.name ?? "جمعية النعمة";

  if (!meetingId || !meeting) {
    return (
      <div className="py-16 text-center">
        <a href="/bureau/paperwork" className="text-primary underline">{t("gov.paperwork.backToHub")}</a>
      </div>
    );
  }

  const heldAt = fmtDate(new Date(meeting.heldAt.getTime() + 43_200_000), locale, { dateStyle: "long" });

  return (
    <div className="py-4">
      <PrintButton />
      <DocSheet>
        <DocHeader associationName={name} city={associationInfo?.city} />
        <h1 className="text-center text-xl font-extrabold underline" dir={locale === "fr" ? "ltr" : "rtl"}>
          {t("gov.paperwork.attendanceSheet")}
        </h1>
        <p className="mt-3 text-center text-sm font-semibold" dir={locale === "fr" ? "ltr" : "rtl"}>
          {t(`gov.meetingKind.${meeting.kind}`)} — {meeting.title} · {heldAt}
          {meeting.location ? ` · ${meeting.location}` : ""}
        </p>

        <table className="mt-6 w-full border-collapse text-sm" dir={locale === "fr" ? "ltr" : "rtl"}>
          <thead>
            <tr>
              <th className="w-10 border border-black p-1.5">#</th>
              <th className="border border-black p-1.5">{t("gov.paperwork.fullNameHeader")}</th>
              <th className="w-12 border border-black p-1.5">{locale === "fr" ? "N°" : "ر.ت"}</th>
              <th className="w-56 border border-black p-1.5">{t("gov.paperwork.signatureMember")}</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m, i) => (
              <tr key={m.registrationNumber}>
                <td className="border border-black p-1.5 text-center">{i + 1}</td>
                <td className="border border-black px-2 py-1.5">{m.fullName}</td>
                <td className="border border-black p-1.5 text-center">{m.registrationNumber}</td>
                <td className="border border-black">&nbsp;</td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="mt-6 text-sm font-bold" dir={locale === "fr" ? "ltr" : "rtl"}>
          {t("gov.paperwork.quorumLine")}
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
