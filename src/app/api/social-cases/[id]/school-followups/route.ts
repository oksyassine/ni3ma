import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { isAdmin, isBahtTeam } from "@/lib/permissions";

function gate(s: { user: { roles: string[] } } | null) {
  if (!s) return false;
  return isAdmin(s.user.roles as never) || isBahtTeam(s.user.roles as never);
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const s = await auth();
  if (!gate(s)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const list = await prisma.caseSchoolFollowup.findMany({ where: { caseId: id }, orderBy: { createdAt: "desc" } });
  return NextResponse.json(list);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const s = await auth();
  if (!gate(s)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const body = await req.json();
  const created = await prisma.caseSchoolFollowup.create({
    data: {
      caseId: id,
      semester: body.semester || null,
      gpa: body.gpa ? parseFloat(String(body.gpa)) : null,
      progressNotes: body.progressNotes || null,
      createdBy: s!.user.id,
    },
  });
  await recordAudit({ userId: s!.user.id, action: "CREATE", entity: "case_school_followup", entityId: created.id, after: created, req });
  return NextResponse.json(created, { status: 201 });
}
