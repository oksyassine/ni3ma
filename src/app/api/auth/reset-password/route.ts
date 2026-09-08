import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hash } from "bcryptjs";
import { rateLimit } from "@/lib/rate-limit";
import { recordAudit } from "@/lib/audit";

// GET  /api/auth/reset-password?token=...   → probe (returns validity + name)
// POST /api/auth/reset-password  { token, password }  → commit new password
//
// GET is a soft probe: if the token is missing, expired, used, or the member
// is deactivated, returns { valid: false }. The success path leaks the
// member's name so the reset page can greet them by name — this is OK
// because anyone with the token has already proven possession of the
// inbox/phone and so already knows which account they control.

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";
  if (!token) return NextResponse.json({ valid: false });
  const row = await prisma.passwordResetToken.findUnique({
    where: { token },
    include: { member: { select: { fullName: true, userIsActive: true } } },
  });
  if (!row) return NextResponse.json({ valid: false });
  if (row.usedAt) return NextResponse.json({ valid: false });
  if (row.expiresAt.getTime() < Date.now()) return NextResponse.json({ valid: false });
  if (!row.member.userIsActive) return NextResponse.json({ valid: false });
  return NextResponse.json({ valid: true, memberName: row.member.fullName });
}

export async function POST(req: NextRequest) {
  // Throttle: 5 attempts per IP per 10 min. The token is single-use so
  // a legitimate user only needs 1; this just blocks the brute force.
  const ip = req.headers.get("cf-connecting-ip")
    ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? "unknown";
  const rl = rateLimit(`reset:${ip}`, 5, 10 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too Many Requests" }, { status: 429 });
  }

  const { token, password } = await req.json().catch(() => ({} as { token?: string; password?: string }));
  if (typeof token !== "string" || typeof password !== "string" || password.length < 8) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const session = await auth();
  const row = await prisma.passwordResetToken.findUnique({
    where: { token },
    include: { member: true },
  });
  if (!row || row.usedAt || row.expiresAt.getTime() < Date.now() || !row.member.userIsActive) {
    return NextResponse.json({ error: "token invalid or expired" }, { status: 400 });
  }

  const newHash = await hash(password, 12);
  await prisma.$transaction([
    prisma.member.update({
      where: { id: row.memberId },
      data: { passwordHash: newHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: row.id },
      data: { usedAt: new Date() },
    }),
  ]);

  await recordAudit({
    userId: session?.user.id ?? null,
    action: "UPDATE",
    entity: "member_password_reset",
    entityId: row.memberId,
    after: { via: "reset-token" },
    req,
  });

  return NextResponse.json({ ok: true });
}
