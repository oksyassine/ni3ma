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

const amount = z.union([z.number(), z.string()]).transform((v) => String(v));

const trancheSchema = z.object({
  label: z.string().min(1).max(120),
  amount,
  expectedAt: dateStr,
  receivedAt: dateStr,
  reportDueAt: dateStr,
  reportedAt: dateStr,
  notes: z.string().max(1000).nullish(),
});

const patchSchema = z.object({
  funderName: z.string().min(2).max(300).optional(),
  funderKind: z
    .enum(["INDH", "COMMUNE", "MINISTRY", "INTERNATIONAL", "FOUNDATION", "OTHER"])
    .optional(),
  projectName: z.string().min(2).max(300).optional(),
  reference: z.string().max(120).nullish(),
  amount: amount.optional(),
  status: z.enum(["APPLIED", "APPROVED", "ACTIVE", "COMPLETED", "CANCELLED"]).optional(),
  signedAt: dateStr,
  startDate: dateStr,
  endDate: dateStr,
  contactName: z.string().max(200).nullish(),
  contactPhone: z.string().max(40).nullish(),
  notes: z.string().max(5000).nullish(),
  // Full replace — the client sends the complete edited tranche list.
  tranches: z.array(trancheSchema).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageGovernance(session.user.roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;

  const before = await prisma.grant.findUnique({ where: { id }, include: { tranches: true } });
  if (!before) return NextResponse.json({ error: "غير موجود" }, { status: 404 });

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "بيانات غير صحيحة" }, { status: 400 });
  const { tranches, ...data } = parsed.data;

  const updated = await prisma.$transaction(async (tx) => {
    if (tranches !== undefined) {
      await tx.grantTranche.deleteMany({ where: { grantId: id } });
      if (tranches.length > 0) {
        await tx.grantTranche.createMany({
          data: tranches.map((t) => ({ ...t, grantId: id })),
        });
      }
    }
    return tx.grant.update({ where: { id }, data, include: { tranches: true } });
  });

  await recordAudit({
    userId: session.user.id,
    action: "UPDATE",
    entity: "grant",
    entityId: id,
    before,
    after: updated,
    req,
  });

  revalidateBureau("grants");

  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageGovernance(session.user.roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;

  const before = await prisma.grant.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "غير موجود" }, { status: 404 });

  await prisma.grant.delete({ where: { id } });
  await recordAudit({
    userId: session.user.id,
    action: "DELETE",
    entity: "grant",
    entityId: id,
    before,
    req,
  });
  revalidateBureau("grants");
  return NextResponse.json({ ok: true });
}
