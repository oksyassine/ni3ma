import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isAdmin, hasBureauRead } from "@/lib/permissions";
import { getT } from "@/lib/i18n/server";
import { headers } from "next/headers";
import { normalizeHost, rootDomain } from "@/lib/tenants";
import { PrintButton } from "./print-button";

// Print-optimized annual moral & financial report (التقرير الأدبي والمعنوي
// والمالي) — the document Moroccan associations submit to their general
// assembly and authorities. Open in browser → Print → Save as PDF.

export default async function AnnualReportPage({
  searchParams,
}: {
  searchParams: Promise<{ academicYearId?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");
  if (!isAdmin(session.user.roles) && !(await hasBureauRead(session))) {
    redirect("/unauthorized");
  }

  const { t, locale } = await getT();
  const dateFmt = new Intl.DateTimeFormat(locale === "fr" ? "fr-MA" : "ar-MA", { dateStyle: "long" });
  const moneyFmt = new Intl.NumberFormat(locale === "fr" ? "fr-MA" : "ar-MA", {
    style: "decimal",
    maximumFractionDigits: 2,
  });
  const mad = locale === "fr" ? "MAD" : "درهم";

  const years = await prisma.academicYear.findMany({ orderBy: { startDate: "desc" } });
  const { academicYearId } = await searchParams;
  const year =
    (academicYearId ? years.find((y) => y.id === academicYearId) : null) ??
    years.find((y) => y.isCurrent) ??
    years[0] ??
    null;
  const scope = year ? { academicYearId: year.id } : {};

  const [
    assoc,
    membersByType,
    membersByGender,
    sectionsRows,
    activityCount,
    attendanceCount,
    contributionsAgg,
    expensesByCategory,
    donationsAgg,
    inKindAgg,
    projectsActive,
    projectsDone,
    quranSessions,
  ] = await Promise.all([
    prisma.associationInfo.findUnique({ where: { id: 1 } }),
    prisma.member.groupBy({ by: ["memberType"], where: { isActive: true }, _count: true }),
    prisma.member.groupBy({ by: ["gender"], where: { isActive: true }, _count: true }),
    prisma.memberSection.groupBy({ by: ["section"], where: { isActive: true }, _count: true }),
    prisma.programActivity.count(),
    prisma.attendance.count({ where: { isPresent: true, ...scope } }),
    prisma.weeklyContribution.aggregate({ where: scope, _sum: { amount: true }, _count: true }),
    prisma.expense.groupBy({ by: ["category"], where: scope, _sum: { amount: true }, _count: true }),
    prisma.donation.aggregate({ where: { ...scope, isPaid: true }, _sum: { amount: true }, _count: true }),
    prisma.inKindDonation.aggregate({ where: scope, _count: true }),
    prisma.socialProject.count({ where: { status: "ACTIVE", ...(year ? { academicYearId: year.id } : {}) } }),
    prisma.socialProject.count({ where: { status: "COMPLETED", ...(year ? { academicYearId: year.id } : {}) } }),
    prisma.quranProgress.count({ where: scope }),
  ]);

  const totalMembers = membersByType.reduce((a, r) => a + r._count, 0);
  const children = membersByType.find((r) => r.memberType === "CHILD")?._count ?? 0;
  const adults = membersByType.find((r) => r.memberType === "ADULT")?._count ?? 0;
  const males = membersByGender.find((r) => r.gender === "MALE")?._count ?? 0;
  const females = membersByGender.find((r) => r.gender === "FEMALE")?._count ?? 0;

  const sectionKeys: Record<string, string> = {
    EDUCATIONAL: "nav.auto4",
    SOCIAL: "nav.auto7",
    QURAN: "nav.auto12",
    QUDAT: "nav.qada",
    MEDIA: "nav.media",
  };
  const catKeys: Record<string, string> = {
    EDUCATIONAL: "financial.cat.educational",
    SOCIAL: "financial.cat.social",
    QURAN: "financial.cat.quran",
    ADMINISTRATIVE: "financial.cat.administrative",
    MAINTENANCE: "financial.cat.maintenance",
    OTHER: "financial.cat.other",
  };

  const totalContributions = Number(contributionsAgg._sum.amount ?? 0);
  const totalDonations = Number(donationsAgg._sum.amount ?? 0);
  const totalExpenses = expensesByCategory.reduce((a, r) => a + Number(r._sum.amount ?? 0), 0);

  const h = await headers();
  const host = normalizeHost(h.get("host"));
  const hostLabel = host && !host.endsWith(rootDomain()) ? host.replace(/:\d+$/, "") : null;

  return (
    <div className="mx-auto max-w-3xl bg-background p-8 print:p-0">
      <style>{`@media print { .no-print { display:none } body { background:#fff } }`}</style>

      <div className="no-print mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          {years.map((y) => (
            <a
              key={y.id}
              href={`/financial/annual-report?academicYearId=${y.id}`}
              className={`rounded-lg border px-3 py-1.5 ${year?.id === y.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
            >
              {y.label}
            </a>
          ))}
        </div>
        <PrintButton label={t("common.print")} />
      </div>

      {/* Header */}
      <header className="border-b pb-6 text-center">
        <h1 className="text-2xl font-extrabold">{assoc?.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {locale === "fr"
            ? "Rapport moral et financier"
            : "التقرير الأدبي والمالي"}
          {year ? ` — ${year.label}` : ""}
        </p>
        {hostLabel && <p className="text-xs text-muted-foreground">{hostLabel}</p>}
        <p className="mt-1 text-xs text-muted-foreground">
          {locale === "fr" ? "Édité le" : "حرر بتاريخ"} {dateFmt.format(new Date())}
        </p>
      </header>

      {/* Members */}
      <section className="mt-8">
        <h2 className="text-lg font-bold">{t("report.members.title")}</h2>
        <table className="mt-3 w-full text-sm">
          <tbody>
            <tr className="border-b"><td className="py-1.5">{t("report.members.total")}</td><td className="text-left font-semibold">{totalMembers}</td></tr>
            <tr className="border-b"><td className="py-1.5">{t("report.members.children")}</td><td className="text-left font-semibold">{children}</td></tr>
            <tr className="border-b"><td className="py-1.5">{t("report.members.adults")}</td><td className="text-left font-semibold">{adults}</td></tr>
            <tr className="border-b"><td className="py-1.5">{t("report.members.males")}</td><td className="text-left font-semibold">{males}</td></tr>
            <tr className="border-b"><td className="py-1.5">{t("report.members.females")}</td><td className="text-left font-semibold">{females}</td></tr>
            {sectionsRows.map((r) => (
              <tr key={r.section} className="border-b">
                <td className="py-1.5">{t(sectionKeys[r.section] ?? r.section)}</td>
                <td className="text-left font-semibold">{r._count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Activities */}
      <section className="mt-8">
        <h2 className="text-lg font-bold">{t("report.activities.title")}</h2>
        <table className="mt-3 w-full text-sm">
          <tbody>
            <tr className="border-b"><td className="py-1.5">{t("report.activities.planned")}</td><td className="text-left font-semibold">{activityCount}</td></tr>
            <tr className="border-b"><td className="py-1.5">{t("report.activities.presences")}</td><td className="text-left font-semibold">{attendanceCount}</td></tr>
            <tr className="border-b"><td className="py-1.5">{t("report.activities.projectsActive")}</td><td className="text-left font-semibold">{projectsActive}</td></tr>
            <tr className="border-b"><td className="py-1.5">{t("report.activities.projectsDone")}</td><td className="text-left font-semibold">{projectsDone}</td></tr>
            <tr className="border-b"><td className="py-1.5">{t("report.activities.quranEvals")}</td><td className="text-left font-semibold">{quranSessions}</td></tr>
          </tbody>
        </table>
      </section>

      {/* Financials */}
      <section className="mt-8">
        <h2 className="text-lg font-bold">{t("report.fin.title")}</h2>
        <table className="mt-3 w-full text-sm">
          <thead>
            <tr className="border-b text-right text-xs text-muted-foreground">
              <th className="py-1.5">{t("report.fin.item")}</th>
              <th className="py-1.5">{t("report.fin.count")}</th>
              <th className="py-1.5 text-left">{`${t("common.amount")} (${mad})`}</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b">
              <td className="py-1.5">{t("report.fin.contributions")}</td>
              <td>{contributionsAgg._count}</td>
              <td className="text-left font-semibold">{moneyFmt.format(totalContributions)}</td>
            </tr>
            <tr className="border-b">
              <td className="py-1.5">{t("report.fin.donationsCash")}</td>
              <td>{donationsAgg._count}</td>
              <td className="text-left font-semibold">{moneyFmt.format(totalDonations)}</td>
            </tr>
            <tr className="border-b">
              <td className="py-1.5">{t("report.fin.donationsInKind")}</td>
              <td>{inKindAgg._count}</td>
              <td />
            </tr>
            {expensesByCategory.map((r) => (
              <tr key={r.category} className="border-b">
                <td className="py-1.5">{t(catKeys[r.category] ?? r.category)}</td>
                <td>{r._count}</td>
                <td className="text-left">-{moneyFmt.format(Number(r._sum.amount ?? 0))}</td>
              </tr>
            ))}
            <tr>
              <td className="py-2 font-bold">{t("report.fin.balance")}</td>
              <td />
              <td className={`text-left font-bold ${totalContributions + totalDonations - totalExpenses >= 0 ? "" : "text-red-600"}`}>
                {moneyFmt.format(totalContributions + totalDonations - totalExpenses)}
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <footer className="mt-10 flex justify-between text-xs text-muted-foreground">
        <span>{assoc?.city}{assoc?.phone ? ` · ${assoc.phone}` : ""}</span>
        <span>{locale === "fr" ? "Signature du trésorier" : "توقيع أمين المال"}: ________</span>
      </footer>
    </div>
  );
}
