import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { isAdmin, hasSectionAdmin } from "@/lib/permissions";

// PUT: assign BAHT_IJTIMA3I_TEAM to this member.
// DELETE: revoke it.
//
// Authorized: ADMIN role OR SECTION_ADMIN of SOCIAL.
// Requirement: member must be enrolled in SOCIAL section.

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowed = isAdmin(session.user.roles) || (await hasSectionAdmin(session, "SOCIAL"));
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const member = await prisma.member.findUnique({
    where: { id },
    include: { sections: { where: { section: "SOCIAL", isActive: true } } },
  });
  if (!member) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (member.sections.length === 0) {
    return NextResponse.json({ error: "المنخرط ليس مسجلا في القسم الاجتماعي" }, { status: 400 });
  }

  // Add BAHT_IJTIMA3I_TEAM role; ignore if already present.
  await prisma.memberRole.upsert({
    where: { memberId_role: { memberId: id, role: "BAHT_IJTIMA3I_TEAM" } },
    update: {},
    create: { memberId: id, role: "BAHT_IJTIMA3I_TEAM" },
  });

  await recordAudit({
    userId: session.user.id,
    action: "UPDATE",
    entity: "member_baht_team",
    entityId: id,
    after: { added: true },
    req,
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowed = isAdmin(session.user.roles) || (await hasSectionAdmin(session, "SOCIAL"));
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  await prisma.memberRole.deleteMany({
    where: { memberId: id, role: "BAHT_IJTIMA3I_TEAM" },
  });

  await recordAudit({
    userId: session.user.id,
    action: "DELETE",
    entity: "member_baht_team",
    entityId: id,
    req,
  });
  return NextResponse.json({ ok: true });
}
