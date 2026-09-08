import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { CapReachedError, checkMemberCap } from "@/lib/plan-enforce";
import { isAdmin, isBureauRW } from "@/lib/permissions";
import { Prisma } from "@prisma/client";
import type { Gender, MemberType } from "@prisma/client";

const MAX_IMPORT_ROWS = 5000;
const MAX_BODY_BYTES = 5 * 1024 * 1024;
const SECTION_VALUES = new Set(["EDUCATIONAL", "SOCIAL", "QURAN"]);

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
  if (/^\d{4}-\d{2}-\d{2}/.test(v)) return new Date(v);
  const m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return new Date(`${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`);
  return null;
}

function parseInt2(v: string | number | undefined | null): number | null {
  if (v === undefined || v === null || v === "") return null;
  const n = typeof v === "number" ? v : parseInt(String(v), 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function parseFloat2(v: string | number | undefined | null): number | null {
  if (v === undefined || v === null || v === "") return null;
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin(session.user.roles) && !(await isBureauRW(session))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Body-size guard. Default Next limit is 1MB, but we allow up to 5MB for
  // legitimate bulk imports while still blocking OOM via huge payloads.
  const contentLength = parseInt(req.headers.get("content-length") ?? "0", 10);
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "حجم الملف يتجاوز الحد المسموح" }, { status: 413 });
  }

  const { rows, dryRun }: { rows: ImportRow[]; dryRun?: boolean } = await req.json();
  if (!Array.isArray(rows)) {
    return NextResponse.json({ error: "rows must be array" }, { status: 400 });
  }
  if (rows.length > MAX_IMPORT_ROWS) {
    return NextResponse.json(
      { error: `الحد الأقصى ${MAX_IMPORT_ROWS} صف في المرة الواحدة` },
      { status: 413 },
    );
  }

  const errors: { index: number; reason: string }[] = [];
  const valid: { index: number; data: Record<string, unknown>; sections: ("EDUCATIONAL" | "SOCIAL" | "QURAN")[] }[] = [];

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
      .filter((s): s is "EDUCATIONAL" | "SOCIAL" | "QURAN" => SECTION_VALUES.has(s));

    const subscriptionAmount = parseFloat2(r.subscriptionAmount);
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
        subscriptionAmount: subscriptionAmount !== null ? new Prisma.Decimal(subscriptionAmount.toFixed(2)) : null,
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

  // Cap check against the *valid* count, not the raw count — invalid rows
  // don't consume cap slots. Done before the transaction so the caller can
  // retry with a narrower file.
  const cap = await checkMemberCap(valid.length);
  if (!cap.ok) {
    return NextResponse.json({ error: cap.message, code: cap.code }, { status: 402 });
  }

  // Insert all valid rows in a single transaction. A failure rolls back
  // everything, so the cap count never drifts from reality and partial
  // failures don't leave orphan members + sections.
  let imported = 0;
  try {
    imported = await prisma.$transaction(async (tx) => {
      let count = 0;
      for (const v of valid) {
        await tx.member.create({
          data: {
            ...(v.data as object),
            sections: v.sections.length > 0
              ? { create: v.sections.map((s) => ({ section: s })) }
              : undefined,
          } as never,
        });
        count++;
      }
      return count;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (err) {
    if (err instanceof CapReachedError) {
      return NextResponse.json({ error: err.message, code: "CAP_REACHED" }, { status: 402 });
    }
    console.error("bulk import failed", err);
    return NextResponse.json({ error: "فشل الاستيراد — لم يحفظ أي صف (تم التراجع)" }, { status: 500 });
  }

  await recordAudit({
    userId: session.user.id,
    action: "CREATE",
    entity: "member",
    after: { bulkImport: true, count: imported, total: rows.length, invalid: errors.length },
    req,
  });

  return NextResponse.json({ imported, errors });
}
