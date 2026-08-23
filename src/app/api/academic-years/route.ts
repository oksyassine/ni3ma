import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const years = await prisma.academicYear.findMany({ orderBy: { startDate: "desc" } });
  return NextResponse.json(years);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.user.roles.includes("ADMIN") && !session.user.roles.includes("BUREAU")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { label, startDate, endDate } = await req.json();
  if (!label || !startDate || !endDate) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const created = await prisma.academicYear.create({
    data: {
      label,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    },
  });

  await recordAudit({
    userId: session.user.id,
    action: "CREATE",
    entity: "academic_year",
    entityId: created.id,
    after: created,
    req,
  });

  return NextResponse.json(created, { status: 201 });
}
