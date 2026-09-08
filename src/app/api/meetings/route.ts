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
  .transform((v) => new Date(v + "T00:00:00.000Z"));

const createSchema = z.object({
  kind: z.enum(["AGO", "AGE", "BUREAU", "OTHER"]).default("AGO"),
  title: z.string().min(2).max(300),
  heldAt: dateStr,
  location: z.string().max(300).nullish(),
  convocationMethod: z.string().max(120).nullish(),
  agenda: z.string().max(5000).nullish(),
  minutes: z.string().max(20000).nullish(),
  minutesUrl: z.string().max(500).nullish(),
  expectedCount: z.number().int().min(0).max(100000).default(0),
  presentCount: z.number().int().min(0).max(100000).default(0),
  quorumPct: z.number().int().min(1).max(100).default(50),
});

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const meetings = await prisma.meeting.findMany({
    orderBy: { heldAt: "desc" },
    include: { decisions: { orderBy: { position: "asc" } } },
  });
  return NextResponse.json({ meetings });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageGovernance(session.user.roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "بيانات غير صحيحة" }, { status: 400 });

  const created = await prisma.meeting.create({ data: parsed.data, include: { decisions: true } });

  await recordAudit({
    userId: session.user.id,
    action: "CREATE",
    entity: "meeting",
    entityId: created.id,
    after: created,
    req,
  });

  revalidateBureau("meetings");

  return NextResponse.json(created, { status: 201 });
}
