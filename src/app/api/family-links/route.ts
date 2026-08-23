import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { isAdmin, isBureauRW } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const parentId = searchParams.get("parentId");
  const childId = searchParams.get("childId");
  const where: Record<string, unknown> = {};
  if (parentId) where.parentId = parentId;
  if (childId) where.childId = childId;
  const links = await prisma.familyLink.findMany({
    where,
    include: {
      parent: { select: { id: true, fullName: true, registrationNumber: true } },
      child: { select: { id: true, fullName: true, registrationNumber: true, photoUrl: true } },
    },
  });
  return NextResponse.json(links);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin(session.user.roles) && !(await isBureauRW(session))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { parentId, childId, relation } = await req.json();
  if (!parentId || !childId) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  const link = await prisma.familyLink.upsert({
    where: { parentId_childId: { parentId, childId } },
    update: { relation: relation ?? null },
    create: { parentId, childId, relation: relation ?? null },
  });
  await recordAudit({
    userId: session.user.id,
    action: "CREATE",
    entity: "family_link",
    entityId: link.id,
    after: link,
    req,
  });
  return NextResponse.json(link, { status: 201 });
}
