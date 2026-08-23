import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { isAdmin, isFinancial, isBureauRW, hasSectionRW } from "@/lib/permissions";
import type { Role } from "@/lib/rbac";

async function canWrite(session: { user: { id: string; roles: Role[] } }, projectId: string | null) {
  if (isAdmin(session.user.roles) || isFinancial(session.user.roles)) return true;
  if (await isBureauRW(session)) return true;
  if (projectId) {
    const project = await prisma.socialProject.findUnique({ where: { id: projectId }, select: { section: true } });
    if (project && (await hasSectionRW(session, project.section))) return true;
  }
  return false;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const before = await prisma.inKindDonation.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!(await canWrite(session, before.projectId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.itemName !== undefined) data.itemName = body.itemName;
  if (body.quantity !== undefined) {
    const n = parseFloat(body.quantity);
    if (!Number.isFinite(n) || n < 0) return NextResponse.json({ error: "كمية غير صالحة" }, { status: 400 });
    data.quantity = n;
  }
  if (body.unit !== undefined) data.unit = body.unit || null;
  if (body.estimatedValue !== undefined) {
    if (body.estimatedValue === null || body.estimatedValue === "") data.estimatedValue = null;
    else {
      const n = parseFloat(body.estimatedValue);
      if (!Number.isFinite(n) || n < 0) return NextResponse.json({ error: "قيمة غير صالحة" }, { status: 400 });
      data.estimatedValue = n;
    }
  }
  if (body.donorName !== undefined) data.donorName = body.isAnonymous ? null : body.donorName;
  if (body.donorPhone !== undefined) data.donorPhone = body.donorPhone;
  if (body.donationDate !== undefined) {
    const d = new Date(body.donationDate);
    if (Number.isNaN(d.getTime())) return NextResponse.json({ error: "تاريخ غير صالح" }, { status: 400 });
    data.donationDate = d;
  }
  if (body.isAnonymous !== undefined) data.isAnonymous = body.isAnonymous;
  if (body.notes !== undefined) data.notes = body.notes;
  if (body.projectId !== undefined) data.projectId = body.projectId || null;

  const updated = await prisma.inKindDonation.update({ where: { id }, data });
  await recordAudit({
    userId: session.user.id,
    action: "UPDATE",
    entity: "in_kind_donation",
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
  const before = await prisma.inKindDonation.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!(await canWrite(session, before.projectId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.inKindDonation.delete({ where: { id } });
  await recordAudit({
    userId: session.user.id,
    action: "DELETE",
    entity: "in_kind_donation",
    entityId: id,
    before,
    req,
  });
  return NextResponse.json({ ok: true });
}
