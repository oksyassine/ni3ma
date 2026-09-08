"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePermissions } from "@/lib/use-permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import type { ProjectKind, ProjectStatus } from "@prisma/client";
import {
  PROJECT_KIND_LABELS,
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_VARIANT,
} from "@/lib/project";
import { Plus, Calendar, MapPin, Users, ChevronDown, Target, ListChecks } from "lucide-react";
import { useT } from "@/components/i18n/provider";
import { fmtMoney } from "@/lib/i18n/format";

type Project = {
  id: string;
  name: string;
  kind: ProjectKind;
  description: string | null;
  objective: string | null;
  startDate: string | null;
  endDate: string | null;
  location: string | null;
  status: ProjectStatus;
  targetAmount: string | null;
  expectedBeneficiaries: number | null;
  summary: {
    cashCollected: number;
    inKindEstimated: number;
    totalCollected: number;
    tasksTotal: number;
    tasksDone: number;
    progressPct: number | null;
  };
};

const initial = {
  name: "",
  kind: "MACHROO3" as ProjectKind,
  description: "",
  objective: "",
  targetAudience: "",
  expectedBeneficiaries: "",
  location: "",
  partners: "",
  targetAmount: "",
  startDate: "",
  endDate: "",
};

export function ProjectsListClient() {
  const { t, locale } = useT();
  const router = useRouter();
  const perms = usePermissions();
  const canWrite = perms.canWriteSection("SOCIAL");
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterKind, setFilterKind] = useState<"" | ProjectKind>("");
  const [filterStatus, setFilterStatus] = useState<"" | ProjectStatus>("");
  const [openCreate, setOpenCreate] = useState<null | ProjectKind>(null);
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterKind) params.set("kind", filterKind);
    if (filterStatus) params.set("status", filterStatus);
    params.set("section", "SOCIAL");
    const r = await fetch(`/api/social-projects?${params}`);
    if (r.ok) {
      const data = await r.json();
      setProjects(data.map((p: Project) => ({
        ...p,
        startDate: p.startDate ? p.startDate.toString().slice(0, 10) : null,
        endDate: p.endDate ? p.endDate.toString().slice(0, 10) : null,
      })));
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [filterKind, filterStatus]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error(t("social.nameRequired"));
      return;
    }
    setSaving(true);
    const r = await fetch("/api/social-projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, kind: openCreate, section: "SOCIAL" }),
    });
    if (r.ok) {
      const created = await r.json();
      toast.success(t("social.createdToast"));
      setOpenCreate(null);
      setForm(initial);
      router.push(`/social/projects/${created.id}`);
    } else toast.error(t("social.createFailed"));
    setSaving(false);
  };

  const isNachat = openCreate === "NACHAT";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t("social.projectsTitle")}</h1>
          <p className="text-muted-foreground">{t("social.projectsSubtitle")}</p>
        </div>
        {canWrite && (
          <DropdownMenu>
            <DropdownMenuTrigger render={
              <Button>
                <Plus size={16} />{t("social.new")}
                <ChevronDown size={14} />
              </Button>
            } />
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => { setOpenCreate("NACHAT"); setForm({ ...initial, kind: "NACHAT" }); }}>
                📅 {t("social.newActivity")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setOpenCreate("MACHROO3"); setForm({ ...initial, kind: "MACHROO3" }); }}>
                🎯 {t("social.newProject")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {!canWrite && perms.hasSectionRead("SOCIAL") && (
          <Badge variant="outline">{t("social.readOnlyBadge")}</Badge>
        )}
      </div>

      <Card>
        <CardContent className="flex flex-wrap gap-3 py-4">
          <div className="flex gap-1">
            <Button size="sm" variant={filterKind === "" ? "default" : "outline"} onClick={() => setFilterKind("")}>{t("common.all")}</Button>
            <Button size="sm" variant={filterKind === "NACHAT" ? "default" : "outline"} onClick={() => setFilterKind("NACHAT")}>{t("social.activitiesFilter")}</Button>
            <Button size="sm" variant={filterKind === "MACHROO3" ? "default" : "outline"} onClick={() => setFilterKind("MACHROO3")}>{t("social.projectsFilter")}</Button>
          </div>
          <div className="flex gap-1">
            <Button size="sm" variant={filterStatus === "" ? "default" : "outline"} onClick={() => setFilterStatus("")}>{t("social.allStatuses")}</Button>
            <Button size="sm" variant={filterStatus === "ACTIVE" ? "default" : "outline"} onClick={() => setFilterStatus("ACTIVE")}>{t("social.activeFilter")}</Button>
            <Button size="sm" variant={filterStatus === "COMPLETED" ? "default" : "outline"} onClick={() => setFilterStatus("COMPLETED")}>{t("social.completedFilter")}</Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <p className="text-center py-8 text-muted-foreground">{t("common.loading")}</p>
      ) : projects.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">{t("social.noProjectsYet")}</CardContent></Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <Link key={p.id} href={`/social/projects/${p.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base line-clamp-2">{p.name}</CardTitle>
                    <Badge variant="outline" className="text-xs shrink-0">{PROJECT_KIND_LABELS[p.kind]}</Badge>
                  </div>
                  {p.description && <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{p.description}</p>}
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                    {p.startDate && (
                      <span className="flex items-center gap-1"><Calendar size={11} />{p.startDate}</span>
                    )}
                    {p.location && (
                      <span className="flex items-center gap-1"><MapPin size={11} />{p.location}</span>
                    )}
                    <Badge variant={PROJECT_STATUS_VARIANT[p.status]} className="text-[10px]">
                      {PROJECT_STATUS_LABELS[p.status]}
                    </Badge>
                  </div>

                  {p.targetAmount && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1 text-muted-foreground"><Target size={11} />{t("social.donationCollection")}</span>
                        <span className="font-medium">
                          {fmtMoney(p.summary.totalCollected, locale, 0)} / {fmtMoney(Number(p.targetAmount ?? 0), locale, 0)} {t("social.mad")}
                        </span>
                      </div>
                      <Progress value={p.summary.progressPct ?? 0} indicatorClassName="bg-green-600" />
                      {p.summary.inKindEstimated > 0 && (
                        <p className="text-[10px] text-muted-foreground">{t("social.inKindPart", { amount: fmtMoney(p.summary.inKindEstimated, locale, 0) })} {t("social.mad")}</p>
                      )}
                    </div>
                  )}

                  {p.summary.tasksTotal > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1 text-muted-foreground"><ListChecks size={11} />{t("social.taskExecution")}</span>
                        <span className="font-medium">{p.summary.tasksDone}/{p.summary.tasksTotal}</span>
                      </div>
                      <Progress
                        value={p.summary.tasksTotal === 0 ? 0 : (p.summary.tasksDone / p.summary.tasksTotal) * 100}
                        indicatorClassName="bg-blue-600"
                      />
                    </div>
                  )}

                  {p.expectedBeneficiaries && (
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Users size={11} />{t("social.expectedBeneficiariesCount", { count: p.expectedBeneficiaries })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Dialog open={!!openCreate} onOpenChange={(o) => !o && setOpenCreate(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {t("social.techCardTitle")} — {isNachat ? t("social.newActivity") : t("social.newProject")}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label>{t("social.fullNameLabel")}</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>{t("social.objectiveLabel")}</Label>
              <Textarea value={form.objective} onChange={(e) => setForm({ ...form, objective: e.target.value })} placeholder={t("social.objectivePlaceholder")} />
            </div>
            <div>
              <Label>{t("common.description")}</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t("social.targetAudienceLabel")}</Label>
                <Input value={form.targetAudience} onChange={(e) => setForm({ ...form, targetAudience: e.target.value })} placeholder={t("social.audiencePlaceholder")} />
              </div>
              <div>
                <Label>{t("social.expectedBeneficiariesLabel")}</Label>
                <Input type="number" value={form.expectedBeneficiaries} onChange={(e) => setForm({ ...form, expectedBeneficiaries: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t("social.locationLabel")}</Label>
                <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
              </div>
              <div>
                <Label>{t("social.partnersLabel")}</Label>
                <Input value={form.partners} onChange={(e) => setForm({ ...form, partners: e.target.value })} placeholder={t("social.partnersPlaceholder")} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>{isNachat ? t("social.activityDateLabel") : t("social.startDateLabel")}</Label>
                <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
              </div>
              {!isNachat && (
                <div>
                  <Label>{t("social.endDateLabel")}</Label>
                  <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
                </div>
              )}
              <div>
                <Label>{t("social.budgetLabel")}</Label>
                <Input type="number" step="0.01" value={form.targetAmount} onChange={(e) => setForm({ ...form, targetAmount: e.target.value })} />
              </div>
            </div>
            <Button type="submit" disabled={saving} className="w-full">
              {saving ? "..." : t("social.createBtn")}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
