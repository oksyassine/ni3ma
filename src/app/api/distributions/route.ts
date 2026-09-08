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
  .transform((v) => new Date(v + "T00:00:00.000Z"))
  .nullish();

const createSchema = z.object({
  kind: z
    .enum(["RAMADAN_BASKET", "IFTAR", "ADHI", "EID_CLOTHES", "FOOD_BASKET", "SCHOOL_KIT", "OTHER"])
    .default("OTHER"),
  name: z.string().min(2).max(300),
  yearLabel: z.string().max(60).nullish(),
  unitLabel: z.string().max(60).nullish(),
  plannedUnits: z.number().int().min(0).max(1_000_000).default(0),
  budget: z.union([z.number(), z.string()]).transform((v) => String(v)).nullish(),
  startDate: dateStr,
  endDate: dateStr,
  notes: z.string().max(2000).nullish(),
});

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canViewGovernance(session.user.roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const campaigns = await prisma.distributionCampaign.findMany({
    orderBy: { createdAt: "desc" },
    include: { entries: true },
  });
  return NextResponse.json({
    campaigns: campaigns.map((c) => ({
      ...c,
      budget: c.budget === null ? null : Number(c.budget),
      deliveredUnits: c.entries.reduce((s, e) => s + e.quantity, 0),
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

  const created = await prisma.distributionCampaign.create({ data: parsed.data, include: { entries: true } });

  await recordAudit({
    userId: session.user.id,
    action: "CREATE",
    entity: "distribution_campaign",
    entityId: created.id,
    after: created,
    req,
  });

  revalidateBureau("distributions");

  return NextResponse.json(
    {
      ...created,
      budget: created.budget === null ? null : Number(created.budget),
      deliveredUnits: 0,
    },
    { status: 201 }
  );
}
