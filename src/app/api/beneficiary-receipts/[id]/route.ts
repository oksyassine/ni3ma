import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";
import { canManageGovernance } from "@/lib/rbac";
import { revalidateBureau } from "@/lib/revalidate";

const amount = z.union([z.number(), z.string()]).transform((v) => String(v)).nullish();

const patchSchema = z.object({
  socialCaseId: z.string().nullish(),
  beneficiaryName: z.string().min(2).max(300).optional(),
  recipientCin: z.string().max(40).nullish(),
  description: z.string().min(2).max(2000).optional(),
  campaignId: z.string().nullish(),
  estimatedValue: amount,
  handedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).transform((v) => new Date(v + "T00:00:00.000Z")).optional(),
  notes: z.string().max(2000).nullish(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageGovernance(session.user.roles)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const before = await prisma.beneficiaryReceipt.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "غير موجود" }, { status: 404 });
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "بيانات غير صحيحة" }, { status: 400 });
  const { socialCaseId, campaignId, ...rest } = parsed.data;
  const data: Record<string, unknown> = { ...rest };
  if (socialCaseId !== undefined) data.socialCaseId = socialCaseId || null;
  if (campaignId !== undefined) data.campaignId = campaignId || null;
  const updated = await prisma.beneficiaryReceipt.update({ where: { id }, data });
  await recordAudit({ userId: session.user.id, action: "UPDATE", entity: "beneficiary_receipt", entityId: id, before, after: updated, req });
  revalidateBureau("bene-receipts");
  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageGovernance(session.user.roles)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const before = await prisma.beneficiaryReceipt.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "غير موجود" }, { status: 404 });
  await prisma.beneficiaryReceipt.delete({ where: { id } });
  await recordAudit({ userId: session.user.id, action: "DELETE", entity: "beneficiary_receipt", entityId: id, before, req });
  revalidateBureau("bene-receipts");
  return NextResponse.json({ ok: true });
}
