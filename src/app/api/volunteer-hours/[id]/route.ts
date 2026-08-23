import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import type { Section } from "@prisma/client";

const APPROVER_ROLES = ["ADMIN", "BUREAU", "BUREAU_RW", "SECTION_ADMIN"];

function isAnyApprover(roles: string[]): boolean {
  return roles.some((r) => APPROVER_ROLES.includes(r));
}

// SECTION_ADMIN can only act on hours in their section. Returns true if the
// user is allowed to approve/edit/delete a record for the given section.
async function canActOnSection(session: { user: { id: string; roles: string[] } }, section: Section): Promise<boolean> {
  if (session.user.roles.some((r) => ["ADMIN", "BUREAU", "BUREAU_RW"].includes(r))) return true;
  if (!session.user.roles.includes("SECTION_ADMIN")) return false;
  const row = await prisma.sectionPermission.findFirst({
    where: {
      OR: [{ userId: session.user.id }, { memberId: session.user.id }],
      section,
      level: "ADMIN",
    },
    select: { id: true },
  });
  return !!row;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const before = await prisma.volunteerHours.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: Record<string, unknown> = {};
  if (body.approve === true) {
    if (!isAnyApprover(session.user.roles) || !(await canActOnSection(session, before.section))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    data.approved = true;
    data.approvedBy = session.user.id;
    data.approvedAt = new Date();
  }
  if (body.approve === false) {
    if (!isAnyApprover(session.user.roles) || !(await canActOnSection(session, before.section))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    data.approved = false;
    data.approvedBy = null;
    data.approvedAt = null;
  }
  // Self-edit allowed (member editing their own record) OR approver
  const isOwner = before.memberId === session.user.id;
  const editingFields = body.hours !== undefined || body.description !== undefined;
  if (editingFields && !isOwner && !isAnyApprover(session.user.roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (body.hours !== undefined) data.hours = parseFloat(body.hours);
  if (body.description !== undefined) data.description = body.description;

  const updated = await prisma.volunteerHours.update({ where: { id }, data });

  await recordAudit({
    userId: session.user.id,
    action: body.approve === true ? "APPROVE" : (body.approve === false ? "REJECT" : "UPDATE"),
    entity: "volunteer_hours",
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
  const before = await prisma.volunteerHours.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Owner can delete their own (unapproved) record; approvers can delete any
  const isOwner = before.memberId === session.user.id;
  if (!isOwner && (!isAnyApprover(session.user.roles) || !(await canActOnSection(session, before.section)))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (isOwner && before.approved) {
    return NextResponse.json({ error: "لا يمكن حذف ساعات معتمدة" }, { status: 400 });
  }

  await prisma.volunteerHours.delete({ where: { id } });
  await recordAudit({
    userId: session.user.id,
    action: "DELETE",
    entity: "volunteer_hours",
    entityId: id,
    before,
    req,
  });
  return NextResponse.json({ ok: true });
}
