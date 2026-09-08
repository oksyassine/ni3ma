import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getT } from "@/lib/i18n/server";
import { canViewGovernance } from "@/lib/rbac";
import { ZakatCalculator } from "@/components/zakat/calculator";

// Bureau-facing Zakat helper. Useful when the treasurer is recording a
// donation and wants to validate the donor's claimed amount.

export default async function BureauZakatPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (!canViewGovernance(session.user.roles)) redirect("/unauthorized");
  const { t } = await getT();

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">{t("zakat.title")}</h1>
        <p className="text-muted-foreground">{t("zakat.subtitle")}</p>
      </div>
      <ZakatCalculator />
    </div>
  );
}
