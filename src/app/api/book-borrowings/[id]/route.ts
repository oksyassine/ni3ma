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

const patchSchema = z.object({
  returnedAt: dateStr,
  status: z.enum(["OPEN", "RETURNED", "LATE", "LOST"]).optional(),
  notes: z.string().max(1000).nullish(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageGovernance(session.user.roles)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const before = await prisma.bookBorrowing.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "غير موجود" }, { status: 404 });
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "بيانات غير صحيحة" }, { status: 400 });
  const data: Record<string, unknown> = { ...parsed.data };
  // Marking RETURNED auto-stamps returnedAt.
  if (data.status === "RETURNED" && !before.returnedAt && data.returnedAt === undefined) {
    data.returnedAt = new Date();
  }
  const updated = await prisma.bookBorrowing.update({ where: { id }, data });
  await recordAudit({ userId: session.user.id, action: "UPDATE", entity: "book_borrowing", entityId: id, before, after: updated, req });
  revalidateBureau("library");
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageGovernance(session.user.roles)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const before = await prisma.bookBorrowing.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "غير موجود" }, { status: 404 });
  await prisma.bookBorrowing.delete({ where: { id } });
  await recordAudit({ userId: session.user.id, action: "DELETE", entity: "book_borrowing", entityId: id, before, req });
  revalidateBureau("library");
  return NextResponse.json({ ok: true });
}
