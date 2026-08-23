import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AcademicYearsManager } from "./client";

export default async function AcademicYearsPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (!session.user.roles.includes("ADMIN") && !session.user.roles.includes("BUREAU")) {
    redirect("/unauthorized");
  }

  const years = await prisma.academicYear.findMany({ orderBy: { startDate: "desc" } });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">السنوات الدراسية</h1>
        <p className="text-muted-foreground">إدارة السنوات الدراسية وتحديد السنة الجارية</p>
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
