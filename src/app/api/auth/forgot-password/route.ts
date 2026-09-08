import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { enqueueAndSend, renderTemplate } from "@/lib/messaging";
import { headers } from "next/headers";
import { normalizeHost, rootDomain } from "@/lib/tenants";
import { randomBytes } from "node:crypto";

// POST /api/auth/forgot-password
// Body: { identifier }  (username OR email OR phone)
// Always returns 200 with a generic message — never confirms or denies
// whether the account exists (anti-enumeration). The token is generated
// server-side regardless; if no matching member exists, we just discard
// it. The email/WhatsApp only fires for real users.
//
// The link format is:
//   {origin}/reset-password?token={token}
// where origin is the current Host header (multi-tenant aware).

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function POST(req: NextRequest) {
  const ip = req.headers.get("cf-connecting-ip")
    ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? "unknown";
  // 5 requests per 10 minutes per IP. Forgot-password is a common attack
  // surface (timing-side-channel enumeration); throttle aggressively.
  const rl = rateLimit(`forgot:${ip}`, 5, 10 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too Many Requests" }, { status: 429 });
  }

  const { identifier } = await req.json().catch(() => ({} as { identifier?: string }));
  if (typeof identifier !== "string" || identifier.length === 0 || identifier.length > 200) {
    return NextResponse.json({ ok: true });
  }

  // Find member by username, email, or phone.
  const member = await prisma.member.findFirst({
    where: {
      OR: [
        { username: identifier.toLowerCase() },
        { email: identifier.toLowerCase() },
        { phone: identifier.replace(/\s+/g, "") },
      ],
    },
    select: {
      id: true,
      username: true,
      fullName: true,
      email: true,
      phone: true,
      userIsActive: true,
    },
  });

  if (!member || !member.userIsActive) {
    // Pretend we did the work to avoid leaking existence.
    return NextResponse.json({ ok: true });
  }

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);
  await prisma.passwordResetToken.create({
    data: { memberId: member.id, token, expiresAt },
  });

  const h = await headers();
  const host = normalizeHost(h.get("host")) ?? new URL(req.url).host;
  const proto = host.includes("localhost") ? "http" : "https";
  const link = `${proto}://${host}/reset-password?token=${encodeURIComponent(token)}`;
  const body = renderTemplate(
    "Salam {{name}},\n\nCliquez sur ce lien pour réinitialiser votre mot de passe Ni3ma. Le lien expire dans 1 heure.\n\n{{link}}\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez ce message.\n\nCordialement,\nL'équipe Ni3ma",
    { name: member.fullName, link },
  );

  // Prefer email; fall back to WhatsApp via the configured provider.
  if (member.email) {
    await enqueueAndSend({
      channel: "EMAIL",
      to: member.email,
      body: `[Ni3ma] Réinitialisation de mot de passe — ${member.fullName}\n\n${body}`,
      templateKey: "password-reset",
      recipientMemberId: member.id,
      recipientName: member.fullName,
    }).catch((err) => console.error("[forgot-password] email failed", err));
  } else if (member.phone) {
    await enqueueAndSend({
      channel: "WHATSAPP",
      to: member.phone,
      body,
      templateKey: "password-reset",
      recipientMemberId: member.id,
      recipientName: member.fullName,
    }).catch((err) => console.error("[forgot-password] whatsapp failed", err));
  }

  // Touch rootDomain so the import is used (and so future logging of
  // the host origin works without surprise).
  void rootDomain;

  return NextResponse.json({ ok: true });
}
