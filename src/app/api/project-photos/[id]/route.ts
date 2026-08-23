import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { hasSectionRW } from "@/lib/permissions";
import type { Role } from "@/lib/rbac";

async function gate(session: { user: { id: string; roles: Role[] } }, id: string) {
  const row = await prisma.projectPhoto.findUnique({
    where: { id },
    include: { project: { select: { section: true } } },
  });
  if (!row) return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  if (!(await hasSectionRW(session, row.project.section))) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { row };
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const gated = await gate(session, id);
  if (gated.error) return gated.error;
  const before = gated.row!;
  const body = await req.json();
  const updated = await prisma.projectPhoto.update({
    where: { id },
    data: { caption: body.caption ?? null },
  });
  await recordAudit({
    userId: session.user.id,
    action: "UPDATE",
    entity: "project_photo",
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
  const gated = await gate(session, id);
  if (gated.error) return gated.error;
  const before = gated.row!;
  await prisma.projectPhoto.delete({ where: { id } });
  await recordAudit({
    userId: session.user.id,
    action: "DELETE",
    entity: "project_photo",
    entityId: id,
    before,
    req,
  });
  return NextResponse.json({ ok: true });
}
