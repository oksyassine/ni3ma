import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";
import { canManageGovernance, canViewGovernance } from "@/lib/rbac";
import { revalidateBureau } from "@/lib/revalidate";

const createSchema = z.object({
  bookId: z.string().min(1),
  borrowerName: z.string().min(1).max(300),
  memberId: z.string().nullish(),
  borrowedAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .transform((v) => new Date(v + "T00:00:00.000Z"))
    .default(() => new Date(new Date().toISOString().slice(0, 10) + "T00:00:00.000Z")),
  dueAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).transform((v) => new Date(v + "T00:00:00.000Z")),
  notes: z.string().max(1000).nullish(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canViewGovernance(session.user.roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const bookId = req.nextUrl.searchParams.get("book");
  const borrowings = await prisma.bookBorrowing.findMany({
    where: bookId ? { bookId } : undefined,
    orderBy: { borrowedAt: "desc" },
    include: { book: { select: { id: true, title: true } } },
  });
  // Auto-flag overdue OPEN rows
  const today = new Date();
  return NextResponse.json({
    borrowings: borrowings.map((b) => ({
      ...b,
      overdue: b.status === "OPEN" && b.dueAt.getTime() < today.getTime(),
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageGovernance(session.user.roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "بيانات غير صحيحة" }, { status: 400 });

  // Availability check: copiesTotal minus active borrows must be > 0.
  const [book, active] = await Promise.all([
    prisma.libraryBook.findUnique({ where: { id: parsed.data.bookId }, select: { copiesTotal: true, title: true } }),
    prisma.bookBorrowing.count({ where: { bookId: parsed.data.bookId, status: "OPEN" } }),
  ]);
  if (!book) return NextResponse.json({ error: "الكتاب غير موجود" }, { status: 404 });
  if (active >= book.copiesTotal) {
    return NextResponse.json({ error: "لا توجد نسخ متاحة للإعارة" }, { status: 400 });
  }

  const { memberId, ...rest } = parsed.data;
  const created = await prisma.bookBorrowing.create({
    data: { ...rest, memberId: memberId || null, status: "OPEN" },
  });
  await recordAudit({ userId: session.user.id, action: "CREATE", entity: "book_borrowing", entityId: created.id, after: created, req });
  revalidateBureau("library");
  return NextResponse.json(created, { status: 201 });
}
