import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const info = await prisma.associationInfo.findUnique({ where: { id: 1 } });
  return NextResponse.json(info);
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session || !session.user.roles.includes("ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  const fees = body.registrationFees && typeof body.registrationFees === "object"
    ? body.registrationFees
    : null;

  // Only "ar" | "fr" are supported UI locales.
  const defaultLocale = body.defaultLocale === "fr" ? "fr" : "ar";

  const info = await prisma.associationInfo.upsert({
    where: { id: 1 },
    update: {
      name: body.name,
      address: body.address || null,
      city: body.city,
      phone: body.phone || null,
      email: body.email || null,
      facebookUrl: body.facebookUrl || null,
      cndpRegistration: body.cndpRegistration || null,
      privacyNotice: body.privacyNotice || null,
      registrationFees: fees,
      defaultLocale,
    },
    create: {
      name: body.name || "جمعية النعمة",
      address: body.address || null,
      city: body.city || "مكناس",
      phone: body.phone || null,
      email: body.email || null,
      facebookUrl: body.facebookUrl || null,
      cndpRegistration: body.cndpRegistration || null,
      privacyNotice: body.privacyNotice || null,
      registrationFees: fees,
      defaultLocale,
    },
  });

  return NextResponse.json(info);
}
