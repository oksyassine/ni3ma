import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getT } from "@/lib/i18n/server";
import { MemberVolunteerClient } from "./client";

export default async function Page() {
  const session = await auth();
  if (!session) redirect("/login");
  const { t } = await getT();

  const me = await prisma.member.findFirst({
    where: { OR: [{ id: session.user.id }, { username: session.user.username }] },
    select: { id: true },
  });
  if (!me) {
    return <p className="p-8 text-center text-muted-foreground">{t("memberVol.notLinked")}</p>;
  }

  const records = await prisma.volunteerHours.findMany({
    where: { memberId: me.id },
    include: {
      activity: { select: { title: true } },
      approver: { select: { fullName: true } },
    },
    orderBy: { hoursDate: "desc" },
  });

  return (
    <MemberVolunteerClient
      memberId={me.id}
      initialRecords={records.map((r) => ({
        id: r.id,
        hoursDate: r.hoursDate.toISOString().slice(0, 10),
        hours: Number(r.hours),
        section: r.section,
        description: r.description,
        approved: r.approved,
        activity: r.activity,
        approver: r.approver,
      }))}
    />
  );
}
