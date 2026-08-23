import { prisma } from "./prisma";

export async function getCurrentAcademicYear() {
  return prisma.academicYear.findFirst({ where: { isCurrent: true } });
}

export async function getCurrentAcademicYearId(): Promise<string | null> {
  const y = await getCurrentAcademicYear();
  return y?.id ?? null;
}

export async function listAcademicYears() {
  return prisma.academicYear.findMany({ orderBy: { startDate: "desc" } });
}

export async function setCurrentAcademicYear(id: string) {
  await prisma.$transaction([
    prisma.academicYear.updateMany({ data: { isCurrent: false } }),
    prisma.academicYear.update({ where: { id }, data: { isCurrent: true } }),
  ]);
}
