import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { isAdmin, isBahtTeam } from "@/lib/permissions";

function gate(s: { user: { roles: string[] } } | null) {
  if (!s) return false;
  return isAdmin(s.user.roles as never) || isBahtTeam(s.user.roles as never);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ fid: string }> }) {
  const s = await auth();
  if (!gate(s)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { fid } = await params;
  const body = await req.json();
  const before = await prisma.caseHealthFollowup.findUnique({ where: { id: fid } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const data: Record<string, unknown> = {};
  if (body.hasSpecialOperation !== undefined) data.hasSpecialOperation = !!body.hasSpecialOperation;
  if (body.illness !== undefined) data.illness = body.illness || null;
  if (body.treatmentNotes !== undefined) data.treatmentNotes = body.treatmentNotes || null;
  if (body.progressNotes !== undefined) data.progressNotes = body.progressNotes || null;
  const updated = await prisma.caseHealthFollowup.update({ where: { id: fid }, data });
  await recordAudit({ userId: s!.user.id, action: "UPDATE", entity: "case_health_followup", entityId: fid, before, after: updated, req });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ fid: string }> }) {
  const s = await auth();
  if (!gate(s)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { fid } = await params;
  const before = await prisma.caseHealthFollowup.findUnique({ where: { id: fid } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.caseHealthFollowup.delete({ where: { id: fid } });
  await recordAudit({ userId: s!.user.id, action: "DELETE", entity: "case_health_followup", entityId: fid, before, req });
  return NextResponse.json({ ok: true });
}
