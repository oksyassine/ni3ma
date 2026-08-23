import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { hasSectionRW } from "@/lib/permissions";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const before = await prisma.attendance.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!(await hasSectionRW(session, before.section))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.isPresent !== undefined) data.isPresent = body.isPresent;
  if (body.date !== undefined) {
    const d = new Date(body.date);
    if (Number.isNaN(d.getTime())) return NextResponse.json({ error: "تاريخ غير صالح" }, { status: 400 });
    data.date = d;
  }
  if (body.section !== undefined) data.section = body.section;

  const updated = await prisma.attendance.update({ where: { id }, data });
  await recordAudit({
    userId: session.user.id,
    action: "UPDATE",
    entity: "attendance",
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
  const before = await prisma.attendance.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!(await hasSectionRW(session, before.section))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await prisma.attendance.delete({ where: { id } });
  await recordAudit({
    userId: session.user.id,
    action: "DELETE",
    entity: "attendance",
    entityId: id,
    before,
    req,
  });
  return NextResponse.json({ ok: true });
}
