import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AnalyticsClient } from "./client";

export default async function Page() {
  const session = await auth();
  if (!session) redirect("/login");

  const projects = await prisma.socialProject.findMany({
    where: { section: "SOCIAL" },
    include: {
      donations: { select: { amount: true } },
      inKindDonations: { select: { estimatedValue: true } },
      tasks: { select: { status: true, worklogs: { select: { hours: true, member: { select: { fullName: true } } } } } },
    },
  });

  const enriched = projects.map((p) => {
    const cash = p.donations.reduce((s, d) => s + Number(d.amount), 0);
    const inKind = p.inKindDonations.reduce((s, d) => s + Number(d.estimatedValue ?? 0), 0);
    const tasksDone = p.tasks.filter((t) => t.status === "DONE").length;
    const tasksTotal = p.tasks.length;
    const hours = p.tasks.flatMap((t) => t.worklogs).reduce((s, w) => s + Number(w.hours), 0);
    return {
      id: p.id,
      name: p.name,
      kind: p.kind,
      status: p.status,
      targetAmount: p.targetAmount ? Number(p.targetAmount) : 0,
      collected: cash + inKind,
      tasksDone,
      tasksTotal,
      hours,
      score: p.evaluationScore,
      actualBeneficiaries: p.actualBeneficiaries,
      expectedBeneficiaries: p.expectedBeneficiaries,
    };
  });

  // Volunteer leaderboard from worklogs across all projects
  const memberHours: Record<string, { name: string; hours: number }> = {};
  projects.forEach((p) =>
    p.tasks.forEach((t) =>
      t.worklogs.forEach((w) => {
        const k = w.member.fullName;
        if (!memberHours[k]) memberHours[k] = { name: k, hours: 0 };
        memberHours[k].hours += Number(w.hours);
      })
    )
  );
  const leaderboard = Object.values(memberHours).sort((a, b) => b.hours - a.hours).slice(0, 10);

  return <AnalyticsClient projects={enriched} leaderboard={leaderboard} />;
}
