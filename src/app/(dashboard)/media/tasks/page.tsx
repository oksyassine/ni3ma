"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { usePermissions } from "@/lib/use-permissions";
import { SECTION_LABELS } from "@/lib/section";
import { useT } from "@/components/i18n/provider";
import type { Section } from "@prisma/client";

const STATUS_ORDER = ["TODO", "IN_PROGRESS", "BLOCKED", "DONE"] as const;
type Status = typeof STATUS_ORDER[number];
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
  const { t } = useT();
  const perms = usePermissions();
  const canWrite = perms.canWriteSection("MEDIA");
  const statusLabels: Record<Status, string> = {
    TODO: t("mediaTasks.status.todo"),
    IN_PROGRESS: t("mediaTasks.status.inProgress"),
    BLOCKED: t("mediaTasks.status.blocked"),
    DONE: t("mediaTasks.status.done"),
  };
  const priorityLabels: Record<string, string> = {
    LOW: t("mediaTasks.priority.low"),
    MEDIUM: t("mediaTasks.priority.medium"),
    HIGH: t("mediaTasks.priority.high"),
    URGENT: t("mediaTasks.priority.urgent"),
  };
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
    if (r.ok) { toast.success(t("misc.done")); load(); }
    else toast.error(t("misc.failed"));
  };

  const removeMediaTag = async (id: string) => {
    if (!confirm(t("mediaTasks.removeMediaConfirm"))) return;
    const r = await fetch(`/api/project-tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ needsMedia: false }),
    });
    if (r.ok) { toast.success(t("misc.done")); load(); }
  };

  if (denied) {
    return <Card><CardContent className="py-12 text-center text-muted-foreground">{t("mediaTasks.denied")}</CardContent></Card>;
  }

  const tasksByStatus = STATUS_ORDER.reduce((acc, s) => {
    acc[s] = tasks.filter((task) => task.status === s);
    return acc;
  }, {} as Record<Status, MediaTask[]>);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">📋 {t("mediaTasks.title")}</h1>
        <p className="text-muted-foreground text-sm">
          {t("mediaTasks.subtitle")}
        </p>
      </div>

      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        {STATUS_ORDER.map((s) => (
          <Card key={s} className="text-center">
            <CardContent className="py-3">
              <p className="text-xs text-muted-foreground">{statusLabels[s]}</p>
              <p className="text-2xl font-bold">{tasksByStatus[s].length}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {loading ? (
        <p className="text-center py-8 text-muted-foreground">{t("misc.loading")}</p>
      ) : tasks.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          {t("mediaTasks.empty")}
        </CardContent></Card>
      ) : (
        <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
          {STATUS_ORDER.map((s) => (
            <div key={s} className="space-y-2">
              <div className="text-sm font-bold flex items-center gap-2 px-1">
                <span>{statusLabels[s]}</span>
                <Badge variant="secondary" className="text-xs">{tasksByStatus[s].length}</Badge>
              </div>
              <div className="space-y-2">
                {tasksByStatus[s].length === 0 && (
                  <p className="text-xs text-muted-foreground italic px-1">{t("mediaTasks.none")}</p>
                )}
                {tasksByStatus[s].map((task) => (
                  <Card key={task.id} className="hover:shadow-sm transition-shadow">
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium leading-snug flex-1">{task.title}</p>
                        {canWrite && (
                          <button onClick={() => removeMediaTag(task.id)} title={t("mediaTasks.removeMediaTag")} className="text-xs text-muted-foreground hover:text-red-600">✕</button>
                        )}
                      </div>
                      <div className="flex items-center gap-1 flex-wrap">
                        <Badge className={`text-[10px] ${PRIORITY_COLORS[task.priority] ?? ""}`}>{priorityLabels[task.priority] ?? task.priority}</Badge>
                        {task.dueDate && <span className="text-[10px] text-muted-foreground">{task.dueDate.slice(0, 10)}</span>}
                      </div>
                      {task.assignees.length > 0 && (
                        <div className="text-[10px] text-muted-foreground line-clamp-1">
                          👥 {task.assignees.map((a) => a.member.fullName).join("، ")}
                        </div>
                      )}
                      <div className="text-[10px] text-muted-foreground border-t pt-1.5 flex items-center justify-between gap-2 flex-wrap">
                        <Link href={`/social/projects/${task.project.id}`} className="hover:underline truncate">
                          📁 {task.project.name}
                        </Link>
                        <Badge variant="outline" className="text-[9px]">{SECTION_LABELS[task.project.section]}</Badge>
                      </div>
                      {canWrite && (
                        <div className="flex gap-1 flex-wrap">
                          {STATUS_ORDER.filter((x) => x !== s).map((nextStatus) => (
                            <Button
                              key={nextStatus}
                              size="sm"
                              variant="outline"
                              className="h-6 text-[10px] flex-1"
                              onClick={() => updateStatus(task.id, nextStatus)}
                            >
                              ← {statusLabels[nextStatus]}
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
