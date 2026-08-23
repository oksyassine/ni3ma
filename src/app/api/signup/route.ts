import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { checkMemberCap } from "@/lib/plan-enforce";

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

export async function POST(req: NextRequest) {
  // Rate limit: 5 signups per IP per hour. The form is fast to submit, so
  // anyone genuinely registering 5 people should pause or have admin do it.
  const ip = clientIp(req);
  const rl = rateLimit(`signup:${ip}`, 5, 60 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `أنت تحاول التسجيل بسرعة كبيرة. أعد المحاولة بعد ${Math.ceil(rl.resetInMs / 60_000)} دقيقة.` },
      { status: 429 }
    );
  }
  const body = await req.json();
  const memberType = body.memberType;

  // Plan limit: public signups also count against the tenant's member cap.
  const cap = await checkMemberCap(1);
  if (!cap.ok) {
    return NextResponse.json(
      { error: "عذرا، الجمعية بلغت الحد الأقصى للتسجيلات في خطتها الحالية. تواصلوا مع إدارة الجمعية." },
      { status: 402 }
    );
  }

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
  if (data.dateOfBirth) data.dateOfBirth = new Date(String(data.dateOfBirth));
  for (const f of INT_FIELDS) {
    if (data[f] !== undefined) data[f] = parseInt(String(data[f]));
  }
  for (const f of BOOL_FIELDS) {
    if (data[f] !== undefined) data[f] = !!data[f];
  }

  try {
    const member = await prisma.member.create({
      data: data as Parameters<typeof prisma.member.create>[0]["data"],
    });
    return NextResponse.json({ id: member.id }, { status: 201 });
  } catch (err) {
    console.error("signup failed", err);
    return NextResponse.json({ error: "حدث خطأ أثناء حفظ الطلب" }, { status: 500 });
  }
}
