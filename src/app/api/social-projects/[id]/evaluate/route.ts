import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { hasSectionRW } from "@/lib/permissions";
import { toIntOrNull } from "@/lib/coerce";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const before = await prisma.socialProject.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!(await hasSectionRW(session, before.section))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updated = await prisma.socialProject.update({
    where: { id },
    data: {
      status: "COMPLETED",
      evaluationReport: body.report ?? null,
      evaluationScore: toIntOrNull(body.score),
      evaluationLessons: body.lessons ?? null,
      evaluationRecommend: body.recommend ?? null,
      actualBeneficiaries: toIntOrNull(body.actualBeneficiaries),
      evaluatedAt: new Date(),
      evaluatedBy: session.user.id,
    },
  });

  await recordAudit({
    userId: session.user.id,
    action: "APPROVE",
    entity: "social_project",
    entityId: id,
    before,
    after: updated,
    req,
  });

  return NextResponse.json(updated);
}
