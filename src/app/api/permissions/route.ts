import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import {
  isAdmin,
  isBureauRW,
  hasSectionAdmin,
  assertBureauRWNotLast,
} from "@/lib/permissions";
import type { Section, PermissionLevel, BureauLevel } from "@prisma/client";

// GET /api/permissions  → list of grants for review.
// POST /api/permissions { kind: "section"|"bureau", subjectType: "user"|"member",
//                        subjectId, section?, level }  → create/update grant
// DELETE /api/permissions { kind, subjectType, subjectId, section? }   → revoke

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin(session.user.roles) && !(await isBureauRW(session))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const [section, bureau] = await Promise.all([
    prisma.sectionPermission.findMany({
      orderBy: [{ section: "asc" }, { level: "desc" }],
      include: {
        user:   { select: { id: true, fullName: true, username: true } },
        member: { select: { id: true, fullName: true, username: true } },
      },
    }),
    prisma.bureauPermission.findMany({
      orderBy: [{ level: "desc" }],
      include: {
        user:   { select: { id: true, fullName: true, username: true } },
        member: { select: { id: true, fullName: true, username: true } },
      },
    }),
  ]);
  return NextResponse.json({ section, bureau });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { kind, subjectType, subjectId, section, level } = body as {
    kind: "section" | "bureau";
    subjectType: "user" | "member";
    subjectId: string;
    section?: Section;
    level: PermissionLevel | BureauLevel;
  };

  if (!subjectId || !level || !subjectType) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // Authorization: who can grant what.
  if (kind === "bureau") {
    // Only ADMIN role can grant bureau-level permissions.
    if (!isAdmin(session.user.roles)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (level !== "READ" && level !== "RW") {
      return NextResponse.json({ error: "مستوى المكتب يجب أن يكون قراءة أو قراءة/كتابة فقط" }, { status: 400 });
    }
    const bLevel: BureauLevel = level;
    const data = { level: bLevel, grantedBy: session.user.id };
    let row;
    if (subjectType === "user") {
      row = await prisma.bureauPermission.upsert({
        where: { userId: subjectId },
        update: data,
        create: { ...data, userId: subjectId },
      });
    } else {
      row = await prisma.bureauPermission.upsert({
        where: { memberId: subjectId },
        update: data,
        create: { ...data, memberId: subjectId },
      });
    }
    await recordAudit({ userId: session.user.id, action: "UPDATE", entity: "bureau_permission", entityId: row.id, after: row, req });
    return NextResponse.json(row);
  }

  // kind === "section"
  if (!section) return NextResponse.json({ error: "section required" }, { status: 400 });
  // ADMIN role or BUREAU_RW or SECTION_ADMIN of that section can grant
  const allowed = isAdmin(session.user.roles)
    || (await isBureauRW(session))
    || (await hasSectionAdmin(session, section));
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // SECTION_ADMIN cannot grant ADMIN-level — only RW or READ within section
  if (
    !isAdmin(session.user.roles)
    && !(await isBureauRW(session))
    && level === "ADMIN"
  ) {
    return NextResponse.json({ error: "Section admins cannot grant ADMIN level" }, { status: 403 });
  }

  const sLevel: PermissionLevel = level as PermissionLevel;
  const data = { level: sLevel, grantedBy: session.user.id };
  let row;
  if (subjectType === "user") {
    row = await prisma.sectionPermission.upsert({
      where: { userId_section: { userId: subjectId, section } },
      update: data,
      create: { ...data, userId: subjectId, section },
    });
  } else {
    row = await prisma.sectionPermission.upsert({
      where: { memberId_section: { memberId: subjectId, section } },
      update: data,
      create: { ...data, memberId: subjectId, section },
    });
  }
  await recordAudit({ userId: session.user.id, action: "UPDATE", entity: "section_permission", entityId: row.id, after: row, req });
  return NextResponse.json(row);
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { kind, subjectType, subjectId, section, force } = body as {
    kind: "section" | "bureau";
    subjectType: "user" | "member";
    subjectId: string;
    section?: Section;
    force?: boolean;
  };

  if (kind === "bureau") {
    if (!isAdmin(session.user.roles)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const subject = subjectType === "user" ? { userId: subjectId } : { memberId: subjectId };
    try {
      await assertBureauRWNotLast(subject, !!force && isAdmin(session.user.roles));
    } catch (e) {
      if ((e as Error).message === "LAST_BUREAU_RW") {
        return NextResponse.json({
          error: "هذا هو آخر عضو لديه صلاحية RW في المكتب — لا يمكن إزالته. عيّن آخر أولا أو استعمل force=true.",
          code: "LAST_BUREAU_RW",
        }, { status: 409 });
      }
      throw e;
    }
    const where = subjectType === "user" ? { userId: subjectId } : { memberId: subjectId };
    const before = await prisma.bureauPermission.findFirst({ where });
    if (!before) return NextResponse.json({ ok: true });
    await prisma.bureauPermission.delete({ where: { id: before.id } });
    await recordAudit({ userId: session.user.id, action: "DELETE", entity: "bureau_permission", entityId: before.id, before, req });
    return NextResponse.json({ ok: true });
  }

  if (!section) return NextResponse.json({ error: "section required" }, { status: 400 });
  const allowed = isAdmin(session.user.roles)
    || (await isBureauRW(session))
    || (await hasSectionAdmin(session, section));
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const where = subjectType === "user"
    ? { userId_section: { userId: subjectId, section } }
    : { memberId_section: { memberId: subjectId, section } };
  const before = await prisma.sectionPermission.findUnique({ where });
  if (!before) return NextResponse.json({ ok: true });
  await prisma.sectionPermission.delete({ where: { id: before.id } });
  await recordAudit({ userId: session.user.id, action: "DELETE", entity: "section_permission", entityId: before.id, before, req });
  return NextResponse.json({ ok: true });
}
