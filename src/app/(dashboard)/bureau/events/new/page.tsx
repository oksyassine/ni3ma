import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getT } from "@/lib/i18n/server";
import { canManageGovernance } from "@/lib/rbac";
import { CreateEventForm } from "./form";

export default async function NewEventPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (!canManageGovernance(session.user.roles)) redirect("/unauthorized");
  const { t } = await getT();

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">{t("gov.events.create")}</h1>
      </div>
      <CreateEventForm />
    </div>
  );
}
