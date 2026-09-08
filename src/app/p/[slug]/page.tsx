import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import Image from "next/image";
import { getT } from "@/lib/i18n/server";
import { fmtMoney } from "@/lib/i18n/format";

export default async function PublicProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug: rawSlug } = await params;
  const { t, locale } = await getT();
  // Defensive: handle both URL-encoded (e.g. %D8%B9...) and decoded (عيد) forms
  let slug = rawSlug;
  try {
    const decoded = decodeURIComponent(rawSlug);
    if (decoded !== rawSlug) slug = decoded;
  } catch {
    // not URI-encoded, use as-is
  }

  const project = await prisma.socialProject.findFirst({
    where: { slug, isPublic: true },
    include: {
      photos: { orderBy: { createdAt: "desc" }, take: 12 },
      donations: { select: { amount: true, isPaid: true } },
      inKindDonations: { select: { estimatedValue: true } },
    },
  });
  // DonationCampaign shares the slug space: if there's a public campaign
  // with the same slug, surface it on top of the project list (rare case
  // where both exist for the same slug, project wins as primary content).
  const campaign = await prisma.donationCampaign.findFirst({
    where: { slug, isPublic: true, isClosed: false },
    include: { donations: { where: { isPaid: true }, select: { amount: true } } },
  });
  if (!project && !campaign) return notFound();

  const association = await prisma.associationInfo.findUnique({ where: { id: 1 } });

  // If only a campaign matched, render a campaign-only page.
  if (!project && campaign) {
    const cRaised = campaign.donations.reduce((s, d) => s + Number(d.amount), 0);
    const cTarget = campaign.targetAmount ? Number(campaign.targetAmount) : 0;
    const cPct = cTarget === 0 ? 0 : Math.min(100, (cRaised / cTarget) * 100);
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white dark:from-emerald-950/20 dark:to-background">
        <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
          <header className="text-center space-y-2 pt-4">
            <div className="flex items-center justify-center gap-2">
              <Image src="/logo.jpg" alt="logo" width={48} height={48} className="rounded-lg" />
              <h2 className="text-lg font-bold">{association?.name ?? t("social.defaultAssocName")}</h2>
            </div>
          </header>
          <Card>
            <CardContent className="p-6 space-y-3">
              <Badge variant="outline">{t("gov.campaigns.title")}</Badge>
              <h1 className="text-3xl font-extrabold">{campaign.name}</h1>
              {campaign.description && <p className="text-muted-foreground">{campaign.description}</p>}
              {cTarget > 0 && (
                <>
                  <div className="flex justify-between text-sm font-medium">
                    <span>{cRaised.toLocaleString()} MAD</span>
                    <span>{cTarget.toLocaleString()} MAD</span>
                  </div>
                  <Progress value={cPct} className="h-2" />
                </>
              )}
              <p className="pt-3 text-sm text-muted-foreground">
                {t("social.donateInstructions")}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
  if (!project) return notFound();
  // Fall through: project content is rendered below.

  // Project-scoped aggregations (TS narrows project to non-null here).
  const cashCollected = project.donations.filter((d) => d.isPaid).reduce((s, d) => s + Number(d.amount), 0);
  const cashPledged = project.donations.filter((d) => !d.isPaid).reduce((s, d) => s + Number(d.amount), 0);
  const inKindEstimated = project.inKindDonations.reduce((s, d) => s + Number(d.estimatedValue ?? 0), 0);
  const totalCollected = cashCollected + inKindEstimated;
  const target = project.targetAmount ? Number(project.targetAmount) : 0;
  const pct = target === 0 ? 0 : Math.min(100, (totalCollected / target) * 100);

  // If a campaign also matches the same slug, show a banner above the project.
  const campaignForBanner = campaign;
  const cRaised = campaignForBanner?.donations.reduce((s, d) => s + Number(d.amount), 0) ?? 0;
  const cTarget = campaignForBanner?.targetAmount ? Number(campaignForBanner.targetAmount) : 0;
  const cPct = cTarget === 0 ? 0 : Math.min(100, (cRaised / cTarget) * 100);

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white dark:from-emerald-950/20 dark:to-background">
      <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
        {/* Header */}
        <header className="text-center space-y-2 pt-4">
          <div className="flex items-center justify-center gap-2">
            <Image src="/logo.jpg" alt="logo" width={48} height={48} className="rounded-lg" />
            <h2 className="text-lg font-bold">{association?.name ?? t("social.defaultAssocName")}</h2>
          </div>
          <Badge variant="outline" className="text-xs">{project.kind === "NACHAT" ? t("social.kindActivity") : t("social.kindProject")}</Badge>
        </header>

        {project.coverPhotoUrl && (
          <div className="rounded-xl overflow-hidden">
            <img src={project.coverPhotoUrl} alt={project.name} className="w-full h-64 object-cover" />
          </div>
        )}

        {campaignForBanner && (
          <Card className="border-emerald-300 bg-emerald-50/40">
            <CardContent className="p-5 space-y-2">
              <Badge className="bg-emerald-600">{t("gov.campaigns.title")}</Badge>
              <h2 className="text-xl font-bold">{campaignForBanner.name}</h2>
              {campaignForBanner.description && <p className="text-sm text-muted-foreground">{campaignForBanner.description}</p>}
              {cTarget > 0 && (
                <>
                  <div className="flex justify-between text-xs font-medium">
                    <span>{cRaised.toLocaleString()} MAD</span>
                    <span>{cTarget.toLocaleString()} MAD</span>
                  </div>
                  <Progress value={cPct} className="h-2" />
                </>
              )}
            </CardContent>
          </Card>
        )}
        {project.coverPhotoUrl && (
          <div className="rounded-xl overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={project.coverPhotoUrl} alt={project.name} className="w-full h-64 object-cover" />
          </div>
        )}

        <Card>
          <CardContent className="py-6 space-y-4">
            <h1 className="text-3xl font-bold">{project.name}</h1>
            {project.objective && <p className="text-lg text-muted-foreground">{project.objective}</p>}
            {project.description && <p>{project.description}</p>}

            {target > 0 && (
              <div className="space-y-2 pt-3 border-t">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold">{t("social.donationCollection")}</h3>
                  <span className="text-2xl font-bold text-emerald-600">{fmtMoney(totalCollected, locale, 0)} {t("social.mad")}</span>
                </div>
                <Progress value={pct} indicatorClassName="bg-emerald-600" className="h-3" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{t("social.pctOfGoal", { pct: fmtMoney(pct, locale, 0) })}</span>
                  <span>{t("social.goalLabel")}: {fmtMoney(target, locale, 0)} {t("social.mad")}</span>
                </div>
                {cashPledged > 0 && <p className="text-xs text-amber-700">{t("social.pledgedDonations", { amount: `${fmtMoney(cashPledged, locale, 0)} ${t("social.mad")}` })}</p>}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-3 border-t text-sm">
              {project.location && <div><p className="text-xs text-muted-foreground">{t("social.locationLabel")}</p><p className="font-medium">{project.location}</p></div>}
              {project.expectedBeneficiaries && <div><p className="text-xs text-muted-foreground">{t("social.expectedBeneficiariesList")}</p><p className="font-medium">{project.expectedBeneficiaries}</p></div>}
              {project.partners && <div><p className="text-xs text-muted-foreground">{t("social.partnersLabel")}</p><p className="font-medium">{project.partners}</p></div>}
              {project.startDate && <div><p className="text-xs text-muted-foreground">{t("common.date")}</p><p className="font-medium">{project.startDate.toISOString().slice(0, 10)}</p></div>}
            </div>
          </CardContent>
        </Card>

        {/* How to donate */}
        <Card>
          <CardContent className="py-6 space-y-3">
            <h2 className="text-xl font-bold">{t("social.howToDonateTitle")}</h2>
            <p className="text-sm">
              {t("social.contactAssociation")}
              {association?.phone && <> <a href={`tel:${association.phone}`} className="text-emerald-600 underline" dir="ltr">{association.phone}</a></>}
              {association?.phone && <> {t("social.orOn")} </>}
              {association?.phone && <a href={`https://wa.me/${association.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="text-emerald-600 underline">{t("social.whatsappLink")}</a>}
            </p>
            {association?.address && <p className="text-sm text-muted-foreground">{t("social.addressValue", { address: association.address, city: association.city ?? "" })}</p>}
            {association?.facebookUrl && (
              <a href={association.facebookUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-emerald-600 underline">{t("social.assocPageLink")}</a>
            )}
          </CardContent>
        </Card>

        {/* Photos */}
        {project.photos.length > 0 && (
          <div>
            <h2 className="text-xl font-bold mb-3">{t("social.photosTitle")}</h2>
            <div className="grid gap-2 grid-cols-2 md:grid-cols-3">
              {project.photos.map((ph) => (
                <div key={ph.id} className="rounded-lg overflow-hidden border bg-card">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={ph.url} alt={ph.caption ?? ""} className="w-full h-40 object-cover" />
                  {ph.caption && <p className="p-2 text-xs">{ph.caption}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        <footer className="text-center text-xs text-muted-foreground py-6">
          <p>{association?.name ?? t("social.defaultAssocName")} · {association?.city ?? t("social.defaultCity")}</p>
          {association?.cndpRegistration && <p className="text-[10px] mt-1">CNDP: {association.cndpRegistration}</p>}
        </footer>
      </div>
    </div>
  );
}
