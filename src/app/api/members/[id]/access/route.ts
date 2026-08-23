import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { hashSync } from "bcryptjs";
import { validateUsernameFormat } from "@/lib/validations/username";

// Disallow admin promotion via this endpoint. Admin users are created via
// /api/users, not by promoting a member.
const ALLOWED_ROLES = new Set([
  "MEMBER",
  "BUREAU",
  "FINANCIAL",
  "EDUCATIONAL",
  "SOCIAL",
  "QURAN",
  "BAHT_IJTIMA3I_TEAM",
]);

// GET: fetch current access info for a member
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || !session.user.roles.includes("ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const member = await prisma.member.findUnique({
    where: { id },
    select: { username: true, userIsActive: true, userRoles: { select: { role: true } } },
  });

  if (!member) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    username: member.username,
    userIsActive: member.userIsActive,
    roles: member.userRoles.map((r) => r.role),
  });
}

// PUT: set or update login access for an adult member
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || !session.user.roles.includes("ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { username, password, roles, userIsActive } = await req.json();

  if (!username) {
    return NextResponse.json({ error: "اسم المستخدم مطلوب" }, { status: 400 });
  }
  const usernameErr = validateUsernameFormat(username);
  if (usernameErr) return NextResponse.json({ error: usernameErr }, { status: 400 });
  if (!roles || roles.length === 0) {
    return NextResponse.json({ error: "يجب اختيار دور واحد على الأقل" }, { status: 400 });
  }
  // Reject ADMIN or any unknown role from being assigned here
  for (const r of roles) {
    if (!ALLOWED_ROLES.has(r)) {
      return NextResponse.json({ error: `الدور ${r} غير مسموح به (الإدارة تُعيَّن عبر /admin/users)` }, { status: 400 });
    }
  }
  const cleanUsername = String(username).trim().toLowerCase();

  const before = await prisma.member.findUnique({
    where: { id },
    select: { username: true, userIsActive: true, userRoles: { select: { role: true } } },
  });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Check username uniqueness (across both users and members, excluding current)
  const existingUser = await prisma.user.findUnique({ where: { username: cleanUsername } });
  if (existingUser) {
    return NextResponse.json({ error: "اسم المستخدم محجوز" }, { status: 409 });
  }
  const existingMember = await prisma.member.findFirst({
    where: { username: cleanUsername, NOT: { id } },
  });
  if (existingMember) {
    return NextResponse.json({ error: "اسم المستخدم محجوز" }, { status: 409 });
  }

  const updateData: Record<string, unknown> = {
    username: cleanUsername,
    userIsActive: userIsActive ?? true,
  };
  if (password) {
    updateData.passwordHash = hashSync(password, 12);
  }

  // Atomic: role-replacement and credential update happen together. If
  // anything fails, the existing roles + credentials are preserved.
  const member = await prisma.$transaction(async (tx) => {
    await tx.memberRole.deleteMany({ where: { memberId: id } });
    await tx.memberRole.createMany({
      data: roles.map((role: string) => ({ id: crypto.randomUUID(), memberId: id, role })),
    });
    return tx.member.update({
      where: { id },
      data: updateData,
      select: { username: true, userIsActive: true, userRoles: { select: { role: true } } },
    });
  });

  await recordAudit({
    userId: session.user.id,
    action: "UPDATE",
    entity: "member_access",
    entityId: id,
    before,
    after: member,
    req,
  });

  return NextResponse.json({
    username: member.username,
    userIsActive: member.userIsActive,
    roles: member.userRoles.map((r) => r.role),
  });
}

// DELETE: revoke login access
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || !session.user.roles.includes("ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const before = await prisma.member.findUnique({
    where: { id },
    select: { username: true, userIsActive: true, userRoles: { select: { role: true } } },
  });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.$transaction(async (tx) => {
    await tx.memberRole.deleteMany({ where: { memberId: id } });
    await tx.member.update({
      where: { id },
      data: { username: null, passwordHash: null, userIsActive: false },
    });
  });

  await recordAudit({
    userId: session.user.id,
    action: "DELETE",
    entity: "member_access",
    entityId: id,
    before,
    req,
  });

  return NextResponse.json({ success: true });
}
