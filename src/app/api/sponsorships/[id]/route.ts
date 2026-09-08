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
  .transform((v) => new Date(v + "T00:00:00.000Z"))
  .nullish();

const patchSchema = z.object({
  kind: z.enum(["YATIM", "STUDENT", "FAMILY"]).optional(),
  beneficiaryName: z.string().min(2).max(300).optional(),
  socialCaseId: z.string().nullish(),
  sponsorName: z.string().min(2).max(300).optional(),
  sponsorPhone: z.string().max(40).nullish(),
  monthlyAmount: z.union([z.number(), z.string()]).transform((v) => String(v)).optional(),
  dayOfMonth: z.number().int().min(1).max(28).optional(),
  startedAt: dateStr,
  endedAt: dateStr,
  // Status transitions (pause/resume/end) are validated against the current record.
  status: z.enum(["ACTIVE", "PAUSED", "ENDED"]).optional(),
  notes: z.string().max(2000).nullish(),
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

  const before = await prisma.sponsorship.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "غير موجود" }, { status: 404 });

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "بيانات غير صحيحة" }, { status: 400 });
  const { socialCaseId, endedAt, ...rest } = parsed.data;

  const data: Record<string, unknown> = { ...rest };
  if (socialCaseId !== undefined) data.socialCaseId = socialCaseId || null;
  if (endedAt !== undefined) data.endedAt = endedAt;
  if (data.status === "ENDED" && !before.endedAt && data.endedAt === undefined) {
    data.endedAt = new Date();
  }
  if (data.status === "ACTIVE") {
    // Resuming clears any premature end date.
    if (before.status !== "ACTIVE" && data.endedAt === undefined) data.endedAt = null;
    data.startedAt = data.startedAt ?? before.startedAt;
  }

  const updated = await prisma.sponsorship.update({ where: { id }, data });

  await recordAudit({
    userId: session.user.id,
    action: "UPDATE",
    entity: "sponsorship",
    entityId: id,
    before,
    after: updated,
    req,
  });

  revalidateBureau("sponsorships");

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

  const before = await prisma.sponsorship.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "غير موجود" }, { status: 404 });

  await prisma.sponsorship.delete({ where: { id } });
  await recordAudit({
    userId: session.user.id,
    action: "DELETE",
    entity: "sponsorship",
    entityId: id,
    before,
    req,
  });
  revalidateBureau("sponsorships");
  return NextResponse.json({ ok: true });
}
