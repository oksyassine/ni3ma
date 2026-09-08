import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getT } from "@/lib/i18n/server";
import { prisma } from "@/lib/prisma";
import { canManageGovernance, canViewGovernance } from "@/lib/rbac";
import { TrainingsClient } from "./client";

export default async function TrainingsPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (!canViewGovernance(session.user.roles)) redirect("/unauthorized");
  const { t } = await getT();

  const courses = await prisma.trainingCourse.findMany({
    orderBy: { createdAt: "desc" },
    include: { participants: true },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("gov.courses.title")}</h1>
        <p className="text-muted-foreground">{t("gov.courses.subtitle")}</p>
      </div>
      <TrainingsClient
        initial={courses.map((c) => ({
          ...c,
          startDate: c.startDate?.toISOString().slice(0, 10) ?? null,
          endDate: c.endDate?.toISOString().slice(0, 10) ?? null,
          createdAt: c.createdAt.toISOString(),
          participants: c.participants.map((p) => ({
            fullName: p.fullName,
            phone: p.phone,
            note: p.note,
          })),
        }))}
        canWrite={canManageGovernance(session.user.roles)}
      />
    </div>
  );
}
