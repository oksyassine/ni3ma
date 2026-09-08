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

const amount = z.union([z.number(), z.string()]).transform((v) => String(v)).nullish();

const createSchema = z.object({
  name: z.string().min(2).max(300),
  slug: z
    .string()
    .max(80)
    .regex(/^[a-z0-9-]*$/, "slug can only contain a-z, 0-9, -")
    .nullish(),
  description: z.string().max(2000).nullish(),
  targetAmount: amount,
  startDate: dateStr,
  endDate: dateStr,
  isPublic: z.boolean().default(false),
  isClosed: z.boolean().default(false),
  coverImageUrl: z.string().max(500).nullish(),
  projectId: z.string().nullish(),
});

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canViewGovernance(session.user.roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const campaigns = await prisma.donationCampaign.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      project: { select: { id: true, name: true } },
      donations: { select: { amount: true, isPaid: true } },
    },
  });
  return NextResponse.json({
    campaigns: campaigns.map((c) => ({
      ...c,
      targetAmount: c.targetAmount === null ? null : Number(c.targetAmount),
      raised: c.donations
        .filter((d) => d.isPaid)
        .reduce((s, d) => s + Number(d.amount), 0),
      donationsCount: c.donations.length,
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

  const { projectId, ...rest } = parsed.data;
  const created = await prisma.donationCampaign.create({
    data: { ...rest, projectId: projectId || null },
  });
  await recordAudit({
    userId: session.user.id,
    action: "CREATE",
    entity: "donation_campaign",
    entityId: created.id,
    after: created,
    req,
  });
  revalidateBureau("campaigns");
  return NextResponse.json(created, { status: 201 });
}
