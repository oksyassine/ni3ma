import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { hasSectionRW } from "@/lib/permissions";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const program = await prisma.annualProgram.findUnique({
    where: { id },
    include: {
      activities: { orderBy: { activityDate: "asc" } },
      academicYear: true,
    },
  });
  if (!program) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(program);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const before = await prisma.annualProgram.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!(await hasSectionRW(session, before.section))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updated = await prisma.annualProgram.update({
    where: { id },
    data: {
      title: body.title ?? before.title,
      description: body.description ?? before.description,
      startDate: body.startDate ? new Date(body.startDate) : before.startDate,
      endDate: body.endDate ? new Date(body.endDate) : before.endDate,
    },
  });

  await recordAudit({
    userId: session.user.id,
    action: "UPDATE",
    entity: "program",
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
  const before = await prisma.annualProgram.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!(await hasSectionRW(session, before.section))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await prisma.annualProgram.delete({ where: { id } });
  await recordAudit({
    userId: session.user.id,
    action: "DELETE",
    entity: "program",
    entityId: id,
    before,
    req,
  });
  return NextResponse.json({ ok: true });
}
