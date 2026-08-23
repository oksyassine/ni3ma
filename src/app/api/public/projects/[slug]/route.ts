import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = await prisma.socialProject.findFirst({
    where: { slug, isPublic: true },
    select: {
      id: true,
      name: true,
      kind: true,
      objective: true,
      description: true,
      targetAudience: true,
      expectedBeneficiaries: true,
      location: true,
      partners: true,
      targetAmount: true,
      startDate: true,
      endDate: true,
      status: true,
      coverPhotoUrl: true,
      slug: true,
      photos: { select: { id: true, url: true, caption: true }, orderBy: { createdAt: "desc" }, take: 12 },
      donations: { select: { amount: true } },
      inKindDonations: { select: { estimatedValue: true } },
    },
  });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const cashCollected = project.donations.reduce((s, d) => s + Number(d.amount), 0);
  const inKindEstimated = project.inKindDonations.reduce((s, d) => s + Number(d.estimatedValue ?? 0), 0);

  return NextResponse.json({
    ...project,
    donations: undefined,
    inKindDonations: undefined,
    cashCollected,
    inKindEstimated,
    totalCollected: cashCollected + inKindEstimated,
  });
}
