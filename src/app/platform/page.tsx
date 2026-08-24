import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { normalizeHost, rootDomain } from "@/lib/tenants";
import { redirect } from "next/navigation";
import { control } from "@/lib/tenants";
import { PlatformTenantsTable } from "./table";
import { getT } from "@/lib/i18n/server";

// Control panel for the PLATFORM OWNER. Only reachable when:
//  1. the request host is the root domain (not a tenant subdomain), and
//  2. the signed-in user holds the ADMIN role in the platform database.
export default async function PlatformPage() {
  const session = await auth();
  if (!session) redirect("/login");
  const h = await headers();
  const host = normalizeHost(h.get("host"));
  if (!host || !host.endsWith(rootDomain())) redirect("/unauthorized");
  if (!(session.user.roles as string[]).includes("ADMIN")) redirect("/unauthorized");
  const { t } = await getT();

  const tenants = await control.tenant.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true, name: true, slug: true, city: true, plan: true, status: true,
      contactName: true, contactPhone: true, contactEmail: true,
      trialEndsAt: true, currentPeriodEnd: true,
      lastProvisionError: true, createdAt: true,
    },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-extrabold">{t("platform.title")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t("platform.subtitle")}</p>
      <PlatformTenantsTable
        initial={tenants.map((t) => ({
          ...t,
          createdAt: t.createdAt.toISOString(),
          trialEndsAt: t.trialEndsAt?.toISOString() ?? null,
          currentPeriodEnd: t.currentPeriodEnd?.toISOString() ?? null,
        }))}
      />
    </div>
  );
}
