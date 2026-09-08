import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";
import { canManageGovernance } from "@/lib/rbac";

const dateStr = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .transform((v) => new Date(v + "T00:00:00.000Z"));

const amount = z.union([z.number(), z.string()]).transform((v) => String(v));

const createSchema = z.object({
  funderName: z.string().min(2).max(300),
  funderKind: z
    .enum(["INDH", "COMMUNE", "MINISTRY", "INTERNATIONAL", "FOUNDATION", "OTHER"])
    .default("OTHER"),
  projectName: z.string().min(2).max(300),
  reference: z.string().max(120).nullish(),
  amount,
  status: z
    .enum(["APPLIED", "APPROVED", "ACTIVE", "COMPLETED", "CANCELLED"])
    .default("APPLIED"),
  signedAt: dateStr.nullish(),
  startDate: dateStr.nullish(),
  endDate: dateStr.nullish(),
  projectId: z.string().nullish(),
  contactName: z.string().max(200).nullish(),
  contactPhone: z.string().max(40).nullish(),
  notes: z.string().max(5000).nullish(),
  tranches: z
    .array(
      z.object({
        label: z.string().min(1).max(120),
        amount,
        expectedAt: dateStr.nullish(),
        receivedAt: dateStr.nullish(),
        reportDueAt: dateStr.nullish(),
        reportedAt: dateStr.nullish(),
      })
    )
    .optional(),
});

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const grants = await prisma.grant.findMany({
    orderBy: { createdAt: "desc" },
    include: { tranches: true },
  });
  return NextResponse.json({ grants });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageGovernance(session.user.roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "بيانات غير صحيحة" }, { status: 400 });

  const { projectId, tranches, ...rest } = parsed.data;
  const created = await prisma.grant.create({
    data: {
      ...rest,
      projectId: projectId || null,
      ...(tranches && tranches.length > 0
        ? { tranches: { create: tranches.map((t) => ({ ...t })) } }
        : {}),
    },
    include: { tranches: true },
  });

  await recordAudit({
    userId: session.user.id,
    action: "CREATE",
    entity: "grant",
    entityId: created.id,
    after: created,
    req,
  });

  return NextResponse.json(created, { status: 201 });
}
