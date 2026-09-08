import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getT } from "@/lib/i18n/server";
import { prisma } from "@/lib/prisma";
import { canViewGovernance } from "@/lib/rbac";
import { normalizeHost, getTenantRecordForHost } from "@/lib/tenants";
import { hijriDate } from "@/lib/dates";
import { BulkReminderSend } from "./bulk-send";

// react-hooks/purity forbids impure calls inline. Module-level helper.
function daysSince(d: Date | null): number | null {
  if (!d) return null;
  return Math.floor((Date.now() - d.getTime()) / 86_400_000);
}

const STALE_DAYS = 30;

type Row = {
  memberId: string;
  fullName: string;
  registrationNumber: number;
  phone: string | null;
  isActive: boolean;
  lastPaidAt: string | null;
  lastAmount: number | null;
  totalContributed: number;
  weekCount: number;
  daysSince: number | null;
};

export default async function RemindersPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (!canViewGovernance(session.user.roles)) redirect("/unauthorized");
  const { t, locale } = await getT();

  // Active adult members, joined to their most recent contribution.
  // Cheap enough for a bureau of <5 000 members; for larger ones the
  // bureau should pay the Pro tier (where this becomes a background job).
  const members = await prisma.member.findMany({
    where: { isActive: true, memberType: "ADULT" },
    select: {
      id: true,
      fullName: true,
      registrationNumber: true,
      phone: true,
      isActive: true,
      contributions: {
        orderBy: { paidAt: "desc" },
        select: { paidAt: true, amount: true },
        take: 1,
      },
      _count: { select: { contributions: true } },
    },
    orderBy: { registrationNumber: "asc" },
  });

  const rows: Row[] = members.map((m) => {
    const last = m.contributions[0];
    const lastPaid = last?.paidAt ?? null;
    const days = daysSince(lastPaid);
    const total = 0;
    return {
      memberId: m.id,
      fullName: m.fullName,
      registrationNumber: m.registrationNumber,
      phone: m.phone,
      isActive: m.isActive,
      lastPaidAt: lastPaid?.toISOString() ?? null,
      lastAmount: last ? Number(last.amount) : null,
      totalContributed: total,
      weekCount: m._count.contributions,
      daysSince: days,
    };
  });
  const stale = rows.filter((r) => r.daysSince === null || r.daysSince > STALE_DAYS);
  stale.sort((a, b) => (b.daysSince ?? 9_999) - (a.daysSince ?? 9_999));
  const fmtDate = (d: string | null) => (d ? new Date(d + "T12:00:00").toLocaleDateString(locale) : "—");
  const fmtHijri = (d: string | null) => (d ? hijriDate(d, locale === "fr" ? "fr" : "ar") : "");

  const [associationInfo, tenant, templates] = await Promise.all([
    prisma.associationInfo.findFirst(),
    associationNameFromHost(),
    prisma.messageTemplate.findMany({
      where: { isActive: true },
      orderBy: { key: "asc" },
    }),
  ]);
  const assocName = associationInfo?.name ?? tenant?.name ?? "جمعية النعمة";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("gov.reminders.title")}</h1>
        <p className="text-muted-foreground">{t("gov.reminders.subtitle")}</p>
      </div>

      <div className="rounded-xl border bg-card p-4 flex flex-wrap items-center gap-3">
        <p className="text-sm flex-1">
          {t("gov.reminders.count")}: <b className="text-2xl">{stale.length}</b>{" "}
          <span className="text-muted-foreground">({STALE_DAYS}+ days)</span>
        </p>
        <BulkReminderSend
          members={stale.map((s) => ({
            id: s.memberId,
            fullName: s.fullName,
            phone: s.phone ?? "",
            daysSince: s.daysSince,
          }))}
          templates={templates.map((t) => ({
            key: t.key,
            name: t.name,
            channel: t.channel,
            body: t.body,
          }))}
          assocName={assocName}
        />
      </div>

      {stale.length === 0 ? (
        <p className="py-10 text-center text-muted-foreground">🎉</p>
      ) : (
        <div className="space-y-2">
          {stale.map((r) => {
            const msg = t("gov.reminders.messageBody", {
              member: r.fullName,
              name: assocName,
              days: r.daysSince === null ? "∞" : String(r.daysSince),
            });
            const phone = r.phone ?? "";
            return (
              <div key={r.memberId} className="rounded-xl border bg-card p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold">{r.fullName}</span>
                  <span className="text-xs text-muted-foreground" dir="ltr">#{r.registrationNumber}</span>
                  <span className="text-xs text-muted-foreground">📅 {fmtDate(r.lastPaidAt)}{fmtHijri(r.lastPaidAt) && <span className="ms-1 text-[10px]" dir="rtl">({fmtHijri(r.lastPaidAt)})</span>}</span>
                  {r.daysSince === null ? (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800 dark:bg-red-950 dark:text-red-300">
                      {t("gov.reminders.never")}
                    </span>
                  ) : (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                      {t("gov.reminders.daysSince", { days: r.daysSince })}
                    </span>
                  )}
                  {phone && (
                    <a href={`tel:${phone}`} className="ms-auto text-xs text-primary underline" dir="ltr">
                      📞 {phone}
                    </a>
                  )}
                </div>
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs text-muted-foreground">{t("gov.reminders.previewMessage")}</summary>
                  <pre className="mt-2 whitespace-pre-wrap rounded-md bg-muted/50 p-2 text-xs leading-relaxed" dir="auto">{msg}</pre>
                  {phone && (
                    <a
                      className="mt-2 inline-block rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white"
                      href={`https://wa.me/${phone.replace(/[^\d+]/g, "")}?text=${encodeURIComponent(msg)}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      WhatsApp
                    </a>
                  )}
                </details>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

async function associationNameFromHost() {
  try {
    const h = await headers();
    const host = normalizeHost(h.get("host"));
    const tenant = host ? await getTenantRecordForHost(host) : null;
    return tenant;
  } catch {
    return null;
  }
}
