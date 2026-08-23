import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { isAdmin, isBahtTeam } from "@/lib/permissions";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(isAdmin(session.user.roles) || isBahtTeam(session.user.roles))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const list = await prisma.beneficiaryHealthFollowup.findMany({
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
  const { id } = await params;
  const body = await req.json();
  const created = await prisma.beneficiaryHealthFollowup.create({
    data: {
      beneficiaryId: id,
      hasSpecialOperation: !!body.hasSpecialOperation,
      illness: body.illness || null,
      treatmentNotes: body.treatmentNotes || null,
      progressNotes: body.progressNotes || null,
      createdBy: session.user.id,
    },
  });
  await recordAudit({ userId: session.user.id, action: "CREATE", entity: "beneficiary_health_followup", entityId: created.id, after: created, req });
  return NextResponse.json(created, { status: 201 });
}
