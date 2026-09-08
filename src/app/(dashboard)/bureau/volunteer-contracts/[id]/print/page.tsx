import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getT } from "@/lib/i18n/server";
import { prisma } from "@/lib/prisma";
import { canViewGovernance } from "@/lib/rbac";
import { normalizeHost, getTenantRecordForHost } from "@/lib/tenants";
import { PrintButton } from "../../../paperwork/print-button";
import { DocFooter, DocHeader, DocSheet } from "../../../paperwork/doc-shell";

// Printable volunteer contract following the mandatory clauses of law 06.18
// (identity of both parties, mission, weekly hours, duration, insurance).
export default async function ContractPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");
  if (!canViewGovernance(session.user.roles)) redirect("/unauthorized");
  const { t, locale } = await getT();
  const { id } = await params;

  const [contract, associationInfo, tenant] = await Promise.all([
    prisma.volunteerContract.findUnique({ where: { id } }),
    prisma.associationInfo.findFirst(),
    associationNameFromHost(),
  ]);
  if (!contract) {
    return (
      <div className="py-16 text-center">
        <a href="/bureau/volunteer-contracts" className="text-primary underline">{t("gov.paperwork.backToHub")}</a>
      </div>
    );
  }
  const name = associationInfo?.name ?? tenant?.name ?? "جمعية النعمة";

  const fmt = (d: Date | null, fallback = "—") =>
    d ? new Date(d.getTime() + 43_200_000).toLocaleDateString(locale, { dateStyle: "long" }) : fallback;
  const dir = locale === "fr" ? "ltr" : "rtl";

  return (
    <div className="py-4">
      <PrintButton />
      <DocSheet>
        <DocHeader associationName={name} city={associationInfo?.city} />

        <h1 className="mt-8 text-center text-xl font-extrabold underline" dir={dir}>
          {t("gov.vcontracts.contractTitle")}
          <span className="block text-xs font-normal text-muted-foreground"> {t("gov.vcontracts.contractLawRef")}</span>
        </h1>

        <section className="mt-8 space-y-1 text-base leading-relaxed" dir={dir}>
          <p>
            <b>{t("gov.vcontracts.partyOrg")}</b> {name}
            {associationInfo?.address ? ` — ${associationInfo.address}` : ""}
          </p>
          <p>
            <b>{t("gov.vcontracts.partyVol")}</b> {contract.volunteerName}
            {contract.cin ? ` — ${locale === "fr" ? "CIN" : "ب.ت.و"}: ${contract.cin}` : ""}
            {contract.birthDate ? ` — ${t("gov.vcontracts.born")} ${fmt(contract.birthDate)}` : ""}
            {contract.phone ? ` — ${t("gov.vcontracts.phone")}: ${contract.phone}` : ""}
            {contract.address ? ` — ${t("gov.vcontracts.address")}: ${contract.address}` : ""}
          </p>
        </section>

        <section className="mt-6 space-y-2 text-base leading-relaxed" dir={dir}>
          <p>
            <b>1. {t("gov.vcontracts.clause1")}</b> {contract.missionTitle}
          </p>
          {contract.missionDetails && (
            <pre className="whitespace-pre-wrap rounded-lg bg-muted/60 p-3 font-sans">{contract.missionDetails}</pre>
          )}
          <p>
            <b>2. {t("gov.vcontracts.clause2")}</b>{" "}
            {contract.weeklyHours !== null
              ? t("gov.vcontracts.clause2Desc", {
                  start: fmt(contract.startDate),
                  end: fmt(contract.endDate, fmt(contract.startDate)),
                  hours: String(Number(contract.weeklyHours)),
                })
              : t("gov.vcontracts.clause2DescNoHours", {
                  start: fmt(contract.startDate),
                  end: fmt(contract.endDate, fmt(contract.startDate)),
                })}
            .
          </p>
          <p>
            <b>3. {t("gov.vcontracts.clause3")}</b>{" "}
            {contract.insuranceRef
              ? t("gov.vcontracts.clause3Insured", { policy: ` (${t("gov.vcontracts.insuranceRef")}: ${contract.insuranceRef})` })
              : t("gov.vcontracts.clause3InsuredNo")}
          </p>
          <p>
            <b>4. {t("gov.vcontracts.clause4")}</b> {t("gov.vcontracts.clause4Desc")}
          </p>
          {contract.notes && (
            <p>
              <b>5. {t("gov.vcontracts.clause5")}</b> {contract.notes}
            </p>
          )}
        </section>

        <p className="mt-8 text-sm text-muted-foreground" dir={dir}>
          {t("gov.vcontracts.footer", { date: fmt(new Date(), "..........") })}
        </p>

        <DocFooter
          left={t("gov.paperwork.signaturePresident")}
          right={t("gov.vcontracts.sigVol", { name: contract.volunteerName })}
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
