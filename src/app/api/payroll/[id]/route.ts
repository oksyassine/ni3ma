import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";
import { postPayroll } from "@/lib/journal";
import { canManageGovernance } from "@/lib/rbac";
import { revalidateBureau } from "@/lib/revalidate";

const amount = z.union([z.number(), z.string()]).transform((v) => String(v));
const dateStr = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .transform((v) => new Date(v + "T00:00:00.000Z"))
  .nullish();

const patchSchema = z.object({
  grossAmount: amount.optional(),
  cnssAmount: amount.nullish(),
  netAmount: amount.optional(),
  paidAt: dateStr,
  status: z.enum(["PENDING", "PAID", "CNSS_DECLARED"]).optional(),
  notes: z.string().max(1000).nullish(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageGovernance(session.user.roles)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const before = await prisma.payrollRun.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "غير موجود" }, { status: 404 });
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "بيانات غير صحيحة" }, { status: 400 });
  const data: Record<string, unknown> = { ...parsed.data };
  // Stamp paidAt when transitioning to PAID/CNSS_DECLARED if not provided.
  if ((data.status === "PAID" || data.status === "CNSS_DECLARED") && !before.paidAt && data.paidAt === undefined) {
    data.paidAt = new Date();
  }
  const updated = await prisma.payrollRun.update({ where: { id }, data });
  await recordAudit({ userId: session.user.id, action: "UPDATE", entity: "payroll_run", entityId: id, before, after: updated, req });
  // Auto-post to the PCAF journal when marked PAID.
  if (updated.status === "PAID" && before.status !== "PAID") {
    await postPayroll(updated.id).catch((err) =>
      console.error("[journal] postPayroll failed", err),
    );
  }
  revalidateBureau("employees");
  return NextResponse.json({
    ...updated,
    grossAmount: Number(updated.grossAmount),
    cnssAmount: updated.cnssAmount === null ? null : Number(updated.cnssAmount),
    netAmount: Number(updated.netAmount),
  });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageGovernance(session.user.roles)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const before = await prisma.payrollRun.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "غير موجود" }, { status: 404 });
  await prisma.payrollRun.delete({ where: { id } });
  await recordAudit({ userId: session.user.id, action: "DELETE", entity: "payroll_run", entityId: id, before, req });
  revalidateBureau("employees");
  return NextResponse.json({ ok: true });
}
