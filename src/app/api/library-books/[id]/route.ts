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
  title: z.string().min(1).max(500).optional(),
  author: z.string().max(300).nullish(),
  category: z
    .enum(["QURAN", "TAFSIR", "HADITH", "FIQH", "AQIDA", "ARABIC_LANGUAGE", "GENERAL", "CHILDREN", "OTHER"])
    .optional(),
  isbn: z.string().max(40).nullish(),
  copiesTotal: z.number().int().min(1).max(10000).optional(),
  shelf: z.string().max(120).nullish(),
  acquiredAt: dateStr,
  notes: z.string().max(2000).nullish(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageGovernance(session.user.roles)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const before = await prisma.libraryBook.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "غير موجود" }, { status: 404 });
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "بيانات غير صحيحة" }, { status: 400 });
  // Prevent shrinking copiesTotal below the number of active borrowings.
  if (parsed.data.copiesTotal !== undefined && parsed.data.copiesTotal < before.copiesTotal) {
    const active = await prisma.bookBorrowing.count({ where: { bookId: id, status: "OPEN" } });
    if (active > parsed.data.copiesTotal) {
      return NextResponse.json(
        { error: `لا يمكن تقليل العدد إلى ${parsed.data.copiesTotal}: ${active} إعارات نشطة` },
        { status: 400 }
      );
    }
  }
  const updated = await prisma.libraryBook.update({ where: { id }, data: parsed.data });
  await recordAudit({ userId: session.user.id, action: "UPDATE", entity: "library_book", entityId: id, before, after: updated, req });
  revalidateBureau("library");
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageGovernance(session.user.roles)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const before = await prisma.libraryBook.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "غير موجود" }, { status: 404 });
  await prisma.libraryBook.delete({ where: { id } });
  await recordAudit({ userId: session.user.id, action: "DELETE", entity: "library_book", entityId: id, before, req });
  revalidateBureau("library");
  return NextResponse.json({ ok: true });
}
