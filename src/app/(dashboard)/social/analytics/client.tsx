"use client";

import {
  BarChart, Bar, PieChart, Pie, Cell,
  CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PROJECT_KIND_LABELS, PROJECT_STATUS_LABELS } from "@/lib/project";
import type { ProjectKind, ProjectStatus } from "@prisma/client";
import { useT } from "@/components/i18n/provider";
import { fmtMoney } from "@/lib/i18n/format";
import { Trophy, Target } from "lucide-react";

type Project = {
  id: string;
  name: string;
  kind: ProjectKind;
  status: ProjectStatus;
  targetAmount: number;
  collected: number;
  tasksDone: number;
  tasksTotal: number;
  hours: number;
  score: number | null;
  actualBeneficiaries: number | null;
  expectedBeneficiaries: number | null;
};

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"];

export function AnalyticsClient({
  projects,
  leaderboard,
}: {
  projects: Project[];
  leaderboard: { name: string; hours: number }[];
}) {
  const total = projects.length;
  const { t, locale } = useT();
  const active = projects.filter((p) => p.status === "ACTIVE").length;
  const completed = projects.filter((p) => p.status === "COMPLETED").length;
  const cancelled = projects.filter((p) => p.status === "CANCELLED").length;

  const totalCollected = projects.reduce((s, p) => s + p.collected, 0);
  const totalTarget = projects.reduce((s, p) => s + p.targetAmount, 0);
  const totalHours = projects.reduce((s, p) => s + p.hours, 0);
  const totalBeneficiaries = projects.reduce((s, p) => s + (p.actualBeneficiaries ?? 0), 0);

  const byKind = ["NACHAT", "MACHROO3"].map((k) => ({
    kind: PROJECT_KIND_LABELS[k as ProjectKind],
    count: projects.filter((p) => p.kind === k).length,
  }));

  const byStatus = ["ACTIVE", "COMPLETED", "CANCELLED"].map((s) => ({
    name: PROJECT_STATUS_LABELS[s as ProjectStatus],
    value: projects.filter((p) => p.status === s).length,
  }));

  const collectionData = projects
    .filter((p) => p.targetAmount > 0)
    .map((p) => ({
      name: p.name.length > 20 ? p.name.slice(0, 20) + "…" : p.name,
      collected: p.collected,
      target: p.targetAmount,
    }))
    .slice(0, 10);

  const completionRate = total === 0 ? 0 : Math.round((completed / total) * 100);
  const avgScore = projects.filter((p) => p.score).reduce((s, p) => s + (p.score ?? 0), 0)
    / Math.max(1, projects.filter((p) => p.score).length);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("social.analyticsTitle")}</h1>
        <p className="text-muted-foreground">{t("social.analyticsSubtitle")}</p>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Card>
          <CardContent className="py-3">
            <p className="text-xs text-muted-foreground">{t("social.totalProjects")}</p>
            <p className="text-2xl font-bold">{total}</p>
            <p className="text-[10px] text-muted-foreground">{t("social.statActiveDone", { active, completed })}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3">
            <p className="text-xs text-muted-foreground">{t("social.donationCollection")}</p>
            <p className="text-2xl font-bold text-green-600">{fmtMoney(totalCollected, locale, 0)} {t("social.mad")}</p>
            {totalTarget > 0 && <p className="text-[10px] text-muted-foreground">{t("social.fromTarget", { target: fmtMoney(totalTarget, locale, 0) })}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3">
            <p className="text-xs text-muted-foreground">{t("social.completionRate")}</p>
            <p className="text-2xl font-bold">{completionRate}%</p>
            <p className="text-[10px] text-muted-foreground">{t("social.cancelledCount", { cancelled })}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3">
            <p className="text-xs text-muted-foreground">{t("social.beneficiaries")}</p>
            <p className="text-2xl font-bold">{totalBeneficiaries}</p>
            <p className="text-[10px] text-muted-foreground">{t("social.volunteerHoursCount", { hours: fmtMoney(totalHours, locale, 0) })}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">{t("social.projectStatusChart")}</CardTitle></CardHeader>
          <CardContent style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={byStatus} dataKey="value" nameKey="name" outerRadius={80} label>
                  {byStatus.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">{t("social.byKind")}</CardTitle></CardHeader>
          <CardContent style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byKind}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="kind" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {collectionData.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">{t("social.collectionVsTargets")}</CardTitle></CardHeader>
          <CardContent style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={collectionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="target" name={t("social.seriesTarget")} fill="#94a3b8" />
                <Bar dataKey="collected" name={t("social.seriesCollected")} fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Trophy size={16} />{t("social.topVolunteers")}</CardTitle>
          </CardHeader>
          <CardContent>
            {leaderboard.length === 0 && <p className="text-center text-muted-foreground py-4 text-sm">{t("social.noHoursYet")}</p>}
            <div className="space-y-2">
              {leaderboard.map((m, i) => (
                <div key={m.name} className="flex items-center justify-between text-sm py-2 border-b last:border-0">
                  <span className="flex items-center gap-2">
                    <span className="text-muted-foreground w-6">#{i + 1}</span>
                    <span className="font-medium">{m.name}</span>
                  </span>
                  <span className="font-mono">{fmtMoney(m.hours, locale, 1)} {t("social.hour")}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Target size={16} />{t("social.avgProjectRating")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-6">
              <p className="text-5xl">{avgScore > 0 ? "⭐".repeat(Math.round(avgScore)) : "—"}</p>
              <p className="text-sm text-muted-foreground mt-2">
                {avgScore > 0 ? `${fmtMoney(avgScore, locale, 1)} / 5` : t("social.notRatedYet")}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {t("social.basedOnProjects", { count: projects.filter((p) => p.score).length })}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
          <CardHeader><CardTitle className="text-base">{t("social.allProjectsList")}</CardTitle></CardHeader>
          <CardContent className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="p-2 text-right">{t("social.thName")}</th>
                  <th className="p-2 text-right">{t("common.type")}</th>
                  <th className="p-2 text-right">{t("common.status")}</th>
                  <th className="p-2 text-right">{t("social.thCollectedTarget")}</th>
                  <th className="p-2 text-right">{t("social.thTasks")}</th>
                  <th className="p-2 text-right">{t("social.thHours")}</th>
                  <th className="p-2 text-right">{t("social.thRating")}</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p.id} className="border-b">
                  <td className="p-2 font-medium">{p.name}</td>
                  <td className="p-2"><Badge variant="outline">{PROJECT_KIND_LABELS[p.kind]}</Badge></td>
                  <td className="p-2"><Badge>{PROJECT_STATUS_LABELS[p.status]}</Badge></td>
                  <td className="p-2 font-mono">{fmtMoney(p.collected, locale, 0)}{p.targetAmount > 0 ? ` / ${fmtMoney(p.targetAmount, locale, 0)}` : ""}</td>
                  <td className="p-2">{p.tasksDone}/{p.tasksTotal}</td>
                  <td className="p-2 font-mono">{fmtMoney(p.hours, locale, 1)}</td>
                  <td className="p-2">{p.score ? "⭐".repeat(p.score) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
