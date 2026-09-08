import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getT } from "@/lib/i18n/server";
import { prisma } from "@/lib/prisma";
import { canManageGovernance, canViewGovernance } from "@/lib/rbac";
import { LibraryClient } from "./client";

export default async function LibraryPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (!canViewGovernance(session.user.roles)) redirect("/unauthorized");
  const { t } = await getT();

  const [books, openBorrowings] = await Promise.all([
    prisma.libraryBook.findMany({
      orderBy: { createdAt: "desc" },
      include: { borrowings: { orderBy: { borrowedAt: "desc" } } },
    }),
    prisma.bookBorrowing.findMany({
      where: { status: "OPEN" },
      orderBy: { dueAt: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("gov.library.title")}</h1>
        <p className="text-muted-foreground">{t("gov.library.subtitle")}</p>
      </div>
      <LibraryClient
        initial={books.map((b) => ({
          ...b,
          acquiredAt: b.acquiredAt?.toISOString().slice(0, 10) ?? null,
          createdAt: b.createdAt.toISOString(),
          borrowings: b.borrowings.map((br) => ({
            id: br.id,
            bookId: br.bookId,
            borrowerName: br.borrowerName,
            memberId: br.memberId,
            borrowedAt: br.borrowedAt.toISOString().slice(0, 10),
            dueAt: br.dueAt.toISOString().slice(0, 10),
            returnedAt: br.returnedAt?.toISOString().slice(0, 10) ?? null,
            status: br.status,
          })),
        }))}
        openBorrowings={openBorrowings.map((b) => ({
          id: b.id,
          bookId: b.bookId,
          borrowerName: b.borrowerName,
          borrowedAt: b.borrowedAt.toISOString().slice(0, 10),
          dueAt: b.dueAt.toISOString().slice(0, 10),
        }))}
        canWrite={canManageGovernance(session.user.roles)}
      />
    </div>
  );
}
