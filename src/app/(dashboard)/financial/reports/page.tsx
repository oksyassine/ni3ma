import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ReportsClient } from "./client";

export default async function Page() {
  const session = await auth();
  if (!session) redirect("/login");

  const years = await prisma.academicYear.findMany({ orderBy: { startDate: "desc" } });
  return <ReportsClient years={years.map((y) => ({ id: y.id, label: y.label, isCurrent: y.isCurrent }))} />;
}
