import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || !session.user.roles.includes("ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const before = await prisma.user.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Prevent self-deactivation (admin shouldn't lock themselves out)
  if (id === session.user.id && body.isActive === false) {
    return NextResponse.json({ error: "لا يمكنك تعطيل حسابك" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (typeof body.isActive === "boolean") data.isActive = body.isActive;

  const user = await prisma.user.update({
    where: { id },
    data,
  });

  await recordAudit({
    userId: session.user.id,
    action: "UPDATE",
    entity: "user",
    entityId: id,
    before,
    after: user,
    req,
  });

  return NextResponse.json({ id: user.id, isActive: user.isActive });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || !session.user.roles.includes("ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  if (id === session.user.id) {
    return NextResponse.json({ error: "لا يمكنك حذف حسابك" }, { status: 400 });
  }

  const before = await prisma.user.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.user.delete({ where: { id } });
  await recordAudit({
    userId: session.user.id,
    action: "DELETE",
    entity: "user",
    entityId: id,
    before,
    req,
  });
  return NextResponse.json({ success: true });
}
