import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getT } from "@/lib/i18n/server";
import { prisma } from "@/lib/prisma";
import { canManageGovernance, canViewGovernance } from "@/lib/rbac";
import { MeetingsClient } from "./client";

export default async function MeetingsPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (!canViewGovernance(session.user.roles)) redirect("/unauthorized");
  const { t } = await getT();

  const meetings = await prisma.meeting.findMany({
    orderBy: { heldAt: "desc" },
    include: { decisions: { orderBy: { position: "asc" } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("gov.meetings.title")}</h1>
        <p className="text-muted-foreground">{t("gov.meetings.subtitle")}</p>
      </div>
      <MeetingsClient
        initial={meetings.map((m) => ({
          id: m.id,
          kind: m.kind,
          title: m.title,
          heldAt: m.heldAt.toISOString().slice(0, 10),
          location: m.location,
          convocationMethod: m.convocationMethod,
          agenda: m.agenda,
          minutes: m.minutes,
          minutesUrl: m.minutesUrl,
          expectedCount: m.expectedCount,
          presentCount: m.presentCount,
          quorumPct: m.quorumPct,
          decisions: m.decisions.map((d) => ({
            title: d.title,
            body: d.body,
            votesFor: d.votesFor,
            votesAgainst: d.votesAgainst,
            votesAbstain: d.votesAbstain,
            passed: d.passed,
          })),
        }))}
        canWrite={canManageGovernance(session.user.roles)}
      />
    </div>
  );
}
