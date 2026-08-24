import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getT } from "@/lib/i18n/server";
import { AcademicYearsManager } from "./client";

export default async function AcademicYearsPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (!session.user.roles.includes("ADMIN") && !session.user.roles.includes("BUREAU")) {
    redirect("/unauthorized");
  }
  const { t } = await getT();

  const years = await prisma.academicYear.findMany({ orderBy: { startDate: "desc" } });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("admin.academicYears.title")}</h1>
        <p className="text-muted-foreground">{t("admin.academicYears.subtitle")}</p>
      </div>
      <AcademicYearsManager
        initialYears={years.map((y) => ({
          id: y.id,
          label: y.label,
          startDate: y.startDate.toISOString().slice(0, 10),
          endDate: y.endDate.toISOString().slice(0, 10),
          isCurrent: y.isCurrent,
          isClosed: y.isClosed,
        }))}
      />
    </div>
  );
}
