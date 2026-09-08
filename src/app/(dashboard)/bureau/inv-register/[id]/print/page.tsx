import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import { prisma } from "@/lib/prisma";
import { canViewGovernance } from "@/lib/rbac";
import { normalizeHost, getTenantRecordForHost } from "@/lib/tenants";
import { PrintButton } from "../../../paperwork/print-button";
import { DocFooter, DocHeader, DocSheet } from "../../../paperwork/doc-shell";

// Printable annual inventory register (registre d'inventaire) —
// mandatory document for any Moroccan association that received
// > 10 000 MAD of public funds (art. 32 ter Dahir 1-58-376).
export default async function InvRegisterPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");
  if (!canViewGovernance(session.user.roles)) redirect("/unauthorized");
  const { t, locale } = await getT();
  const dir = locale === "fr" ? "ltr" : "rtl";
  const { id } = await params;

  const [register, assets, associationInfo, tenant] = await Promise.all([
    prisma.inventoryRegister.findUnique({
      where: { id },
      include: { closedByUser: { select: { id: true, fullName: true } } },
    }),
    prisma.asset.findMany({ orderBy: [{ category: "asc" }, { createdAt: "asc" }] }),
    prisma.associationInfo.findFirst(),
    associationNameFromHost(),
  ]);
  if (!register) {
    return (
      <div className="py-16 text-center">
        <Link href="/bureau/inv-register" className="text-primary underline">← {t("gov.paperwork.backToHub")}</Link>
      </div>
    );
  }
  const name = associationInfo?.name ?? tenant?.name ?? "جمعية النعمة";
  const totalValue = assets.reduce((s, a) => s + (a.value ? Number(a.value) * a.quantity : 0), 0);
  const today = new Date().toLocaleDateString(locale, { dateStyle: "long" });

  // Group by category for readability
  const grouped = new Map<string, typeof assets>();
  for (const a of assets) {
    const cat = a.category ?? "OTHER";
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push(a);
  }

  return (
    <div className="py-4">
      <PrintButton />
      <DocSheet>
        <DocHeader associationName={name} city={associationInfo?.city} />
        <h1 className="mt-6 text-center text-xl font-extrabold underline" dir={dir}>
          {t("gov.invRegister.title")} — {register.yearLabel}
        </h1>
        <p className="mt-1 text-center text-xs text-muted-foreground" dir="auto">
          📅 {new Date(register.snapshotAt.getTime() + 43_200_000).toLocaleDateString(locale, { dateStyle: "long" })}
        </p>

        <table className="mt-6 w-full border-collapse text-xs" dir={dir}>
          <thead>
            <tr>
              <th className="w-8 border border-black p-1.5">#</th>
              <th className="border border-black p-1.5">{t("gov.assets.name")}</th>
              <th className="w-20 border border-black p-1.5">{t("gov.assets.category")}</th>
              <th className="w-14 border border-black p-1.5">{t("gov.assets.quantity")}</th>
              <th className="w-20 border border-black p-1.5">{t("gov.assets.value")}</th>
              <th className="w-20 border border-black p-1.5">{t("gov.assets.location")}</th>
              <th className="w-20 border border-black p-1.5">{t("gov.assets.condition")}</th>
            </tr>
          </thead>
          <tbody>
            {Array.from(grouped.entries()).map(([cat, items]) => (
              <>
                <tr key={`cat-${cat}`}>
                  <td colSpan={7} className="border border-black bg-black/5 p-1 font-bold">
                    {t(`gov.assetCondition.${cat === "GOOD" || cat === "NEEDS_REPAIR" || cat === "OUT_OF_SERVICE" ? cat : "OTHER"}`)}
                  </td>
                </tr>
                {items.map((a, i) => (
                  <tr key={a.id}>
                    <td className="border border-black p-1.5 text-center">{i + 1}</td>
                    <td className="border border-black p-1.5" dir="auto">{a.name}</td>
                    <td className="border border-black p-1.5" dir="auto">{a.category ?? "—"}</td>
                    <td className="border border-black p-1.5 text-center">{a.quantity}</td>
                    <td className="border border-black p-1.5" dir="ltr">
                      {a.value === null ? "—" : `${Number(a.value).toLocaleString(locale)} × ${a.quantity} = ${(Number(a.value) * a.quantity).toLocaleString(locale)}`}
                    </td>
                    <td className="border border-black p-1.5" dir="auto">{a.location ?? "—"}</td>
                    <td className="border border-black p-1.5 text-center">
                      {t(`gov.assetCondition.${a.condition}`)}
                    </td>
                  </tr>
                ))}
              </>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4} className="border border-black p-2 text-end font-bold">
                {t("gov.invRegister.totalValue")}
              </td>
              <td colSpan={3} className="border border-black p-2 font-bold" dir="ltr">
                {totalValue.toLocaleString(locale, { maximumFractionDigits: 2 })} MAD
              </td>
            </tr>
          </tfoot>
        </table>

        <p className="mt-8 text-sm text-muted-foreground" dir="auto">
          {t("gov.paperwork.certCityLine", {
            city: associationInfo?.city ?? "—",
            date: today,
          })}
        </p>

        {register.closedAt && register.closedByUser && (
          <p className="mt-2 text-sm text-muted-foreground" dir="auto">
            {t("gov.invRegister.closedAt")}: {new Date(register.closedAt).toLocaleDateString(locale, { dateStyle: "long" })} · {register.closedByUser.fullName}
          </p>
        )}

        <DocFooter left={t("gov.paperwork.signaturePresident")} right="" />
      </DocSheet>
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
