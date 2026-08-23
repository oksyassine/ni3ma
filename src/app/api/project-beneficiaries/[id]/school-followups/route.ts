import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { isAdmin, isBahtTeam, hasSectionRW } from "@/lib/permissions";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(isAdmin(session.user.roles) || isBahtTeam(session.user.roles))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const list = await prisma.beneficiarySchoolFollowup.findMany({
    where: { beneficiaryId: id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(list);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(isAdmin(session.user.roles) || isBahtTeam(session.user.roles))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  // Beyond baht-team, require SOCIAL RW (defense in depth)
  if (!(await hasSectionRW(session, "SOCIAL")) && !isBahtTeam(session.user.roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const body = await req.json();

  const created = await prisma.beneficiarySchoolFollowup.create({
    data: {
      beneficiaryId: id,
      semester: body.semester || null,
      gpa: body.gpa ? parseFloat(String(body.gpa)) : null,
      progressNotes: body.progressNotes || null,
      createdBy: session.user.id,
    },
  });
  await recordAudit({ userId: session.user.id, action: "CREATE", entity: "beneficiary_school_followup", entityId: created.id, after: created, req });
  return NextResponse.json(created, { status: 201 });
}
