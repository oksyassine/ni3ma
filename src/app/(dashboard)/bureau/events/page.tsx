import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getT } from "@/lib/i18n/server";
import { canViewGovernance, canManageGovernance } from "@/lib/rbac";
import { fmtDate, fmtMoney } from "@/lib/i18n/format";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// Bureau events list. Events are gala / marche verte / conference style.
// Tickets are sold via YouCan Pay or tracked as free RSVPs. Members see
// them in the portal; the public sees a landing page at /e/[slug].

export default async function EventsPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (!canViewGovernance(session.user.roles)) redirect("/unauthorized");
  const { t, locale } = await getT();

  const events = await prisma.event.findMany({
    orderBy: { startsAt: "desc" },
    include: {
      _count: { select: { tickets: true } },
      tickets: { where: { status: { in: ["PAID", "CHECKED_IN"] } }, select: { id: true } },
    },
  });

  const canWrite = canManageGovernance(session.user.roles);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">{t("gov.events.title")}</h1>
          <p className="text-muted-foreground">{t("gov.events.subtitle")}</p>
        </div>
        {canWrite && (
          <Link
            href="/bureau/events/new"
            className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
          >
            + {t("gov.events.create")}
          </Link>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {events.length === 0 && (
          <p className="col-span-full text-center text-muted-foreground py-12">
            {t("gov.events.empty")}
          </p>
        )}
        {events.map((e) => {
          const remaining = e.capacity === null ? null : Math.max(0, e.capacity - e._count.tickets);
          return (
            <Link
              key={e.id}
              href={`/bureau/events/${e.id}`}
              className="block rounded-xl border bg-card p-4 hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-bold text-base">{e.title}</h3>
                <Badge className={statusColor(e.visibility)}>
                  {t(`events.status.${e.visibility}`)}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                {e.description}
              </p>
              <div className="space-y-1 text-xs">
                <div>📅 {fmtDate(e.startsAt, locale)}</div>
                {e.venue && <div>📍 {e.venue}{e.city ? `, ${e.city}` : ""}</div>}
                <div>💰 {e.ticketPrice && Number(e.ticketPrice) > 0 ? `${fmtMoney(Number(e.ticketPrice), locale)} ${t("gov.events.perTicket")}` : t("gov.events.free")}</div>
                <div>🎟 {e.tickets.length} {t("gov.events.ticketsSold")}
                  {remaining !== null && ` / ${e.capacity}`}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function statusColor(s: string): string {
  if (s === "PUBLISHED") return "bg-emerald-100 text-emerald-800";
  if (s === "CLOSED")    return "bg-stone-200 text-stone-700";
  return "bg-gray-200 text-gray-700"; // DRAFT
}
