import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";
import { canManageGovernance, canViewGovernance } from "@/lib/rbac";
import { revalidateBureau } from "@/lib/revalidate";

const dateStr = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .transform((v) => new Date(v + "T00:00:00.000Z"))
  .nullish();

const createSchema = z.object({
  fullName: z.string().min(2).max(300),
  cin: z.string().max(40).nullish(),
  cnssNumber: z.string().max(60).nullish(),
  position: z.string().min(1).max(200),
  contractType: z.enum(["CDI", "CDD", "APPRENTICESHIP", "STAGE", "ANAPEC", "OTHER"]).default("CDI"),
  status: z.enum(["ACTIVE", "ON_LEAVE", "TERMINATED"]).default("ACTIVE"),
  hireDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).transform((v) => new Date(v + "T00:00:00.000Z")),
  endDate: dateStr,
  grossSalary: z.union([z.number(), z.string()]).transform((v) => String(v)).nullish(),
  bankName: z.string().max(200).nullish(),
  bankRib: z.string().max(60).nullish(),
  phone: z.string().max(40).nullish(),
  email: z.string().max(200).nullish(),
  address: z.string().max(500).nullish(),
  contractDocUrl: z.string().max(500).nullish(),
  notes: z.string().max(2000).nullish(),
});

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canViewGovernance(session.user.roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const employees = await prisma.employee.findMany({ orderBy: { createdAt: "desc" }, include: { payrolls: true } });
  return NextResponse.json({
    employees: employees.map((e) => ({
      ...e,
      grossSalary: e.grossSalary === null ? null : Number(e.grossSalary),
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

  const created = await prisma.employee.create({ data: parsed.data });
  await recordAudit({ userId: session.user.id, action: "CREATE", entity: "employee", entityId: created.id, after: created, req });
  revalidateBureau("employees");
  return NextResponse.json({ ...created, grossSalary: created.grossSalary === null ? null : Number(created.grossSalary) }, { status: 201 });
}
