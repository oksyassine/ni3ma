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

// Entries use full-replace semantics like meeting decisions — the client sends
// the complete edited list on save.
const entrySchema = z.object({
  beneficiaryName: z.string().min(1).max(300),
  quantity: z.number().int().min(1).max(10000).default(1),
  note: z.string().max(500).nullish(),
});

const patchSchema = z.object({
  kind: z
    .enum(["RAMADAN_BASKET", "IFTAR", "ADHI", "EID_CLOTHES", "FOOD_BASKET", "SCHOOL_KIT", "OTHER"])
    .optional(),
  name: z.string().min(2).max(300).optional(),
  yearLabel: z.string().max(60).nullish(),
  unitLabel: z.string().max(60).nullish(),
  plannedUnits: z.number().int().min(0).max(1_000_000).optional(),
  budget: z.union([z.number(), z.string()]).transform((v) => String(v)).nullish(),
  startDate: dateStr,
  endDate: dateStr,
  notes: z.string().max(2000).nullish(),
  entries: z.array(entrySchema).optional(),
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

  const before = await prisma.distributionCampaign.findUnique({
    where: { id },
    include: { entries: true },
  });
  if (!before) return NextResponse.json({ error: "غير موجود" }, { status: 404 });

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "بيانات غير صحيحة" }, { status: 400 });
  const { entries, ...data } = parsed.data;

  const updated = await prisma.$transaction(async (tx) => {
    if (entries !== undefined) {
      await tx.distributionEntry.deleteMany({ where: { campaignId: id } });
      if (entries.length > 0) {
        await tx.distributionEntry.createMany({
          data: entries.map((e) => ({ ...e, campaignId: id })),
        });
      }
    }
    return tx.distributionCampaign.update({ where: { id }, data, include: { entries: true } });
  });

  await recordAudit({
    userId: session.user.id,
    action: "UPDATE",
    entity: "distribution_campaign",
    entityId: id,
    before,
    after: updated,
    req,
  });

  revalidateBureau("distributions");

  return NextResponse.json({
    ...updated,
    budget: updated.budget === null ? null : Number(updated.budget),
    deliveredUnits: updated.entries.reduce((s, e) => s + e.quantity, 0),
  });
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

  const before = await prisma.distributionCampaign.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "غير موجود" }, { status: 404 });

  await prisma.distributionCampaign.delete({ where: { id } });
  await recordAudit({
    userId: session.user.id,
    action: "DELETE",
    entity: "distribution_campaign",
    entityId: id,
    before,
    req,
  });
  revalidateBureau("distributions");
  return NextResponse.json({ ok: true });
}
