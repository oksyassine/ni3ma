import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { isAdmin, isBahtTeam } from "@/lib/permissions";

const EDITABLE = [
  "type", "fullName", "dateOfBirth", "gender", "cin", "phone", "address",
  "fatherName", "fatherDeceased", "motherName", "motherDeceased",
  "guardianName", "guardianRelation", "guardianPhone",
  "monthlyIncome", "familySize", "housingStatus", "financialProofUrl",
  "notes",
] as const;

function gate(session: { user: { roles: string[] } } | null) {
  if (!session) return false;
  return isAdmin(session.user.roles as never) || isBahtTeam(session.user.roles as never);
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!gate(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const c = await prisma.socialCase.findUnique({
    where: { id },
    include: {
      schoolFollowups: { orderBy: { createdAt: "desc" } },
      healthFollowups: { orderBy: { createdAt: "desc" } },
      projectLinks: { include: { project: { select: { id: true, name: true, status: true } } } },
    },
  });
  if (!c) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(c);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!gate(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const body = await req.json();
  const before = await prisma.socialCase.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: Record<string, unknown> = {};
  for (const f of EDITABLE) {
    if (body[f] !== undefined) data[f] = body[f] === "" ? null : body[f];
  }
  if (data.dateOfBirth) data.dateOfBirth = new Date(data.dateOfBirth as string);
  if (data.monthlyIncome != null && data.monthlyIncome !== "") {
    const n = parseFloat(String(data.monthlyIncome));
    data.monthlyIncome = Number.isFinite(n) ? n : null;
  }
  if (data.familySize != null && data.familySize !== "") {
    const n = parseInt(String(data.familySize));
    data.familySize = Number.isFinite(n) ? n : null;
  }

  const newType = (data.type ?? before.type) as string;
  const newFatherDeceased = data.fatherDeceased !== undefined ? data.fatherDeceased : before.fatherDeceased;
  if (newType === "YATIM" && newFatherDeceased === false && !body.yatimOverrideReason && !before.yatimOverrideReason) {
    return NextResponse.json({ error: "لا يمكن تسجيل يتيم إذا كان الأب على قيد الحياة. يرجى تقديم سبب الاستثناء." }, { status: 400 });
  }
  if (body.yatimOverrideReason) {
    data.yatimOverrideReason = body.yatimOverrideReason;
    data.yatimOverrideBy = session!.user.id;
    data.yatimOverrideAt = new Date();
  }

  const updated = await prisma.socialCase.update({ where: { id }, data });
  await recordAudit({ userId: session!.user.id, action: "UPDATE", entity: "social_case", entityId: id, before, after: updated, req });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!gate(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const before = await prisma.socialCase.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.socialCase.delete({ where: { id } });
  await recordAudit({ userId: session!.user.id, action: "DELETE", entity: "social_case", entityId: id, before, req });
  return NextResponse.json({ ok: true });
}
