import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { canViewGovernance } from "@/lib/rbac";
import { getT } from "@/lib/i18n/server";
import { fmtMoney } from "@/lib/i18n/format";
import { computeIrMonthly } from "@/lib/cnss";
import { PrintButton } from "../../../paperwork/print-button";

export default async function SalarySlipPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ period?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");
  if (!canViewGovernance(session.user.roles)) redirect("/unauthorized");
  const { t, locale } = await getT();
  const { id } = await params;
  const { period: periodParam } = await searchParams;

  const payroll = await prisma.payrollRun.findUnique({
    where: { id },
    include: { employee: true },
  });
  if (!payroll) notFound();

  const period = periodParam ?? payroll.period;
  const [yearStr, monthStr] = period.split("-");
  const monthNamesAr = ["يناير","فبراير","مارس","أبريل","ماي","يونيو","يوليوز","غشت","شتنبر","أكتوبر","نونبر","دجنبر"];
  const monthNamesFr = ["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"];
  const monthLabel = (locale === "fr" ? monthNamesFr : monthNamesAr)[parseInt(monthStr, 10) - 1] ?? "";
  const periodLabel = `${monthLabel} ${yearStr}`;

  const gross = Number(payroll.grossAmount);
  const cnss = payroll.cnssAmount === null ? 0 : Number(payroll.cnssAmount);
  const ir = computeIrMonthly(gross);
  const net = Math.max(0, gross - cnss - ir);

  return (
    <div className="mx-auto max-w-2xl bg-background p-8 print:p-0 print:max-w-full">
      <style>{`@media print { .no-print { display:none } body { background:#fff } }`}</style>

      <div className="no-print mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold">
          {t("gov.payroll.salarySlip")} — {monthLabel} {yearStr}
        </h1>
        <PrintButton />
      </div>

      <header className="border-b pb-4 text-center">
        <h1 className="text-2xl font-extrabold">{t("gov.payroll.salarySlip")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("gov.payroll.periodLabel")}: <b>{periodLabel}</b>
        </p>
      </header>

      <section className="mt-6 grid grid-cols-2 gap-3 text-sm">
        <Field label={t("gov.payroll.employee")} value={payroll.employee.fullName} />
        <Field label={t("gov.payroll.position")} value={payroll.employee.position} />
        <Field label={t("gov.payroll.cnssNumber")} value={payroll.employee.cnssNumber ?? "—"} />
        <Field label={t("gov.payroll.cin")} value={payroll.employee.cin ?? "—"} />
      </section>

      <section className="mt-8">
        <h2 className="mb-2 text-lg font-bold">{t("gov.payroll.earningsAndDeductions")}</h2>
        <table className="w-full text-sm">
          <tbody>
            <Row label={t("gov.payroll.grossSalary")} amount={gross} locale={locale} />
            <Row label={t("gov.payroll.cnssEmployee")} amount={-cnss} locale={locale} negative />
            <Row label={t("gov.payroll.irMonthly")} amount={-ir} locale={locale} negative />
            <tr className="border-t-2 font-bold">
              <td className="py-2">{t("gov.payroll.netSalary")}</td>
              <td className="py-2 text-end">{fmtMoney(net, locale)} {t("financial.mad")}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <footer className="mt-10 grid grid-cols-2 text-xs text-muted-foreground">
        <div>
          <p>{t("gov.payroll.employerSignature")}</p>
          <p className="mt-12 border-t pt-1">{t("gov.payroll.employerName")}</p>
        </div>
        <div className="text-end">
          <p>{t("gov.payroll.employeeSignature")}</p>
          <p className="mt-12 border-t pt-1">{payroll.employee.fullName}</p>
        </div>
      </footer>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}

function Row({ label, amount, locale, negative = false }: { label: string; amount: number; locale: string; negative?: boolean }) {
  return (
    <tr className="border-b">
      <td className="py-2">{label}</td>
      <td className={`py-2 text-end ${negative ? "text-red-600" : ""}`}>
        {amount < 0 ? "-" : ""}{fmtMoney(Math.abs(amount), locale)} {locale === "fr" ? "MAD" : "د.م"}
      </td>
    </tr>
  );
}
