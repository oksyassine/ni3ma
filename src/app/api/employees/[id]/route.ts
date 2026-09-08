import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";
import { canManageGovernance } from "@/lib/rbac";
import { revalidateBureau } from "@/lib/revalidate";

const dateStr = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .transform((v) => new Date(v + "T00:00:00.000Z"))
  .nullish();

const patchSchema = z.object({
  fullName: z.string().min(2).max(300).optional(),
  cin: z.string().max(40).nullish(),
  cnssNumber: z.string().max(60).nullish(),
  position: z.string().min(1).max(200).optional(),
  contractType: z.enum(["CDI", "CDD", "APPRENTICESHIP", "STAGE", "ANAPEC", "OTHER"]).optional(),
  status: z.enum(["ACTIVE", "ON_LEAVE", "TERMINATED"]).optional(),
  hireDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).transform((v) => new Date(v + "T00:00:00.000Z")).optional(),
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

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageGovernance(session.user.roles)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const before = await prisma.employee.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "غير موجود" }, { status: 404 });
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "بيانات غير صحيحة" }, { status: 400 });
  const updated = await prisma.employee.update({ where: { id }, data: parsed.data });
  await recordAudit({ userId: session.user.id, action: "UPDATE", entity: "employee", entityId: id, before, after: updated, req });
  revalidateBureau("employees");
  return NextResponse.json({ ...updated, grossSalary: updated.grossSalary === null ? null : Number(updated.grossSalary) });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageGovernance(session.user.roles)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const before = await prisma.employee.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "غير موجود" }, { status: 404 });
  await prisma.employee.delete({ where: { id } });
  await recordAudit({ userId: session.user.id, action: "DELETE", entity: "employee", entityId: id, before, req });
  revalidateBureau("employees");
  return NextResponse.json({ ok: true });
}
