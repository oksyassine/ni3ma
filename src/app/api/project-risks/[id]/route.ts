import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { hasSectionRW } from "@/lib/permissions";
import type { Role } from "@/lib/rbac";

async function gate(session: { user: { id: string; roles: Role[] } }, id: string) {
  const risk = await prisma.projectRisk.findUnique({
    where: { id },
    include: { project: { select: { section: true } } },
  });
  if (!risk) return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  if (!(await hasSectionRW(session, risk.project.section))) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { risk };
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const gated = await gate(session, id);
  if (gated.error) return gated.error;
  const before = gated.risk!;
  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.description !== undefined) data.description = body.description;
  if (body.mitigation !== undefined) data.mitigation = body.mitigation;
  if (body.severity !== undefined) data.severity = body.severity;
  if (body.status !== undefined) data.status = body.status;
  const updated = await prisma.projectRisk.update({ where: { id }, data });
  await recordAudit({ userId: session.user.id, action: "UPDATE", entity: "project_risk", entityId: id, before, after: updated, req });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const gated = await gate(session, id);
  if (gated.error) return gated.error;
  const before = gated.risk!;
  await prisma.projectRisk.delete({ where: { id } });
  await recordAudit({ userId: session.user.id, action: "DELETE", entity: "project_risk", entityId: id, before, req });
  return NextResponse.json({ ok: true });
}
