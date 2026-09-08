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
  memberName: z.string().min(2).max(300).optional(),
  position: z.string().min(1).max(120).optional(),
  positionOrder: z.number().int().min(0).max(999).optional(),
  startedAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .transform((v) => new Date(v + "T00:00:00.000Z"))
    .optional(),
  endedAt: dateStr,
  declaredAt: dateStr,
  isActive: z.boolean().optional(),
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

  const before = await prisma.bureauMandate.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "غير موجود" }, { status: 404 });

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "بيانات غير صحيحة" }, { status: 400 });
  const { memberId, ...rest } = parsed.data;

  const data: Record<string, unknown> = { ...rest };
  if (memberId !== undefined) data.memberId = memberId || null;
  // Closer of a mandate without explicit end date stamps today.
  if (data.isActive === false && !before.endedAt && data.endedAt === undefined) {
    data.endedAt = new Date();
  }

  const updated = await prisma.bureauMandate.update({ where: { id }, data });

  await recordAudit({
    userId: session.user.id,
    action: "UPDATE",
    entity: "bureau_mandate",
    entityId: id,
    before,
    after: updated,
    req,
  });

  revalidateBureau("mandates");

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

  const before = await prisma.bureauMandate.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "غير موجود" }, { status: 404 });

  await prisma.bureauMandate.delete({ where: { id } });
  await recordAudit({
    userId: session.user.id,
    action: "DELETE",
    entity: "bureau_mandate",
    entityId: id,
    before,
    req,
  });
  revalidateBureau("mandates");
  return NextResponse.json({ ok: true });
}
