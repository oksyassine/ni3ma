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
  const before = await prisma.caseSchoolFollowup.findUnique({ where: { id: fid } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const data: Record<string, unknown> = {};
  if (body.semester !== undefined) data.semester = body.semester || null;
  if (body.gpa !== undefined) data.gpa = body.gpa ? parseFloat(String(body.gpa)) : null;
  if (body.progressNotes !== undefined) data.progressNotes = body.progressNotes || null;
  const updated = await prisma.caseSchoolFollowup.update({ where: { id: fid }, data });
  await recordAudit({ userId: s!.user.id, action: "UPDATE", entity: "case_school_followup", entityId: fid, before, after: updated, req });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ fid: string }> }) {
  const s = await auth();
  if (!gate(s)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { fid } = await params;
  const before = await prisma.caseSchoolFollowup.findUnique({ where: { id: fid } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.caseSchoolFollowup.delete({ where: { id: fid } });
  await recordAudit({ userId: s!.user.id, action: "DELETE", entity: "case_school_followup", entityId: fid, before, req });
  return NextResponse.json({ ok: true });
}
