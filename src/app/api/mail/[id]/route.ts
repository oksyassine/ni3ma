import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";
import { canManageGovernance } from "@/lib/rbac";
import { revalidateBureau } from "@/lib/revalidate";

const dateStr = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .transform((v) => new Date(v + "T00:00:00.000Z"))
  .nullish();

// Direction is immutable after creation: changing it would break the
// serial-numbering scheme (و/ص + year/seq). If a user must change it,
// they should delete and re-create the entry. Everything else is editable.
const patchSchema = z.object({
  reference: z.string().min(1).max(60).optional(),
  subject: z.string().min(2).max(500).optional(),
  correspondent: z.string().min(2).max(300).optional(),
  mailDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).transform((v) => new Date(v + "T00:00:00.000Z")).optional(),
  channel: z.string().max(120).nullish(),
  status: z.enum(["PENDING", "PROCESSED", "ARCHIVED"]).optional(),
  responseDueAt: dateStr,
  respondedAt: dateStr,
  fileUrl: z.string().max(500).nullish(),
  notes: z.string().max(2000).nullish(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageGovernance(session.user.roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;

  const before = await prisma.mailItem.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "غير موجود" }, { status: 404 });

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "بيانات غير صحيحة" }, { status: 400 });

  const updated = await prisma.mailItem.update({ where: { id }, data: parsed.data });

  await recordAudit({
    userId: session.user.id,
    action: "UPDATE",
    entity: "mail_item",
    entityId: id,
    before,
    after: updated,
    req,
  });

  revalidateBureau("mail");

  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageGovernance(session.user.roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;

  const before = await prisma.mailItem.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "غير موجود" }, { status: 404 });

  await prisma.mailItem.delete({ where: { id } });
  await recordAudit({
    userId: session.user.id,
    action: "DELETE",
    entity: "mail_item",
    entityId: id,
    before,
    req,
  });
  revalidateBureau("mail");
  return NextResponse.json({ ok: true });
}
