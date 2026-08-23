import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { isAdmin, isBahtTeam } from "@/lib/permissions";

const CASE_FIELDS = [
  "type", "fullName", "dateOfBirth", "gender", "cin", "phone", "address",
  "fatherName", "fatherDeceased", "motherName", "motherDeceased",
  "guardianName", "guardianRelation", "guardianPhone",
  "monthlyIncome", "familySize", "housingStatus", "financialProofUrl",
  "notes",
] as const;

function gateOrDeny(roles: string[]) {
  return isAdmin(roles as never) || isBahtTeam(roles as never);
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!gateOrDeny(session.user.roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";
  const type = searchParams.get("type");

  const where: Record<string, unknown> = {};
  if (type === "YATIM" || type === "MOZWIZ" || type === "GENERAL") where.type = type;
  if (search.trim()) where.fullName = { contains: search.trim(), mode: "insensitive" };

  const cases = await prisma.socialCase.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { schoolFollowups: true, healthFollowups: true, projectLinks: true } },
    },
  });
  return NextResponse.json(cases);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!gateOrDeny(session.user.roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  if (!body.fullName?.trim()) return NextResponse.json({ error: "الاسم مطلوب" }, { status: 400 });
  const type = body.type as string;
  if (!["YATIM", "MOZWIZ", "GENERAL"].includes(type)) {
    return NextResponse.json({ error: "نوع الحالة غير صالح" }, { status: 400 });
  }

  // Yatim hard-block with override audit
  if (type === "YATIM" && body.fatherDeceased === false && !body.yatimOverrideReason) {
    return NextResponse.json(
      { error: "لا يمكن تسجيل يتيم إذا كان الأب على قيد الحياة. يرجى تقديم سبب الاستثناء." },
      { status: 400 }
    );
  }

  const data: Record<string, unknown> = { createdBy: session.user.id };
  for (const f of CASE_FIELDS) {
    if (body[f] !== undefined && body[f] !== "") data[f] = body[f];
  }
  if (data.dateOfBirth) data.dateOfBirth = new Date(data.dateOfBirth as string);
  if (data.monthlyIncome) {
    const n = parseFloat(String(data.monthlyIncome));
    data.monthlyIncome = Number.isFinite(n) ? n : null;
  }
  if (data.familySize) {
    const n = parseInt(String(data.familySize));
    data.familySize = Number.isFinite(n) ? n : null;
  }
  if (type === "YATIM" && body.yatimOverrideReason) {
    data.yatimOverrideReason = body.yatimOverrideReason;
    data.yatimOverrideBy = session.user.id;
    data.yatimOverrideAt = new Date();
  }
  data.fullName = String(data.fullName).trim();

  const created = await prisma.socialCase.create({
    data: data as Parameters<typeof prisma.socialCase.create>[0]["data"],
  });
  await recordAudit({ userId: session.user.id, action: "CREATE", entity: "social_case", entityId: created.id, after: created, req });
  return NextResponse.json(created, { status: 201 });
}
