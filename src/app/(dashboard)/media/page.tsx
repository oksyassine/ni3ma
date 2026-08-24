import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getT } from "@/lib/i18n/server";

export default async function MediaDashboard() {
  const { t } = await getT();
  const members = await prisma.member.findMany({
    where: { sections: { some: { section: "MEDIA", isActive: true } }, isActive: true },
    orderBy: { fullName: "asc" },
    select: { id: true, fullName: true, registrationNumber: true, memberType: true, gender: true },
  });
  const maleCount = members.filter((m) => m.gender === "MALE").length;
  const femaleCount = members.filter((m) => m.gender === "FEMALE").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("media.title")}</h1>
        <p className="text-muted-foreground">{t("media.subtitle")}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{t("media.members")}</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold">{members.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{t("media.males")}</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold">{maleCount}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{t("media.females")}</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold">{femaleCount}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">{t("media.inSection")}</CardTitle></CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("media.empty")}</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {members.map((m) => (
                <div key={m.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <span className="font-medium">{m.fullName}</span>
                    <span className="text-muted-foreground text-sm mr-2">#{m.registrationNumber}</span>
                  </div>
                  <Badge variant="secondary">{m.memberType === "CHILD" ? t("media.child") : t("media.adult")}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
