import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getT } from "@/lib/i18n/server";
import { prisma } from "@/lib/prisma";
import { canManageGovernance, canViewGovernance } from "@/lib/rbac";
import { DocumentsClient } from "./client";

export default async function DocumentsPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (!canViewGovernance(session.user.roles)) redirect("/unauthorized");
  const { t } = await getT();

  const documents = await prisma.officialDocument.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("gov.documents.title")}</h1>
        <p className="text-muted-foreground">{t("gov.documents.subtitle")}</p>
      </div>
      <DocumentsClient
        initial={documents.map((d) => ({
          id: d.id,
          kind: d.kind,
          title: d.title,
          reference: d.reference,
          issuedAt: d.issuedAt?.toISOString().slice(0, 10) ?? null,
          expiresAt: d.expiresAt?.toISOString().slice(0, 10) ?? null,
          reminderDays: d.reminderDays,
          fileUrl: d.fileUrl,
          notes: d.notes,
        }))}
        canWrite={canManageGovernance(session.user.roles)}
      />
    </div>
  );
}
