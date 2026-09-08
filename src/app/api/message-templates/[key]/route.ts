import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";
import { canManageGovernance } from "@/lib/rbac";
import { revalidateBureau } from "@/lib/revalidate";

const patchSchema = z.object({
  name: z.string().min(2).max(300).optional(),
  channel: z.enum(["WHATSAPP", "SMS", "EMAIL"]).optional(),
  body: z.string().min(1).max(4000).optional(),
  variables: z.string().max(2000).nullish(),
  isActive: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageGovernance(session.user.roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { key } = await params;
  const before = await prisma.messageTemplate.findUnique({ where: { key } });
  if (!before) return NextResponse.json({ error: "غير موجود" }, { status: 404 });
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "بيانات غير صحيحة" }, { status: 400 });
  const updated = await prisma.messageTemplate.update({ where: { key }, data: parsed.data });
  await recordAudit({ userId: session.user.id, action: "UPDATE", entity: "message_template", entityId: key, before, after: updated, req });
  revalidateBureau("messages");
  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageGovernance(session.user.roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { key } = await params;
  const before = await prisma.messageTemplate.findUnique({ where: { key } });
  if (!before) return NextResponse.json({ error: "غير موجود" }, { status: 404 });
  await prisma.messageTemplate.delete({ where: { key } });
  await recordAudit({ userId: session.user.id, action: "DELETE", entity: "message_template", entityId: key, before, req });
  revalidateBureau("messages");
  return NextResponse.json({ ok: true });
}
