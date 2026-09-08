import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";
import { canManageGovernance, canViewGovernance } from "@/lib/rbac";
import { revalidateBureau } from "@/lib/revalidate";

const amount = z.union([z.number(), z.string()]).transform((v) => String(v));
const dateStr = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .transform((v) => new Date(v + "T00:00:00.000Z"))
  .nullish();

const createSchema = z.object({
  employeeId: z.string().min(1),
  period: z.string().regex(/^\d{4}-\d{2}$/),
  grossAmount: amount,
  cnssAmount: amount.nullish(),
  netAmount: amount,
  paidAt: dateStr,
  status: z.enum(["PENDING", "PAID", "CNSS_DECLARED"]).default("PENDING"),
  notes: z.string().max(1000).nullish(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canViewGovernance(session.user.roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const employeeId = req.nextUrl.searchParams.get("employee");
  const runs = await prisma.payrollRun.findMany({
    where: employeeId ? { employeeId } : undefined,
    orderBy: [{ period: "desc" }],
    include: { employee: { select: { id: true, fullName: true } } },
  });
  return NextResponse.json({
    runs: runs.map((r) => ({
      ...r,
      grossAmount: Number(r.grossAmount),
      cnssAmount: r.cnssAmount === null ? null : Number(r.cnssAmount),
      netAmount: Number(r.netAmount),
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageGovernance(session.user.roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "بيانات غير صحيحة" }, { status: 400 });

  try {
    const created = await prisma.payrollRun.create({ data: parsed.data });
    await recordAudit({ userId: session.user.id, action: "CREATE", entity: "payroll_run", entityId: created.id, after: created, req });
    revalidateBureau("employees");
    return NextResponse.json(
      {
        ...created,
        grossAmount: Number(created.grossAmount),
        cnssAmount: created.cnssAmount === null ? null : Number(created.cnssAmount),
        netAmount: Number(created.netAmount),
      },
      { status: 201 }
    );
  } catch (e: unknown) {
    // P2002 = unique(employeeId, period) — localised 409 so the client
    // can surface "bulletin already exists" instead of a generic 500.
    if (typeof e === "object" && e !== null && "code" in e && (e as { code?: string }).code === "P2002") {
      return NextResponse.json(
        { error: "كشف شهر لهذا الموظف موجود مسبقاً. استعمل تعديلاً بدل إنشاء جديد." },
        { status: 409 }
      );
    }
    throw e;
  }
}
