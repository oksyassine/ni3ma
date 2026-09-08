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

// Participants use full-replace semantics like decisions/tranches/entries.
const participantSchema = z.object({
  fullName: z.string().min(1).max(300),
  phone: z.string().max(40).nullish(),
  note: z.string().max(500).nullish(),
});

const patchSchema = z.object({
  title: z.string().min(2).max(300).optional(),
  field: z.string().max(200).nullish(),
  trainerName: z.string().max(300).nullish(),
  partner: z.string().max(300).nullish(),
  location: z.string().max(300).nullish(),
  seatsTotal: z.number().int().min(0).max(100000).optional(),
  startDate: dateStr,
  endDate: dateStr,
  status: z.enum(["PLANNED", "ONGOING", "DONE", "CANCELLED"]).optional(),
  notes: z.string().max(2000).nullish(),
  participants: z.array(participantSchema).optional(),
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

  const before = await prisma.trainingCourse.findUnique({
    where: { id },
    include: { participants: true },
  });
  if (!before) return NextResponse.json({ error: "غير موجود" }, { status: 404 });

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "بيانات غير صحيحة" }, { status: 400 });
  const { participants, ...data } = parsed.data;

  const updated = await prisma.$transaction(async (tx) => {
    if (participants !== undefined) {
      await tx.courseParticipant.deleteMany({ where: { courseId: id } });
      if (participants.length > 0) {
        await tx.courseParticipant.createMany({
          data: participants.map((p) => ({ ...p, courseId: id })),
        });
      }
    }
    return tx.trainingCourse.update({ where: { id }, data, include: { participants: true } });
  });

  await recordAudit({
    userId: session.user.id,
    action: "UPDATE",
    entity: "training_course",
    entityId: id,
    before,
    after: updated,
    req,
  });

  revalidateBureau("trainings");

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

  const before = await prisma.trainingCourse.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "غير موجود" }, { status: 404 });

  await prisma.trainingCourse.delete({ where: { id } });
  await recordAudit({
    userId: session.user.id,
    action: "DELETE",
    entity: "training_course",
    entityId: id,
    before,
    req,
  });
  revalidateBureau("trainings");
  return NextResponse.json({ ok: true });
}
