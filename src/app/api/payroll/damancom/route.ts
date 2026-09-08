import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { canManageGovernance } from "@/lib/rbac";
import { computeDamancomLine, formatDamancomLine } from "@/lib/cnss";
import { recordAudit } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";

// GET /api/payroll/damancom?period=2026-08
//
// Streams a Damancom-format declaration file for the requested month. Each
// line is one employee with a CNSS number and a payroll in that period.
//
// Returns text/plain; charset=utf-8 so the bureau can upload directly to
// the Damancom web UI without further transformation.

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageGovernance(session.user.roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Throttle: 5/min — Damancom exports are infrequent.
  const rl = rateLimit(`damancom:${session.user.id}`, 5, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too Many Requests" }, { status: 429 });
  }

  const period = req.nextUrl.searchParams.get("period") ?? "";
  if (!/^\d{4}-\d{2}$/.test(period)) {
    return NextResponse.json({ error: "period must be YYYY-MM" }, { status: 400 });
  }

  // The employer CNSS code lives on AssociationInfo — it was added in
  // earlier rounds. If absent, we emit "00000000" so the file is still
  // downloadable but the bureau knows to fill it before upload.
  const assoc = await prisma.associationInfo.findUnique({ where: { id: 1 } });
  const employerCode = assoc?.cnssEmployerCode ?? "00000000";

  const [yearStr, monthStr] = period.split("-");
  const periodStart = new Date(`${yearStr}-${monthStr}-01`);
  const periodEnd = new Date(periodStart);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  const payrolls = await prisma.payrollRun.findMany({
    where: {
      period,
      status: { in: ["PAID", "PENDING"] },
      employee: { cnssNumber: { not: null }, status: "ACTIVE" },
    },
    include: {
      employee: { select: { cnssNumber: true, fullName: true, hireDate: true, endDate: true } },
    },
  });

  // Days worked = period days minus unpaid leave; we approximate by
  // counting month-days minus any gap between hireDate and periodStart.
  const daysInMonth = new Date(periodStart.getFullYear(), periodStart.getMonth() + 1, 0).getDate();
  const lines = payrolls
    .filter((p) => p.employee.cnssNumber)
    .map((p) => {
      const grossCents = Math.round(Number(p.grossAmount) * 100);
      // Days worked: full month unless the employee was hired mid-month or
      // terminated mid-month.
      const hire = p.employee.hireDate;
      const end = p.employee.endDate;
      const startDay = hire > periodStart ? hire.getUTCDate() : 1;
      const endDay = end && end < periodEnd ? end.getUTCDate() : daysInMonth;
      const daysWorked = Math.max(1, endDay - startDay + 1);
      return computeDamancomLine({
        employerCode,
        employeeCnss: p.employee.cnssNumber!,
        period,
        daysWorked,
        grossCents,
      });
    });

  const body = lines.map(formatDamancomLine).join("\n") + (lines.length > 0 ? "\n" : "");
  const filename = `damancom-${period}.txt`;

  await recordAudit({
    userId: session.user.id,
    action: "CREATE",
    entity: "damancom_export",
    after: { period, lineCount: lines.length, employeeCount: payrolls.length },
    req,
  });

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store, private",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
