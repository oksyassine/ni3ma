import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { hasSectionRW } from "@/lib/permissions";
import type { Role } from "@/lib/rbac";

async function gateByPlan(session: { user: { id: string; roles: Role[] } }, id: string) {
  const plan = await prisma.projectPlan.findUnique({
    where: { id },
    include: { project: { select: { section: true } } },
  });
  if (!plan) return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  if (!(await hasSectionRW(session, plan.project.section))) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { plan };
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const gated = await gateByPlan(session, id);
  if (gated.error) return gated.error;
  const before = gated.plan!;
  const body = await req.json();

  if (body.makeActive === true) {
    await prisma.$transaction([
      prisma.projectPlan.updateMany({
        where: { projectId: before.projectId },
        data: { isActive: false },
      }),
      prisma.projectPlan.update({ where: { id }, data: { isActive: true } }),
    ]);
    const updated = await prisma.projectPlan.findUnique({ where: { id } });
    await recordAudit({
      userId: session.user.id,
      action: "UPDATE",
      entity: "project_plan",
      entityId: id,
      before,
      after: updated,
      req,
    });
    return NextResponse.json(updated);
  }

  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.description !== undefined) data.description = body.description;
  if (body.estimatedCost !== undefined) {
    if (!body.estimatedCost) data.estimatedCost = null;
    else {
      const n = parseFloat(body.estimatedCost);
      if (!Number.isFinite(n) || n < 0) return NextResponse.json({ error: "تكلفة غير صالحة" }, { status: 400 });
      data.estimatedCost = n;
    }
  }

  const updated = await prisma.projectPlan.update({ where: { id }, data });
  await recordAudit({
    userId: session.user.id,
    action: "UPDATE",
    entity: "project_plan",
    entityId: id,
    before,
    after: updated,
    req,
  });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const gated = await gateByPlan(session, id);
  if (gated.error) return gated.error;
  const before = gated.plan!;
  await prisma.projectPlan.delete({ where: { id } });
  await recordAudit({
    userId: session.user.id,
    action: "DELETE",
    entity: "project_plan",
    entityId: id,
    before,
    req,
  });
  return NextResponse.json({ ok: true });
}
