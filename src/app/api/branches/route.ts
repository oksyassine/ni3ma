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
  name: z.string().min(2).max(300),
  city: z.string().max(120).nullish(),
  address: z.string().max(500).nullish(),
  phone: z.string().max(40).nullish(),
  email: z.string().max(200).nullish(),
  responsibleName: z.string().max(300).nullish(),
  openedAt: dateStr,
  isActive: z.boolean().default(true),
  notes: z.string().max(2000).nullish(),
});

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canViewGovernance(session.user.roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const branches = await prisma.branch.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ branches });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageGovernance(session.user.roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "بيانات غير صحيحة" }, { status: 400 });

  const created = await prisma.branch.create({ data: parsed.data });

  await recordAudit({
    userId: session.user.id,
    action: "CREATE",
    entity: "branch",
    entityId: created.id,
    after: created,
    req,
  });

  return NextResponse.json(created, { status: 201 });
}
