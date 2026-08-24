import { prisma } from "@/lib/prisma";
import { getT } from "@/lib/i18n/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

async function getEducationalStats() {
  const [members, programs, totalAttendance] = await Promise.all([
    prisma.member.findMany({
      where: { sections: { some: { section: "EDUCATIONAL", isActive: true } }, isActive: true },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true, registrationNumber: true, memberType: true, gender: true },
    }),
    prisma.annualProgram.findMany({
      where: { section: "EDUCATIONAL" },
      orderBy: { year: "desc" },
      take: 3,
      include: { activities: { orderBy: { activityDate: "desc" }, take: 5 } },
    }),
    prisma.attendance.count({ where: { section: "EDUCATIONAL" } }),
  ]);

  return { members, programs, totalAttendance };
}

export default async function EducationalDashboard() {
  const { members, programs, totalAttendance } = await getEducationalStats();
  const { t } = await getT();
  const maleCount = members.filter((m) => m.gender === "MALE").length;
  const femaleCount = members.filter((m) => m.gender === "FEMALE").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("educational.title")}</h1>
        <p className="text-muted-foreground">{t("educational.subtitle")}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("educational.members")}</CardTitle>
          </CardHeader>
          <CardContent><div className="text-3xl font-bold">{members.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("educational.males")}</CardTitle>
          </CardHeader>
          <CardContent><div className="text-3xl font-bold">{maleCount}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("educational.females")}</CardTitle>
          </CardHeader>
          <CardContent><div className="text-3xl font-bold">{femaleCount}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("educational.attendanceRecords")}</CardTitle>
          </CardHeader>
          <CardContent><div className="text-3xl font-bold">{totalAttendance}</div></CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("educational.sectionMembers")}</CardTitle>
          </CardHeader>
          <CardContent>
            {members.length === 0 ? (
              <p className="text-muted-foreground text-sm">{t("educational.noMembers")}</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {members.map((m) => (
                  <div key={m.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <span className="font-medium">{m.fullName}</span>
                      <span className="text-muted-foreground text-sm mr-2">#{m.registrationNumber}</span>
                    </div>
                    <Badge variant="secondary">
                      {m.memberType === "CHILD" ? t("educational.child") : t("educational.adult")}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("educational.annualPrograms")}</CardTitle>
          </CardHeader>
          <CardContent>
            {programs.length === 0 ? (
              <p className="text-muted-foreground text-sm">{t("educational.noPrograms")}</p>
            ) : (
              <div className="space-y-4">
                {programs.map((p) => (
                  <div key={p.id} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium">{p.title}</h3>
                      <Badge>{p.year}</Badge>
                    </div>
                    {p.description && <p className="text-sm text-muted-foreground">{p.description}</p>}
                    {p.activities.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {p.activities.map((a) => (
                          <p key={a.id} className="text-xs text-muted-foreground">
                            • {a.title}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
