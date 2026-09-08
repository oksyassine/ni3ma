import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";
import { canManageGovernance, canViewGovernance } from "@/lib/rbac";
import { revalidateBureau } from "@/lib/revalidate";

const dateStr = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .transform((v) => new Date(v + "T00:00:00.000Z"));

const createSchema = z.object({
  name: z.string().min(1).max(300),
  category: z.string().max(120).nullish(),
  quantity: z.number().int().min(1).max(100000).default(1),
  value: z.union([z.number(), z.string()]).transform((v) => String(v)).nullish(),
  serialNumber: z.string().max(120).nullish(),
  location: z.string().max(300).nullish(),
  condition: z.enum(["GOOD", "NEEDS_REPAIR", "OUT_OF_SERVICE"]).default("GOOD"),
  acquiredAt: dateStr,
  source: z.string().max(200).nullish(),
  notes: z.string().max(2000).nullish(),
});

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canViewGovernance(session.user.roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const assets = await prisma.asset.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ assets });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageGovernance(session.user.roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "بيانات غير صحيحة" }, { status: 400 });

  const created = await prisma.asset.create({ data: parsed.data });

  await recordAudit({
    userId: session.user.id,
    action: "CREATE",
    entity: "asset",
    entityId: created.id,
    after: created,
    req,
  });

  revalidateBureau("assets");

  return NextResponse.json(created, { status: 201 });
}
