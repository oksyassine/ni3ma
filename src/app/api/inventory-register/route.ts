import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";
import { canManageGovernance, canViewGovernance } from "@/lib/rbac";
import { revalidateBureau } from "@/lib/revalidate";

const createSchema = z.object({
  yearLabel: z.string().min(4).max(20), // e.g., "2025" or "1446-1447"
  snapshotAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).transform((v) => new Date(v + "T00:00:00.000Z")).optional(),
  notes: z.string().max(2000).nullish(),
});

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canViewGovernance(session.user.roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const registers = await prisma.inventoryRegister.findMany({
    orderBy: { snapshotAt: "desc" },
    include: { closedByUser: { select: { id: true, fullName: true } } },
  });
  return NextResponse.json({
    registers: registers.map((r) => ({
      ...r,
      totalValue: Number(r.totalValue),
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageGovernance(session.user.roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "بيانات غير صحيحة" }, { status: 400 });

  // Block duplicate year — caller must PATCH (regenerate) instead.
  const existing = await prisma.inventoryRegister.findUnique({ where: { yearLabel: parsed.data.yearLabel } });
  if (existing) {
    return NextResponse.json({ error: "invExists" }, { status: 409 });
  }

  // Snapshot the live Asset table: sum (value * quantity) per row.
  const assets = await prisma.asset.findMany({ select: { value: true, quantity: true } });
  const totalValue = assets.reduce((s, a) => s + (a.value ? Number(a.value) * a.quantity : 0), 0);
  const totalValueRounded = Math.round(totalValue * 100) / 100;

  const created = await prisma.inventoryRegister.create({
    data: {
      yearLabel: parsed.data.yearLabel,
      snapshotAt: parsed.data.snapshotAt ?? new Date(),
      totalValue: String(totalValueRounded),
      notes: parsed.data.notes,
    },
  });
  await recordAudit({
    userId: session.user.id,
    action: "CREATE",
    entity: "inventory_register",
    entityId: created.id,
    after: { ...created, snapshotDetails: { assetsCount: assets.length, totalValue: totalValueRounded } },
    req,
  });
  revalidateBureau("inv-register");
  return NextResponse.json(
    { ...created, assetsCount: assets.length, totalValue: totalValueRounded },
    { status: 201 }
  );
}
