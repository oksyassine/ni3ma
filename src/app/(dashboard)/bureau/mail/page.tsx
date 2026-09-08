import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getT } from "@/lib/i18n/server";
import { prisma } from "@/lib/prisma";
import { canManageGovernance, canViewGovernance } from "@/lib/rbac";
import { MailClient } from "./client";

export default async function MailPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (!canViewGovernance(session.user.roles)) redirect("/unauthorized");
  const { t } = await getT();

  const items = await prisma.mailItem.findMany({ orderBy: { mailDate: "desc" } });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("gov.mail.title")}</h1>
        <p className="text-muted-foreground">{t("gov.mail.subtitle")}</p>
      </div>
      <MailClient
        initial={items.map((m) => ({
          id: m.id,
          direction: m.direction,
          reference: m.reference,
          subject: m.subject,
          correspondent: m.correspondent,
          mailDate: m.mailDate.toISOString().slice(0, 10),
          channel: m.channel,
          status: m.status,
          responseDueAt: m.responseDueAt?.toISOString().slice(0, 10) ?? null,
          respondedAt: m.respondedAt?.toISOString().slice(0, 10) ?? null,
          fileUrl: m.fileUrl,
          notes: m.notes,
          createdAt: m.createdAt.toISOString(),
        }))}
        canWrite={canManageGovernance(session.user.roles)}
      />
    </div>
  );
}
