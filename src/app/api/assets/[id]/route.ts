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
  name: z.string().min(1).max(300).optional(),
  category: z.string().max(120).nullish(),
  quantity: z.number().int().min(1).max(100000).optional(),
  value: z.union([z.number(), z.string()]).transform((v) => String(v)).nullish(),
  serialNumber: z.string().max(120).nullish(),
  location: z.string().max(300).nullish(),
  condition: z.enum(["GOOD", "NEEDS_REPAIR", "OUT_OF_SERVICE"]).optional(),
  acquiredAt: dateStr,
  source: z.string().max(200).nullish(),
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

  const before = await prisma.asset.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "غير موجود" }, { status: 404 });

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "بيانات غير صحيحة" }, { status: 400 });

  const updated = await prisma.asset.update({ where: { id }, data: parsed.data });

  await recordAudit({
    userId: session.user.id,
    action: "UPDATE",
    entity: "asset",
    entityId: id,
    before,
    after: updated,
    req,
  });

  revalidateBureau("assets");

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

  const before = await prisma.asset.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "غير موجود" }, { status: 404 });

  await prisma.asset.delete({ where: { id } });
  await recordAudit({
    userId: session.user.id,
    action: "DELETE",
    entity: "asset",
    entityId: id,
    before,
    req,
  });
  revalidateBureau("assets");
  return NextResponse.json({ ok: true });
}
