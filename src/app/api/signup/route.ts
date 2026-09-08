import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { recordAudit } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";
import { createCappedMember, CapReachedError } from "@/lib/plan-enforce";

// Self-signup endpoint — public (no auth). Creates a Member with isActive=false
// pending admin approval. Allowlist + parsing mirrors /api/members POST so
// nothing privileged (passwordHash, isActive=true, registrationDate override,
// etc.) can be set from the form.

const SIGNUP_ALLOWED_FIELDS = [
  "fullName", "dateOfBirth", "placeOfBirth", "gender",
  "cin", "parentCin",
  "fatherName", "fatherPhone", "fatherCin", "fatherProfession", "fatherEducation", "fatherLandline", "fatherAddress",
  "motherName", "motherPhone", "motherCin", "motherProfession", "motherEducation", "motherLandline", "motherAddress",
  "siblingsBoys", "siblingsGirls", "siblingOrder",
  "healthStatus", "healthConditions",
  "educationalLevel", "address", "phone", "landline",
  "profession", "maritalStatus", "childrenBoys", "childrenGirls",
  "interestJtima3iya", "interestTarbawiya", "interestFikriya", "interests",
  "registrationType",
] as const;

const INT_FIELDS = ["siblingsBoys", "siblingsGirls", "siblingOrder", "childrenBoys", "childrenGirls"] as const;
const BOOL_FIELDS = ["interestJtima3iya", "interestTarbawiya", "interestFikriya"] as const;

const VALID_REG_TYPES = ["TAMM", "DAAM_MADRASSI", "QURAN_TAJWEED", "MOKHAYAM"];
const VALID_HEALTH = ["HEALTHY", "SICK"];
const VALID_MARITAL = ["SINGLE", "MARRIED", "DIVORCED", "WIDOWED"];
const VALID_GENDER = ["MALE", "FEMALE"];

function ipFor(req: NextRequest): string {
  return (
    req.headers.get("cf-connecting-ip")
    ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? "unknown"
  );
}

export async function POST(req: NextRequest) {
  const ip = ipFor(req);
  const rl = rateLimit(`signup:${ip}`, 5, 60 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `أنت تحاول التسجيل بسرعة كبيرة. أعد المحاولة بعد ${Math.ceil(rl.resetInMs / 60_000)} دقيقة.` },
      { status: 429 }
    );
  }
  const body = await req.json();
  const memberType = body.memberType;

  if (!body.fullName?.trim()) {
    return NextResponse.json({ error: "الاسم الكامل مطلوب" }, { status: 400 });
  }
  if (!memberType || !["CHILD", "ADULT"].includes(memberType)) {
    return NextResponse.json({ error: "نوع التسجيل غير صالح" }, { status: 400 });
  }
  if (!body.registrationType || !VALID_REG_TYPES.includes(body.registrationType)) {
    return NextResponse.json({ error: "نوع التسجيل (تام/دعم/قرآن/مخيم) مطلوب" }, { status: 400 });
  }
  if (body.gender && !VALID_GENDER.includes(body.gender)) {
    return NextResponse.json({ error: "الجنس غير صالح" }, { status: 400 });
  }
  if (body.healthStatus && !VALID_HEALTH.includes(body.healthStatus)) {
    return NextResponse.json({ error: "الوضع الصحي غير صالح" }, { status: 400 });
  }
  if (body.maritalStatus && !VALID_MARITAL.includes(body.maritalStatus)) {
    return NextResponse.json({ error: "الحالة العائلية غير صالحة" }, { status: 400 });
  }

  const data: Record<string, unknown> = {
    memberType,
    fullName: body.fullName.trim(),
    isActive: false, // hard-coded — admin must approve
  };
  for (const f of SIGNUP_ALLOWED_FIELDS) {
    if (body[f] !== undefined && body[f] !== "" && f !== "fullName") {
      data[f] = body[f];
    }
  }
  if (data.dateOfBirth) {
    const d = new Date(String(data.dateOfBirth));
    if (Number.isNaN(d.getTime())) {
      return NextResponse.json({ error: "تاريخ الازدياد غير صالح" }, { status: 400 });
    }
    data.dateOfBirth = d;
  }
  for (const f of INT_FIELDS) {
    if (data[f] !== undefined) data[f] = parseInt(String(data[f]));
  }
  for (const f of BOOL_FIELDS) {
    if (data[f] !== undefined) data[f] = !!data[f];
  }

  try {
    // createCappedMember atomically checks the plan cap and inserts the row
    // in one serializable transaction, preventing the TOCTOU race where N
    // parallel signups all pass `count() < cap` and exhaust the slot.
    const member = await createCappedMember(
      data as Parameters<typeof prisma.member.create>[0]["data"],
    );
    await recordAudit({
      userId: null,
      action: "CREATE",
      entity: "member",
      entityId: member.id,
      after: {
        fullName: member.fullName,
        memberType: member.memberType,
        registrationType: data.registrationType,
        via: "public_signup",
      },
      req,
    });
    return NextResponse.json({ id: member.id }, { status: 201 });
  } catch (err) {
    if (err instanceof CapReachedError) {
      return NextResponse.json(
        { error: "عذرا، الجمعية بلغت الحد الأقصى للتسجيلات في خطتها الحالية. تواصلوا مع إدارة الجمعية." },
        { status: 402 },
      );
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "بيانات مكررة (تحققوا من ب.و.ت)" }, { status: 409 });
    }
    console.error("signup failed", err);
    return NextResponse.json({ error: "حدث خطأ أثناء حفظ الطلب" }, { status: 500 });
  }
}
