import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getT } from "@/lib/i18n/server";
import { prisma } from "@/lib/prisma";
import { canViewGovernance } from "@/lib/rbac";

// Hub linking every printable administrative document to its source record.
export default async function PaperworkPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (!canViewGovernance(session.user.roles)) redirect("/unauthorized");
  const { t } = await getT();

  const [members, meetings, paidDonations, recentContributions] = await Promise.all([
    prisma.member.findMany({
      where: { isActive: true },
      select: { id: true, fullName: true, registrationNumber: true },
      orderBy: { registrationNumber: "asc" },
      take: 2000,
    }),
    prisma.meeting.findMany({
      select: { id: true, title: true, kind: true, heldAt: true },
      orderBy: { heldAt: "desc" },
      take: 100,
    }),
    prisma.donation.findMany({
      where: { isPaid: true },
      select: { id: true, donorName: true, amount: true, donationDate: true, receiptNumber: true, isAnonymous: true },
      orderBy: { donationDate: "desc" },
      take: 200,
    }),
    prisma.weeklyContribution.findMany({
      orderBy: { paidAt: "desc" },
      take: 200,
      include: { member: { select: { id: true, fullName: true, registrationNumber: true } } },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("gov.paperwork.title")}</h1>
        <p className="text-muted-foreground">{t("gov.paperwork.subtitle")}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <form action="/bureau/paperwork/certificate" method="get" className="flex flex-col rounded-xl border bg-card p-5">
          <h3 className="font-bold">📜 {t("gov.paperwork.certificate")}</h3>
          <p className="mt-1 flex-1 text-xs text-muted-foreground">{t("gov.paperwork.certificateDesc")}</p>
          <select
            name="member"
            required
            className="mt-3 h-9 w-full rounded-lg border bg-transparent px-2 text-sm"
            dir="auto"
          >
            <option value="" disabled>{t("gov.paperwork.selectMember")}</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.fullName} — {m.registrationNumber}
              </option>
            ))}
          </select>
          <button type="submit" className="mt-3 h-9 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground">
            {t("gov.paperwork.generate")}
          </button>
        </form>

        <form action="/bureau/paperwork/convocation" method="get" className="flex flex-col rounded-xl border bg-card p-5">
          <h3 className="font-bold">📨 {t("gov.paperwork.convocation")}</h3>
          <p className="mt-1 flex-1 text-xs text-muted-foreground">{t("gov.paperwork.convocationDesc")}</p>
          <MeetingSelect meetings={meetings} placeholder={t("gov.paperwork.selectMeeting")} />
          <button type="submit" className="mt-3 h-9 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground">
            {t("gov.paperwork.generate")}
          </button>
        </form>

        <form action="/bureau/paperwork/attendance-sheet" method="get" className="flex flex-col rounded-xl border bg-card p-5">
          <h3 className="font-bold">✍️ {t("gov.paperwork.attendanceSheet")}</h3>
          <p className="mt-1 flex-1 text-xs text-muted-foreground">{t("gov.paperwork.attendanceSheetDesc")}</p>
          <MeetingSelect meetings={meetings} placeholder={t("gov.paperwork.selectMeeting")} />
          <button type="submit" className="mt-3 h-9 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground">
            {t("gov.paperwork.generate")}
          </button>
        </form>

        <form action="/bureau/paperwork/donation-receipt" method="get" className="flex flex-col rounded-xl border bg-card p-5">
          <h3 className="font-bold">💰 {t("gov.paperwork.donationReceipt")}</h3>
          <p className="mt-1 flex-1 text-xs text-muted-foreground">{t("gov.paperwork.donationReceiptDesc")}</p>
          <DonationSelect donations={paidDonations} placeholder={t("gov.paperwork.selectDonation")} />
          <button type="submit" className="mt-3 h-9 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground">
            {t("gov.paperwork.generate")}
          </button>
        </form>

        <form action="/bureau/paperwork/contribution-receipt" method="get" className="flex flex-col rounded-xl border bg-card p-5">
          <h3 className="font-bold">🧾 {t("gov.paperwork.contributionReceipt")}</h3>
          <p className="mt-1 flex-1 text-xs text-muted-foreground">{t("gov.paperwork.contributionReceiptDesc")}</p>
          <ContributionSelect contributions={recentContributions} placeholder={t("gov.paperwork.selectContribution")} />
          <button type="submit" className="mt-3 h-9 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground">
            {t("gov.paperwork.generate")}
          </button>
        </form>
      </div>
    </div>
  );
}

function MeetingSelect({
  meetings,
  placeholder,
}: {
  meetings: { id: string; title: string; kind: string; heldAt: Date }[];
  placeholder: string;
}) {
  return (
    <select name="meeting" required className="mt-3 h-9 w-full rounded-lg border bg-transparent px-2 text-sm" dir="auto">
      <option value="" disabled>{placeholder}</option>
      {meetings.map((m) => (
        <option key={m.id} value={m.id}>
          {m.title} — {m.heldAt.toISOString().slice(0, 10)}
        </option>
      ))}
    </select>
  );
}

function DonationSelect({
  donations,
  placeholder,
}: {
  donations: { id: string; donorName: string | null; amount: unknown; donationDate: Date; receiptNumber: string | null; isAnonymous: boolean }[];
  placeholder: string;
}) {
  return (
    <select name="donation" required className="mt-3 h-9 w-full rounded-lg border bg-transparent px-2 text-sm" dir="auto">
      <option value="" disabled>{placeholder}</option>
      {donations.map((d) => (
        <option key={d.id} value={d.id} dir="ltr">
          {d.donationDate.toISOString().slice(0, 10)} — {d.isAnonymous ? "مجهول" : (d.donorName ?? "—")} — {String(d.amount)} DH{d.receiptNumber ? ` (${d.receiptNumber})` : ""}
        </option>
      ))}
    </select>
  );
}

function ContributionSelect({
  contributions,
  placeholder,
}: {
  contributions: { id: string; paidAt: Date; amount: unknown; member: { fullName: string; registrationNumber: number } | null }[];
  placeholder: string;
}) {
  return (
    <select name="contribution" required className="mt-3 h-9 w-full rounded-lg border bg-transparent px-2 text-sm" dir="auto">
      <option value="" disabled>{placeholder}</option>
      {contributions.map((c) => (
        <option key={c.id} value={c.id} dir="ltr">
          {c.paidAt.toISOString().slice(0, 10)} — {c.member?.fullName ?? "—"} — {String(c.amount)} DH
        </option>
      ))}
    </select>
  );
}
