import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { randomBytes } from "crypto";

// POST /api/invitations — admin creates an invitation link for a member
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !session.user.roles.includes("ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { memberId } = await req.json();
  if (!memberId) {
    return NextResponse.json({ error: "memberId required" }, { status: 400 });
  }

  const member = await prisma.member.findUnique({ where: { id: memberId } });
  if (!member) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }
  if (member.memberType !== "ADULT") {
    return NextResponse.json({ error: "يمكن إرسال دعوة للمنخرطين الكبار فقط" }, { status: 400 });
  }

  // Invalidate any previous unused invitations
  await prisma.invitation.updateMany({
    where: { memberId, usedAt: null },
    data: { expiresAt: new Date() }, // expire them
  });

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const invitation = await prisma.invitation.create({
    data: {
      id: crypto.randomUUID(),
      memberId,
      token,
      expiresAt,
    },
  });

  // Also approve the member (set isActive = true)
  await prisma.member.update({
    where: { id: memberId },
    data: { isActive: true },
  });

  const inviteUrl = `${process.env.AUTH_URL ?? ""}/invite/${invitation.token}`;

  return NextResponse.json({ token: invitation.token, inviteUrl, expiresAt });
}
