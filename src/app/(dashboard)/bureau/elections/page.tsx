import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getT } from "@/lib/i18n/server";
import { canManageGovernance, canViewGovernance } from "@/lib/rbac";
import { fmtDate } from "@/lib/i18n/format";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// Bureau elections (AGO) — list view. The bureau creates an election,
// opens candidacies, runs an online vote (weighted by member type), then
// signs & publishes the minutes. Each step is gated by the ElectionStatus.

export default async function ElectionsPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (!canViewGovernance(session.user.roles)) redirect("/unauthorized");
  const { t, locale } = await getT();

  const elections = await prisma.election.findMany({
    orderBy: { electionDate: "desc" },
    include: { _count: { select: { candidacies: true, votes: true } } },
  });

  const canWrite = canManageGovernance(session.user.roles);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">{t("gov.elections.title")}</h1>
          <p className="text-muted-foreground">{t("gov.elections.subtitle")}</p>
        </div>
        {canWrite && (
          <form action="/api/elections" method="post">
            <Button type="submit">+ {t("gov.elections.create")}</Button>
          </form>
        )}
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-xs">
            <tr>
              <th className="p-3 text-start">{t("gov.elections.colTitle")}</th>
              <th className="p-3 text-start">{t("gov.elections.colDate")}</th>
              <th className="p-3 text-start">{t("gov.elections.colSeats")}</th>
              <th className="p-3 text-start">{t("gov.elections.colCandidacies")}</th>
              <th className="p-3 text-start">{t("gov.elections.colVotes")}</th>
              <th className="p-3 text-start">{t("gov.elections.colStatus")}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {elections.length === 0 && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-muted-foreground">
                  {t("gov.elections.empty")}
                </td>
              </tr>
            )}
            {elections.map((e) => (
              <tr key={e.id} className="border-t">
                <td className="p-3 font-medium">{e.title}</td>
                <td className="p-3 font-mono">{fmtDate(e.electionDate, locale)}</td>
                <td className="p-3">{e.seats}</td>
                <td className="p-3">{e._count.candidacies}</td>
                <td className="p-3">{e._count.votes}</td>
                <td className="p-3">
                  <Badge className={statusColor(e.status)}>{t(`elections.status.${e.status}`)}</Badge>
                </td>
                <td className="p-3 text-end">
                  <Link href={`/bureau/elections/${e.id}`} className="text-xs underline">
                    {t("common.open")}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
