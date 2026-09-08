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

const amount = z.union([z.number(), z.string()]).transform((v) => String(v)).nullish();

const patchSchema = z.object({
  name: z.string().min(2).max(300).optional(),
  slug: z
    .string()
    .max(80)
    .regex(/^[a-z0-9-]*$/)
    .nullish(),
  description: z.string().max(2000).nullish(),
  targetAmount: amount,
  startDate: dateStr,
  endDate: dateStr,
  isPublic: z.boolean().optional(),
  isClosed: z.boolean().optional(),
  coverImageUrl: z.string().max(500).nullish(),
  projectId: z.string().nullish(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageGovernance(session.user.roles)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const before = await prisma.donationCampaign.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "غير موجود" }, { status: 404 });
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "بيانات غير صحيحة" }, { status: 400 });
  const { projectId, ...rest } = parsed.data;
  const data: Record<string, unknown> = { ...rest };
  if (projectId !== undefined) data.projectId = projectId || null;
  const updated = await prisma.donationCampaign.update({ where: { id }, data });
  await recordAudit({ userId: session.user.id, action: "UPDATE", entity: "donation_campaign", entityId: id, before, after: updated, req });
  revalidateBureau("campaigns");
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
  const before = await prisma.donationCampaign.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "غير موجود" }, { status: 404 });
  await prisma.donationCampaign.delete({ where: { id } });
  await recordAudit({ userId: session.user.id, action: "DELETE", entity: "donation_campaign", entityId: id, before, req });
  revalidateBureau("campaigns");
  return NextResponse.json({ ok: true });
}
