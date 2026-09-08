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
  partnerName: z.string().min(2).max(300).optional(),
  kind: z
    .enum(["PUBLIC_INSTITUTION", "PRIVATE_COMPANY", "NGO", "SCHOOL", "HEALTH", "INTERNATIONAL", "OTHER"])
    .optional(),
  contactName: z.string().max(300).nullish(),
  contactPhone: z.string().max(40).nullish(),
  contactEmail: z.string().max(200).nullish(),
  object: z.string().min(2).max(2000).optional(),
  signedAt: dateStr,
  startDate: dateStr,
  endDate: dateStr,
  status: z.enum(["DRAFT", "SIGNED", "ACTIVE", "EXPIRED", "TERMINATED"]).optional(),
  fileUrl: z.string().max(500).nullish(),
  notes: z.string().max(2000).nullish(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageGovernance(session.user.roles)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const before = await prisma.partnership.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "غير موجود" }, { status: 404 });
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "بيانات غير صحيحة" }, { status: 400 });
  const updated = await prisma.partnership.update({ where: { id }, data: parsed.data });
  await recordAudit({ userId: session.user.id, action: "UPDATE", entity: "partnership", entityId: id, before, after: updated, req });
  revalidateBureau("partnerships");
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageGovernance(session.user.roles)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const before = await prisma.partnership.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "غير موجود" }, { status: 404 });
  await prisma.partnership.delete({ where: { id } });
  await recordAudit({ userId: session.user.id, action: "DELETE", entity: "partnership", entityId: id, before, req });
  revalidateBureau("partnerships");
  return NextResponse.json({ ok: true });
}
