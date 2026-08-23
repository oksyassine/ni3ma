import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { getCurrentAcademicYearId } from "@/lib/academic-year";
import { isFinancial, hasBureauRead, hasSectionRead, hasSectionRW } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  const academicYearId = searchParams.get("academicYearId");

  // When listing by project, require read on that project's section.
  // For the global list (no projectId), require financial or maktab.
  if (projectId) {
    const project = await prisma.socialProject.findUnique({ where: { id: projectId }, select: { section: true } });
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!isFinancial(session.user.roles) && !(await hasSectionRead(session, project.section))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else {
    if (!isFinancial(session.user.roles) && !(await hasBureauRead(session))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const where: Record<string, unknown> = {};
  if (projectId) where.projectId = projectId;
  if (academicYearId) where.academicYearId = academicYearId;
  const records = await prisma.inKindDonation.findMany({
    where,
    include: { recorder: { select: { fullName: true } } },
    orderBy: { donationDate: "desc" },
  });
  return NextResponse.json(records);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  if (!body.itemName?.trim() || !body.quantity) {
    return NextResponse.json({ error: "اسم البند والكمية مطلوبان" }, { status: 400 });
  }

  // Section write required (project's section if linked, else FINANCIAL).
  if (body.projectId) {
    const project = await prisma.socialProject.findUnique({ where: { id: body.projectId }, select: { section: true } });
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
    if (!isFinancial(session.user.roles) && !(await hasSectionRW(session, project.section))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else if (!isFinancial(session.user.roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const quantity = parseFloat(body.quantity);
  if (!Number.isFinite(quantity) || quantity < 0) {
    return NextResponse.json({ error: "الكمية غير صالحة" }, { status: 400 });
  }
  let estimatedValue: number | null = null;
  if (body.estimatedValue) {
    estimatedValue = parseFloat(body.estimatedValue);
    if (!Number.isFinite(estimatedValue) || estimatedValue < 0) {
      return NextResponse.json({ error: "القيمة المقدّرة غير صالحة" }, { status: 400 });
    }
  }
  let donationDate = new Date();
  if (body.donationDate) {
    donationDate = new Date(body.donationDate);
    if (Number.isNaN(donationDate.getTime())) {
      return NextResponse.json({ error: "تاريخ غير صالح" }, { status: 400 });
    }
  }

  const academicYearId = await getCurrentAcademicYearId();

  const created = await prisma.inKindDonation.create({
    data: {
      projectId: body.projectId ?? null,
      donorName: body.isAnonymous ? null : (body.donorName ?? null),
      donorPhone: body.donorPhone ?? null,
      itemName: body.itemName.trim(),
      quantity,
      unit: body.unit ?? null,
      estimatedValue,
      donationDate,
      isAnonymous: body.isAnonymous ?? false,
      notes: body.notes ?? null,
      recordedBy: session.user.id,
      academicYearId,
    },
  });

  await recordAudit({
    userId: session.user.id,
    action: "CREATE",
    entity: "in_kind_donation",
    entityId: created.id,
    after: created,
    req,
  });
  return NextResponse.json(created, { status: 201 });
}
