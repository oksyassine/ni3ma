import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getT } from "@/lib/i18n/server";
import { fmtDate, fmtMoney } from "@/lib/i18n/format";
import { EventRegisterForm } from "./register-form";

// Public event landing page. Visible only when the event is PUBLISHED.
// Members are recognized via NextAuth (when logged in) — non-members
// just give a name + phone.

export default async function PublicEventPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { t, locale } = await getT();
  const { slug } = await params;
  const event = await prisma.event.findUnique({ where: { slug } });
  if (!event || event.visibility !== "PUBLISHED") notFound();

  const remaining = event.capacity === null ? null : Math.max(0, event.capacity - await prisma.ticket.count({ where: { eventId: event.id } }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-amber-50 dark:from-emerald-950 dark:to-amber-950">
      <article className="mx-auto max-w-3xl px-4 py-12">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-extrabold">{event.title}</h1>
          <p className="mt-3 text-lg text-muted-foreground">{event.description}</p>
        </header>

        <dl className="grid grid-cols-2 gap-4 my-8">
          <div className="rounded-lg border bg-card p-4">
            <dt className="text-xs text-muted-foreground">{t("events.startsAt")}</dt>
            <dd className="font-bold">{fmtDate(event.startsAt, locale)}</dd>
          </div>
          {event.endsAt && (
            <div className="rounded-lg border bg-card p-4">
              <dt className="text-xs text-muted-foreground">{t("events.endsAt")}</dt>
              <dd className="font-bold">{fmtDate(event.endsAt, locale)}</dd>
            </div>
          )}
          {(event.venue || event.city) && (
            <div className="rounded-lg border bg-card p-4 col-span-2">
              <dt className="text-xs text-muted-foreground">{t("events.venue")}</dt>
              <dd className="font-bold">{event.venue}{event.city ? `, ${event.city}` : ""}</dd>
            </div>
          )}
          <div className="rounded-lg border bg-card p-4">
            <dt className="text-xs text-muted-foreground">{t("events.price")}</dt>
            <dd className="font-bold">
              {Number(event.ticketPrice) > 0
                ? `${fmtMoney(Number(event.ticketPrice), locale)} ${t("events.perTicket")}`
                : t("events.free")}
            </dd>
          </div>
          {remaining !== null && (
            <div className="rounded-lg border bg-card p-4">
              <dt className="text-xs text-muted-foreground">{t("events.remaining")}</dt>
              <dd className="font-bold">{remaining} / {event.capacity}</dd>
            </div>
          )}
        </dl>

        <EventRegisterForm eventId={event.id} priceMad={Number(event.ticketPrice)} />
      </article>
    </div>
  );
}
