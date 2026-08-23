"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { usePermissions } from "@/lib/use-permissions";
import { SECTION_LABELS } from "@/lib/section";
import type { Section } from "@prisma/client";

const STATUS_ORDER = ["TODO", "IN_PROGRESS", "BLOCKED", "DONE"] as const;
type Status = typeof STATUS_ORDER[number];
const STATUS_LABELS: Record<Status, string> = {
  TODO: "للقيام بها",
  IN_PROGRESS: "قيد العمل",
  BLOCKED: "متوقف",
  DONE: "منجز",
};
const PRIORITY_LABELS: Record<string, string> = {
  LOW: "منخفضة",
  MEDIUM: "متوسطة",
  HIGH: "عالية",
  URGENT: "عاجلة",
};
const PRIORITY_COLORS: Record<string, string> = {
  LOW: "bg-slate-100 text-slate-700",
  MEDIUM: "bg-blue-100 text-blue-700",
  HIGH: "bg-orange-100 text-orange-700",
  URGENT: "bg-red-100 text-red-700",
};

type MediaTask = {
  id: string;
  title: string;
  description: string | null;
  status: Status | "CANCELLED";
  priority: string;
  dueDate: string | null;
  needsMedia: boolean;
  project: { id: string; name: string; section: Section; status: string };
  assignees: { id: string; member: { id: string; fullName: string } }[];
};

export default function MediaTasksPage() {
  const perms = usePermissions();
  const canWrite = perms.canWriteSection("MEDIA");
  const [tasks, setTasks] = useState<MediaTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);

  const load = async () => {
    setLoading(true);
    const r = await fetch("/api/media-tasks");
    if (r.status === 403) { setDenied(true); setLoading(false); return; }
    const data = await r.json();
    setTasks(Array.isArray(data) ? data : []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const updateStatus = async (id: string, status: Status) => {
    const r = await fetch(`/api/project-tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (r.ok) { toast.success("تم"); load(); }
    else toast.error("فشل");
  };

  const removeMediaTag = async (id: string) => {
    if (!confirm("إزالة الوسم الإعلامي عن هذه المهمة؟")) return;
    const r = await fetch(`/api/project-tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ needsMedia: false }),
    });
    if (r.ok) { toast.success("تم"); load(); }
  };

  if (denied) {
    return <Card><CardContent className="py-12 text-center text-muted-foreground">ليس لديك صلاحية الوصول إلى مهام القسم الإعلامي.</CardContent></Card>;
  }

  const tasksByStatus = STATUS_ORDER.reduce((acc, s) => {
    acc[s] = tasks.filter((t) => t.status === s);
    return acc;
  }, {} as Record<Status, MediaTask[]>);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">📋 لوحة المهام الإعلامية</h1>
        <p className="text-muted-foreground text-sm">
          المهام الموسومة كـ &quot;إعلامية&quot; من جميع المشاريع — تعديل الحالة هنا يحدّث المهمة في مشروعها الأصلي.
        </p>
      </div>

      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        {STATUS_ORDER.map((s) => (
          <Card key={s} className="text-center">
            <CardContent className="py-3">
              <p className="text-xs text-muted-foreground">{STATUS_LABELS[s]}</p>
              <p className="text-2xl font-bold">{tasksByStatus[s].length}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {loading ? (
        <p className="text-center py-8 text-muted-foreground">جاري التحميل...</p>
      ) : tasks.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          لا توجد مهام إعلامية بعد. وسم المهمة بـ &quot;يحتاج إلى دعم إعلامي&quot; في صفحة المشروع.
        </CardContent></Card>
      ) : (
        <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
          {STATUS_ORDER.map((s) => (
            <div key={s} className="space-y-2">
              <div className="text-sm font-bold flex items-center gap-2 px-1">
                <span>{STATUS_LABELS[s]}</span>
                <Badge variant="secondary" className="text-xs">{tasksByStatus[s].length}</Badge>
              </div>
              <div className="space-y-2">
                {tasksByStatus[s].length === 0 && (
                  <p className="text-xs text-muted-foreground italic px-1">لا شيء</p>
                )}
                {tasksByStatus[s].map((t) => (
                  <Card key={t.id} className="hover:shadow-sm transition-shadow">
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium leading-snug flex-1">{t.title}</p>
                        {canWrite && (
                          <button onClick={() => removeMediaTag(t.id)} title="إزالة الوسم الإعلامي" className="text-xs text-muted-foreground hover:text-red-600">✕</button>
                        )}
                      </div>
                      <div className="flex items-center gap-1 flex-wrap">
                        <Badge className={`text-[10px] ${PRIORITY_COLORS[t.priority] ?? ""}`}>{PRIORITY_LABELS[t.priority] ?? t.priority}</Badge>
                        {t.dueDate && <span className="text-[10px] text-muted-foreground">{t.dueDate.slice(0, 10)}</span>}
                      </div>
                      {t.assignees.length > 0 && (
                        <div className="text-[10px] text-muted-foreground line-clamp-1">
                          👥 {t.assignees.map((a) => a.member.fullName).join("، ")}
                        </div>
                      )}
                      <div className="text-[10px] text-muted-foreground border-t pt-1.5 flex items-center justify-between gap-2 flex-wrap">
                        <Link href={`/social/projects/${t.project.id}`} className="hover:underline truncate">
                          📁 {t.project.name}
                        </Link>
                        <Badge variant="outline" className="text-[9px]">{SECTION_LABELS[t.project.section]}</Badge>
                      </div>
                      {canWrite && (
                        <div className="flex gap-1 flex-wrap">
                          {STATUS_ORDER.filter((x) => x !== s).map((nextStatus) => (
                            <Button
                              key={nextStatus}
                              size="sm"
                              variant="outline"
                              className="h-6 text-[10px] flex-1"
                              onClick={() => updateStatus(t.id, nextStatus)}
                            >
                              ← {STATUS_LABELS[nextStatus]}
                            </Button>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
