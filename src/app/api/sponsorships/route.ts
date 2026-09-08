import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";
import { canManageGovernance, canViewGovernance } from "@/lib/rbac";

const dateStr = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .transform((v) => new Date(v + "T00:00:00.000Z"));

const createSchema = z.object({
  kind: z.enum(["YATIM", "STUDENT", "FAMILY"]).default("YATIM"),
  beneficiaryName: z.string().min(2).max(300),
  socialCaseId: z.string().nullish(),
  sponsorName: z.string().min(2).max(300),
  sponsorPhone: z.string().max(40).nullish(),
  monthlyAmount: z.union([z.number(), z.string()]).transform((v) => String(v)),
  dayOfMonth: z.number().int().min(1).max(28).default(5),
  startedAt: dateStr,
  endedAt: dateStr.nullish(),
  status: z.enum(["ACTIVE", "PAUSED", "ENDED"]).default("ACTIVE"),
  notes: z.string().max(2000).nullish(),
});

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canViewGovernance(session.user.roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sponsorships = await prisma.sponsorship.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ sponsorships });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageGovernance(session.user.roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "بيانات غير صحيحة" }, { status: 400 });

  const { socialCaseId, ...rest } = parsed.data;
  const created = await prisma.sponsorship.create({
    data: { ...rest, socialCaseId: socialCaseId || null },
  });

  await recordAudit({
    userId: session.user.id,
    action: "CREATE",
    entity: "sponsorship",
    entityId: created.id,
    after: created,
    req,
  });

  return NextResponse.json(created, { status: 201 });
}
