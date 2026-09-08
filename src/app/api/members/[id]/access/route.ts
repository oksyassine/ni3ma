import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { hash } from "bcryptjs";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { rateLimit } from "@/lib/rate-limit";
import { validateUsernameFormat } from "@/lib/validations/username";

const ALLOWED_ROLES = new Set([
  "MEMBER",
  "BUREAU",
  "FINANCIAL",
  "EDUCATIONAL",
  "SOCIAL",
  "QURAN",
  "BAHT_IJTIMA3I_TEAM",
]);

const accessSchema = z.object({
  username: z.string().trim().min(3).max(30),
  password: z.string().min(8).max(72).optional(),
  roles: z.array(z.string()).min(1),
  userIsActive: z.boolean().optional(),
});

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

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || !session.user.roles.includes("ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Throttle: 30 PUTs/min per admin. A stolen admin session can't mass-revoke
  // access in a single burst.
  const rl = rateLimit(`access:put:${session.user.id}`, 30, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "طلبات كثيرة" }, { status: 429 });
  }

  const { id } = await params;
  const parsed = accessSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "بيانات غير صحيحة" }, { status: 400 });
  }
  const { username, password, roles, userIsActive } = parsed.data;

  const usernameErr = validateUsernameFormat(username);
  if (usernameErr) return NextResponse.json({ error: usernameErr }, { status: 400 });
  for (const r of roles) {
    if (!ALLOWED_ROLES.has(r)) {
      return NextResponse.json({ error: `الدور ${r} غير مسموح به (الإدارة تُعيَّن عبر /admin/users)` }, { status: 400 });
    }
  }
  const cleanUsername = username.toLowerCase();

  const before = await prisma.member.findUnique({
    where: { id },
    select: { username: true, userIsActive: true, userRoles: { select: { role: true } } },
  });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Hash outside the transaction — bcrypt at cost-12 is ~200ms and blocks
  // the PG connection while running. Doing it here lets us reuse the
  // connection from the transaction.
  const passwordHash = password ? await hash(password, 12) : null;

  try {
    // Username uniqueness check + role-replace + credential update all in
    // one transaction. The DB unique constraint on User.username and
    // Member.username guarantees the check is correct under concurrency.
    const member = await prisma.$transaction(async (tx) => {
      const existingUser = await tx.user.findUnique({
        where: { username: cleanUsername },
        select: { id: true },
      });
      if (existingUser) throw new UsernameTakenError();
      const existingMember = await tx.member.findFirst({
        where: { username: cleanUsername, NOT: { id } },
        select: { id: true },
      });
      if (existingMember) throw new UsernameTakenError();

      await tx.memberRole.deleteMany({ where: { memberId: id } });
      await tx.memberRole.createMany({
        data: roles.map((role) => ({ id: crypto.randomUUID(), memberId: id, role: role as "MEMBER" | "BUREAU" | "FINANCIAL" | "EDUCATIONAL" | "SOCIAL" | "QURAN" | "BAHT_IJTIMA3I_TEAM" })),
      });
      return tx.member.update({
        where: { id },
        data: {
          username: cleanUsername,
          userIsActive: userIsActive ?? true,
          ...(passwordHash ? { passwordHash } : {}),
        },
        select: { username: true, userIsActive: true, userRoles: { select: { role: true } } },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

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
  } catch (err) {
    if (err instanceof UsernameTakenError) {
      return NextResponse.json({ error: "اسم المستخدم محجوز" }, { status: 409 });
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "اسم المستخدم محجوز" }, { status: 409 });
    }
    throw err;
  }
}

class UsernameTakenError extends Error {}

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
