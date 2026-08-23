import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { QuranProgressClient } from "./client";

export default async function QuranProgressPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const members = await prisma.member.findMany({
    where: {
      isActive: true,
      sections: { some: { section: "QURAN", isActive: true } },
    },
    select: { id: true, fullName: true, registrationNumber: true },
    orderBy: { fullName: "asc" },
  });

  return <QuranProgressClient members={members} />;
}
