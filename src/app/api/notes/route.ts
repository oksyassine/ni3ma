import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { isAdmin as isAdminRole, isBureauRW } from "@/lib/permissions";
import type { Role } from "@/lib/rbac";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const memberId = searchParams.get("memberId");
  // Require memberId — unfiltered note dumps could leak private notes despite
  // the in-JS visibility filter (they'd still be fetched from DB and shipped).
  if (!memberId) {
    return NextResponse.json({ error: "memberId مطلوب" }, { status: 400 });
  }
  const notes = await prisma.memberNote.findMany({
    where: { memberId },
    include: { author: { select: { fullName: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  // Filter notes by visibility
  const userRoles = session.user.roles as Role[];
  const isAdmin = userRoles.includes("ADMIN");
  const filtered = notes.filter((n) => {
    if (isAdmin) return true;
    if (n.authorId === session.user.id) return true;
    if (!n.isPrivate) return true;
    return n.visibleTo.some((r) => userRoles.includes(r));
  });
  return NextResponse.json(filtered);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Notes are staff annotations on a member's file. The only UI that writes
  // them is /admin/members/[id], which the proxy restricts to ADMIN/BUREAU_RW;
  // without a check here any signed-in member could attach notes to anyone.
  if (!isAdminRole(session.user.roles) && !(await isBureauRW(session))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { memberId, content, isPrivate, visibleTo } = await req.json();
  if (!memberId || !content) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const note = await prisma.memberNote.create({
    data: {
      memberId,
      authorId: session.user.id,
      content,
      isPrivate: isPrivate ?? true,
      visibleTo: visibleTo ?? [],
    },
    include: { author: { select: { fullName: true } } },
  });

  await recordAudit({
    userId: session.user.id,
    action: "CREATE",
    entity: "member_note",
    entityId: note.id,
    after: note,
    req,
  });
  return NextResponse.json(note, { status: 201 });
}
