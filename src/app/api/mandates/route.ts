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
  memberId: z.string().nullish(),
  memberName: z.string().min(2).max(300),
  position: z.string().min(1).max(120),
  positionOrder: z.number().int().min(0).max(999).default(99),
  startedAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .transform((v) => new Date(v + "T00:00:00.000Z")),
  endedAt: dateStr,
  declaredAt: dateStr,
  isActive: z.boolean().default(true),
  notes: z.string().max(2000).nullish(),
});

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canViewGovernance(session.user.roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Current composition first (by position order), then past mandates.
  const [active, past] = await Promise.all([
    prisma.bureauMandate.findMany({
      where: { isActive: true },
      orderBy: [{ positionOrder: "asc" }, { startedAt: "desc" }],
    }),
    prisma.bureauMandate.findMany({
      where: { isActive: false },
      orderBy: { endedAt: "desc" },
      take: 100,
    }),
  ]);
  return NextResponse.json({ active, past });
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
  const created = await prisma.bureauMandate.create({ data: { ...rest, memberId: memberId || null } });

  await recordAudit({
    userId: session.user.id,
    action: "CREATE",
    entity: "bureau_mandate",
    entityId: created.id,
    after: created,
    req,
  });

  revalidateBureau("mandates");

  return NextResponse.json(created, { status: 201 });
}
