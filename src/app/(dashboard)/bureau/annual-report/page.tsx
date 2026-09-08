import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getT } from "@/lib/i18n/server";
import { prisma } from "@/lib/prisma";
import { canViewGovernance } from "@/lib/rbac";
import { normalizeHost, getTenantRecordForHost } from "@/lib/tenants";
import { ReportToolbar } from "./toolbar";

// Statutory annual report (art. 32 Dahir 1-58-376): aggregates the academic
// year's income/expenses per section and category, plus governance snapshots,
// in a print-ready layout for the General Assembly and funders.
export default async function AnnualReportPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");
  if (!canViewGovernance(session.user.roles)) redirect("/unauthorized");
  const { t, locale } = await getT();
  const { year: yearParam } = await searchParams;

  const years = await prisma.academicYear.findMany({ orderBy: { startDate: "desc" } });
  if (years.length === 0) {
    return (
      <div className="py-16 text-center text-muted-foreground">
        {t("gov.report.year")}: — ({t("admin.academicYears.none")})
      </div>
    );
  }
  const year = years.find((y) => y.id === yearParam) ?? years.find((y) => y.isCurrent) ?? years[0];

  const [associationInfo, tenantCtx] = await Promise.all([
    prisma.associationInfo.findFirst(),
    (async () => {
      try {
        const h = await headers();
        const host = normalizeHost(h.get("host"));
        return host ? await getTenantRecordForHost(host) : null;
      } catch {
        return null;
      }
    })(),
  ]);
  const associationName =
    associationInfo?.name ?? tenantCtx?.name ?? "جمعية النعمة";

  const [
    membersCount,
    contributionsAgg,
    donationsAgg,
    inKindCount,
    grantsReceivedAgg,
    expensesByCategory,
    expensesBySection,
    meetingsCount,
    decisionsCount,
    assetsAgg,
    sponsorshipsActive,
  ] = await Promise.all([
    prisma.member.count({ where: { isActive: true } }),
    prisma.weeklyContribution.aggregate({ _sum: { amount: true }, where: { academicYearId: year.id } }),
    prisma.donation.aggregate({ _sum: { amount: true }, where: { isPaid: true, academicYearId: year.id } }),
    prisma.inKindDonation.count({ where: { academicYearId: year.id } }),
    prisma.grantTranche.aggregate({
      _sum: { amount: true },
      where: { receivedAt: { gte: year.startDate, lte: year.endDate }, grant: { status: { not: "CANCELLED" } } },
    }),
    prisma.expense.groupBy({ by: ["category"], _sum: { amount: true }, where: { academicYearId: year.id } }),
    prisma.expense.groupBy({ by: ["section"], _sum: { amount: true }, where: { academicYearId: year.id } }),
    prisma.meeting.count({ where: { heldAt: { gte: year.startDate, lte: year.endDate } } }),
    prisma.meetingDecision.count({ where: { passed: true, meeting: { heldAt: { gte: year.startDate, lte: year.endDate } } } }),
    prisma.asset.aggregate({ _sum: { value: true }, _count: true }),
    prisma.sponsorship.count({ where: { status: "ACTIVE" } }),
  ]);

  const num = (v: unknown) => Number(v ?? 0);
  const totalIncome =
    num(contributionsAgg._sum.amount) + num(donationsAgg._sum.amount) + num(grantsReceivedAgg._sum.amount);
  const totalExpense = expensesByCategory.reduce((s, e) => s + num(e._sum.amount), 0);
  const fmtMoney = (n: number) => n.toLocaleString(locale, { maximumFractionDigits: 2 });

  return (
    <div className="space-y-6">
      <style>{`@media print{aside[data-slot="sidebar"],header{display:none !important}main{padding:0 !important}}`}</style>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{t("gov.report.title")}</h1>
          <p className="text-muted-foreground">{t("gov.report.subtitle")}</p>
        </div>
        <ReportToolbar
          years={years.map((y) => ({ id: y.id, label: y.label }))}
          selectedId={year.id}
        />
      </div>

      <div id="annual-report" className="space-y-8 rounded-xl border bg-card p-6 sm:p-10">
        <header className="border-b pb-4 text-center">
          <h2 className="text-xl font-extrabold" dir="auto">{associationName}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("gov.report.title")} — {year.label}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground" dir="auto">
            {new Date().toLocaleDateString(locale, { dateStyle: "long" })}
          </p>
        </header>

        <section className="grid gap-3 sm:grid-cols-3">
          {[
            [t("gov.report.membersActive"), String(membersCount)],
            [t("gov.report.meetingsHeld"), String(meetingsCount)],
            [t("gov.report.decisionsTaken"), String(decisionsCount)],
            [t("gov.report.activeSponsorships"), String(sponsorshipsActive)],
            [t("gov.report.inKindCount"), String(inKindCount)],
            [t("gov.report.assetsValue"), `${fmtMoney(num(assetsAgg._sum.value))} MAD`],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-0.5 text-lg font-bold">{value}</p>
            </div>
          ))}
        </section>

        <section>
          <h3 className="mb-3 font-bold">💰 {t("gov.report.totalIncome")}</h3>
          <table className="w-full text-sm">
            <tbody>
              {[
                [t("gov.report.contributions"), num(contributionsAgg._sum.amount)],
                [t("gov.report.donationsCash"), num(donationsAgg._sum.amount)],
                [t("gov.report.grantsReceived"), num(grantsReceivedAgg._sum.amount)],
              ].map(([label, value]) => (
                <tr key={label as string} className="border-b">
                  <td className="py-1.5" dir="auto">{label}</td>
                  <td className="py-1.5 text-left font-medium" dir="ltr">{fmtMoney(value as number)} MAD</td>
                </tr>
              ))}
              <tr>
                <td className="pt-2 font-bold" dir="auto">{t("gov.report.totalIncome")}</td>
                <td className="pt-2 text-left font-bold" dir="ltr">{fmtMoney(totalIncome)} MAD</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section>
          <h3 className="mb-3 font-bold">💸 {t("gov.report.expensesByCategory")}</h3>
          <table className="w-full text-sm">
            <tbody>
              {expensesByCategory.map((e) => (
                <tr key={e.category} className="border-b">
                  <td className="py-1.5" dir="auto">{t(`gov.report.category.${e.category}`)}</td>
                  <td className="py-1.5 text-left font-medium" dir="ltr">{fmtMoney(num(e._sum.amount))} MAD</td>
                </tr>
              ))}
              {expensesByCategory.length === 0 && (
                <tr><td className="py-2 text-muted-foreground">—</td><td /></tr>
              )}
              <tr>
                <td className="pt-2 font-bold" dir="auto">{t("gov.report.totalExpense")}</td>
                <td className="pt-2 text-left font-bold" dir="ltr">{fmtMoney(totalExpense)} MAD</td>
              </tr>
            </tbody>
          </table>
        </section>

        {expensesBySection.length > 0 && (
          <section>
            <h3 className="mb-3 font-bold">🏫 {t("gov.report.expensesBySection")}</h3>
            <table className="w-full text-sm">
              <tbody>
                {expensesBySection.map((e) => (
                  <tr key={e.section ?? "none"} className="border-b">
                    <td className="py-1.5" dir="auto">{e.section ? t(`gov.report.section.${e.section}`) : "—"}</td>
                    <td className="py-1.5 text-left font-medium" dir="ltr">{fmtMoney(num(e._sum.amount))} MAD</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        <section className="rounded-lg bg-muted/50 p-4">
          <p className="font-bold" dir="auto">
            {t("gov.report.balance")}:{" "}
            <span className={totalIncome - totalExpense >= 0 ? "text-green-700 dark:text-green-400" : "text-red-600"}>
              {fmtMoney(totalIncome - totalExpense)} MAD
            </span>
          </p>
        </section>
      </div>
    </div>
  );
}
