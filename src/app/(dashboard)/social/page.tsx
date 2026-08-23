import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Target, BarChart3, ClipboardList, CalendarCheck, ArrowLeft } from "lucide-react";

async function getSocialStats() {
  const [members, projects, totalDonations, programs] = await Promise.all([
    prisma.member.findMany({
      where: { sections: { some: { section: "SOCIAL", isActive: true } }, isActive: true },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true, registrationNumber: true, memberType: true },
    }),
    prisma.socialProject.findMany({
      orderBy: { createdAt: "desc" },
      include: { donations: { select: { amount: true } } },
    }),
    prisma.donation.aggregate({ where: { section: "SOCIAL" }, _sum: { amount: true } }),
    prisma.annualProgram.findMany({
      where: { section: "SOCIAL" },
      orderBy: { year: "desc" },
      take: 3,
    }),
  ]);

  return {
    members,
    projects: projects.map((p) => ({
      ...p,
      collected: p.donations.reduce((s, d) => s + Number(d.amount), 0),
    })),
    totalDonations: Number(totalDonations._sum.amount ?? 0),
    programs,
  };
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "نشط",
  COMPLETED: "مكتمل",
  CANCELLED: "ملغى",
};

export default async function SocialDashboard() {
  const { members, projects, totalDonations, programs } = await getSocialStats();
  const activeProjects = projects.filter((p) => p.status === "ACTIVE");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">القسم الاجتماعي</h1>
        <p className="text-muted-foreground">إدارة المشاريع الاجتماعية والتبرعات</p>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">المنخرطون</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold">{members.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">المشاريع النشطة</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold">{activeProjects.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">إجمالي المشاريع</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold">{projects.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">التبرعات</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-green-600">{totalDonations.toFixed(2)} د.م</div></CardContent>
        </Card>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Link href="/social/projects">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardContent className="py-4 flex items-center gap-3">
              <Target size={22} className="text-primary" />
              <div>
                <p className="font-medium">المشاريع والأنشطة</p>
                <p className="text-xs text-muted-foreground">إدارة كاملة + خطط + مهام</p>
              </div>
              <ArrowLeft size={14} className="ms-auto text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
        <Link href="/social/programs">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardContent className="py-4 flex items-center gap-3">
              <ClipboardList size={22} className="text-primary" />
              <div>
                <p className="font-medium">البرامج السنوية</p>
                <p className="text-xs text-muted-foreground">برامج وأنشطة دورية</p>
              </div>
              <ArrowLeft size={14} className="ms-auto text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
        <Link href="/social/attendance">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardContent className="py-4 flex items-center gap-3">
              <CalendarCheck size={22} className="text-primary" />
              <div>
                <p className="font-medium">الحضور</p>
                <p className="text-xs text-muted-foreground">تسجيل حضور المنخرطين</p>
              </div>
              <ArrowLeft size={14} className="ms-auto text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
        <Link href="/social/analytics">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardContent className="py-4 flex items-center gap-3">
              <BarChart3 size={22} className="text-primary" />
              <div>
                <p className="font-medium">التحليلات</p>
                <p className="text-xs text-muted-foreground">إحصائيات تنفيذ المشاريع</p>
              </div>
              <ArrowLeft size={14} className="ms-auto text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">المشاريع الاجتماعية</CardTitle>
          </CardHeader>
          <CardContent>
            {projects.length === 0 ? (
              <p className="text-muted-foreground text-sm">لا توجد مشاريع مسجلة</p>
            ) : (
              <div className="space-y-3">
                {projects.map((p) => (
                  <Link key={p.id} href={`/social/projects/${p.id}`} className="block">
                    <div className="border rounded-lg p-3 hover:bg-muted/30 transition-colors">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-medium">{p.name}</h3>
                        <Badge variant={p.status === "ACTIVE" ? "default" : "secondary"}>
                          {STATUS_LABELS[p.status]}
                        </Badge>
                      </div>
                      {p.description && <p className="text-sm text-muted-foreground mb-2 line-clamp-1">{p.description}</p>}
                      {p.targetAmount && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">المجموع: </span>
                          <span className="font-medium">{p.collected.toFixed(2)}</span>
                          <span className="text-muted-foreground"> / {Number(p.targetAmount).toFixed(2)} د.م</span>
                          <Progress
                            value={Math.min(100, (p.collected / Number(p.targetAmount)) * 100)}
                            indicatorClassName="bg-green-600"
                            className="mt-1"
                          />
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">المنخرطين في القسم</CardTitle>
          </CardHeader>
          <CardContent>
            {members.length === 0 ? (
              <p className="text-muted-foreground text-sm">لا يوجد منخرطين</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {members.map((m) => (
                  <div key={m.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <span className="font-medium">{m.fullName}</span>
                    <span className="text-muted-foreground text-sm">#{m.registrationNumber}</span>
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
