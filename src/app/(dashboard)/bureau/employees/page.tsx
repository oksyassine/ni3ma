import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getT } from "@/lib/i18n/server";
import { prisma } from "@/lib/prisma";
import { canManageGovernance, canViewGovernance } from "@/lib/rbac";
import { EmployeesClient } from "./client";

export default async function EmployeesPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (!canViewGovernance(session.user.roles)) redirect("/unauthorized");
  const { t } = await getT();

  const employees = await prisma.employee.findMany({
    orderBy: { createdAt: "desc" },
    include: { payrolls: { orderBy: { period: "desc" }, take: 6 } },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">{t("gov.employees.title")}</h1>
          <p className="text-muted-foreground">{t("gov.employees.subtitle")}</p>
        </div>
        {canManageGovernance(session.user.roles) && (
          <form
            action="/api/payroll/damancom"
            method="get"
            className="flex items-center gap-2 text-sm"
            target="_blank"
          >
            <label className="text-xs text-muted-foreground">
              {t("gov.payroll.damancomExport")}:
            </label>
            <input
              type="month"
              name="period"
              required
              defaultValue={new Date().toISOString().slice(0, 7)}
              className="rounded-md border bg-background px-2 py-1"
            />
            <button
              type="submit"
              className="rounded-md bg-primary px-3 py-1 text-xs text-primary-foreground hover:bg-primary/90"
            >
              📥 {t("gov.payroll.damancomDownload")}
            </button>
          </form>
        )}
      </div>
      <EmployeesClient
        initial={employees.map((e) => ({
          ...e,
          grossSalary: e.grossSalary === null ? null : Number(e.grossSalary),
          hireDate: e.hireDate.toISOString().slice(0, 10),
          endDate: e.endDate?.toISOString().slice(0, 10) ?? null,
          createdAt: e.createdAt.toISOString(),
          payrolls: e.payrolls.map((p) => ({
            id: p.id,
            period: p.period,
            grossAmount: Number(p.grossAmount),
            cnssAmount: p.cnssAmount === null ? null : Number(p.cnssAmount),
            netAmount: Number(p.netAmount),
            paidAt: p.paidAt?.toISOString().slice(0, 10) ?? null,
            status: p.status,
          })),
        }))}
        canWrite={canManageGovernance(session.user.roles)}
      />
    </div>
  );
}
