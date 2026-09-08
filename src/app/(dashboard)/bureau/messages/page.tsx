import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getT } from "@/lib/i18n/server";
import { prisma } from "@/lib/prisma";
import { canManageGovernance, canViewGovernance } from "@/lib/rbac";
import { MessagesClient } from "./client";

export default async function MessagesPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (!canViewGovernance(session.user.roles)) redirect("/unauthorized");
  const { t } = await getT();

  const [templates, recent, adultMembers] = await Promise.all([
    prisma.messageTemplate.findMany({ orderBy: { key: "asc" } }),
    prisma.messageOut.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { member: { select: { id: true, fullName: true } } },
    }),
    prisma.member.findMany({
      where: { isActive: true, memberType: "ADULT" },
      select: { id: true, fullName: true, registrationNumber: true, phone: true },
      orderBy: { registrationNumber: "asc" },
      take: 2000,
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("gov.messages.title")}</h1>
        <p className="text-muted-foreground">{t("gov.messages.subtitle")}</p>
      </div>
      <MessagesClient
        templates={templates.map((t) => ({
          id: t.id,
          key: t.key,
          name: t.name,
          channel: t.channel,
          body: t.body,
          variables: t.variables,
          isActive: t.isActive,
        }))}
        recent={recent.map((m) => ({
          id: m.id,
          status: m.status,
          channel: m.channel,
          recipientPhone: m.recipientPhone,
          recipientName: m.recipientName,
          templateKey: m.templateKey,
          body: m.body,
          cost: m.cost === null ? null : Number(m.cost),
          provider: m.provider,
          error: m.error,
          sentAt: m.sentAt?.toISOString() ?? null,
          createdAt: m.createdAt.toISOString(),
        }))}
        members={adultMembers}
        canWrite={canManageGovernance(session.user.roles)}
      />
    </div>
  );
}
