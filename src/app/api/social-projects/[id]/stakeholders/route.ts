import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { hasSectionRW } from "@/lib/permissions";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const project = await prisma.socialProject.findUnique({ where: { id }, select: { section: true } });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!(await hasSectionRW(session, project.section))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  if (!body.name?.trim()) return NextResponse.json({ error: "الاسم مطلوب" }, { status: 400 });
  const created = await prisma.projectStakeholder.create({
    data: {
      projectId: id,
      name: body.name.trim(),
      role: body.role || null,
      phone: body.phone || null,
      email: body.email || null,
      notes: body.notes || null,
    },
  });
  await recordAudit({ userId: session.user.id, action: "CREATE", entity: "project_stakeholder", entityId: created.id, after: created, req });
  return NextResponse.json(created, { status: 201 });
}
