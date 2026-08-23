import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import Image from "next/image";

export default async function PublicProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug: rawSlug } = await params;
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
  if (!project) return notFound();

  const cashCollected = project.donations.filter((d) => d.isPaid).reduce((s, d) => s + Number(d.amount), 0);
  const cashPledged = project.donations.filter((d) => !d.isPaid).reduce((s, d) => s + Number(d.amount), 0);
  const inKindEstimated = project.inKindDonations.reduce((s, d) => s + Number(d.estimatedValue ?? 0), 0);
  const totalCollected = cashCollected + inKindEstimated;
  const target = project.targetAmount ? Number(project.targetAmount) : 0;
  const pct = target === 0 ? 0 : Math.min(100, (totalCollected / target) * 100);

  const association = await prisma.associationInfo.findUnique({ where: { id: 1 } });

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white dark:from-emerald-950/20 dark:to-background">
      <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
        {/* Header */}
        <header className="text-center space-y-2 pt-4">
          <div className="flex items-center justify-center gap-2">
            <Image src="/logo.jpg" alt="logo" width={48} height={48} className="rounded-lg" />
            <h2 className="text-lg font-bold">{association?.name ?? "جمعية النعمة"}</h2>
          </div>
          <Badge variant="outline" className="text-xs">{project.kind === "NACHAT" ? "نشاط" : "مشروع"}</Badge>
        </header>

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
                  <h3 className="font-bold">جمع التبرعات</h3>
                  <span className="text-2xl font-bold text-emerald-600">{totalCollected.toFixed(0)} د.م</span>
                </div>
                <Progress value={pct} indicatorClassName="bg-emerald-600" className="h-3" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{pct.toFixed(0)}% من الهدف</span>
                  <span>الهدف: {target.toFixed(0)} د.م</span>
                </div>
                {cashPledged > 0 && <p className="text-xs text-amber-700">+ {cashPledged.toFixed(0)} د.م تبرعات موعودة</p>}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-3 border-t text-sm">
              {project.location && <div><p className="text-xs text-muted-foreground">المكان</p><p className="font-medium">{project.location}</p></div>}
              {project.expectedBeneficiaries && <div><p className="text-xs text-muted-foreground">المستفيدون المتوقعون</p><p className="font-medium">{project.expectedBeneficiaries}</p></div>}
              {project.partners && <div><p className="text-xs text-muted-foreground">الشركاء</p><p className="font-medium">{project.partners}</p></div>}
              {project.startDate && <div><p className="text-xs text-muted-foreground">التاريخ</p><p className="font-medium">{project.startDate.toISOString().slice(0, 10)}</p></div>}
            </div>
          </CardContent>
        </Card>

        {/* How to donate */}
        <Card>
          <CardContent className="py-6 space-y-3">
            <h2 className="text-xl font-bold">كيف تتبرّع؟</h2>
            <p className="text-sm">
              تواصل مع الجمعية مباشرة:
              {association?.phone && <> <a href={`tel:${association.phone}`} className="text-emerald-600 underline" dir="ltr">{association.phone}</a></>}
              {association?.phone && <> أو على </>}
              {association?.phone && <a href={`https://wa.me/${association.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="text-emerald-600 underline">واتساب</a>}
            </p>
            {association?.address && <p className="text-sm text-muted-foreground">العنوان: {association.address}, {association.city}</p>}
            {association?.facebookUrl && (
              <a href={association.facebookUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-emerald-600 underline">📘 صفحة الجمعية</a>
            )}
          </CardContent>
        </Card>

        {/* Photos */}
        {project.photos.length > 0 && (
          <div>
            <h2 className="text-xl font-bold mb-3">صور</h2>
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
          <p>{association?.name ?? "جمعية النعمة"} · {association?.city ?? "مكناس"}</p>
          {association?.cndpRegistration && <p className="text-[10px] mt-1">CNDP: {association.cndpRegistration}</p>}
        </footer>
      </div>
    </div>
  );
}
