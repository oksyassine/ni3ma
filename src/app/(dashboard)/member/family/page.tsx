import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HIFZ_GRADE_LABELS, HIFZ_GRADE_COLORS } from "@/lib/quran";
import { getT } from "@/lib/i18n/server";
import { Calendar, BookOpen, Coins, CalendarCheck } from "lucide-react";
import Link from "next/link";

export default async function FamilyPage() {
  const session = await auth();
  if (!session) redirect("/login");
  const { t } = await getT();

  // Find this user's member row to use as the parent
  const me = await prisma.member.findFirst({
    where: { OR: [{ id: session.user.id }, { username: session.user.username }] },
    select: { id: true },
  });
  if (!me) {
    return <p className="p-8 text-center text-muted-foreground">{t("memberVol.notLinked")}</p>;
  }

  const links = await prisma.familyLink.findMany({
    where: { parentId: me.id },
    include: {
      child: {
        include: {
          attendance: { take: 5, orderBy: { date: "desc" } },
          contributions: { take: 5, orderBy: { weekStart: "desc" } },
          quranProgress: { take: 3, orderBy: { recitationDate: "desc" } },
        },
      },
    },
  });

  if (links.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">{t("family.title")}</h1>
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {t("family.empty")}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("family.title")}</h1>
        <p className="text-muted-foreground">{t("family.subtitle")}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {links.map((l) => {
          const c = l.child;
          const attendanceRate = c.attendance.length > 0
            ? Math.round((c.attendance.filter((a) => a.isPresent).length / c.attendance.length) * 100)
            : null;
          return (
            <Card key={l.id}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  {c.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.photoUrl} alt={c.fullName} className="w-14 h-14 rounded-full object-cover" />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center text-2xl">👦</div>
                  )}
                  <div>
                    <CardTitle className="text-lg">{c.fullName}</CardTitle>
                    <p className="text-xs text-muted-foreground">{t("family.regNumber", { number: c.registrationNumber })}{l.relation ? ` · ${l.relation}` : ""}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {attendanceRate !== null && (
                  <div className="flex items-center gap-2">
                    <CalendarCheck size={16} className="text-muted-foreground" />
                    <span className="text-sm">{t("family.attendanceRate", { count: c.attendance.length })}</span>
                    <Badge variant={attendanceRate >= 70 ? "default" : "outline"}>{attendanceRate}%</Badge>
                  </div>
                )}

                {c.quranProgress.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold flex items-center gap-1 mb-2">
                      <BookOpen size={14} />{t("family.recentRecitations")}
                    </h4>
                    <div className="space-y-1">
                      {c.quranProgress.map((q) => (
                        <div key={q.id} className="text-xs flex items-center gap-2">
                          <span className="text-muted-foreground">{q.recitationDate.toISOString().slice(0, 10)}</span>
                          {q.currentSurah && <Badge variant="outline" className="text-[10px]">{q.currentSurah}</Badge>}
                          {q.hifzGrade && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${HIFZ_GRADE_COLORS[q.hifzGrade]}`}>
                              {HIFZ_GRADE_LABELS[q.hifzGrade]}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {c.contributions.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold flex items-center gap-1 mb-2">
                      <Coins size={14} />{t("family.recentContributions")}
                    </h4>
                    <div className="space-y-1">
                      {c.contributions.map((co) => (
                        <div key={co.id} className="text-xs flex items-center justify-between">
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Calendar size={11} />{co.weekStart.toISOString().slice(0, 10)}
                          </span>
                          <span className="font-mono">{Number(co.amount).toFixed(2)} {t("bureau.currencyMad")}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Link href={`/admin/members/${c.id}`} className="text-xs text-primary hover:underline">
                  {t("family.viewProfile")}
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
