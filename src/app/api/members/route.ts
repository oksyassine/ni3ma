import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { isAdmin, isBureauRW, hasBureauRead, isFinancial } from "@/lib/permissions";
import { recordAudit } from "@/lib/audit";
import { createCappedMember, CapReachedError } from "@/lib/plan-enforce";
import { Prisma } from "@prisma/client";

const CREATABLE_FIELDS = [
  "memberType", "fullName", "dateOfBirth", "placeOfBirth", "gender",
  "cin", "parentCin",
  "fatherName", "fatherPhone", "fatherCin", "fatherProfession", "fatherEducation", "fatherLandline", "fatherAddress",
  "motherName", "motherPhone", "motherCin", "motherProfession", "motherEducation", "motherLandline", "motherAddress",
  "siblingsCount", "siblingsBoys", "siblingsGirls", "siblingOrder",
  "healthStatus", "healthConditions",
  "educationalLevel", "address", "phone", "landline",
  "profession", "maritalStatus", "childrenBoys", "childrenGirls",
  "interestJtima3iya", "interestTarbawiya", "interestFikriya", "interests",
  "associationRole",
  "registrationType", "registrationDate",
  "subscriptionAmount",
] as const;
const INT_FIELDS = ["siblingsCount", "siblingsBoys", "siblingsGirls", "siblingOrder", "childrenBoys", "childrenGirls"] as const;
const BOOL_FIELDS = ["interestJtima3iya", "interestTarbawiya", "interestFikriya"] as const;
const DATE_FIELDS = ["dateOfBirth", "registrationDate"] as const;
const SECTION_VALUES = new Set(["EDUCATIONAL", "SOCIAL", "QURAN"]);
const MAX_LIMIT = 100;

const MEMBER_SAFE_SELECT = {
  id: true,
  registrationNumber: true,
  memberType: true,
  fullName: true,
  photoUrl: true,
  isActive: true,
  username: true,
  userIsActive: true,
} as const;

function parseFiniteFloat(v: unknown): number | undefined {
  const n = parseFloat(String(v));
  return Number.isFinite(n) ? n : undefined;
}
function parseFiniteInt(v: unknown): number | undefined {
  const n = parseInt(String(v));
  return Number.isFinite(n) ? n : undefined;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";
  const type = searchParams.get("type") ?? "";
  const section = searchParams.get("section") ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1") || 1);
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(searchParams.get("limit") ?? "20") || 20));
  const skip = (page - 1) * limit;

  const hasAccess = searchParams.get("hasAccess") === "1";
  const pending = searchParams.get("pending") === "1";
  const noAccess = searchParams.get("noAccess") === "1";

  const where: Record<string, unknown> = {};
  if (search) where.fullName = { contains: search, mode: "insensitive" };
  if (type === "CHILD" || type === "ADULT") where.memberType = type;
  if (section) where.sections = { some: { section, isActive: true } };
  if (hasAccess) where.username = { not: null };
  if (pending) where.isActive = false;
  if (noAccess) {
    where.memberType = "ADULT";
    where.isActive = true;
    where.username = null;
  }

  const canSeeFullData = isAdmin(session.user.roles)
    || isFinancial(session.user.roles)
    || (await hasBureauRead(session));

  const [members, total] = await Promise.all([
    canSeeFullData
      ? prisma.member.findMany({
          where,
          include: { sections: true, userRoles: true },
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
        })
      : prisma.member.findMany({
          where,
          select: MEMBER_SAFE_SELECT,
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
        }),
    prisma.member.count({ where }),
  ]);

  if (hasAccess) {
    return NextResponse.json(
      (members as Array<{ id: string; username: string | null; fullName: string; registrationNumber: number; userIsActive: boolean; userRoles?: { role: string }[] }>).map((m) => ({
        id: m.id,
        username: m.username,
        fullName: m.fullName,
        registrationNumber: m.registrationNumber,
        userIsActive: m.userIsActive,
        roles: (m.userRoles ?? []).map((r) => r.role),
      }))
    );
  }

  return NextResponse.json({ members, total, page, limit });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!isAdmin(session.user.roles) && !(await isBureauRW(session))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { sections: sectionList } = body;

  const data: Record<string, unknown> = {};
  for (const f of CREATABLE_FIELDS) {
    if (body[f] !== undefined && body[f] !== "") data[f] = body[f];
  }
  for (const f of DATE_FIELDS) {
    if (data[f]) {
      const d = new Date(data[f] as string);
      if (Number.isNaN(d.getTime())) {
        return NextResponse.json({ error: `تاريخ غير صالح: ${f}` }, { status: 400 });
      }
      data[f] = d;
    }
  }
  if (data.subscriptionAmount !== undefined) {
    const n = parseFiniteFloat(data.subscriptionAmount);
    if (n === undefined || n < 0) {
      return NextResponse.json({ error: "مبلغ الانخراط غير صالح" }, { status: 400 });
    }
    // Use Prisma.Decimal for monetary columns to avoid float-rounding
    // drift (e.g. 0.1 + 0.2 → 0.30000000000000004).
    data.subscriptionAmount = new Prisma.Decimal(n.toFixed(2));
  }
  for (const f of INT_FIELDS) {
    if (data[f] !== undefined) {
      const n = parseFiniteInt(data[f]);
      if (n === undefined || n < 0) {
        return NextResponse.json({ error: `قيمة غير صالحة: ${f}` }, { status: 400 });
      }
      data[f] = n;
    }
  }
  for (const f of BOOL_FIELDS) {
    if (data[f] !== undefined) data[f] = !!data[f];
  }

  // Validate sections against the enum values — the cast `section as …`
  // in the create payload is a TypeScript lie Prisma would reject at
  // runtime with an unhelpful error.
  const validSections = Array.isArray(sectionList)
    ? sectionList.filter((s): s is string => typeof s === "string" && SECTION_VALUES.has(s))
    : [];

  try {
    const member = await createCappedMember({
      ...(data as Parameters<typeof prisma.member.create>[0]["data"]),
      sections: validSections.length > 0
        ? { create: validSections.map((section) => ({ section: section as "EDUCATIONAL" | "SOCIAL" | "QURAN" })) }
        : undefined,
    } as Parameters<typeof prisma.member.create>[0]["data"]);

    await recordAudit({
      userId: session.user.id,
      action: "CREATE",
      entity: "member",
      entityId: member.id,
      after: { fullName: member.fullName, memberType: member.memberType, registrationNumber: member.registrationNumber },
      req,
    });

    return NextResponse.json(member, { status: 201 });
  } catch (err) {
    if (err instanceof CapReachedError) {
      return NextResponse.json({ error: err.message, code: "CAP_REACHED" }, { status: 402 });
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "ب.و.ت مكرر" }, { status: 409 });
    }
    console.error("member create failed", err);
    return NextResponse.json({ error: "تعذر إضافة المنخرط" }, { status: 500 });
  }
}
