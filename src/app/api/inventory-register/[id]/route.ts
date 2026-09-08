import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";
import { canManageGovernance } from "@/lib/rbac";
import { revalidateBureau } from "@/lib/revalidate";

const patchSchema = z.object({
  notes: z.string().max(2000).nullish(),
  close: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageGovernance(session.user.roles)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const before = await prisma.inventoryRegister.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "غير موجود" }, { status: 404 });
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "بيانات غير صحيحة" }, { status: 400 });
  const data: Record<string, unknown> = { notes: parsed.data.notes };
  if (parsed.data.close === true) {
    data.closedAt = new Date();
    data.closedBy = session.user.id;
  }
  const updated = await prisma.inventoryRegister.update({ where: { id }, data });
  await recordAudit({ userId: session.user.id, action: "UPDATE", entity: "inventory_register", entityId: id, before, after: updated, req });
  revalidateBureau("inv-register");
  return NextResponse.json(updated);
}

// Regenerate = re-snapshot current assets (overwrites totalValue).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageGovernance(session.user.roles)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const before = await prisma.inventoryRegister.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "غير موجود" }, { status: 404 });
  if (before.closedAt) {
    return NextResponse.json({ error: "closed" }, { status: 400 });
  }
  const assets = await prisma.asset.findMany({ select: { value: true, quantity: true } });
  const totalValue = assets.reduce((s, a) => s + (a.value ? Number(a.value) * a.quantity : 0), 0);
  const totalValueRounded = Math.round(totalValue * 100) / 100;
  const updated = await prisma.inventoryRegister.update({
    where: { id },
    data: { totalValue: String(totalValueRounded), snapshotAt: new Date() },
  });
  await recordAudit({ userId: session.user.id, action: "UPDATE", entity: "inventory_register", entityId: id, before, after: updated, req });
  revalidateBureau("inv-register");
  return NextResponse.json({ ...updated, assetsCount: assets.length, totalValue: totalValueRounded });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageGovernance(session.user.roles)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const before = await prisma.inventoryRegister.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "غير موجود" }, { status: 404 });
  await prisma.inventoryRegister.delete({ where: { id } });
  await recordAudit({ userId: session.user.id, action: "DELETE", entity: "inventory_register", entityId: id, before, req });
  revalidateBureau("inv-register");
  return NextResponse.json({ ok: true });
}
