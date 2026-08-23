import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { sanitizeSlug, validateSlugFormat, isSlugAvailable } from "@/lib/validations/slug";
import { isAdmin, isBahtTeam, hasSectionRW } from "@/lib/permissions";
import { toIntOrNull, toFloatOrNull, toDateOrNull } from "@/lib/coerce";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const project = await prisma.socialProject.findUnique({
    where: { id },
    include: {
      donations: {
        select: { id: true, amount: true, donorName: true, isAnonymous: true, donationDate: true, notes: true },
        orderBy: { donationDate: "desc" },
      },
      inKindDonations: {
        orderBy: { donationDate: "desc" },
      },
      plans: {
        orderBy: { position: "asc" },
        include: {
          lineItems: { orderBy: { position: "asc" } },
          expenses: { select: { amount: true, planLineItemId: true } },
        },
      },
      tasks: {
        include: {
          assignees: {
            include: { member: { select: { id: true, fullName: true, registrationNumber: true } } },
          },
          worklogs: {
            include: { member: { select: { id: true, fullName: true } } },
            orderBy: { workedDate: "desc" },
          },
          taskPlans: { select: { planId: true } },
        },
        orderBy: [{ status: "asc" }, { position: "asc" }, { createdAt: "asc" }],
      },
      photos: { orderBy: { createdAt: "desc" } },
      beneficiaries: { orderBy: { createdAt: "desc" } },
      risks: { orderBy: { createdAt: "desc" } },
      stakeholders: { orderBy: { createdAt: "desc" } },
      expenses: {
        select: { id: true, amount: true, description: true, expenseDate: true, planId: true, planLineItemId: true, category: true },
        orderBy: { expenseDate: "desc" },
      },
      academicYear: true,
      creator: { select: { fullName: true } },
      evaluator: { select: { fullName: true } },
    },
  });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Privacy: redact beneficiary records for non-baht-team viewers
  if (!isAdmin(session.user.roles) && !isBahtTeam(session.user.roles)) {
    const redacted = project.beneficiaries.map((b) => {
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
    });
    return NextResponse.json({ ...project, beneficiaries: redacted });
  }

  return NextResponse.json(project);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const before = await prisma.socialProject.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Gate: section-RW required for the project's section
  if (!(await hasSectionRW(session, before.section))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const data: Record<string, unknown> = {};
  const fields = ["name", "kind", "description", "objective", "targetAudience", "location", "partners", "status", "section", "coverPhotoUrl"];
  for (const f of fields) if (body[f] !== undefined) data[f] = body[f] === "" ? null : body[f];

  // Slug: sanitize, validate, check uniqueness against other projects
  if (body.slug !== undefined) {
    if (body.slug === null || body.slug === "") {
      data.slug = null;
    } else {
      const cleaned = sanitizeSlug(String(body.slug));
      const formatErr = validateSlugFormat(cleaned);
      if (formatErr) return NextResponse.json({ error: formatErr }, { status: 400 });
      const available = await isSlugAvailable(cleaned, id);
      if (!available) return NextResponse.json({ error: "هذا الرابط مستعمل في مشروع آخر — اختر رابطا غيره" }, { status: 409 });
      data.slug = cleaned;
    }
  }

  if (body.isPublic !== undefined) data.isPublic = !!body.isPublic;
  if (body.expectedBeneficiaries !== undefined) data.expectedBeneficiaries = toIntOrNull(body.expectedBeneficiaries);
  if (body.targetAmount !== undefined) data.targetAmount = toFloatOrNull(body.targetAmount);
  if (body.startDate !== undefined) data.startDate = toDateOrNull(body.startDate);
  if (body.endDate !== undefined) data.endDate = toDateOrNull(body.endDate);

  const updated = await prisma.socialProject.update({ where: { id }, data });
  await recordAudit({
    userId: session.user.id,
    action: "UPDATE",
    entity: "social_project",
    entityId: id,
    before,
    after: updated,
    req,
  });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.user.roles.includes("ADMIN") && !session.user.roles.includes("BUREAU")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const before = await prisma.socialProject.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.socialProject.delete({ where: { id } });
  await recordAudit({
    userId: session.user.id,
    action: "DELETE",
    entity: "social_project",
    entityId: id,
    before,
    req,
  });
  return NextResponse.json({ ok: true });
}
