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

const decisionSchema = z.object({
  title: z.string().min(1).max(300),
  body: z.string().max(5000).nullish(),
  votesFor: z.number().int().min(0).default(0),
  votesAgainst: z.number().int().min(0).default(0),
  votesAbstain: z.number().int().min(0).default(0),
  passed: z.boolean().default(true),
});

const patchSchema = z.object({
  kind: z.enum(["AGO", "AGE", "BUREAU", "OTHER"]).optional(),
  title: z.string().min(2).max(300).optional(),
  heldAt: dateStr.optional(),
  location: z.string().max(300).nullish(),
  convocationMethod: z.string().max(120).nullish(),
  agenda: z.string().max(5000).nullish(),
  minutes: z.string().max(20000).nullish(),
  minutesUrl: z.string().max(500).nullish(),
  expectedCount: z.number().int().min(0).max(100000).optional(),
  presentCount: z.number().int().min(0).max(100000).optional(),
  quorumPct: z.number().int().min(1).max(100).optional(),
  // Full replace — the client sends the complete edited decision list.
  decisions: z.array(decisionSchema).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageGovernance(session.user.roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;

  const before = await prisma.meeting.findUnique({
    where: { id },
    include: { decisions: true },
  });
  if (!before) return NextResponse.json({ error: "غير موجود" }, { status: 404 });

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "بيانات غير صحيحة" }, { status: 400 });
  const { decisions, ...data } = parsed.data;

  const updated = await prisma.$transaction(async (tx) => {
    if (decisions !== undefined) {
      await tx.meetingDecision.deleteMany({ where: { meetingId: id } });
      if (decisions.length > 0) {
        await tx.meetingDecision.createMany({
          data: decisions.map((d, i) => ({ ...d, meetingId: id, position: i })),
        });
      }
    }
    return tx.meeting.update({
      where: { id },
      data,
      include: { decisions: { orderBy: { position: "asc" } } },
    });
  });

  await recordAudit({
    userId: session.user.id,
    action: "UPDATE",
    entity: "meeting",
    entityId: id,
    before,
    after: updated,
    req,
  });

  revalidateBureau("meetings");

  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageGovernance(session.user.roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;

  const before = await prisma.meeting.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "غير موجود" }, { status: 404 });

  await prisma.meeting.delete({ where: { id } });
  await recordAudit({
    userId: session.user.id,
    action: "DELETE",
    entity: "meeting",
    entityId: id,
    before,
    req,
  });
  revalidateBureau("meetings");
  return NextResponse.json({ ok: true });
}
