import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { isAdmin, isBahtTeam } from "@/lib/permissions";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ fid: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(isAdmin(session.user.roles) || isBahtTeam(session.user.roles))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { fid } = await params;
  const body = await req.json();
  const before = await prisma.beneficiaryHealthFollowup.findUnique({ where: { id: fid } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const data: Record<string, unknown> = {};
  if (body.hasSpecialOperation !== undefined) data.hasSpecialOperation = !!body.hasSpecialOperation;
  if (body.illness !== undefined) data.illness = body.illness || null;
  if (body.treatmentNotes !== undefined) data.treatmentNotes = body.treatmentNotes || null;
  if (body.progressNotes !== undefined) data.progressNotes = body.progressNotes || null;
  const updated = await prisma.beneficiaryHealthFollowup.update({ where: { id: fid }, data });
  await recordAudit({ userId: session.user.id, action: "UPDATE", entity: "beneficiary_health_followup", entityId: fid, before, after: updated, req });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ fid: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(isAdmin(session.user.roles) || isBahtTeam(session.user.roles))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { fid } = await params;
  const before = await prisma.beneficiaryHealthFollowup.findUnique({ where: { id: fid } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.beneficiaryHealthFollowup.delete({ where: { id: fid } });
  await recordAudit({ userId: session.user.id, action: "DELETE", entity: "beneficiary_health_followup", entityId: fid, before, req });
  return NextResponse.json({ ok: true });
}
