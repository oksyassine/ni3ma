import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { hasSectionRW } from "@/lib/permissions";
import type { RiskSeverity, RiskStatus } from "@prisma/client";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const project = await prisma.socialProject.findUnique({ where: { id }, select: { section: true } });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!(await hasSectionRW(session, project.section))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  if (!body.description?.trim()) return NextResponse.json({ error: "الوصف مطلوب" }, { status: 400 });
  const created = await prisma.projectRisk.create({
    data: {
      projectId: id,
      description: body.description.trim(),
      mitigation: body.mitigation || null,
      severity: (body.severity ?? "MEDIUM") as RiskSeverity,
      status: (body.status ?? "OPEN") as RiskStatus,
    },
  });
  await recordAudit({ userId: session.user.id, action: "CREATE", entity: "project_risk", entityId: created.id, after: created, req });
  return NextResponse.json(created, { status: 201 });
}
