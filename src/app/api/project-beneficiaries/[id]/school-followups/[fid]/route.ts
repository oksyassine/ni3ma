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
  const before = await prisma.beneficiarySchoolFollowup.findUnique({ where: { id: fid } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const data: Record<string, unknown> = {};
  if (body.semester !== undefined) data.semester = body.semester || null;
  if (body.gpa !== undefined) data.gpa = body.gpa ? parseFloat(String(body.gpa)) : null;
  if (body.progressNotes !== undefined) data.progressNotes = body.progressNotes || null;
  const updated = await prisma.beneficiarySchoolFollowup.update({ where: { id: fid }, data });
  await recordAudit({ userId: session.user.id, action: "UPDATE", entity: "beneficiary_school_followup", entityId: fid, before, after: updated, req });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ fid: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(isAdmin(session.user.roles) || isBahtTeam(session.user.roles))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { fid } = await params;
  const before = await prisma.beneficiarySchoolFollowup.findUnique({ where: { id: fid } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.beneficiarySchoolFollowup.delete({ where: { id: fid } });
  await recordAudit({ userId: session.user.id, action: "DELETE", entity: "beneficiary_school_followup", entityId: fid, before, req });
  return NextResponse.json({ ok: true });
}
