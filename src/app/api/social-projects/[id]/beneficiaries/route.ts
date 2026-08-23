import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { isAdmin, isBahtTeam, hasSectionRW } from "@/lib/permissions";

const BEN_FIELDS = [
  "type", "socialCaseId", "name", "dateOfBirth", "gender", "phone", "address", "itemsReceived", "amount", "notes",
  "fatherDeceased", "motherDeceased", "guardianName", "guardianRelation", "guardianPhone",
  "monthlyIncome", "familySize", "housingStatus", "financialProofUrl",
] as const;

type RawBen = {
  id: string;
  type: string;
  name: string;
  dateOfBirth: Date | null;
  gender: string | null;
  phone: string | null;
  address: string | null;
  itemsReceived: string | null;
  amount: unknown;
  notes: string | null;
  fatherDeceased: boolean | null;
  motherDeceased: boolean | null;
  guardianName: string | null;
  guardianRelation: string | null;
  guardianPhone: string | null;
  monthlyIncome: unknown;
  familySize: number | null;
  housingStatus: string | null;
  financialProofUrl: string | null;
  yatimOverrideReason: string | null;
  yatimOverrideAt: Date | null;
  createdAt: Date;
};

/** Strip private fields for non-baht-team viewers — only show name+age+sex+type */
function redactBeneficiary(b: RawBen) {
  const age = b.dateOfBirth
    ? Math.floor((Date.now() - new Date(b.dateOfBirth).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
    : null;
  return {
    id: b.id,
    type: b.type,
    name: b.name,
    age,
    gender: b.gender,
    createdAt: b.createdAt,
  };
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const list = await prisma.projectBeneficiary.findMany({
    where: { projectId: id },
    orderBy: { createdAt: "desc" },
  });

  // Privacy: full record only for ADMIN, BAHT_IJTIMA3I_TEAM. Others see redacted view.
  if (isAdmin(session.user.roles) || isBahtTeam(session.user.roles)) {
    return NextResponse.json(list);
  }
  return NextResponse.json(list.map(redactBeneficiary));
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  // Only users with SOCIAL section RW can add beneficiaries.
  if (!(await hasSectionRW(session, "SOCIAL"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  if (!body.name?.trim()) return NextResponse.json({ error: "الاسم مطلوب" }, { status: 400 });

  const type = (body.type as string) || "GENERAL";
  if (!["GENERAL", "YATIM", "MOZWIZ"].includes(type)) {
    return NextResponse.json({ error: "نوع المستفيد غير صالح" }, { status: 400 });
  }

  // Yatim hard-block: cannot create YATIM if fatherDeceased=false, unless override
  if (type === "YATIM" && body.fatherDeceased === false && !body.yatimOverrideReason) {
    return NextResponse.json(
      { error: "لا يمكن تسجيل يتيم إذا كان الأب على قيد الحياة. يرجى تقديم سبب الاستثناء." },
      { status: 400 }
    );
  }

  const data: Record<string, unknown> = { projectId: id, type };
  for (const f of BEN_FIELDS) {
    if (body[f] !== undefined && f !== "type") data[f] = body[f] === "" ? null : body[f];
  }
  if (data.dateOfBirth) data.dateOfBirth = new Date(data.dateOfBirth as string);
  if (data.amount) {
    const n = parseFloat(String(data.amount));
    data.amount = Number.isFinite(n) ? n : null;
  }
  if (data.monthlyIncome) {
    const n = parseFloat(String(data.monthlyIncome));
    data.monthlyIncome = Number.isFinite(n) ? n : null;
  }
  if (data.familySize) {
    const n = parseInt(String(data.familySize));
    data.familySize = Number.isFinite(n) ? n : null;
  }

  // Yatim override audit
  if (type === "YATIM" && body.yatimOverrideReason) {
    data.yatimOverrideReason = body.yatimOverrideReason;
    data.yatimOverrideBy = session.user.id;
    data.yatimOverrideAt = new Date();
  }

  const created = await prisma.projectBeneficiary.create({
    data: data as Parameters<typeof prisma.projectBeneficiary.create>[0]["data"],
  });

  await recordAudit({
    userId: session.user.id,
    action: "CREATE",
    entity: "project_beneficiary",
    entityId: created.id,
    after: created,
    req,
  });
  return NextResponse.json(created, { status: 201 });
}
