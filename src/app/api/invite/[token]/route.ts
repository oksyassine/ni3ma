import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashSync } from "bcryptjs";
import { validateUsernameFormat } from "@/lib/validations/username";

// GET — validate token and return member info
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const invitation = await prisma.invitation.findUnique({
    where: { token },
    include: { member: { select: { fullName: true, memberType: true, username: true } } },
  });

  if (!invitation) {
    return NextResponse.json({ error: "رابط الدعوة غير صالح" }, { status: 404 });
  }
  if (invitation.usedAt) {
    return NextResponse.json({ error: "تم استخدام رابط الدعوة مسبقاً" }, { status: 410 });
  }
  if (new Date() > invitation.expiresAt) {
    return NextResponse.json({ error: "انتهت صلاحية رابط الدعوة" }, { status: 410 });
  }

  return NextResponse.json({
    fullName: invitation.member.fullName,
    hasUsername: !!invitation.member.username,
  });
}

// POST — accept invitation: set username + password
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const { username, password } = await req.json();

  if (!username?.trim() || !password) {
    return NextResponse.json({ error: "اسم المستخدم وكلمة المرور مطلوبان" }, { status: 400 });
  }
  const usernameErr = validateUsernameFormat(username);
  if (usernameErr) return NextResponse.json({ error: usernameErr }, { status: 400 });
  if (password.length < 6) {
    return NextResponse.json({ error: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" }, { status: 400 });
  }
  const cleanUsername = username.trim().toLowerCase();

  const invitation = await prisma.invitation.findUnique({
    where: { token },
    include: { member: true },
  });

  if (!invitation) {
    return NextResponse.json({ error: "رابط الدعوة غير صالح" }, { status: 404 });
  }
  if (invitation.usedAt) {
    return NextResponse.json({ error: "تم استخدام رابط الدعوة مسبقاً" }, { status: 410 });
  }
  if (new Date() > invitation.expiresAt) {
    return NextResponse.json({ error: "انتهت صلاحية رابط الدعوة" }, { status: 410 });
  }

  // Check username uniqueness
  const existingUser = await prisma.user.findUnique({ where: { username: cleanUsername } });
  if (existingUser) {
    return NextResponse.json({ error: "اسم المستخدم محجوز، اختر اسماً آخر" }, { status: 409 });
  }
  const existingMember = await prisma.member.findFirst({
    where: { username: cleanUsername, NOT: { id: invitation.memberId } },
  });
  if (existingMember) {
    return NextResponse.json({ error: "اسم المستخدم محجوز، اختر اسماً آخر" }, { status: 409 });
  }

  // Atomic: credential set + invitation consumption. If invitation.update
  // fails after member.update, the token would remain valid → replay risk.
  await prisma.$transaction([
    prisma.member.update({
      where: { id: invitation.memberId },
      data: {
        username: cleanUsername,
        passwordHash: hashSync(password, 12),
        userIsActive: true,
        isActive: true,
        userRoles: {
          deleteMany: {},
          create: [{ id: crypto.randomUUID(), role: "MEMBER" }],
        },
      },
    }),
    prisma.invitation.update({
      where: { token },
      data: { usedAt: new Date() },
    }),
  ]);

  return NextResponse.json({ success: true });
}
