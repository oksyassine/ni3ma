import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { isAdmin, isBureauRW } from "@/lib/permissions";
import type { Gender, MemberType } from "@prisma/client";

type ImportRow = {
  fullName?: string;
  memberType?: string;
  gender?: string;
  dateOfBirth?: string;
  placeOfBirth?: string;
  educationalLevel?: string;
  address?: string;
  phone?: string;
  cin?: string;
  parentCin?: string;
  fatherName?: string;
  fatherPhone?: string;
  motherName?: string;
  motherPhone?: string;
  siblingsCount?: string | number;
  siblingOrder?: string | number;
  healthConditions?: string;
  profession?: string;
  interests?: string;
  associationRole?: string;
  subscriptionAmount?: string | number;
  sections?: string;
};

const MEMBER_TYPE_MAP: Record<string, MemberType> = {
  CHILD: "CHILD", "طفل": "CHILD", child: "CHILD",
  ADULT: "ADULT", "بالغ": "ADULT", "كبير": "ADULT", adult: "ADULT",
};
const GENDER_MAP: Record<string, Gender> = {
  MALE: "MALE", M: "MALE", "ذكر": "MALE",
  FEMALE: "FEMALE", F: "FEMALE", "أنثى": "FEMALE",
};

function parseDate(v: string | undefined | null): Date | null {
  if (!v) return null;
  // Accept yyyy-mm-dd or dd/mm/yyyy
  if (/^\d{4}-\d{2}-\d{2}/.test(v)) return new Date(v);
  const m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return new Date(`${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`);
  return null;
}

function parseInt2(v: string | number | undefined | null): number | null {
  if (v === undefined || v === null || v === "") return null;
  const n = typeof v === "number" ? v : parseInt(String(v), 10);
  return Number.isFinite(n) ? n : null;
}

function parseFloat2(v: string | number | undefined | null): number | null {
  if (v === undefined || v === null || v === "") return null;
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : null;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin(session.user.roles) && !(await isBureauRW(session))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { rows, dryRun }: { rows: ImportRow[]; dryRun?: boolean } = await req.json();
  if (!Array.isArray(rows)) {
    return NextResponse.json({ error: "rows must be array" }, { status: 400 });
  }

  const errors: { index: number; reason: string }[] = [];
  const valid: { index: number; data: Record<string, unknown>; sections: string[] }[] = [];

  rows.forEach((r, i) => {
    if (!r.fullName?.trim()) {
      errors.push({ index: i, reason: "الاسم الكامل مطلوب" });
      return;
    }
    const memberType = MEMBER_TYPE_MAP[(r.memberType ?? "").toString().trim()];
    if (!memberType) {
      errors.push({ index: i, reason: `نوع المنخرط غير صحيح: ${r.memberType}` });
      return;
    }
    const gender = r.gender ? GENDER_MAP[r.gender.toString().trim()] ?? null : null;
    const sections = (r.sections ?? "")
      .toString()
      .split(/[,;\s]+/)
      .map((s) => s.trim().toUpperCase())
      .filter((s) => ["EDUCATIONAL", "SOCIAL", "QURAN"].includes(s));

    valid.push({
      index: i,
      sections,
      data: {
        fullName: r.fullName.trim(),
        memberType,
        gender,
        dateOfBirth: parseDate(r.dateOfBirth),
        placeOfBirth: r.placeOfBirth ?? null,
        educationalLevel: r.educationalLevel ?? null,
        address: r.address ?? null,
        phone: r.phone ?? null,
        cin: r.cin ?? null,
        parentCin: r.parentCin ?? null,
        fatherName: r.fatherName ?? null,
        fatherPhone: r.fatherPhone ?? null,
        motherName: r.motherName ?? null,
        motherPhone: r.motherPhone ?? null,
        siblingsCount: parseInt2(r.siblingsCount),
        siblingOrder: parseInt2(r.siblingOrder),
        healthConditions: r.healthConditions ?? null,
        profession: r.profession ?? null,
        interests: r.interests ?? null,
        associationRole: r.associationRole ?? null,
        subscriptionAmount: parseFloat2(r.subscriptionAmount),
        isActive: true,
      },
    });
  });

  if (dryRun) {
    return NextResponse.json({
      total: rows.length,
      valid: valid.length,
      errors,
      preview: valid.slice(0, 10).map((v) => v.data),
    });
  }

  let imported = 0;
  for (const v of valid) {
    await prisma.member.create({
      data: {
        ...(v.data as object),
        sections: { create: v.sections.map((s) => ({ section: s as "EDUCATIONAL" | "SOCIAL" | "QURAN" })) },
      } as never,
    });
    imported++;
  }

  await recordAudit({
    userId: session.user.id,
    action: "CREATE",
    entity: "member",
    after: { bulkImport: true, count: imported },
    req,
  });

  return NextResponse.json({ imported, errors });
}
