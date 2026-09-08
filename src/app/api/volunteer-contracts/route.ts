import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";
import { canManageGovernance, canViewGovernance } from "@/lib/rbac";

const dateStr = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .transform((v) => new Date(v + "T00:00:00.000Z"))
  .nullish();

const createSchema = z.object({
  memberId: z.string().nullish(),
  volunteerName: z.string().min(2).max(300),
  cin: z.string().max(40).nullish(),
  phone: z.string().max(40).nullish(),
  birthDate: dateStr,
  address: z.string().max(500).nullish(),
  missionTitle: z.string().min(2).max(300),
  missionDetails: z.string().max(5000).nullish(),
  weeklyHours: z.union([z.number(), z.string()]).transform((v) => String(v)).nullish(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).transform((v) => new Date(v + "T00:00:00.000Z")),
  endDate: dateStr,
  insuranceRef: z.string().max(200).nullish(),
  status: z.enum(["DRAFT", "ACTIVE", "ENDED", "TERMINATED"]).default("DRAFT"),
  signedAt: dateStr,
  notes: z.string().max(2000).nullish(),
});

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canViewGovernance(session.user.roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const contracts = await prisma.volunteerContract.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({
    contracts: contracts.map((c) => ({ ...c, weeklyHours: c.weeklyHours === null ? null : Number(c.weeklyHours) })),
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

  const { memberId, ...rest } = parsed.data;
  const created = await prisma.volunteerContract.create({
    data: { ...rest, memberId: memberId || null },
  });

  await recordAudit({
    userId: session.user.id,
    action: "CREATE",
    entity: "volunteer_contract",
    entityId: created.id,
    after: created,
    req,
  });

  return NextResponse.json(
    { ...created, weeklyHours: created.weeklyHours === null ? null : Number(created.weeklyHours) },
    { status: 201 }
  );
}
