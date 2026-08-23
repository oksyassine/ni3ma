import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { hasSectionRW, isAdmin, isBahtTeam } from "@/lib/permissions";

const BEN_EDITABLE_FIELDS = [
  "type", "name", "dateOfBirth", "gender", "phone", "address", "itemsReceived", "amount", "notes",
  "fatherDeceased", "motherDeceased", "guardianName", "guardianRelation", "guardianPhone",
  "monthlyIncome", "familySize", "housingStatus", "financialProofUrl",
] as const;

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const ben = await prisma.projectBeneficiary.findUnique({
    where: { id },
    include: { schoolFollowups: { orderBy: { createdAt: "desc" } }, healthFollowups: { orderBy: { createdAt: "desc" } } },
  });
  if (!ben) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!(isAdmin(session.user.roles) || isBahtTeam(session.user.roles))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return NextResponse.json(ben);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!(await hasSectionRW(session, "SOCIAL"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const before = await prisma.projectBeneficiary.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: Record<string, unknown> = {};
  for (const f of BEN_EDITABLE_FIELDS) {
    if (body[f] !== undefined) data[f] = body[f] === "" ? null : body[f];
  }
  if (data.dateOfBirth) data.dateOfBirth = new Date(data.dateOfBirth as string);
  if (data.amount !== undefined && data.amount !== null) data.amount = parseFloat(String(data.amount));
  if (data.monthlyIncome !== undefined && data.monthlyIncome !== null) data.monthlyIncome = parseFloat(String(data.monthlyIncome));
  if (data.familySize !== undefined && data.familySize !== null) data.familySize = parseInt(String(data.familySize));

  // Yatim hard-block: if patching to YATIM with fatherDeceased=false, require override
  const newType = (data.type ?? before.type) as string;
  const newFatherDeceased = data.fatherDeceased !== undefined ? data.fatherDeceased : before.fatherDeceased;
  if (newType === "YATIM" && newFatherDeceased === false && !body.yatimOverrideReason && !before.yatimOverrideReason) {
    return NextResponse.json(
      { error: "لا يمكن تسجيل يتيم إذا كان الأب على قيد الحياة. يرجى تقديم سبب الاستثناء." },
      { status: 400 }
    );
  }
  if (body.yatimOverrideReason) {
    data.yatimOverrideReason = body.yatimOverrideReason;
    data.yatimOverrideBy = session.user.id;
    data.yatimOverrideAt = new Date();
  }

  const updated = await prisma.projectBeneficiary.update({ where: { id }, data });
  await recordAudit({ userId: session.user.id, action: "UPDATE", entity: "project_beneficiary", entityId: id, before, after: updated, req });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await hasSectionRW(session, "SOCIAL"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const before = await prisma.projectBeneficiary.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.projectBeneficiary.delete({ where: { id } });
  await recordAudit({ userId: session.user.id, action: "DELETE", entity: "project_beneficiary", entityId: id, before, req });
  return NextResponse.json({ ok: true });
}
