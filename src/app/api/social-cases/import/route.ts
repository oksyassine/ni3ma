import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { isAdmin, isBahtTeam } from "@/lib/permissions";
import * as XLSX from "xlsx";

// Excel/CSV import for the baht-ijtima3i team.
// Expected headers (case-insensitive, partial match):
//   fullName | الاسم
//   type     ("YATIM" | "MOZWIZ" | "GENERAL")
//   gender   ("MALE" | "FEMALE")
//   dateOfBirth (YYYY-MM-DD or Excel date)
//   phone, address, cin
//   fatherName, fatherDeceased (true/false), motherName, motherDeceased
//   guardianName, guardianRelation, guardianPhone
//   monthlyIncome, familySize, housingStatus
//   notes
//
// Mode: ?dryRun=1 returns a preview; without it, performs the insert.

function gate(s: { user: { roles: string[] } } | null) {
  if (!s) return false;
  return isAdmin(s.user.roles as never) || isBahtTeam(s.user.roles as never);
}

const HEADER_ALIASES: Record<string, string> = {
  // Arabic + English aliases → canonical field name
  "الاسم": "fullName", "fullname": "fullName", "name": "fullName",
  "النوع": "type", "type": "type",
  "الجنس": "gender", "gender": "gender",
  "تاريخ الازدياد": "dateOfBirth", "dateofbirth": "dateOfBirth", "dob": "dateOfBirth",
  "الهاتف": "phone", "phone": "phone",
  "العنوان": "address", "address": "address",
  "بطاقة التعريف": "cin", "cin": "cin",
  "اسم الأب": "fatherName", "fathername": "fatherName",
  "الأب متوفى": "fatherDeceased", "fatherdeceased": "fatherDeceased",
  "اسم الأم": "motherName", "mothername": "motherName",
  "الأم متوفاة": "motherDeceased", "motherdeceased": "motherDeceased",
  "اسم الولي": "guardianName", "guardianname": "guardianName",
  "صلة الولي": "guardianRelation", "guardianrelation": "guardianRelation",
  "هاتف الولي": "guardianPhone", "guardianphone": "guardianPhone",
  "الدخل الشهري": "monthlyIncome", "monthlyincome": "monthlyIncome", "income": "monthlyIncome",
  "حجم الأسرة": "familySize", "familysize": "familySize",
  "وضع السكن": "housingStatus", "housingstatus": "housingStatus",
  "ملاحظات": "notes", "notes": "notes",
};

function normalizeKey(k: string) {
  return String(k).trim().toLowerCase().replace(/\s+/g, " ");
}

function mapRow(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    const canonical = HEADER_ALIASES[normalizeKey(k)];
    if (canonical && v != null && v !== "") out[canonical] = v;
  }
  return out;
}

function coerceBool(v: unknown): boolean | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const s = String(v).trim().toLowerCase();
  if (["true", "1", "yes", "نعم", "متوفى", "متوفاة"].includes(s)) return true;
  if (["false", "0", "no", "لا", "حي", "حية"].includes(s)) return false;
  return undefined;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!gate(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const dryRun = req.nextUrl.searchParams.get("dryRun") === "1";
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "ملف مطلوب" }, { status: 400 });

  const buf = Buffer.from(await file.arrayBuffer());
  let rows: Record<string, unknown>[];
  try {
    const wb = XLSX.read(buf, { type: "buffer", cellDates: true });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "تعذّر قراءة الملف" }, { status: 400 });
  }

  const valid: Record<string, unknown>[] = [];
  const errors: { row: number; error: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const m = mapRow(rows[i]);
    if (!m.fullName || !String(m.fullName).trim()) {
      errors.push({ row: i + 2, error: "الاسم مطلوب" });
      continue;
    }
    const type = String(m.type ?? "YATIM").toUpperCase();
    if (!["YATIM", "MOZWIZ", "GENERAL"].includes(type)) {
      errors.push({ row: i + 2, error: `نوع غير صالح: ${type}` });
      continue;
    }
    const gender = m.gender ? String(m.gender).toUpperCase() : null;
    const fatherDeceased = coerceBool(m.fatherDeceased);
    const motherDeceased = coerceBool(m.motherDeceased);
    if (type === "YATIM" && fatherDeceased === false) {
      errors.push({ row: i + 2, error: "يتيم بدون وفاة الأب — يستلزم استثناء يدوي" });
      continue;
    }
    let dob: Date | null = null;
    if (m.dateOfBirth) {
      const d = m.dateOfBirth instanceof Date ? m.dateOfBirth : new Date(String(m.dateOfBirth));
      if (!isNaN(d.getTime())) dob = d;
    }

    valid.push({
      fullName: String(m.fullName).trim(),
      type,
      gender: gender === "MALE" || gender === "FEMALE" ? gender : null,
      dateOfBirth: dob,
      phone: m.phone ? String(m.phone) : null,
      address: m.address ? String(m.address) : null,
      cin: m.cin ? String(m.cin) : null,
      fatherName: m.fatherName ? String(m.fatherName) : null,
      fatherDeceased,
      motherName: m.motherName ? String(m.motherName) : null,
      motherDeceased,
      guardianName: m.guardianName ? String(m.guardianName) : null,
      guardianRelation: m.guardianRelation ? String(m.guardianRelation) : null,
      guardianPhone: m.guardianPhone ? String(m.guardianPhone) : null,
      monthlyIncome: m.monthlyIncome ? parseFloat(String(m.monthlyIncome)) : null,
      familySize: m.familySize ? parseInt(String(m.familySize)) : null,
      housingStatus: m.housingStatus ? String(m.housingStatus) : null,
      notes: m.notes ? String(m.notes) : null,
      createdBy: session!.user.id,
    });
  }

  if (dryRun) {
    return NextResponse.json({
      total: rows.length,
      valid: valid.length,
      errors,
      preview: valid.slice(0, 10),
    });
  }

  if (valid.length === 0) {
    return NextResponse.json({ error: "لا توجد صفوف صالحة", errors }, { status: 400 });
  }

  // Cast data — we've validated the shape above
  const created = await prisma.socialCase.createMany({
    data: valid as never,
  });
  return NextResponse.json({ inserted: created.count, errors, total: rows.length });
}
