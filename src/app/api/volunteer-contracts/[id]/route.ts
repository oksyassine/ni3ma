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
  memberId: z.string().nullish(),
  volunteerName: z.string().min(2).max(300).optional(),
  cin: z.string().max(40).nullish(),
  phone: z.string().max(40).nullish(),
  birthDate: dateStr,
  address: z.string().max(500).nullish(),
  missionTitle: z.string().min(2).max(300).optional(),
  missionDetails: z.string().max(5000).nullish(),
  weeklyHours: z.union([z.number(), z.string()]).transform((v) => String(v)).nullish(),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .transform((v) => new Date(v + "T00:00:00.000Z"))
    .optional(),
  endDate: dateStr,
  insuranceRef: z.string().max(200).nullish(),
  status: z.enum(["DRAFT", "ACTIVE", "ENDED", "TERMINATED"]).optional(),
  signedAt: dateStr,
  notes: z.string().max(2000).nullish(),
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

  const before = await prisma.volunteerContract.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "غير موجود" }, { status: 404 });

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "بيانات غير صحيحة" }, { status: 400 });
  const { memberId, ...rest } = parsed.data;

  const data: Record<string, unknown> = { ...rest };
  if (memberId !== undefined) data.memberId = memberId || null;
  // Signing the contract activates it and stamps the signature date.
  if (data.status === "ACTIVE" && !before.signedAt && data.signedAt === undefined) {
    data.signedAt = new Date();
  }

  const updated = await prisma.volunteerContract.update({ where: { id }, data });

  await recordAudit({
    userId: session.user.id,
    action: "UPDATE",
    entity: "volunteer_contract",
    entityId: id,
    before,
    after: updated,
    req,
  });

  revalidateBureau("volunteer-contracts");

  return NextResponse.json({
    ...updated,
    weeklyHours: updated.weeklyHours === null ? null : Number(updated.weeklyHours),
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

  const before = await prisma.volunteerContract.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "غير موجود" }, { status: 404 });

  await prisma.volunteerContract.delete({ where: { id } });
  await recordAudit({
    userId: session.user.id,
    action: "DELETE",
    entity: "volunteer_contract",
    entityId: id,
    before,
    req,
  });
  revalidateBureau("volunteer-contracts");
  return NextResponse.json({ ok: true });
}
