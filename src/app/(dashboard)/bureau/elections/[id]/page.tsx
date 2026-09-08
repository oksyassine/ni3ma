import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getT } from "@/lib/i18n/server";
import { canManageGovernance, canViewGovernance } from "@/lib/rbac";
import { fmtDate } from "@/lib/i18n/format";
import { Badge } from "@/components/ui/badge";
import { ElectionActions } from "./actions";

// Election detail page. Shows candidacies + votes + tally, and exposes
// the lifecycle actions (open candidacy, open/close voting, sign minutes)
// if the caller has management rights.

export default async function ElectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");
  if (!canViewGovernance(session.user.roles)) redirect("/unauthorized");
  const { t, locale } = await getT();
  const { id } = await params;

  const election = await prisma.election.findUnique({
    where: { id },
    include: {
      candidacies: {
        where: { withdrawnAt: null },
        include: { member: { select: { fullName: true, registrationNumber: true } } },
        orderBy: [{ ballotOrder: "asc" }, { createdAt: "asc" }],
      },
      // Deliberately do NOT include the voter relation — secret ballot.
      // The count is enough for the live tally.
      votes: { select: { id: true, ballot: true, weight: true } },
      minutes: true,
    },
  });
  if (!election) notFound();

  // Eligible voters: adults only (children carry childWeight=0).
  const eligibleVoters = await prisma.member.count({
    where: { isActive: true, memberType: "ADULT" },
  });

  // Tally: weighted by adultWeight (default 1) — each vote's `weight`
  // already accounts for the voter's type at cast time.
  const tally = new Map<string, number>();
  for (const v of election.votes) {
    const ballot = Array.isArray(v.ballot) ? (v.ballot as unknown as string[]) : [];
    // The ballot is a ranked list of candidacy ids. We weight by inverse
    // rank: top choice gets full weight, next gets half, etc. (Borda count).
    ballot.forEach((cid, idx) => {
      const score = v.weight * (ballot.length - idx) / ballot.length;
      tally.set(cid, (tally.get(cid) ?? 0) + score);
    });
  }
  const tallied = election.candidacies.map((c) => ({
    id: c.id,
    name: c.member.fullName,
    registrationNumber: c.member.registrationNumber,
    score: tally.get(c.id) ?? 0,
    statement: c.statement,
  })).sort((a, b) => b.score - a.score);

  const canWrite = canManageGovernance(session.user.roles);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">{election.title}</h1>
          <p className="text-muted-foreground">
            {fmtDate(election.electionDate, locale)} · {t("elections.seats")}: {election.seats}
          </p>
        </div>
        <Badge className={statusColor(election.status)}>
          {t(`elections.status.${election.status}`)}
        </Badge>
      </div>

      {canWrite && (
        <ElectionActions
          electionId={election.id}
          status={election.status}
          eligibleVoters={eligibleVoters}
          hasMinutes={!!election.minutes}
        />
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-xl border bg-card p-4 space-y-3">
          <h2 className="font-bold">{t("elections.candidacies")} ({election.candidacies.length})</h2>
          <ul className="space-y-2 text-sm">
            {election.candidacies.length === 0 && (
              <li className="text-muted-foreground text-xs">{t("elections.noCandidacies")}</li>
            )}
            {election.candidacies.map((c) => (
              <li key={c.id} className="border rounded p-2">
                <div className="font-medium">
                  #{c.member.registrationNumber} · {c.member.fullName}
                </div>
                {c.statement && (
                  <p className="text-xs text-muted-foreground mt-1">{c.statement}</p>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border bg-card p-4 space-y-3">
          <h2 className="font-bold">{t("elections.tally")}</h2>
          {election.votes.length === 0 ? (
            <p className="text-xs text-muted-foreground">{t("elections.noVotesYet")}</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr>
                  <th className="text-start">Candidat</th>
                  <th className="text-end">Score (Borda)</th>
                  <th className="text-end">Élu ?</th>
                </tr>
              </thead>
              <tbody>
                {tallied.map((row, idx) => (
                  <tr key={row.id} className={idx < election.seats ? "font-bold bg-emerald-50 dark:bg-emerald-950/30" : ""}>
                    <td className="py-1">#{row.registrationNumber} · {row.name}</td>
                    <td className="py-1 text-end font-mono">{row.score.toFixed(2)}</td>
                    <td className="py-1 text-end">{idx < election.seats ? "✓" : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>

      {election.minutes && (
        <section className="rounded-xl border bg-card p-4 space-y-2">
          <h2 className="font-bold">{t("elections.minutes")}</h2>
          <p className="text-xs text-muted-foreground">
            {t("elections.signedAt")}: {fmtDate(election.minutes.signedAt ?? election.minutes.createdAt, locale)} ·{" "}
            {t("elections.publishedAt")}: {fmtDate(election.minutes.publishedAt, locale)}
          </p>
          <pre className="bg-muted/40 p-3 rounded text-xs whitespace-pre-wrap font-mono">
            {election.minutes.body}
          </pre>
        </section>
      )}
    </div>
  );
}

function statusColor(status: string): string {
  switch (status) {
    case "DRAFT":            return "bg-gray-200 text-gray-700";
    case "CANDIDACY_OPEN":   return "bg-amber-100 text-amber-800";
    case "CANDIDACY_CLOSED": return "bg-blue-100 text-blue-800";
    case "VOTING_OPEN":      return "bg-emerald-100 text-emerald-800";
    case "VOTING_CLOSED":    return "bg-indigo-100 text-indigo-800";
    case "ARCHIVED":         return "bg-stone-200 text-stone-700";
    default:                  return "bg-muted";
  }
}
