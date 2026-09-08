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
  title: z.string().min(2).max(300),
  field: z.string().max(200).nullish(),
  trainerName: z.string().max(300).nullish(),
  partner: z.string().max(300).nullish(),
  location: z.string().max(300).nullish(),
  seatsTotal: z.number().int().min(0).max(100000).default(0),
  startDate: dateStr,
  endDate: dateStr,
  status: z.enum(["PLANNED", "ONGOING", "DONE", "CANCELLED"]).default("PLANNED"),
  notes: z.string().max(2000).nullish(),
});

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canViewGovernance(session.user.roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const courses = await prisma.trainingCourse.findMany({
    orderBy: { createdAt: "desc" },
    include: { participants: true },
  });
  return NextResponse.json({ courses });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageGovernance(session.user.roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "بيانات غير صحيحة" }, { status: 400 });

  const created = await prisma.trainingCourse.create({
    data: parsed.data,
    include: { participants: true },
  });

  await recordAudit({
    userId: session.user.id,
    action: "CREATE",
    entity: "training_course",
    entityId: created.id,
    after: created,
    req,
  });

  revalidateBureau("trainings");

  return NextResponse.json(created, { status: 201 });
}
