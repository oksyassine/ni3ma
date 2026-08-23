import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function MediaDashboard() {
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
        <h1 className="text-2xl font-bold">القسم الإعلامي</h1>
        <p className="text-muted-foreground">إدارة المنخرطين في القسم الإعلامي</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">المنخرطين</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold">{members.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">ذكور</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold">{maleCount}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">إناث</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold">{femaleCount}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">المنخرطين في القسم</CardTitle></CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <p className="text-muted-foreground text-sm">لا يوجد منخرطين في هذا القسم</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {members.map((m) => (
                <div key={m.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <span className="font-medium">{m.fullName}</span>
                    <span className="text-muted-foreground text-sm mr-2">#{m.registrationNumber}</span>
                  </div>
                  <Badge variant="secondary">{m.memberType === "CHILD" ? "طفل" : "كبير"}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
