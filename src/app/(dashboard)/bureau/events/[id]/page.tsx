import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getT } from "@/lib/i18n/server";
import { canManageGovernance } from "@/lib/rbac";
import { fmtDate, fmtMoney } from "@/lib/i18n/format";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

// Event detail + ticket sales dashboard. Shows the ticket list, capacity,
// revenue, and (for published events) a public link to /e/[slug].

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");
  if (!canManageGovernance(session.user.roles)) redirect("/unauthorized");
  const { t, locale } = await getT();
  const { id } = await params;

  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      _count: { select: { tickets: true } },
      tickets: {
        include: { member: { select: { fullName: true, registrationNumber: true } } },
        orderBy: { createdAt: "desc" },
        take: 100,
      },
    },
  });
  if (!event) notFound();

  const counts = await prisma.ticket.groupBy({
    by: ["status"],
    where: { eventId: id },
    _count: { _all: true },
  });
  const countBy = Object.fromEntries(counts.map((c) => [c.status, c._count._all]));
  // Revenue counts only confirmed tickets (PAID + CHECKED_IN). PENDING
  // is reserved for ONLINE but not yet paid.
  const totalRevenue = event.tickets.reduce(
    (s, t) => s + (t.status === "PAID" || t.status === "CHECKED_IN" ? Number(t.amountPaid) : 0),
    0,
  );
  const confirmedCount = (countBy.PAID ?? 0) + (countBy.CHECKED_IN ?? 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">{event.title}</h1>
          <p className="text-muted-foreground">{event.description}</p>
        </div>
        <div className="flex gap-2 items-center">
          <Badge className={event.visibility === "PUBLISHED" ? "bg-emerald-100 text-emerald-800" : "bg-gray-200 text-gray-700"}>
            {t(`events.status.${event.visibility}`)}
          </Badge>
          {event.visibility === "PUBLISHED" && (
            <Link
              href={`/e/${event.slug}`}
              target="_blank"
              className="rounded-md border px-3 py-1 text-xs hover:bg-muted"
            >
              🌐 {t("gov.events.publicLink")}
            </Link>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Stat label={t("gov.events.startsAt")} value={fmtDate(event.startsAt, locale)} />
        <Stat label={t("gov.events.venue")} value={`${event.venue ?? "—"}${event.city ? ", " + event.city : ""}`} />
        <Stat label={t("gov.events.price")} value={Number(event.ticketPrice) > 0 ? `${fmtMoney(Number(event.ticketPrice), locale)}` : t("gov.events.free")} />
        <Stat label={t("gov.events.capacity")} value={event.capacity === null ? "∞" : `${event._count.tickets} / ${event.capacity}`} />
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Stat label={t("gov.events.ticketsPending")} value={String(countBy.PENDING ?? 0)} />
        <Stat label={t("gov.events.ticketsPaid")} value={String(countBy.PAID ?? 0)} />
        <Stat label={t("gov.events.ticketsCheckedIn")} value={String(countBy.CHECKED_IN ?? 0)} />
        <Stat label={t("gov.events.revenue")} value={fmtMoney(totalRevenue, locale)} />
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <h2 className="font-bold p-3 border-b">{t("gov.events.tickets")}</h2>
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-xs">
            <tr>
              <th className="p-2 text-start">#</th>
              <th className="p-2 text-start">{t("gov.events.attendee")}</th>
              <th className="p-2 text-start">{t("gov.events.memberId")}</th>
              <th className="p-2 text-start">{t("gov.events.amountPaid")}</th>
              <th className="p-2 text-start">{t("gov.events.statusLabel")}</th>
            </tr>
          </thead>
          <tbody>
            {event.tickets.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-muted-foreground">
                  {t("gov.events.noTickets")}
                </td>
              </tr>
            )}
            {event.tickets.map((t) => (
              <tr key={t.id} className="border-t">
                <td className="p-2 font-mono text-xs">{t.qrToken.slice(0, 8)}</td>
                <td className="p-2">{t.attendeeName}</td>
                <td className="p-2 text-xs">
                  {t.member ? `#${t.member.registrationNumber} ${t.member.fullName}` : "—"}
                </td>
                <td className="p-2">{fmtMoney(Number(t.amountPaid), locale)}</td>
                <td className="p-2">
                  <Badge variant="outline">{t.status}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-bold text-base">{value}</div>
    </div>
  );
}
