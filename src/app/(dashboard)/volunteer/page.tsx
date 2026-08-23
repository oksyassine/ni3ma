import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { VolunteerLeaderClient } from "./client";

export default async function Page() {
  const session = await auth();
  if (!session) redirect("/login");

  const adults = await prisma.member.findMany({
    where: { memberType: "ADULT", isActive: true },
    select: { id: true, fullName: true, registrationNumber: true },
    orderBy: { fullName: "asc" },
  });

  const activities = await prisma.programActivity.findMany({
    select: {
      id: true, title: true, activityDate: true,
      program: { select: { section: true } },
    },
    orderBy: { activityDate: "desc" },
    take: 100,
  });

  return (
    <VolunteerLeaderClient
      adults={adults}
      activities={activities.map((a) => ({
        id: a.id,
        title: a.title,
        section: a.program.section,
        activityDate: a.activityDate?.toISOString().slice(0, 10) ?? null,
      }))}
    />
  );
}
