import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";

// Self-service member profile endpoint.
// GET: returns the logged-in member's own record (subset).
// PATCH: lets the member edit a SAFE allowlist of contact/personal fields.
// Hard-restricted: cannot change isActive, registrationType, fullName, CIN,
// passwordHash, roles, fees, registrationDate, etc. Those are admin-only.

const SELF_EDITABLE_FIELDS = [
  "phone", "landline", "address",
  "profession", "interests",
  "interestJtima3iya", "interestTarbawiya", "interestFikriya",
] as const;

const BOOL_FIELDS = ["interestJtima3iya", "interestTarbawiya", "interestFikriya"] as const;

async function findMyMember(sessionUserId: string) {
  // session.user.id is either a User row or a Member row depending on login.
  // For self-edit we only operate on Member rows — Users (admin accounts)
  // don't have a member profile.
  return prisma.member.findUnique({ where: { id: sessionUserId } });
}

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const member = await findMyMember(session.user.id);
  if (!member) {
    return NextResponse.json({ error: "ليست لديك بطاقة منخرط مرتبطة بحسابك" }, { status: 404 });
  }

  // Return only fields useful for self-display, no secrets
  const {
    passwordHash: _ph, checkinToken: _ct,
    ...safe
  } = member;
  void _ph; void _ct;
  return NextResponse.json(safe);
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const before = await findMyMember(session.user.id);
  if (!before) {
    return NextResponse.json({ error: "ليست لديك بطاقة منخرط مرتبطة بحسابك" }, { status: 404 });
  }

  const body = await req.json();
  const data: Record<string, unknown> = {};
  for (const f of SELF_EDITABLE_FIELDS) {
    if (body[f] !== undefined) data[f] = body[f] === "" ? null : body[f];
  }
  for (const f of BOOL_FIELDS) {
    if (data[f] !== undefined) data[f] = !!data[f];
  }

  const updated = await prisma.member.update({ where: { id: before.id }, data });

  await recordAudit({
    userId: session.user.id,
    action: "UPDATE",
    entity: "member_self",
    entityId: before.id,
    before,
    after: updated,
    req,
  });

  return NextResponse.json(updated);
}
