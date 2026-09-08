import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { postDonation } from "@/lib/journal";
import { getCurrentAcademicYearId } from "@/lib/academic-year";
import { isFinancial, hasBureauRead } from "@/lib/permissions";
import { revalidateFinancial } from "@/lib/revalidate";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Donation rows include donor names + phones. Restrict to FINANCIAL + maktab.
  const privileged = isFinancial(session.user.roles) || (await hasBureauRead(session));
  if (!privileged) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const academicYearId = searchParams.get("academicYearId");
  const where: Record<string, unknown> = {};
  if (academicYearId) where.academicYearId = academicYearId;

  const donations = await prisma.donation.findMany({
    where,
    include: {
      project: { select: { name: true } },
      recorder: { select: { fullName: true } },
    },
    orderBy: { donationDate: "desc" },
  });

  return NextResponse.json(donations);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!isFinancial(session.user.roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const amount = parseFloat(body.amount);
  if (!Number.isFinite(amount) || amount < 0) {
    return NextResponse.json({ error: "مبلغ التبرع غير صالح" }, { status: 400 });
  }

  const academicYearId = await getCurrentAcademicYearId();
  const isPledge = body.isPledge === true;
  const donation = await prisma.donation.create({
    data: {
      donorName: body.isAnonymous ? null : body.donorName,
      donorPhone: body.donorPhone || null,
      donorCin: body.donorCin || null,
      donorAddress: body.donorAddress || null,
      donorEmail: body.donorEmail || null,
      amount,
      section: body.section || "SOCIAL",
      projectId: body.projectId || null,
      campaignId: body.campaignId || null,
      isAnonymous: body.isAnonymous || false,
      isPaid: !isPledge,
      pledgedAt: isPledge ? new Date() : null,
      paidAt: !isPledge ? new Date() : null,
      notes: body.notes || null,
      recordedBy: session.user.id,
      academicYearId,
    },
  });

  // Auto-post to the PCAF journal (debit treasury, credit income).
  // Only paid donations — pledges are posted when they convert.
  if (donation.isPaid) {
    await postDonation(donation.id).catch((err) =>
      console.error("[journal] postDonation failed", err),
    );
  }

  await recordAudit({
    userId: session.user.id,
    action: "CREATE",
    entity: "donation",
    entityId: donation.id,
    after: donation,
    req,
  });

  revalidateFinancial();

  return NextResponse.json(donation, { status: 201 });
}
