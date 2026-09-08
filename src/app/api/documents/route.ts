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
  kind: z
    .enum([
      "STATUTES", "INTERNAL_RULES", "PV", "DECLARATION", "BANK",
      "CNSS", "AGREEMENT", "INSURANCE", "RECEIPT", "OTHER",
    ])
    .default("OTHER"),
  title: z.string().min(1).max(300),
  reference: z.string().max(200).nullish(),
  issuedAt: dateStr,
  expiresAt: dateStr,
  reminderDays: z.number().int().min(0).max(365).default(30),
  fileUrl: z.string().max(500).nullish(),
  notes: z.string().max(2000).nullish(),
});

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canViewGovernance(session.user.roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const documents = await prisma.officialDocument.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ documents });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageGovernance(session.user.roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "بيانات غير صحيحة" }, { status: 400 });

  const created = await prisma.officialDocument.create({ data: parsed.data });

  await recordAudit({
    userId: session.user.id,
    action: "CREATE",
    entity: "official_document",
    entityId: created.id,
    after: created,
    req,
  });

  return NextResponse.json(created, { status: 201 });
}
