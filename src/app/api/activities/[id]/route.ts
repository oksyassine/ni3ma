import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { hasSectionRW } from "@/lib/permissions";
import type { Role } from "@/lib/rbac";

async function loadAndGate(session: { user: { id: string; roles: Role[] } }, id: string) {
  const activity = await prisma.programActivity.findUnique({
    where: { id },
    include: { program: { select: { section: true } } },
  });
  if (!activity) return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  if (!(await hasSectionRW(session, activity.program.section))) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { activity };
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const gated = await loadAndGate(session, id);
  if (gated.error) return gated.error;
  const before = gated.activity!;
  const body = await req.json();

  const updated = await prisma.programActivity.update({
    where: { id },
    data: {
      title: body.title ?? before.title,
      description: body.description ?? before.description,
      activityDate: body.activityDate ? new Date(body.activityDate) : before.activityDate,
      timeStart: body.timeStart ?? before.timeStart,
      timeEnd: body.timeEnd ?? before.timeEnd,
      location: body.location ?? before.location,
      status: body.status ?? before.status,
    },
  });

  await recordAudit({
    userId: session.user.id,
    action: "UPDATE",
    entity: "activity",
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
  const gated = await loadAndGate(session, id);
  if (gated.error) return gated.error;
  const before = gated.activity!;
  await prisma.programActivity.delete({ where: { id } });
  await recordAudit({
    userId: session.user.id,
    action: "DELETE",
    entity: "activity",
    entityId: id,
    before,
    req,
  });
  return NextResponse.json({ ok: true });
}
