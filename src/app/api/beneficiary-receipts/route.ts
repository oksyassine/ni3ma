import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";
import { canManageGovernance, canViewGovernance } from "@/lib/rbac";
import { revalidateBureau } from "@/lib/revalidate";

const amount = z.union([z.number(), z.string()]).transform((v) => String(v)).nullish();

const createSchema = z.object({
  socialCaseId: z.string().nullish(),
  beneficiaryName: z.string().min(2).max(300),
  recipientCin: z.string().max(40).nullish(),
  description: z.string().min(2).max(2000),
  campaignId: z.string().nullish(),
  estimatedValue: amount,
  handedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).transform((v) => new Date(v + "T00:00:00.000Z")),
  notes: z.string().max(2000).nullish(),
});

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canViewGovernance(session.user.roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const receipts = await prisma.beneficiaryReceipt.findMany({
    orderBy: { handedAt: "desc" },
    include: {
      socialCase: { select: { id: true, fullName: true, caseNumber: true } },
      campaign: { select: { id: true, name: true } },
    },
  });
  return NextResponse.json({
    receipts: receipts.map((r) => ({
      ...r,
      estimatedValue: r.estimatedValue === null ? null : Number(r.estimatedValue),
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageGovernance(session.user.roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "بيانات غير صحيحة" }, { status: 400 });
  const { socialCaseId, campaignId, ...rest } = parsed.data;
  const created = await prisma.beneficiaryReceipt.create({
    data: {
      ...rest,
      socialCaseId: socialCaseId || null,
      campaignId: campaignId || null,
    },
  });
  await recordAudit({
    userId: session.user.id,
    action: "CREATE",
    entity: "beneficiary_receipt",
    entityId: created.id,
    after: created,
    req,
  });
  revalidateBureau("bene-receipts");
  return NextResponse.json(created, { status: 201 });
}
