import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { revokeAllForMember, isAdmin, isBureauRW, hasBureauRead, isFinancial } from "@/lib/permissions";

// Allowlist: only these fields make it through to Prisma. Prevents accidental
// or malicious overwrites of system columns (passwordHash, createdAt, etc.).
const MEMBER_EDITABLE_FIELDS = [
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
  "subscriptionAmount", "isActive", "photoUrl",
] as const;

const INT_FIELDS = ["siblingsCount", "siblingsBoys", "siblingsGirls", "siblingOrder", "childrenBoys", "childrenGirls"] as const;
const BOOL_FIELDS = ["interestJtima3iya", "interestTarbawiya", "interestFikriya", "isActive"] as const;
const DATE_FIELDS = ["dateOfBirth", "registrationDate"] as const;

// Enum validation — reject bad values BEFORE Prisma 500s.
const ENUM_VALIDATORS: Record<string, (v: unknown) => boolean> = {
  memberType: (v) => v === "CHILD" || v === "ADULT",
  gender: (v) => v === "MALE" || v === "FEMALE",
  healthStatus: (v) => v === "HEALTHY" || v === "SICK",
  maritalStatus: (v) => ["SINGLE", "MARRIED", "DIVORCED", "WIDOWED"].includes(v as string),
  registrationType: (v) => ["TAMM", "DAAM_MADRASSI", "QURAN_TAJWEED", "MOKHAYAM"].includes(v as string),
};

function parseFiniteFloat(v: unknown): number | undefined {
  const n = parseFloat(String(v));
  return Number.isFinite(n) ? n : undefined;
}
function parseFiniteInt(v: unknown): number | undefined {
  const n = parseInt(String(v));
  return Number.isFinite(n) ? n : undefined;
}

// Safe member shape — strips passwordHash, checkinToken always.
function stripSecrets<T extends Record<string, unknown>>(m: T): Omit<T, "passwordHash" | "checkinToken"> {
  const { passwordHash: _ph, checkinToken: _ct, ...rest } = m as T & { passwordHash?: unknown; checkinToken?: unknown };
  void _ph; void _ct;
  return rest;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Anyone can view their OWN member record. For other members, require a
  // privileged role (admin/bureau/financial) — section leaders read the
  // limited list view, not full PII.
  const isSelf = id === session.user.id;
  const privileged = isAdmin(session.user.roles)
    || isFinancial(session.user.roles)
    || (await hasBureauRead(session));

  if (!isSelf && !privileged) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const member = await prisma.member.findUnique({
    where: { id },
    include: {
      sections: true,
      notes: {
        // Respect note visibility rules: private notes only to author or admin
        where: isAdmin(session.user.roles)
          ? {}
          : {
              OR: [
                { isPrivate: false },
                { authorId: session.user.id },
              ],
            },
        include: { author: { select: { fullName: true } } },
        orderBy: { createdAt: "desc" },
      },
      contributions: privileged
        ? { orderBy: { weekStart: "desc" }, take: 10 }
        : false,
    },
  });

  if (!member) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(stripSecrets(member as unknown as Record<string, unknown>));
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Editing member records is admin/bureau-RW only.
  if (!isAdmin(session.user.roles) && !(await isBureauRW(session))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const { sections: sectionList } = body;

  const before = await prisma.member.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updateData: Record<string, unknown> = {};
  for (const f of MEMBER_EDITABLE_FIELDS) {
    if (body[f] !== undefined) updateData[f] = body[f];
  }

  // Enum guards — reject before Prisma sees it
  for (const [field, validate] of Object.entries(ENUM_VALIDATORS)) {
    const v = updateData[field];
    if (v !== undefined && v !== null && v !== "" && !validate(v)) {
      return NextResponse.json({ error: `قيمة غير صالحة في حقل ${field}` }, { status: 400 });
    }
    if (v === "") updateData[field] = null;
  }

  // Coerce dates
  for (const f of DATE_FIELDS) {
    if (updateData[f] !== undefined) {
      const v = updateData[f];
      if (v === null || v === "") {
        updateData[f] = null;
      } else {
        const d = new Date(v as string);
        if (Number.isNaN(d.getTime())) {
          return NextResponse.json({ error: `تاريخ غير صالح: ${f}` }, { status: 400 });
        }
        updateData[f] = d;
      }
    }
  }
  // Coerce decimal
  if (updateData.subscriptionAmount !== undefined) {
    const v = updateData.subscriptionAmount;
    if (v === null || v === "") {
      updateData.subscriptionAmount = null;
    } else {
      const n = parseFiniteFloat(v);
      if (n === undefined) return NextResponse.json({ error: "مبلغ الانخراط غير صالح" }, { status: 400 });
      updateData.subscriptionAmount = n;
    }
  }
  // Coerce ints
  for (const f of INT_FIELDS) {
    if (updateData[f] !== undefined) {
      const v = updateData[f];
      if (v === null || v === "") {
        updateData[f] = null;
      } else {
        const n = parseFiniteInt(v);
        if (n === undefined) return NextResponse.json({ error: `قيمة غير صالحة: ${f}` }, { status: 400 });
        updateData[f] = n;
      }
    }
  }
  // Coerce booleans
  for (const f of BOOL_FIELDS) {
    if (updateData[f] !== undefined) updateData[f] = !!updateData[f];
  }

  // Atomic: replace sections AND update the member together so we never end
  // up with a member that has zero sections after a mid-flight failure.
  const member = await prisma.$transaction(async (tx) => {
    if (sectionList) {
      await tx.memberSection.deleteMany({ where: { memberId: id } });
      if (sectionList.length > 0) {
        await tx.memberSection.createMany({
          data: sectionList.map((section: string) => ({ memberId: id, section })),
        });
      }
    }
    return tx.member.update({
      where: { id },
      data: updateData,
      include: { sections: true },
    });
  });

  // Auto-revoke permissions on deactivation
  if (before.isActive && member.isActive === false) {
    await revokeAllForMember(id);
  }

  await recordAudit({
    userId: session.user.id,
    action: "UPDATE",
    entity: "member",
    entityId: id,
    before,
    after: member,
    req,
  });

  return NextResponse.json(stripSecrets(member as unknown as Record<string, unknown>));
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Deletion is admin/bureau-RW only.
  if (!isAdmin(session.user.roles) && !(await isBureauRW(session))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const before = await prisma.member.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Prevent self-deletion through this endpoint
  if (id === session.user.id) {
    return NextResponse.json({ error: "لا يمكنك حذف حسابك من هنا" }, { status: 400 });
  }

  // Guard against losing financial / audit history. Recommend soft-delete
  // (isActive=false) for active members with linked financial data.
  const [contribCount, donationCount, expenseCount] = await Promise.all([
    prisma.weeklyContribution.count({ where: { memberId: id } }),
    prisma.donation.count({ where: { recordedBy: id } }),
    prisma.expense.count({ where: { recordedBy: id } }),
  ]);
  if (contribCount > 0 || donationCount > 0 || expenseCount > 0) {
    return NextResponse.json({
      error: "لا يمكن حذف منخرط له سجل مالي. عطّل الحساب بدلا من ذلك (isActive=false).",
      code: "HAS_FINANCIAL_RECORDS",
    }, { status: 409 });
  }

  await prisma.member.delete({ where: { id } });
  await recordAudit({
    userId: session.user.id,
    action: "DELETE",
    entity: "member",
    entityId: id,
    before,
    req,
  });
  return NextResponse.json({ success: true });
}
