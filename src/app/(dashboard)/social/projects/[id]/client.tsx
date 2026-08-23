"use client";

import { useEffect, useState, useCallback } from "react";
import { usePermissions } from "@/lib/use-permissions";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  ArrowRight,
  Plus,
  Trash2,
  CheckCircle2,
  Coins,
  Package,
  Layers,
  ListChecks,
  Trophy,
  ClipboardCheck,
  ShieldCheck,
  Star,
  UserPlus,
  Clock,
  Pencil,
} from "lucide-react";
import type { ProjectKind, ProjectStatus, TaskPriority, TaskStatus } from "@prisma/client";
import {
  PROJECT_KIND_LABELS,
  PROJECT_STATUS_LABELS,
  TASK_STATUS_LABELS,
  TASK_STATUS_COLORS,
  TASK_PRIORITY_LABELS,
  TASK_PRIORITY_COLORS,
  TASK_STATUS_ORDER,
} from "@/lib/project";

type Member = { id: string; fullName: string; registrationNumber: number };

type Donation = {
  id: string;
  amount: string;
  donorName: string | null;
  isAnonymous: boolean;
  donationDate: string;
  notes: string | null;
};

type InKindDonation = {
  id: string;
  itemName: string;
  quantity: string;
  unit: string | null;
  estimatedValue: string | null;
  donorName: string | null;
  isAnonymous: boolean;
  donationDate: string;
};

type LineItem = {
  id: string;
  name: string;
  amount: string;
  position: number;
};

type Plan = {
  id: string;
  name: string;
  description: string | null;
  estimatedCost: string | null;
  isActive: boolean;
  lineItems: LineItem[];
  expenses: { amount: string; planLineItemId: string | null }[];
};

type Worklog = {
  id: string;
  hours: string;
  workedDate: string;
  description: string | null;
  member: { fullName: string };
};

type Assignee = { id: string; member: { id: string; fullName: string } };

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  estimatedHours: string | null;
  plannedExpense: string | null;
  actualExpense: string | null;
  needsMedia?: boolean;
  completedAt: string | null;
  createdAt: string;
  assignees: Assignee[];
  worklogs: Worklog[];
  taskPlans: { planId: string }[];
};

type Photo = { id: string; url: string; caption: string | null; createdAt: string };
type Beneficiary = {
  id: string;
  type: "GENERAL" | "YATIM" | "MOZWIZ";
  name: string;
  phone?: string | null;
  itemsReceived?: string | null;
  amount?: string | null;
  notes?: string | null;
  age?: number | null;
  gender?: "MALE" | "FEMALE" | null;
  dateOfBirth?: string | null;
  address?: string | null;
  fatherDeceased?: boolean | null;
  motherDeceased?: boolean | null;
  guardianName?: string | null;
  guardianRelation?: string | null;
  guardianPhone?: string | null;
  monthlyIncome?: string | null;
  familySize?: number | null;
  housingStatus?: string | null;
  financialProofUrl?: string | null;
  yatimOverrideReason?: string | null;
};
type Risk = { id: string; description: string; mitigation: string | null; severity: "LOW" | "MEDIUM" | "HIGH"; status: "OPEN" | "MITIGATED" | "OCCURRED" | "CLOSED" };
type Stakeholder = { id: string; name: string; role: string | null; phone: string | null; email: string | null; notes: string | null };
type ProjectExpense = { id: string; amount: string; description: string; expenseDate: string; planId: string | null; planLineItemId: string | null; category: string };

type Project = {
  id: string;
  name: string;
  kind: ProjectKind;
  description: string | null;
  objective: string | null;
  targetAudience: string | null;
  expectedBeneficiaries: number | null;
  actualBeneficiaries: number | null;
  location: string | null;
  partners: string | null;
  targetAmount: string | null;
  startDate: string | null;
  endDate: string | null;
  status: ProjectStatus;
  section: import("@prisma/client").Section;
  evaluationReport: string | null;
  evaluationScore: number | null;
  evaluationLessons: string | null;
  evaluationRecommend: string | null;
  evaluatedAt: string | null;
  donations: Donation[];
  inKindDonations: InKindDonation[];
  plans: Plan[];
  tasks: Task[];
  photos: Photo[];
  beneficiaries: Beneficiary[];
  risks: Risk[];
  stakeholders: Stakeholder[];
  expenses: ProjectExpense[];
  creator: { fullName: string } | null;
  evaluator: { fullName: string } | null;
  slug: string | null;
  isPublic: boolean;
  recurringFromId: string | null;
  coverPhotoUrl: string | null;
};

export function ProjectDetailClient({ projectId, adults }: { projectId: string; adults: Member[] }) {
  const router = useRouter();
  const perms = usePermissions();
  const [p, setP] = useState<Project | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch(`/api/social-projects/${projectId}`);
    if (r.ok) {
      setLoadError(null);
      setP(await r.json());
    } else if (r.status === 403) {
      setLoadError("ليس لديك صلاحية لعرض هذا المشروع.");
    } else if (r.status === 404) {
      setLoadError("لم نجد المشروع.");
    } else {
      setLoadError("تعذّر تحميل المشروع.");
    }
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  if (loadError) return <p className="text-center py-8 text-muted-foreground">{loadError}</p>;
  if (!p) return <p className="text-center py-8 text-muted-foreground">جاري التحميل...</p>;

  const canWrite = perms.canWriteSection(p.section);
  const canDelete = perms.isAdmin || perms.isBureauRW;

  const cashCollected = p.donations.reduce((s, d) => s + Number(d.amount), 0);
  const inKindEstimated = p.inKindDonations.reduce((s, d) => s + Number(d.estimatedValue ?? 0), 0);
  const totalCollected = cashCollected + inKindEstimated;
  const targetNum = p.targetAmount ? Number(p.targetAmount) : 0;
  const progressPct = targetNum > 0 ? Math.min(100, (totalCollected / targetNum) * 100) : 0;
  const tasksTotal = p.tasks.length;
  const tasksDone = p.tasks.filter((t) => t.status === "DONE").length;
  const taskProgressPct = tasksTotal === 0 ? 0 : (tasksDone / tasksTotal) * 100;
  const totalLoggedHours = p.tasks.reduce((s, t) => s + t.worklogs.reduce((ws, w) => ws + Number(w.hours), 0), 0);
  const isComplete = p.status === "COMPLETED";

  const deleteProject = async () => {
    if (!confirm(`حذف "${p.name}" نهائيا؟ سيتم حذف كل المهام والخطط والتبرعات العينية المرتبطة.`)) return;
    const r = await fetch(`/api/social-projects/${projectId}`, { method: "DELETE" });
    if (r.ok) {
      toast.success("تم حذف المشروع");
      router.push("/social/projects");
    } else {
      const data = await r.json().catch(() => ({}));
      toast.error(data.error ?? "فشل الحذف");
    }
  };

  const cloneProject = async (recurring: boolean) => {
    const name = prompt("اسم المشروع الجديد:", `${p.name} (نسخة)`);
    if (!name) return;
    const r = await fetch(`/api/social-projects/${projectId}/clone`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, recurring }),
    });
    if (r.ok) {
      const cloned = await r.json();
      toast.success("تم النسخ");
      router.push(`/social/projects/${cloned.id}`);
    } else toast.error("فشل النسخ");
  };

  const publishProject = async () => {
    // If already public, just open the share dialog
    if (p.isPublic && p.slug) {
      setShareOpen(true);
      return;
    }
    // Need to publish: prompt for slug, then enable public, then open share
    let slug = p.slug;
    if (!slug) {
      // Suggest a slug from the project name. Let user edit freely (Arabic or English).
      // Replace whitespace/punctuation with dashes; keep letters (any script), digits, underscores.
      const suggested = p.name
        .trim()
        .replace(/[\s/\\?#&=.,!:;'"]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 50);
      slug = prompt("اختر رابطا فريدا للصفحة العامة (يمكن استعمال العربية أو الإنجليزية، بدون مسافات):", suggested);
      if (!slug) return;
      slug = slug.trim();
    }
    const r = await fetch(`/api/social-projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublic: true, slug }),
    });
    if (r.ok) {
      toast.success("أصبحت الصفحة عامة");
      // Wait for fresh data BEFORE opening dialog so the share URL is correct
      await load();
      setShareOpen(true);
    } else {
      const data = await r.json().catch(() => ({}));
      toast.error(data.error ?? `فشل (HTTP ${r.status})`);
    }
  };

  const copyPublicUrl = async () => {
    if (!p.slug) return;
    const url = `${window.location.origin}/p/${p.slug}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("✓ تم نسخ الرابط");
    } catch {
      toast.error("تعذّر النسخ");
    }
  };

  const unpublishProject = async () => {
    if (!confirm("إخفاء الصفحة العامة؟ سيتوقف الرابط عن العمل.")) return;
    const r = await fetch(`/api/social-projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublic: false }),
    });
    if (r.ok) {
      toast.success("تم إخفاء الصفحة");
      load();
    } else {
      const data = await r.json().catch(() => ({}));
      toast.error(data.error ?? `فشل (HTTP ${r.status})`);
    }
  };

  return (
    <div className="space-y-6 min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Link href="/social/projects" className="text-sm text-muted-foreground hover:underline flex items-center gap-1">
            <ArrowRight size={14} />العودة
          </Link>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold break-words">{p.name}</h1>
            <Badge variant="outline">{PROJECT_KIND_LABELS[p.kind]}</Badge>
            <Badge variant={isComplete ? "secondary" : "default"}>{PROJECT_STATUS_LABELS[p.status]}</Badge>
          </div>
          {p.objective && <p className="text-muted-foreground mt-1 max-w-3xl">{p.objective}</p>}
        </div>
        <div className="flex gap-2 flex-wrap">
          {canWrite && <EditProjectDialog project={p} reload={load} />}
          {p.isPublic ? (
            <>
              <Button onClick={() => setShareOpen(true)} className="bg-emerald-600 hover:bg-emerald-700">
                🔗 مشاركة الرابط
              </Button>
              {canWrite && (
                <Button variant="outline" onClick={unpublishProject} title="إخفاء الصفحة العامة">
                  🙈 إخفاء
                </Button>
              )}
            </>
          ) : (
            canWrite && (
              <Button variant="outline" onClick={publishProject} title="نشر صفحة عامة قابلة للمشاركة">
                🌐 نشر عام
              </Button>
            )
          )}
          {canWrite && (
            <>
              <Button variant="outline" onClick={() => cloneProject(false)} title="نسخ المشروع">
                📋 نسخ
              </Button>
              <Button variant="outline" onClick={() => cloneProject(true)} title="إنشاء نسخة سنوية متكررة">
                🔁 سنوي
              </Button>
            </>
          )}
          {canDelete && (
            <Button variant="outline" onClick={deleteProject} className="text-destructive hover:text-destructive">
              <Trash2 size={14} />حذف
            </Button>
          )}
          {!canWrite && perms.hasSectionRead(p.section) && (
            <Badge variant="outline" className="self-center">قراءة فقط</Badge>
          )}
        </div>
      </div>

      {p.isPublic && p.slug && (
        <Card className="border-emerald-300 bg-emerald-50/60 dark:bg-emerald-950/20 dark:border-emerald-800">
          <CardContent className="py-3 flex flex-wrap items-center gap-3 min-w-0">
            <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">🌐 الصفحة العامة منشورة</span>
            <a
              href={`/p/${p.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              dir="ltr"
              className="flex-1 min-w-0 font-mono text-xs sm:text-sm underline text-emerald-700 dark:text-emerald-300 hover:text-emerald-900 dark:hover:text-emerald-100 break-all"
            >
              {typeof window !== "undefined" ? window.location.origin : ""}/p/{p.slug}
            </a>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={copyPublicUrl}>
                📋 نسخ
              </Button>
              <Button size="sm" onClick={() => setShareOpen(true)} className="bg-emerald-600 hover:bg-emerald-700">
                💬 مشاركة
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 md:grid-cols-4">
        <Card>
          <CardContent className="py-3">
            <p className="text-xs text-muted-foreground">جمع التبرعات</p>
            <p className="text-xl font-bold text-green-600">{totalCollected.toFixed(0)} د.م</p>
            {targetNum > 0 && <p className="text-[10px] text-muted-foreground">من {targetNum.toFixed(0)} ({progressPct.toFixed(0)}%)</p>}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3">
            <p className="text-xs text-muted-foreground">المهام</p>
            <p className="text-xl font-bold">{tasksDone}/{tasksTotal}</p>
            <p className="text-[10px] text-muted-foreground">منجز {taskProgressPct.toFixed(0)}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3">
            <p className="text-xs text-muted-foreground">ساعات التطوع المسجلة</p>
            <p className="text-xl font-bold">{totalLoggedHours.toFixed(1)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3">
            <p className="text-xs text-muted-foreground">المستفيدون</p>
            <p className="text-xl font-bold">{p.actualBeneficiaries ?? p.expectedBeneficiaries ?? "—"}</p>
            <p className="text-[10px] text-muted-foreground">{p.actualBeneficiaries ? "فعلي" : "متوقع"}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview"><ClipboardCheck size={14} />نظرة عامة</TabsTrigger>
          <TabsTrigger value="plans"><Layers size={14} />الخطط</TabsTrigger>
          <TabsTrigger value="tasks"><ListChecks size={14} />المهام</TabsTrigger>
          <TabsTrigger value="donations"><Coins size={14} />التبرعات</TabsTrigger>
          <TabsTrigger value="expenses">💰 المصاريف</TabsTrigger>
          <TabsTrigger value="photos">📸 الصور</TabsTrigger>
          <TabsTrigger value="beneficiaries">👥 المستفيدون</TabsTrigger>
          <TabsTrigger value="risks">⚠️ المخاطر</TabsTrigger>
          <TabsTrigger value="stakeholders">🤝 الشركاء</TabsTrigger>
          <TabsTrigger value="evaluation"><Star size={14} />التقييم</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>البطاقة التقنية</CardTitle></CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-4 text-sm">
              <Field label="الفئة المستهدفة" value={p.targetAudience} />
              <Field label="المكان" value={p.location} />
              <Field label="الشركاء" value={p.partners} />
              <Field label="المستفيدون المتوقع" value={p.expectedBeneficiaries?.toString() ?? null} />
              <Field label="تاريخ البداية" value={p.startDate?.slice(0, 10) ?? null} />
              <Field label="تاريخ النهاية" value={p.endDate?.slice(0, 10) ?? null} />
              <Field label="الميزانية المستهدفة" value={p.targetAmount ? `${Number(p.targetAmount).toFixed(0)} د.م` : null} />
              <Field label="منشئ المشروع" value={p.creator?.fullName ?? null} />
            </CardContent>
          </Card>

          <MultiTierProgressCard
            collected={totalCollected}
            inKindEstimated={inKindEstimated}
            cashCollected={cashCollected}
            projectTarget={targetNum}
            plans={p.plans}
          />
          <ProgressCard
            label="تنفيذ المهام"
            current={tasksDone}
            target={tasksTotal}
            unit="مهمة"
            color="bg-blue-600"
          />
        </TabsContent>

        <TabsContent value="plans" className="space-y-3">
          <PlansTab projectId={projectId} plans={p.plans} totalCollected={totalCollected} reload={load} canWrite={canWrite} />
        </TabsContent>

        <TabsContent value="tasks" className="space-y-3">
          <TasksTab projectId={projectId} tasks={p.tasks} plans={p.plans} adults={adults} reload={load} canWrite={canWrite} />
        </TabsContent>

        <TabsContent value="donations" className="space-y-3">
          <DonationsTab projectId={projectId} donations={p.donations} inKind={p.inKindDonations} reload={load} canWrite={canWrite} />
        </TabsContent>

        <TabsContent value="expenses" className="space-y-3">
          <ExpensesTab projectId={projectId} tasks={p.tasks} expenses={p.expenses} plans={p.plans} reload={load} canWrite={canWrite} />
        </TabsContent>

        <TabsContent value="photos" className="space-y-3">
          <PhotosTab projectId={projectId} photos={p.photos} reload={load} canWrite={canWrite} />
        </TabsContent>

        <TabsContent value="beneficiaries" className="space-y-3">
          <BeneficiariesTab projectId={projectId} beneficiaries={p.beneficiaries} reload={load} canWrite={canWrite} />
        </TabsContent>

        <TabsContent value="risks" className="space-y-3">
          <RisksTab projectId={projectId} risks={p.risks} reload={load} canWrite={canWrite} />
        </TabsContent>

        <TabsContent value="stakeholders" className="space-y-3">
          <StakeholdersTab projectId={projectId} stakeholders={p.stakeholders} reload={load} canWrite={canWrite} />
        </TabsContent>

        <TabsContent value="evaluation" className="space-y-3">
          <EvaluationTab project={p} reload={load} router={router} canWrite={canWrite} />
        </TabsContent>
      </Tabs>

      {p.slug && (
        <PublishShareDialog
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          url={typeof window !== "undefined" ? `${window.location.origin}/p/${p.slug}` : `/p/${p.slug}`}
          projectName={p.name}
        />
      )}
    </div>
  );
}

function EditProjectDialog({ project, reload }: { project: Project; reload: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: project.name,
    description: project.description ?? "",
    objective: project.objective ?? "",
    targetAudience: project.targetAudience ?? "",
    expectedBeneficiaries: project.expectedBeneficiaries?.toString() ?? "",
    location: project.location ?? "",
    partners: project.partners ?? "",
    targetAmount: project.targetAmount ?? "",
    startDate: project.startDate?.slice(0, 10) ?? "",
    endDate: project.endDate?.slice(0, 10) ?? "",
  });
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("الاسم مطلوب");
    setSaving(true);
    const r = await fetch(`/api/social-projects/${project.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (r.ok) {
      toast.success("تم حفظ التعديلات");
      setOpen(false);
      reload();
    } else toast.error("فشل");
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline"><Pencil size={14} />تعديل البطاقة التقنية</Button>} />
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>تعديل البطاقة التقنية</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label>الاسم *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label>الهدف</Label>
            <Textarea value={form.objective} onChange={(e) => setForm({ ...form, objective: e.target.value })} />
          </div>
          <div>
            <Label>الوصف</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>الفئة المستهدفة</Label>
              <Input value={form.targetAudience} onChange={(e) => setForm({ ...form, targetAudience: e.target.value })} />
            </div>
            <div>
              <Label>عدد المستفيدين المتوقع</Label>
              <Input type="number" value={form.expectedBeneficiaries} onChange={(e) => setForm({ ...form, expectedBeneficiaries: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>المكان</Label>
              <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </div>
            <div>
              <Label>الشركاء</Label>
              <Input value={form.partners} onChange={(e) => setForm({ ...form, partners: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>تاريخ البداية</Label>
              <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
            </div>
            <div>
              <Label>تاريخ النهاية</Label>
              <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
            </div>
            <div>
              <Label>الميزانية المستهدفة (د.م)</Label>
              <Input type="number" step="0.01" value={form.targetAmount} onChange={(e) => setForm({ ...form, targetAmount: e.target.value })} />
            </div>
          </div>
          <Button type="submit" disabled={saving} className="w-full">
            {saving ? "..." : "حفظ التعديلات"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}

function ProgressCard({
  label,
  current,
  target,
  unit,
  color,
  extraNote,
}: {
  label: string;
  current: number;
  target: number;
  unit: string;
  color: string;
  extraNote?: string | null;
}) {
  const pct = target === 0 ? 0 : Math.min(100, (current / target) * 100);
  return (
    <Card>
      <CardContent className="py-4 space-y-2">
        <div className="flex items-center justify-between">
          <p className="font-medium">{label}</p>
          <p className="text-sm">
            <span className="font-bold">{current.toFixed(unit === "مهمة" ? 0 : 1)}</span>
            {target > 0 && <span className="text-muted-foreground"> / {target.toFixed(unit === "مهمة" ? 0 : 1)} {unit}</span>}
          </p>
        </div>
        <Progress value={pct} indicatorClassName={color} className="h-3" />
        {target > 0 && <p className="text-xs text-muted-foreground text-left">{pct.toFixed(0)}%</p>}
        {extraNote && <p className="text-xs text-muted-foreground">{extraNote}</p>}
      </CardContent>
    </Card>
  );
}

function MultiTierProgressCard({
  collected,
  cashCollected,
  inKindEstimated,
  projectTarget,
  plans,
}: {
  collected: number;
  cashCollected: number;
  inKindEstimated: number;
  projectTarget: number;
  plans: Plan[];
}) {
  const planThresholds = plans
    .map((p) => ({ id: p.id, name: p.name, isActive: p.isActive, target: p.estimatedCost ? Number(p.estimatedCost) : 0 }))
    .filter((p) => p.target > 0)
    .sort((a, b) => a.target - b.target);

  const maxScale = Math.max(projectTarget, ...planThresholds.map((p) => p.target), collected);
  const collectedPct = maxScale === 0 ? 0 : Math.min(100, (collected / maxScale) * 100);

  return (
    <Card>
      <CardContent className="py-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="font-medium">جمع التبرعات</p>
          <p className="text-sm">
            <span className="font-bold text-green-600">{collected.toFixed(0)}</span>
            <span className="text-muted-foreground"> د.م</span>
          </p>
        </div>

        <div className="relative h-7 rounded-full bg-muted overflow-hidden">
          <div
            className="absolute inset-y-0 right-0 bg-green-600 transition-all"
            style={{ width: `${collectedPct}%` }}
          />
          {planThresholds.map((p) => {
            const pct = (p.target / maxScale) * 100;
            const reached = collected >= p.target;
            return (
              <div
                key={p.id}
                className="absolute inset-y-0 border-r-2 border-dashed flex items-end pb-0.5"
                style={{
                  right: `${pct}%`,
                  borderColor: p.isActive ? "rgb(220, 38, 38)" : "rgb(100, 116, 139)",
                }}
                title={`${p.name}: ${p.target.toFixed(0)} د.م${reached ? " ✓" : ""}`}
              />
            );
          })}
        </div>

        <div className="flex flex-wrap gap-2 text-[11px]">
          {cashCollected > 0 && <Badge variant="outline" className="font-normal">نقدي: {cashCollected.toFixed(0)} د.م</Badge>}
          {inKindEstimated > 0 && <Badge variant="outline" className="font-normal">عيني: {inKindEstimated.toFixed(0)} د.م</Badge>}
          {planThresholds.map((p) => {
            const reached = collected >= p.target;
            return (
              <Badge
                key={p.id}
                variant={reached ? "default" : "outline"}
                className={`text-[10px] ${p.isActive ? "ring-1 ring-red-500" : ""}`}
              >
                {p.isActive && "● "}{p.name}: {p.target.toFixed(0)} {reached ? "✓" : ""}
              </Badge>
            );
          })}
          {projectTarget > 0 && (
            <Badge variant="outline" className="text-[10px] font-normal">
              هدف المشروع: {projectTarget.toFixed(0)}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function PlansTab({ projectId, plans, totalCollected, reload, canWrite }: { projectId: string; plans: Plan[]; totalCollected: number; reload: () => void; canWrite: boolean }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", estimatedCost: "" });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("الاسم مطلوب");
    const r = await fetch(`/api/social-projects/${projectId}/plans`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (r.ok) {
      toast.success("تم إضافة الخطة");
      setOpen(false);
      setForm({ name: "", description: "", estimatedCost: "" });
      reload();
    } else toast.error("فشل");
  };

  const setActive = async (id: string) => {
    const r = await fetch(`/api/project-plans/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ makeActive: true }),
    });
    if (r.ok) {
      toast.success("تم تفعيل الخطة");
      reload();
    }
  };

  const del = async (id: string) => {
    if (!confirm("حذف الخطة؟")) return;
    const r = await fetch(`/api/project-plans/${id}`, { method: "DELETE" });
    if (r.ok) {
      toast.success("تم الحذف");
      reload();
    }
  };

  return (
    <>
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">خطط بديلة في حال نقص الميزانية أو تغيّر الظروف</p>
        {canWrite && <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button size="sm"><Plus size={14} />خطة جديدة</Button>} />
          <DialogContent>
            <DialogHeader><DialogTitle>خطة جديدة</DialogTitle></DialogHeader>
            <form onSubmit={submit} className="space-y-3">
              <div>
                <Label>الاسم</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="مثلا: خطة A، خطة بديلة..." />
              </div>
              <div>
                <Label>الوصف</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div>
                <Label>التكلفة المقدّرة (د.م)</Label>
                <Input type="number" step="0.01" value={form.estimatedCost} onChange={(e) => setForm({ ...form, estimatedCost: e.target.value })} />
              </div>
              <Button type="submit" className="w-full">إضافة</Button>
            </form>
          </DialogContent>
        </Dialog>}
      </div>

      {plans.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">لا توجد خطط بعد</CardContent></Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {plans.map((pl) => (
            <PlanCard key={pl.id} plan={pl} totalCollected={totalCollected} onSetActive={() => setActive(pl.id)} onDelete={() => del(pl.id)} reload={reload} canWrite={canWrite} />
          ))}
        </div>
      )}
    </>
  );
}

function TasksTab({
  projectId,
  tasks,
  plans,
  adults,
  reload,
  canWrite,
}: {
  projectId: string;
  tasks: Task[];
  plans: Plan[];
  adults: Member[];
  reload: () => void;
  canWrite: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [openTask, setOpenTask] = useState<Task | null>(null);
  const [planFilter, setPlanFilter] = useState<string>("ALL"); // ALL | ACTIVE | <planId>
  const [form, setForm] = useState({
    title: "",
    description: "",
    priority: "MEDIUM" as TaskPriority,
    dueDate: "",
    estimatedHours: "",
    plannedExpense: "",
    needsMedia: false,
  });

  const activePlanIds = new Set(plans.filter((p) => p.isActive).map((p) => p.id));
  const filterFn = (t: Task) => {
    if (planFilter === "ALL") return true;
    if (planFilter === "ACTIVE") {
      // task is relevant if it has no plan tags OR has at least one active plan tag
      if (t.taskPlans.length === 0) return true;
      return t.taskPlans.some((tp) => activePlanIds.has(tp.planId));
    }
    return t.taskPlans.some((tp) => tp.planId === planFilter);
  };
  const filteredTasks = tasks.filter(filterFn);
  const planById = Object.fromEntries(plans.map((p) => [p.id, p]));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error("العنوان مطلوب");
    const r = await fetch(`/api/social-projects/${projectId}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (r.ok) {
      toast.success("تم إضافة المهمة");
      setOpen(false);
      setForm({ title: "", description: "", priority: "MEDIUM", dueDate: "", estimatedHours: "", plannedExpense: "", needsMedia: false });
      reload();
    } else toast.error("فشل");
  };

  const updateStatus = async (taskId: string, status: TaskStatus) => {
    const r = await fetch(`/api/project-tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (r.ok) {
      toast.success("تم التحديث");
      reload();
    }
  };

  const tasksByStatus = TASK_STATUS_ORDER.reduce((acc, s) => {
    acc[s] = filteredTasks.filter((t) => t.status === s);
    return acc;
  }, {} as Record<TaskStatus, Task[]>);

  return (
    <>
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">إدارة المهام مثل شراء، تصميم، نشر... يمكن إسناد كل مهمة لمتطوع وتسجيل ساعات العمل</p>
        {canWrite && <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button size="sm"><Plus size={14} />مهمة جديدة</Button>} />
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>مهمة جديدة</DialogTitle></DialogHeader>
            <form onSubmit={submit} className="space-y-3">
              <div>
                <Label>العنوان *</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="مثلا: شراء المواد، تصميم البوستر، نشر على إنستاغرام..." />
              </div>
              <div>
                <Label>الوصف (اختياري)</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>الأولوية</Label>
                  <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as TaskPriority })} className="w-full h-9 px-3 rounded-md border bg-background text-sm">
                    {Object.entries(TASK_PRIORITY_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>الموعد النهائي</Label>
                  <Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
                </div>
                <div>
                  <Label>الساعات المقدّرة</Label>
                  <Input type="number" step="0.5" value={form.estimatedHours} onChange={(e) => setForm({ ...form, estimatedHours: e.target.value })} />
                </div>
                <div>
                  <Label className="font-bold">💰 المبلغ المخطط (د.م)</Label>
                  <Input type="number" step="0.01" value={form.plannedExpense} onChange={(e) => setForm({ ...form, plannedExpense: e.target.value })} placeholder="مثلا: 200" />
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">المبلغ المخطط يُحدّده المسؤول. المنفِّذ يُدخل المبلغ الفعلي عند تحديث حالة المهمة.</p>
              <label className="flex items-center gap-2 text-sm border rounded-md p-2 bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800">
                <input type="checkbox" checked={form.needsMedia} onChange={(e) => setForm({ ...form, needsMedia: e.target.checked })} />
                <span>📋 يحتاج إلى دعم إعلامي (ملصق، ستوري، تصميم...) — تظهر هذه المهمة في القسم الإعلامي</span>
              </label>
              <Button type="submit" className="w-full">إضافة</Button>
            </form>
          </DialogContent>
        </Dialog>}
      </div>

      {plans.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="text-muted-foreground">تصفية حسب الخطة:</span>
          <Button size="sm" variant={planFilter === "ALL" ? "default" : "outline"} onClick={() => setPlanFilter("ALL")}>الكل</Button>
          <Button size="sm" variant={planFilter === "ACTIVE" ? "default" : "outline"} onClick={() => setPlanFilter("ACTIVE")}>الخطة النشطة فقط</Button>
          {plans.map((pl) => (
            <Button key={pl.id} size="sm" variant={planFilter === pl.id ? "default" : "outline"} onClick={() => setPlanFilter(pl.id)}>
              {pl.name}{pl.isActive ? " ●" : ""}
            </Button>
          ))}
        </div>
      )}

      {tasks.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">لا توجد مهام بعد</CardContent></Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-4">
          {TASK_STATUS_ORDER.map((s) => (
            <div key={s} className="space-y-2">
              <div className={`text-xs font-bold px-2 py-1 rounded ${TASK_STATUS_COLORS[s]}`}>
                {TASK_STATUS_LABELS[s]} ({tasksByStatus[s].length})
              </div>
              <div className="space-y-2">
                {tasksByStatus[s].map((t) => {
                  const logged = t.worklogs.reduce((sum, w) => sum + Number(w.hours), 0);
                  const onlyInactivePlans = t.taskPlans.length > 0 && !t.taskPlans.some((tp) => activePlanIds.has(tp.planId));
                  return (
                    <button
                      key={t.id}
                      onClick={() => setOpenTask(t)}
                      className={`w-full text-right border rounded-lg p-3 bg-card hover:shadow-sm transition-shadow space-y-1 ${onlyInactivePlans ? "opacity-50" : ""}`}
                    >
                      <p className="text-sm font-medium line-clamp-2">{t.title}</p>
                      <div className="flex items-center gap-1 flex-wrap">
                        <Badge variant="outline" className={`text-[10px] ${TASK_PRIORITY_COLORS[t.priority]}`}>
                          {TASK_PRIORITY_LABELS[t.priority]}
                        </Badge>
                        {t.dueDate && (
                          <span className="text-[10px] text-muted-foreground">{t.dueDate.slice(0, 10)}</span>
                        )}
                        {t.taskPlans.map((tp) => {
                          const pl = planById[tp.planId];
                          if (!pl) return null;
                          return (
                            <Badge key={tp.planId} variant={pl.isActive ? "default" : "secondary"} className="text-[10px]">
                              {pl.name}
                            </Badge>
                          );
                        })}
                        {t.needsMedia && <Badge className="bg-purple-100 text-purple-800 text-[10px]">📋 إعلامي</Badge>}
                      </div>
                      {t.assignees.length > 0 && (
                        <div className="text-[10px] text-muted-foreground line-clamp-1">
                          👥 {t.assignees.map((a) => a.member.fullName).join("، ")}
                        </div>
                      )}
                      {(t.estimatedHours || logged > 0) && (
                        <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Clock size={10} />
                          {logged.toFixed(1)}{t.estimatedHours ? `/${Number(t.estimatedHours).toFixed(1)}` : ""} ساعة
                        </div>
                      )}
                      {(t.plannedExpense || t.actualExpense) && (() => {
                        const planned = t.plannedExpense ? Number(t.plannedExpense) : 0;
                        const actual = t.actualExpense ? Number(t.actualExpense) : 0;
                        const overBudget = planned > 0 && actual > planned;
                        return (
                          <div className={`text-[10px] flex items-center gap-1 ${overBudget ? "text-red-600" : "text-muted-foreground"}`}>
                            💰 {actual ? `${actual.toFixed(0)}` : "—"}{planned ? ` / ${planned.toFixed(0)}` : ""} د.م
                          </div>
                        );
                      })()}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {(() => {
        const cancelled = filteredTasks.filter((t) => t.status === "CANCELLED");
        if (cancelled.length === 0) return null;
        return (
          <details className="border rounded-lg bg-muted/20">
            <summary className="cursor-pointer px-3 py-2 text-sm font-medium hover:bg-muted/40 rounded-lg select-none">
              المهام الملغاة ({cancelled.length}) ▾
            </summary>
            <div className="p-3 space-y-2">
              {cancelled.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setOpenTask(t)}
                  className="w-full text-right border rounded-lg p-3 bg-card hover:shadow-sm transition-shadow flex items-center gap-3 opacity-60 hover:opacity-100"
                >
                  <span className="text-sm font-medium line-through flex-1">{t.title}</span>
                  <Badge variant="outline" className="text-[10px]">{TASK_PRIORITY_LABELS[t.priority]}</Badge>
                  {t.dueDate && <span className="text-[10px] text-muted-foreground">{t.dueDate.slice(0, 10)}</span>}
                  {t.assignees.length > 0 && (
                    <span className="text-[10px] text-muted-foreground">👥 {t.assignees.length}</span>
                  )}
                </button>
              ))}
            </div>
          </details>
        );
      })()}

      <TaskDetailDialog
        // Live-derive the displayed task from the freshly-loaded list
        // so status changes / edits reflect immediately without closing the dialog.
        task={openTask ? tasks.find((t) => t.id === openTask.id) ?? openTask : null}
        adults={adults}
        plans={plans}
        onClose={() => setOpenTask(null)}
        onChange={() => { reload(); }}
        onStatusChange={updateStatus}
        canWrite={canWrite}
      />
    </>
  );
}

function TaskDetailDialog({
  task,
  adults,
  plans,
  onClose,
  onChange,
  onStatusChange,
  canWrite,
}: {
  task: Task | null;
  adults: Member[];
  plans: Plan[];
  onClose: () => void;
  onChange: () => void;
  onStatusChange: (id: string, s: TaskStatus) => void;
  canWrite: boolean;
}) {
  const [worklog, setWorklog] = useState({ memberId: "", hours: "", workedDate: new Date().toISOString().slice(0, 10), description: "" });
  const [assignMember, setAssignMember] = useState("");
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    title: task?.title ?? "",
    description: task?.description ?? "",
    priority: (task?.priority ?? "MEDIUM") as TaskPriority,
    dueDate: task?.dueDate?.slice(0, 10) ?? "",
    estimatedHours: task?.estimatedHours ?? "",
    plannedExpense: task?.plannedExpense ?? "",
    needsMedia: !!task?.needsMedia,
  });
  const [actualExpenseInput, setActualExpenseInput] = useState(task?.actualExpense ?? "");

  if (!task) return null;

  const saveActualExpense = async () => {
    const r = await fetch(`/api/project-tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actualExpense: actualExpenseInput || null }),
    });
    if (r.ok) {
      toast.success("تم تسجيل المبلغ الفعلي");
      onChange();
    } else toast.error("فشل");
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await fetch(`/api/project-tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    if (r.ok) {
      toast.success("تم التعديل");
      setEditing(false);
      onChange();
    } else toast.error("فشل");
  };

  const assign = async () => {
    if (!assignMember) return;
    const r = await fetch(`/api/project-tasks/${task.id}/assignees`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId: assignMember }),
    });
    if (r.ok) {
      toast.success("تم الإسناد");
      setAssignMember("");
      onChange();
    }
  };

  const unassign = async (memberId: string) => {
    const r = await fetch(`/api/project-tasks/${task.id}/assignees?memberId=${memberId}`, { method: "DELETE" });
    if (r.ok) {
      toast.success("تم الحذف");
      onChange();
    }
  };

  const logWork = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!worklog.memberId || !worklog.hours) return toast.error("اختر عضو وحدد الساعات");
    const r = await fetch(`/api/project-tasks/${task.id}/worklogs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(worklog),
    });
    if (r.ok) {
      toast.success("تم تسجيل الساعات");
      setWorklog({ memberId: "", hours: "", workedDate: new Date().toISOString().slice(0, 10), description: "" });
      onChange();
    }
  };

  const del = async () => {
    if (!confirm("حذف المهمة؟")) return;
    const r = await fetch(`/api/project-tasks/${task.id}`, { method: "DELETE" });
    if (r.ok) {
      toast.success("تم الحذف");
      onChange();
    }
  };

  const totalLogged = task.worklogs.reduce((s, w) => s + Number(w.hours), 0);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {task.title}
            {canWrite && (
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing(!editing)} title="تعديل">
                <Pencil size={13} />
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {editing && canWrite ? (
            <form onSubmit={saveEdit} className="space-y-3 border rounded p-3 bg-muted/20">
              <div><Label>العنوان</Label><Input value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} /></div>
              <div><Label>الوصف</Label><Textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} /></div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label>الأولوية</Label>
                  <select value={editForm.priority} onChange={(e) => setEditForm({ ...editForm, priority: e.target.value as TaskPriority })} className="w-full h-9 px-3 rounded-md border bg-background text-sm">
                    {Object.entries(TASK_PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div><Label>الموعد</Label><Input type="date" value={editForm.dueDate} onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })} /></div>
                <div><Label>الساعات المقدّرة</Label><Input type="number" step="0.5" value={editForm.estimatedHours} onChange={(e) => setEditForm({ ...editForm, estimatedHours: e.target.value })} /></div>
              </div>
              <div>
                <Label>المبلغ المخطط (د.م)</Label>
                <Input type="number" step="0.01" value={editForm.plannedExpense} onChange={(e) => setEditForm({ ...editForm, plannedExpense: e.target.value })} />
              </div>
              <label className="flex items-center gap-2 text-sm border rounded-md p-2 bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800">
                <input type="checkbox" checked={editForm.needsMedia} onChange={(e) => setEditForm({ ...editForm, needsMedia: e.target.checked })} />
                <span>📋 يحتاج إلى دعم إعلامي</span>
              </label>
              <div className="flex gap-2">
                <Button type="submit" size="sm">حفظ</Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>إلغاء</Button>
              </div>
            </form>
          ) : (
            task.description && <p className="text-sm text-muted-foreground">{task.description}</p>
          )}

          {/* Planned vs Actual expense inline panel */}
          <div className="border rounded-lg p-3 bg-muted/20 space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-bold flex items-center gap-1">💰 الميزانية</Label>
              {task.plannedExpense && (
                <span className="text-xs text-muted-foreground">المخطط: <span className="font-mono font-bold">{Number(task.plannedExpense).toFixed(2)} د.م</span></span>
              )}
            </div>
            {canWrite ? (
              <div className="flex items-center gap-2">
                <Label className="text-xs whitespace-nowrap">المبلغ الفعلي:</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={actualExpenseInput}
                  onChange={(e) => setActualExpenseInput(e.target.value)}
                  placeholder="0.00"
                  className="h-8"
                />
                <Button size="sm" onClick={saveActualExpense}>حفظ</Button>
              </div>
            ) : (
              task.actualExpense && (
                <p className="text-xs text-muted-foreground">المبلغ الفعلي: <span className="font-mono font-bold">{Number(task.actualExpense).toFixed(2)} د.م</span></p>
              )
            )}
            {task.plannedExpense && task.actualExpense && (() => {
              const planned = Number(task.plannedExpense);
              const actual = Number(task.actualExpense);
              const diff = actual - planned;
              const overBudget = diff > 0;
              return (
                <p className={`text-xs ${overBudget ? "text-red-600" : "text-green-600"}`}>
                  {overBudget ? "تجاوز الميزانية بـ " : "وفر "}
                  <span className="font-mono font-bold">{Math.abs(diff).toFixed(2)} د.م</span>
                  {planned > 0 && ` (${((diff / planned) * 100).toFixed(0)}%)`}
                </p>
              );
            })()}
          </div>

          {canWrite ? (
            <div className="flex flex-wrap gap-2">
              {TASK_STATUS_ORDER.concat(["CANCELLED"] as TaskStatus[]).map((s) => {
                const active = task.status === s;
                return (
                  <Button
                    key={s}
                    size="sm"
                    variant={active ? "default" : "outline"}
                    onClick={() => onStatusChange(task.id, s)}
                    className={active ? "ring-2 ring-primary ring-offset-2 ring-offset-background font-bold" : ""}
                  >
                    {active && "✓ "}{TASK_STATUS_LABELS[s]}
                  </Button>
                );
              })}
            </div>
          ) : (
            <Badge>{TASK_STATUS_LABELS[task.status]}</Badge>
          )}

          {plans.length > 0 && canWrite && (
            <div>
              <Label className="text-sm font-bold">الخطط المرتبطة</Label>
              <p className="text-[11px] text-muted-foreground mb-2">إذا لم تختر خطة، تعتبر المهمة لازمة لكل الخطط</p>
              <div className="flex flex-wrap gap-1.5">
                {plans.map((pl) => {
                  const checked = task.taskPlans.some((tp) => tp.planId === pl.id);
                  return (
                    <Button
                      key={pl.id}
                      size="sm"
                      variant={checked ? "default" : "outline"}
                      onClick={async () => {
                        const newIds = checked
                          ? task.taskPlans.filter((tp) => tp.planId !== pl.id).map((tp) => tp.planId)
                          : [...task.taskPlans.map((tp) => tp.planId), pl.id];
                        const r = await fetch(`/api/project-tasks/${task.id}/plans`, {
                          method: "PUT",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ planIds: newIds }),
                        });
                        if (r.ok) { toast.success("تم"); onChange(); } else toast.error("فشل");
                      }}
                      className="h-7 text-xs"
                    >
                      {checked && "✓ "}{pl.name}{pl.isActive ? " ●" : ""}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <Label className="text-sm font-bold">المسؤولون</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {task.assignees.map((a) => (
                <Badge key={a.id} variant="secondary" className="gap-1 pe-1">
                  {a.member.fullName}
                  {canWrite && (
                    <button onClick={() => unassign(a.member.id)} className="hover:text-destructive">
                      <Trash2 size={11} />
                    </button>
                  )}
                </Badge>
              ))}
              {task.assignees.length === 0 && (
                <span className="text-xs text-muted-foreground">لا أحد بعد</span>
              )}
            </div>
            {canWrite && (
              <div className="flex gap-2 mt-2">
                <select value={assignMember} onChange={(e) => setAssignMember(e.target.value)} className="flex-1 h-9 px-3 rounded-md border bg-background text-sm">
                  <option value="">— اختر متطوع —</option>
                  {adults.map((m) => (
                    <option key={m.id} value={m.id}>{m.fullName}</option>
                  ))}
                </select>
                <Button size="sm" onClick={assign} disabled={!assignMember}>
                  <UserPlus size={14} />إسناد
                </Button>
              </div>
            )}
          </div>

          <div>
            <Label className="text-sm font-bold flex items-center gap-2">
              <Clock size={14} />ساعات العمل (اختياري)
              <Badge variant="outline">{totalLogged.toFixed(1)}{task.estimatedHours ? `/${Number(task.estimatedHours).toFixed(1)}` : ""} ساعة</Badge>
            </Label>
            {canWrite && (
              <form onSubmit={logWork} className="grid grid-cols-2 gap-2 mt-2">
                <select value={worklog.memberId} onChange={(e) => setWorklog({ ...worklog, memberId: e.target.value })} className="h-9 px-3 rounded-md border bg-background text-sm">
                  <option value="">— من قام بالعمل —</option>
                  {task.assignees.length > 0
                    ? task.assignees.map((a) => <option key={a.id} value={a.member.id}>{a.member.fullName}</option>)
                    : adults.map((m) => <option key={m.id} value={m.id}>{m.fullName}</option>)}
                </select>
                <Input type="number" step="0.25" placeholder="ساعات" value={worklog.hours} onChange={(e) => setWorklog({ ...worklog, hours: e.target.value })} />
                <Input type="date" value={worklog.workedDate} onChange={(e) => setWorklog({ ...worklog, workedDate: e.target.value })} />
                <Input placeholder="ملاحظة" value={worklog.description} onChange={(e) => setWorklog({ ...worklog, description: e.target.value })} />
                <Button type="submit" className="col-span-2">تسجيل ساعات</Button>
              </form>
            )}
            {task.worklogs.length > 0 && (
              <div className="mt-3 space-y-1 max-h-40 overflow-auto">
                {task.worklogs.map((w) => (
                  <WorklogRow key={w.id} taskId={task.id} worklog={w} onChange={onChange} canWrite={canWrite} />
                ))}
              </div>
            )}
          </div>

          {canWrite && (
            <Button variant="destructive" size="sm" onClick={del} className="w-full">
              <Trash2 size={14} />حذف المهمة
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DonationsTab({
  projectId,
  donations,
  inKind,
  reload,
  canWrite,
}: {
  projectId: string;
  donations: Donation[];
  inKind: InKindDonation[];
  reload: () => void;
  canWrite: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<"CASH" | "IN_KIND">("CASH");
  const [cashForm, setCashForm] = useState({ donorName: "", donorPhone: "", amount: "", notes: "", isAnonymous: false });
  const [inKindForm, setInKindForm] = useState({ donorName: "", donorPhone: "", itemName: "", quantity: "", unit: "", estimatedValue: "", notes: "", isAnonymous: false });

  const submitCash = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cashForm.amount) return toast.error("المبلغ مطلوب");
    const r = await fetch("/api/donations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...cashForm, projectId, section: "SOCIAL" }),
    });
    if (r.ok) {
      toast.success("تم تسجيل التبرع");
      setCashForm({ donorName: "", donorPhone: "", amount: "", notes: "", isAnonymous: false });
      setOpen(false);
      reload();
    } else toast.error("فشل");
  };

  const submitInKind = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inKindForm.itemName || !inKindForm.quantity) return toast.error("اسم البند والكمية مطلوبان");
    const r = await fetch("/api/in-kind-donations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...inKindForm, projectId }),
    });
    if (r.ok) {
      toast.success("تم تسجيل التبرع العيني");
      setInKindForm({ donorName: "", donorPhone: "", itemName: "", quantity: "", unit: "", estimatedValue: "", notes: "", isAnonymous: false });
      setOpen(false);
      reload();
    } else toast.error("فشل");
  };

  const delInKind = async (id: string) => {
    if (!confirm("حذف؟")) return;
    const r = await fetch(`/api/in-kind-donations/${id}`, { method: "DELETE" });
    if (r.ok) {
      toast.success("تم الحذف");
      reload();
    }
  };

  const cashTotal = donations.reduce((s, d) => s + Number(d.amount), 0);
  const inKindTotal = inKind.reduce((s, d) => s + Number(d.estimatedValue ?? 0), 0);

  return (
    <>
      <div className="flex justify-between items-center">
        <div className="text-sm text-muted-foreground">
          نقدي: <strong>{cashTotal.toFixed(0)} د.م</strong> · عيني: <strong>{inKindTotal.toFixed(0)} د.م</strong>
        </div>
        {canWrite && <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button size="sm"><Plus size={14} />تبرع جديد</Button>} />
          <DialogContent>
            <DialogHeader><DialogTitle>تبرع جديد</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="flex gap-1">
                <Button size="sm" variant={kind === "CASH" ? "default" : "outline"} onClick={() => setKind("CASH")} className="flex-1">
                  <Coins size={14} />نقدي
                </Button>
                <Button size="sm" variant={kind === "IN_KIND" ? "default" : "outline"} onClick={() => setKind("IN_KIND")} className="flex-1">
                  <Package size={14} />عيني
                </Button>
              </div>

              {kind === "CASH" ? (
                <form onSubmit={submitCash} className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>اسم المتبرع</Label>
                      <Input value={cashForm.donorName} onChange={(e) => setCashForm({ ...cashForm, donorName: e.target.value })} disabled={cashForm.isAnonymous} />
                    </div>
                    <div>
                      <Label>الهاتف</Label>
                      <Input value={cashForm.donorPhone} onChange={(e) => setCashForm({ ...cashForm, donorPhone: e.target.value })} dir="ltr" />
                    </div>
                  </div>
                  <div>
                    <Label>المبلغ (د.م) *</Label>
                    <Input type="number" step="0.01" value={cashForm.amount} onChange={(e) => setCashForm({ ...cashForm, amount: e.target.value })} />
                  </div>
                  <div>
                    <Label>ملاحظات</Label>
                    <Textarea value={cashForm.notes} onChange={(e) => setCashForm({ ...cashForm, notes: e.target.value })} />
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={cashForm.isAnonymous} onChange={(e) => setCashForm({ ...cashForm, isAnonymous: e.target.checked })} />
                    تبرع مجهول
                  </label>
                  <Button type="submit" className="w-full">تسجيل</Button>
                </form>
              ) : (
                <form onSubmit={submitInKind} className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>اسم المتبرع</Label>
                      <Input value={inKindForm.donorName} onChange={(e) => setInKindForm({ ...inKindForm, donorName: e.target.value })} disabled={inKindForm.isAnonymous} />
                    </div>
                    <div>
                      <Label>الهاتف</Label>
                      <Input value={inKindForm.donorPhone} onChange={(e) => setInKindForm({ ...inKindForm, donorPhone: e.target.value })} dir="ltr" />
                    </div>
                  </div>
                  <div>
                    <Label>اسم البند *</Label>
                    <Input value={inKindForm.itemName} onChange={(e) => setInKindForm({ ...inKindForm, itemName: e.target.value })} placeholder="أرز، ثياب، ألعاب..." />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label>الكمية *</Label>
                      <Input type="number" step="0.01" value={inKindForm.quantity} onChange={(e) => setInKindForm({ ...inKindForm, quantity: e.target.value })} />
                    </div>
                    <div>
                      <Label>الوحدة</Label>
                      <Input value={inKindForm.unit} onChange={(e) => setInKindForm({ ...inKindForm, unit: e.target.value })} placeholder="كجم، علبة، قطعة..." />
                    </div>
                    <div>
                      <Label>القيمة التقديرية</Label>
                      <Input type="number" step="0.01" value={inKindForm.estimatedValue} onChange={(e) => setInKindForm({ ...inKindForm, estimatedValue: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <Label>ملاحظات</Label>
                    <Textarea value={inKindForm.notes} onChange={(e) => setInKindForm({ ...inKindForm, notes: e.target.value })} />
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={inKindForm.isAnonymous} onChange={(e) => setInKindForm({ ...inKindForm, isAnonymous: e.target.checked })} />
                    تبرع مجهول
                  </label>
                  <Button type="submit" className="w-full">تسجيل</Button>
                </form>
              )}
            </div>
          </DialogContent>
        </Dialog>}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Coins size={16} />التبرعات النقدية ({donations.length})</CardTitle></CardHeader>
          <CardContent className="divide-y p-0">
            {donations.length === 0 && <p className="text-center text-muted-foreground py-4 text-sm">لا توجد تبرعات نقدية</p>}
            {donations.map((d) => (
              <div key={d.id} className="flex items-center gap-2 p-3 text-sm">
                <div className="flex-1">
                  <p>{d.isAnonymous ? "🤐 مجهول" : (d.donorName ?? "—")}</p>
                  <p className="text-xs text-muted-foreground">{d.donationDate.slice(0, 10)}</p>
                </div>
                <span className="font-mono font-bold">{Number(d.amount).toFixed(2)} د.م</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Package size={16} />التبرعات العينية ({inKind.length})</CardTitle></CardHeader>
          <CardContent className="divide-y p-0">
            {inKind.length === 0 && <p className="text-center text-muted-foreground py-4 text-sm">لا توجد تبرعات عينية</p>}
            {inKind.map((d) => (
              <div key={d.id} className="flex items-center gap-2 p-3 text-sm">
                <div className="flex-1">
                  <p className="font-medium">{d.itemName}</p>
                  <p className="text-xs text-muted-foreground">
                    {Number(d.quantity).toString()} {d.unit ?? ""} · {d.isAnonymous ? "مجهول" : (d.donorName ?? "—")} · {d.donationDate.slice(0, 10)}
                  </p>
                </div>
                {d.estimatedValue && (
                  <span className="font-mono text-xs">≈ {Number(d.estimatedValue).toFixed(0)} د.م</span>
                )}
                {canWrite && (
                  <>
                    <InKindEditButton donation={d} reload={reload} />
                    <Button size="icon" variant="ghost" onClick={() => delInKind(d.id)}>
                      <Trash2 size={12} />
                    </Button>
                  </>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function EvaluationTab({
  project,
  reload,
  router,
  canWrite,
}: {
  project: Project;
  reload: () => void;
  router: ReturnType<typeof useRouter>;
  canWrite: boolean;
}) {
  const [form, setForm] = useState({
    actualBeneficiaries: project.actualBeneficiaries?.toString() ?? "",
    score: project.evaluationScore?.toString() ?? "",
    report: project.evaluationReport ?? "",
    lessons: project.evaluationLessons ?? "",
    recommend: project.evaluationRecommend ?? "",
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await fetch(`/api/social-projects/${project.id}/evaluate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (r.ok) {
      toast.success("تم اعتماد التقييم");
      reload();
    } else toast.error("فشل");
  };

  if (project.status === "COMPLETED") {
    return (
      <div className="space-y-4">
        <Card className="border-green-200 bg-green-50/40 dark:bg-green-950/10 dark:border-green-900/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy size={18} className="text-green-700" />
              مشروع منجز
              {project.evaluationScore && (
                <span className="ms-auto text-yellow-500">
                  {"⭐".repeat(project.evaluationScore)}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Field label="عدد المستفيدين الفعلي" value={project.actualBeneficiaries?.toString() ?? null} />
            <Field label="ملخص التقرير" value={project.evaluationReport} />
            <Field label="الدروس المستفادة" value={project.evaluationLessons} />
            <Field label="التوصيات" value={project.evaluationRecommend} />
            <Field label="المُقيّم" value={project.evaluator?.fullName ?? null} />
            <Field label="تاريخ التقييم" value={project.evaluatedAt?.slice(0, 10) ?? null} />
          </CardContent>
        </Card>
        <Button variant="outline" onClick={() => router.push(`/social/projects/${project.id}/report`)}>
          <ShieldCheck size={14} />عرض التقرير القابل للطباعة
        </Button>
      </div>
    );
  }

  if (!canWrite) {
    return (
      <Card><CardContent className="py-8 text-center text-muted-foreground">قراءة فقط — لم يُكتمل تقييم هذا المشروع بعد.</CardContent></Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">تقييم المشروع بعد إنجازه</CardTitle>
        <p className="text-xs text-muted-foreground">يُملأ هذا النموذج عند انتهاء النشاط/المشروع، ويُولد تقريرا قابلا للطباعة</p>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>عدد المستفيدين الفعلي</Label>
              <Input type="number" value={form.actualBeneficiaries} onChange={(e) => setForm({ ...form, actualBeneficiaries: e.target.value })} />
            </div>
            <div>
              <Label>التقييم العام (1-5)</Label>
              <select value={form.score} onChange={(e) => setForm({ ...form, score: e.target.value })} className="w-full h-9 px-3 rounded-md border bg-background text-sm">
                <option value="">—</option>
                {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{"⭐".repeat(n)} ({n})</option>)}
              </select>
            </div>
          </div>
          <div>
            <Label>ملخص التقرير</Label>
            <Textarea rows={4} value={form.report} onChange={(e) => setForm({ ...form, report: e.target.value })} placeholder="ماذا تم إنجازه؟ كيف سار المشروع؟" />
          </div>
          <div>
            <Label>الدروس المستفادة</Label>
            <Textarea rows={3} value={form.lessons} onChange={(e) => setForm({ ...form, lessons: e.target.value })} placeholder="ما الذي نجح؟ ما الذي يحتاج تحسين؟" />
          </div>
          <div>
            <Label>التوصيات للمستقبل</Label>
            <Textarea rows={3} value={form.recommend} onChange={(e) => setForm({ ...form, recommend: e.target.value })} />
          </div>
          <Button type="submit" className="w-full">
            <CheckCircle2 size={14} />اعتماد التقييم وإغلاق المشروع
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function PlanEditButton({ plan, reload }: { plan: Plan; reload: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: plan.name, description: plan.description ?? "", estimatedCost: plan.estimatedCost ?? "" });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await fetch(`/api/project-plans/${plan.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (r.ok) { toast.success("تم التعديل"); setOpen(false); reload(); } else toast.error("فشل");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="icon" variant="ghost" title="تعديل"><Pencil size={13} /></Button>} />
      <DialogContent>
        <DialogHeader><DialogTitle>تعديل الخطة</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div><Label>الاسم</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><Label>الوصف</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div><Label>التكلفة المقدّرة (د.م)</Label><Input type="number" step="0.01" value={form.estimatedCost} onChange={(e) => setForm({ ...form, estimatedCost: e.target.value })} /></div>
          <Button type="submit" className="w-full">حفظ</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function WorklogRow({ taskId, worklog, onChange, canWrite }: { taskId: string; worklog: Worklog; onChange: () => void; canWrite: boolean }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ hours: worklog.hours, workedDate: worklog.workedDate.slice(0, 10), description: worklog.description ?? "" });

  const save = async () => {
    const r = await fetch(`/api/project-tasks/${taskId}/worklogs`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ worklogId: worklog.id, ...form }),
    });
    if (r.ok) { toast.success("تم"); setEditing(false); onChange(); } else toast.error("فشل");
  };

  const del = async () => {
    if (!confirm("حذف؟")) return;
    const r = await fetch(`/api/project-tasks/${taskId}/worklogs?worklogId=${worklog.id}`, { method: "DELETE" });
    if (r.ok) { toast.success("تم"); onChange(); }
  };

  if (editing) {
    return (
      <div className="text-xs flex items-center gap-1 border-b py-1">
        <Input className="h-7 w-16 text-xs" type="number" step="0.25" value={form.hours} onChange={(e) => setForm({ ...form, hours: e.target.value })} />
        <Input className="h-7 w-32 text-xs" type="date" value={form.workedDate} onChange={(e) => setForm({ ...form, workedDate: e.target.value })} />
        <Input className="h-7 flex-1 text-xs" placeholder="ملاحظة" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={save}><CheckCircle2 size={12} /></Button>
        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditing(false)}><Trash2 size={12} /></Button>
      </div>
    );
  }
  return (
    <div className="text-xs flex items-center justify-between border-b py-1 gap-1">
      <span className="flex-1">{worklog.member.fullName}</span>
      <span className="text-muted-foreground">{worklog.workedDate.slice(0, 10)}</span>
      <span className="font-mono">{Number(worklog.hours).toFixed(1)} س</span>
      {canWrite && (
        <>
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditing(true)} title="تعديل"><Pencil size={11} /></Button>
          <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={del} title="حذف"><Trash2 size={11} /></Button>
        </>
      )}
    </div>
  );
}

function InKindEditButton({ donation, reload }: { donation: InKindDonation; reload: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    itemName: donation.itemName,
    quantity: donation.quantity,
    unit: donation.unit ?? "",
    estimatedValue: donation.estimatedValue ?? "",
    donorName: donation.donorName ?? "",
    donorPhone: "",
    donationDate: donation.donationDate.slice(0, 10),
    isAnonymous: donation.isAnonymous,
    notes: "",
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await fetch(`/api/in-kind-donations/${donation.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (r.ok) { toast.success("تم"); setOpen(false); reload(); } else toast.error("فشل");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="icon" variant="ghost" className="h-6 w-6" title="تعديل"><Pencil size={11} /></Button>} />
      <DialogContent>
        <DialogHeader><DialogTitle>تعديل التبرع العيني</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div><Label>اسم البند</Label><Input value={form.itemName} onChange={(e) => setForm({ ...form, itemName: e.target.value })} /></div>
          <div className="grid grid-cols-3 gap-2">
            <div><Label>الكمية</Label><Input type="number" step="0.01" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></div>
            <div><Label>الوحدة</Label><Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} /></div>
            <div><Label>القيمة التقديرية</Label><Input type="number" step="0.01" value={form.estimatedValue} onChange={(e) => setForm({ ...form, estimatedValue: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>اسم المتبرع</Label><Input value={form.donorName} onChange={(e) => setForm({ ...form, donorName: e.target.value })} disabled={form.isAnonymous} /></div>
            <div><Label>التاريخ</Label><Input type="date" value={form.donationDate} onChange={(e) => setForm({ ...form, donationDate: e.target.value })} /></div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.isAnonymous} onChange={(e) => setForm({ ...form, isAnonymous: e.target.checked })} />
            مجهول
          </label>
          <Button type="submit" className="w-full">حفظ</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PlanCard({
  plan,
  totalCollected,
  onSetActive,
  onDelete,
  reload,
  canWrite,
}: {
  plan: Plan;
  totalCollected: number;
  onSetActive: () => void;
  onDelete: () => void;
  reload: () => void;
  canWrite: boolean;
}) {
  const target = plan.estimatedCost ? Number(plan.estimatedCost) : 0;
  const reached = target > 0 && totalCollected >= target;
  const readinessPct = target === 0 ? 0 : Math.min(100, (totalCollected / target) * 100);
  const totalSpent = plan.expenses.reduce((s, e) => s + Number(e.amount), 0);
  const lineItemsTotal = plan.lineItems.reduce((s, li) => s + Number(li.amount), 0);

  return (
    <Card className={plan.isActive ? "border-primary border-2" : ""}>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2 flex-wrap">
            {plan.name}
            {plan.isActive && <Badge variant="default" className="text-[10px]"><CheckCircle2 size={10} />نشطة</Badge>}
            {reached && <Badge className="text-[10px] bg-green-600">✓ مؤمّنة</Badge>}
          </CardTitle>
          {canWrite && (
            <div className="flex gap-1">
              <PlanEditButton plan={plan} reload={reload} />
              <Button size="icon" variant="ghost" onClick={onDelete}>
                <Trash2 size={14} />
              </Button>
            </div>
          )}
        </div>
        {plan.description && <p className="text-xs text-muted-foreground">{plan.description}</p>}
      </CardHeader>
      <CardContent className="space-y-3">
        {target > 0 && (
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">جاهزية الخطة</span>
              <span className="font-medium">{totalCollected.toFixed(0)} / {target.toFixed(0)} د.م</span>
            </div>
            <Progress value={readinessPct} indicatorClassName={reached ? "bg-green-600" : "bg-blue-600"} />
            <p className="text-[10px] text-muted-foreground mt-1">{readinessPct.toFixed(0)}%</p>
          </div>
        )}

        {totalSpent > 0 && (
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">المصروف</span>
              <span className="font-medium">
                {totalSpent.toFixed(0)} / {target.toFixed(0)} د.م
                <span className="text-muted-foreground"> (متبقّي {(target - totalSpent).toFixed(0)})</span>
              </span>
            </div>
            <Progress value={target > 0 ? Math.min(100, (totalSpent / target) * 100) : 0} indicatorClassName="bg-orange-500" />
          </div>
        )}

        <PlanLineItemsEditor plan={plan} reload={reload} totalCost={lineItemsTotal} canWrite={canWrite} />

        {!plan.isActive && canWrite && (
          <Button size="sm" variant="outline" onClick={onSetActive} className="w-full">
            تفعيل هذه الخطة
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function PlanLineItemsEditor({ plan, reload, totalCost, canWrite }: { plan: Plan; reload: () => void; totalCost: number; canWrite: boolean }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", amount: "" });
  const [saving, setSaving] = useState(false);

  // Map line item id → spent
  const spentByLineItem: Record<string, number> = {};
  plan.expenses.forEach((e) => {
    if (e.planLineItemId) {
      spentByLineItem[e.planLineItemId] = (spentByLineItem[e.planLineItemId] ?? 0) + Number(e.amount);
    }
  });

  const addItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.amount) return toast.error("اسم البند والمبلغ مطلوبان");
    setSaving(true);
    const r = await fetch(`/api/project-plans/${plan.id}/line-items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (r.ok) {
      toast.success("تم");
      setForm({ name: "", amount: "" });
      reload();
    } else toast.error("فشل");
    setSaving(false);
  };

  const delItem = async (id: string) => {
    if (!confirm("حذف البند؟")) return;
    const r = await fetch(`/api/plan-line-items/${id}`, { method: "DELETE" });
    if (r.ok) {
      toast.success("تم");
      reload();
    }
  };

  return (
    <div className="border rounded-lg p-2 bg-muted/20">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between text-xs font-semibold py-1"
      >
        <span>تفصيل بنود الميزانية ({plan.lineItems.length}{totalCost > 0 ? ` · ${totalCost.toFixed(0)} د.م` : ""})</span>
        <span>{open ? "▴" : "▾"}</span>
      </button>
      {open && (
        <div className="mt-2 space-y-2">
          {plan.lineItems.length === 0 && (
            <p className="text-[11px] text-muted-foreground">لا توجد بنود. أضف بنود لتفصيل الميزانية (مثلا أكل، نقل، هدايا...)</p>
          )}
          {plan.lineItems.map((li) => {
            const spent = spentByLineItem[li.id] ?? 0;
            const target = Number(li.amount);
            return (
              <div key={li.id} className="text-xs border-b pb-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium">{li.name}</span>
                  <div className="flex items-center gap-1">
                    <span className="font-mono">{spent.toFixed(0)} / {target.toFixed(0)} د.م</span>
                    {canWrite && (
                      <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => delItem(li.id)}>
                        <Trash2 size={11} />
                      </Button>
                    )}
                  </div>
                </div>
                <Progress value={target > 0 ? Math.min(100, (spent / target) * 100) : 0} indicatorClassName={spent > target ? "bg-red-600" : "bg-orange-500"} className="h-1" />
              </div>
            );
          })}
          {canWrite && (
            <form onSubmit={addItem} className="flex gap-1">
              <Input className="h-7 text-xs flex-1" placeholder="بند مثلا: أكل" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <Input className="h-7 w-20 text-xs" type="number" step="0.01" placeholder="مبلغ" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
              <Button type="submit" size="sm" className="h-7" disabled={saving}>+</Button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

function PhotosTab({ projectId, photos, reload, canWrite }: { projectId: string; photos: Photo[]; reload: () => void; canWrite: boolean }) {
  const [uploading, setUploading] = useState(false);

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("photo", f);
    const caption = prompt("تعليق على الصورة (اختياري):");
    if (caption) fd.append("caption", caption);
    const r = await fetch(`/api/social-projects/${projectId}/photos`, { method: "POST", body: fd });
    if (r.ok) { toast.success("تم رفع الصورة"); reload(); } else toast.error("فشل");
    setUploading(false);
    e.target.value = "";
  };

  const del = async (id: string) => {
    if (!confirm("حذف الصورة؟")) return;
    const r = await fetch(`/api/project-photos/${id}`, { method: "DELETE" });
    if (r.ok) { toast.success("تم"); reload(); }
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">صور النشاط — تظهر في التقرير الختامي للمشروع وفي الصفحة العامة إن تم تفعيلها</p>
        {canWrite && (
          <label className="cursor-pointer">
            <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={upload} disabled={uploading} />
            <Button size="sm" disabled={uploading} render={<span>{uploading ? "..." : "📸 رفع صورة"}</span>} />
          </label>
        )}
      </div>
      {photos.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">لا توجد صور بعد</CardContent></Card>
      ) : (
        <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {photos.map((ph) => (
            <div key={ph.id} className="relative group rounded-lg overflow-hidden border bg-card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={ph.url} alt={ph.caption ?? ""} className="w-full h-40 object-cover" />
              {ph.caption && <div className="p-2 text-xs">{ph.caption}</div>}
              {canWrite && (
                <Button size="icon" variant="destructive" className="absolute top-2 left-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => del(ph.id)}>
                  <Trash2 size={12} />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function BeneficiariesTab({ projectId, beneficiaries, reload, canWrite }: { projectId: string; beneficiaries: Beneficiary[]; reload: () => void; canWrite: boolean }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"PICK" | "ADHOC">("PICK");
  const [search, setSearch] = useState("");
  const [hits, setHits] = useState<{ id: string; fullName: string; type: string; caseNumber: number }[]>([]);
  const [picked, setPicked] = useState<{ id: string; fullName: string; type: string } | null>(null);
  const [adhoc, setAdhoc] = useState({ name: "", phone: "", itemsReceived: "", amount: "", notes: "" });
  const [extra, setExtra] = useState({ itemsReceived: "", amount: "", notes: "" });

  // Search master cases
  useEffect(() => {
    if (!open || mode !== "PICK") return;
    const t = setTimeout(async () => {
      if (!search.trim()) { setHits([]); return; }
      const r = await fetch(`/api/social-cases?search=${encodeURIComponent(search)}`);
      if (r.ok) {
        const data = await r.json();
        setHits(data.slice(0, 20));
      }
    }, 250);
    return () => clearTimeout(t);
  }, [search, open, mode]);

  const reset = () => {
    setMode("PICK");
    setSearch("");
    setHits([]);
    setPicked(null);
    setAdhoc({ name: "", phone: "", itemsReceived: "", amount: "", notes: "" });
    setExtra({ itemsReceived: "", amount: "", notes: "" });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    let body: Record<string, unknown>;
    if (mode === "PICK") {
      if (!picked) return toast.error("اختر حالة من السجل");
      body = {
        socialCaseId: picked.id,
        type: picked.type,
        name: picked.fullName,
        ...extra,
      };
    } else {
      if (!adhoc.name.trim()) return toast.error("الاسم مطلوب");
      body = { type: "GENERAL", ...adhoc };
    }
    const r = await fetch(`/api/social-projects/${projectId}/beneficiaries`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await r.json().catch(() => ({}));
    if (r.ok) { toast.success("تم"); reset(); setOpen(false); reload(); }
    else toast.error(data.error ?? "فشل");
  };

  const del = async (id: string) => {
    if (!confirm("حذف؟")) return;
    const r = await fetch(`/api/project-beneficiaries/${id}`, { method: "DELETE" });
    if (r.ok) { toast.success("تم"); reload(); }
  };

  return (
    <>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <p className="text-sm text-muted-foreground">قائمة المستفيدين — يتيم / محتاج / عام</p>
          <p className="text-xs text-amber-600 mt-1">⚠️ التفاصيل الكاملة مرئية فقط لفريق البحث الاجتماعي</p>
        </div>
        {canWrite && <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
          <DialogTrigger render={<Button size="sm"><Plus size={14} />ربط مستفيد</Button>} />
          <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>ربط مستفيد بالمشروع</DialogTitle></DialogHeader>
            <form onSubmit={submit} className="space-y-3">
              <div className="flex gap-2">
                <Button type="button" size="sm" variant={mode === "PICK" ? "default" : "outline"} onClick={() => setMode("PICK")}>اختيار من السجل</Button>
                <Button type="button" size="sm" variant={mode === "ADHOC" ? "default" : "outline"} onClick={() => setMode("ADHOC")}>غير مرتبط (عام)</Button>
              </div>

              {mode === "PICK" ? (
                <>
                  <p className="text-xs text-muted-foreground">السجل مدار من قبل فريق البحث الاجتماعي. إن لم تجد الحالة هنا، أضفها أولا في صفحة <a className="underline" href="/social/cases" target="_blank" rel="noopener">الحالات الاجتماعية</a>.</p>
                  <div>
                    <Label>البحث في السجل</Label>
                    <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث بالاسم..." />
                  </div>
                  {picked ? (
                    <div className="flex items-center gap-2 text-sm">
                      <Badge>{picked.fullName}</Badge>
                      {picked.type === "YATIM" && <Badge className="bg-amber-100 text-amber-800 text-[10px]">يتيم</Badge>}
                      {picked.type === "MOZWIZ" && <Badge className="bg-blue-100 text-blue-800 text-[10px]">محتاج</Badge>}
                      <Button type="button" size="sm" variant="ghost" onClick={() => setPicked(null)}>تغيير</Button>
                    </div>
                  ) : hits.length > 0 ? (
                    <div className="border rounded-md divide-y max-h-48 overflow-y-auto">
                      {hits.map((h) => (
                        <button key={h.id} type="button" className="w-full text-right p-2 text-sm hover:bg-muted flex items-center gap-2" onClick={() => { setPicked({ id: h.id, fullName: h.fullName, type: h.type }); setSearch(""); setHits([]); }}>
                          {h.type === "YATIM" && <Badge className="bg-amber-100 text-amber-800 text-[10px]">يتيم</Badge>}
                          {h.type === "MOZWIZ" && <Badge className="bg-blue-100 text-blue-800 text-[10px]">محتاج</Badge>}
                          <span className="text-xs text-muted-foreground" dir="ltr">#{h.caseNumber}</span>
                          <span>{h.fullName}</span>
                        </button>
                      ))}
                    </div>
                  ) : search.trim() ? (
                    <p className="text-xs text-muted-foreground">لا توجد نتائج مطابقة</p>
                  ) : null}
                  <div className="border-t pt-3 grid grid-cols-2 gap-3">
                    <div><Label className="text-xs">المبلغ المُستلم</Label><Input type="number" step="0.01" value={extra.amount} onChange={(e) => setExtra({ ...extra, amount: e.target.value })} dir="ltr" className="text-right" /></div>
                    <div><Label className="text-xs">المواد المُسلَّمة</Label><Input value={extra.itemsReceived} onChange={(e) => setExtra({ ...extra, itemsReceived: e.target.value })} placeholder="قفة رمضان، ثياب..." /></div>
                    <div className="col-span-2"><Label className="text-xs">ملاحظات خاصة بهذا المشروع</Label><Textarea rows={2} value={extra.notes} onChange={(e) => setExtra({ ...extra, notes: e.target.value })} /></div>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground">للمستفيدين الذين لا يستلزمون متابعة دائمة (مثل توزيع عام). للأيتام والمحتاجين، استخدم سجل الحالات.</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>الاسم *</Label><Input value={adhoc.name} onChange={(e) => setAdhoc({ ...adhoc, name: e.target.value })} /></div>
                    <div><Label>الهاتف</Label><Input value={adhoc.phone} onChange={(e) => setAdhoc({ ...adhoc, phone: e.target.value })} dir="ltr" className="text-right" /></div>
                    <div><Label>المبلغ المُستلم</Label><Input type="number" step="0.01" value={adhoc.amount} onChange={(e) => setAdhoc({ ...adhoc, amount: e.target.value })} dir="ltr" className="text-right" /></div>
                    <div><Label>المواد المُسلَّمة</Label><Input value={adhoc.itemsReceived} onChange={(e) => setAdhoc({ ...adhoc, itemsReceived: e.target.value })} placeholder="قفة، ثياب..." /></div>
                    <div className="col-span-2"><Label>ملاحظات</Label><Textarea rows={2} value={adhoc.notes} onChange={(e) => setAdhoc({ ...adhoc, notes: e.target.value })} /></div>
                  </div>
                </>
              )}

              <Button type="submit" className="w-full">إضافة</Button>
            </form>
          </DialogContent>
        </Dialog>}
      </div>
      <Card>
        <CardContent className="divide-y p-0">
          {beneficiaries.length === 0 && <p className="text-center text-muted-foreground py-8">لا يوجد مستفيدون مسجَّلون بعد</p>}
          {beneficiaries.map((b) => (
            <div key={b.id} className="flex items-center gap-3 p-3 text-sm">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  {b.type === "YATIM" && <Badge className="bg-amber-100 text-amber-800 text-[10px]">يتيم</Badge>}
                  {b.type === "MOZWIZ" && <Badge className="bg-blue-100 text-blue-800 text-[10px]">محتاج</Badge>}
                  <span className="font-medium">{b.name}</span>
                  {b.age != null && <span className="text-muted-foreground text-xs">{b.age} سنة</span>}
                  {b.gender === "MALE" && <span className="text-xs">♂</span>}
                  {b.gender === "FEMALE" && <span className="text-xs">♀</span>}
                  {b.phone && <span className="text-muted-foreground" dir="ltr">{b.phone}</span>}
                  {b.amount && <Badge variant="outline" className="text-[10px]">{Number(b.amount).toFixed(0)} د.م</Badge>}
                </div>
                {b.itemsReceived && <p className="text-xs text-muted-foreground mt-1">{b.itemsReceived}</p>}
                {b.notes && <p className="text-xs text-muted-foreground mt-1">{b.notes}</p>}
              </div>
              {canWrite && (
                <Button size="icon" variant="ghost" onClick={() => del(b.id)}>
                  <Trash2 size={13} />
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  );
}

function RisksTab({ projectId, risks, reload, canWrite }: { projectId: string; risks: Risk[]; reload: () => void; canWrite: boolean }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ description: "", mitigation: "", severity: "MEDIUM" as Risk["severity"] });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.description.trim()) return toast.error("الوصف مطلوب");
    const r = await fetch(`/api/social-projects/${projectId}/risks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (r.ok) {
      toast.success("تم");
      setForm({ description: "", mitigation: "", severity: "MEDIUM" });
      setOpen(false);
      reload();
    } else toast.error("فشل");
  };

  const updateStatus = async (id: string, status: Risk["status"]) => {
    const r = await fetch(`/api/project-risks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (r.ok) { toast.success("تم"); reload(); }
  };

  const del = async (id: string) => {
    if (!confirm("حذف؟")) return;
    const r = await fetch(`/api/project-risks/${id}`, { method: "DELETE" });
    if (r.ok) { toast.success("تم"); reload(); }
  };

  const sevColor = (s: Risk["severity"]) => s === "HIGH" ? "bg-red-100 text-red-700 dark:bg-red-950/30" : s === "MEDIUM" ? "bg-amber-100 text-amber-700 dark:bg-amber-950/30" : "bg-slate-100 text-slate-700 dark:bg-slate-800";
  const sevLabel = (s: Risk["severity"]) => ({ LOW: "منخفضة", MEDIUM: "متوسطة", HIGH: "عالية" }[s]);
  const statusLabel = (s: Risk["status"]) => ({ OPEN: "مفتوحة", MITIGATED: "تم التخفيف", OCCURRED: "وقعت", CLOSED: "مغلقة" }[s]);

  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">سجل المخاطر والاحتياطات (Pre-mortem) — ساعدنا أن نكون مستعدين</p>
        {canWrite && <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button size="sm"><Plus size={14} />خطر جديد</Button>} />
          <DialogContent>
            <DialogHeader><DialogTitle>إضافة خطر محتمل</DialogTitle></DialogHeader>
            <form onSubmit={submit} className="space-y-3">
              <div><Label>الوصف *</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="مثلا: تأخر التبرعات، عدد أكثر من المتوقع..." /></div>
              <div><Label>خطة التخفيف</Label><Textarea value={form.mitigation} onChange={(e) => setForm({ ...form, mitigation: e.target.value })} placeholder="ما الذي سنفعله إن وقع؟" /></div>
              <div>
                <Label>الخطورة</Label>
                <select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value as Risk["severity"] })} className="w-full h-9 px-3 rounded-md border bg-background text-sm">
                  <option value="LOW">منخفضة</option>
                  <option value="MEDIUM">متوسطة</option>
                  <option value="HIGH">عالية</option>
                </select>
              </div>
              <Button type="submit" className="w-full">إضافة</Button>
            </form>
          </DialogContent>
        </Dialog>}
      </div>
      <Card>
        <CardContent className="divide-y p-0">
          {risks.length === 0 && <p className="text-center text-muted-foreground py-8">لا توجد مخاطر مسجَّلة</p>}
          {risks.map((r) => (
            <div key={r.id} className="p-3 text-sm space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs px-2 py-0.5 rounded ${sevColor(r.severity)}`}>{sevLabel(r.severity)}</span>
                <Badge variant="outline" className="text-[10px]">{statusLabel(r.status)}</Badge>
                {canWrite && (
                  <Button size="icon" variant="ghost" className="ms-auto h-6 w-6" onClick={() => del(r.id)}>
                    <Trash2 size={11} />
                  </Button>
                )}
              </div>
              <p className="font-medium">{r.description}</p>
              {r.mitigation && <p className="text-xs text-muted-foreground">↳ {r.mitigation}</p>}
              {canWrite && (
                <div className="flex gap-1">
                  {(["OPEN", "MITIGATED", "OCCURRED", "CLOSED"] as Risk["status"][]).map((s) => (
                    <Button key={s} size="sm" variant={r.status === s ? "default" : "outline"} className="h-6 text-[10px]" onClick={() => updateStatus(r.id, s)}>
                      {statusLabel(s)}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  );
}

function StakeholdersTab({ projectId, stakeholders, reload, canWrite }: { projectId: string; stakeholders: Stakeholder[]; reload: () => void; canWrite: boolean }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", role: "", phone: "", email: "", notes: "" });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("الاسم مطلوب");
    const r = await fetch(`/api/social-projects/${projectId}/stakeholders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (r.ok) {
      toast.success("تم");
      setForm({ name: "", role: "", phone: "", email: "", notes: "" });
      setOpen(false);
      reload();
    } else toast.error("فشل");
  };

  const del = async (id: string) => {
    if (!confirm("حذف؟")) return;
    const r = await fetch(`/api/project-stakeholders/${id}`, { method: "DELETE" });
    if (r.ok) { toast.success("تم"); reload(); }
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">سجل المتدخلين والشركاء (إمام مسجد، جمعية شريكة، راعٍ...)</p>
        {canWrite && <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button size="sm"><Plus size={14} />متدخل جديد</Button>} />
          <DialogContent>
            <DialogHeader><DialogTitle>إضافة متدخل</DialogTitle></DialogHeader>
            <form onSubmit={submit} className="space-y-3">
              <div><Label>الاسم *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>الدور</Label><Input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="إمام، راعٍ، جمعية شريكة..." /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>الهاتف</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} dir="ltr" /></div>
                <div><Label>البريد</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} dir="ltr" /></div>
              </div>
              <div><Label>ملاحظات</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
              <Button type="submit" className="w-full">إضافة</Button>
            </form>
          </DialogContent>
        </Dialog>}
      </div>
      <Card>
        <CardContent className="divide-y p-0">
          {stakeholders.length === 0 && <p className="text-center text-muted-foreground py-8">لا يوجد متدخلون مسجَّلون</p>}
          {stakeholders.map((s) => (
            <div key={s.id} className="p-3 text-sm flex items-start gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{s.name}</span>
                  {s.role && <Badge variant="outline" className="text-[10px]">{s.role}</Badge>}
                </div>
                <div className="text-xs text-muted-foreground mt-1 space-x-3" dir="ltr">
                  {s.phone && <span>📞 {s.phone}</span>}
                  {s.email && <span>✉️ {s.email}</span>}
                </div>
                {s.notes && <p className="text-xs text-muted-foreground mt-1">{s.notes}</p>}
              </div>
              {canWrite && (
                <Button size="icon" variant="ghost" onClick={() => del(s.id)}>
                  <Trash2 size={13} />
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  );
}

function ExpensesTab({
  projectId,
  tasks,
  expenses,
  plans,
  reload,
  canWrite,
}: {
  projectId: string;
  tasks: Task[];
  expenses: ProjectExpense[];
  plans: Plan[];
  reload: () => void;
  canWrite: boolean;
}) {
  // Aggregate per task
  const totalPlanned = tasks.reduce((s, t) => s + (t.plannedExpense ? Number(t.plannedExpense) : 0), 0);
  const totalActualOnTasks = tasks.reduce((s, t) => s + (t.actualExpense ? Number(t.actualExpense) : 0), 0);
  const totalProjectExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const variance = totalActualOnTasks - totalPlanned;

  const planById = Object.fromEntries(plans.map((p) => [p.id, p]));

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <Card>
          <CardContent className="py-3">
            <p className="text-xs text-muted-foreground">إجمالي المخطط</p>
            <p className="text-2xl font-bold">{totalPlanned.toFixed(0)} د.م</p>
            <p className="text-[10px] text-muted-foreground">حسب البطاقات التقنية للمهام</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3">
            <p className="text-xs text-muted-foreground">المصاريف الإجمالية الفعلية</p>
            <p className={`text-2xl font-bold ${variance > 0 ? "text-red-600" : "text-green-600"}`}>{totalActualOnTasks.toFixed(0)} د.م</p>
            <p className="text-[10px] text-muted-foreground">مجموع المبالغ الفعلية المُسجَّلة على المهام</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3">
            <p className="text-xs text-muted-foreground">الفارق</p>
            <p className={`text-2xl font-bold ${variance > 0 ? "text-red-600" : variance < 0 ? "text-green-600" : ""}`}>
              {variance > 0 ? "+" : ""}{variance.toFixed(0)} د.م
            </p>
            <p className="text-[10px] text-muted-foreground">
              {variance > 0 ? "تجاوز الميزانية" : variance < 0 ? "وفر مقابل المخطط" : "مطابق"}
              {totalPlanned > 0 && ` (${((variance / totalPlanned) * 100).toFixed(0)}%)`}
            </p>
          </CardContent>
        </Card>
      </div>

      {expenses.length > 0 && (
        <p className="text-xs text-muted-foreground">
          ℹ️ هناك أيضا {expenses.length} مصروف رسمي ({totalProjectExpenses.toFixed(0)} د.م) مرتبط بهذا المشروع في سجل المالية — يظهر أسفل هذه الصفحة.
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">المصاريف حسب المهمة</CardTitle>
          <p className="text-xs text-muted-foreground">المسؤول يضع المخطط، المنفّذ يضع الفعلي عند تحديث الحالة</p>
        </CardHeader>
        <CardContent className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-right p-2">المهمة</th>
                <th className="text-right p-2">الحالة</th>
                <th className="text-right p-2">المخطط</th>
                <th className="text-right p-2">الفعلي</th>
                <th className="text-right p-2">الفارق</th>
                <th className="text-right p-2">المسؤولون</th>
              </tr>
            </thead>
            <tbody>
              {tasks.length === 0 ? (
                <tr><td colSpan={6} className="text-center text-muted-foreground py-4">لا توجد مهام</td></tr>
              ) : (
                tasks.map((t) => {
                  const planned = t.plannedExpense ? Number(t.plannedExpense) : 0;
                  const actual = t.actualExpense ? Number(t.actualExpense) : 0;
                  const diff = actual - planned;
                  const overBudget = planned > 0 && diff > 0;
                  return (
                    <tr key={t.id} className="border-b">
                      <td className="p-2 font-medium">{t.title}</td>
                      <td className="p-2"><Badge variant="outline" className="text-[10px]">{TASK_STATUS_LABELS[t.status]}</Badge></td>
                      <td className="p-2 font-mono">{planned > 0 ? planned.toFixed(2) : "—"}</td>
                      <td className="p-2 font-mono">{actual > 0 ? actual.toFixed(2) : "—"}</td>
                      <td className={`p-2 font-mono ${overBudget ? "text-red-600" : diff < 0 ? "text-green-600" : ""}`}>
                        {actual > 0 && planned > 0 ? `${diff >= 0 ? "+" : ""}${diff.toFixed(2)}` : "—"}
                      </td>
                      <td className="p-2 text-xs text-muted-foreground">
                        {t.assignees.map((a) => a.member.fullName).join("، ") || "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {tasks.length > 0 && (
              <tfoot>
                <tr className="border-t-2 font-bold">
                  <td className="p-2">الإجمالي</td>
                  <td className="p-2"></td>
                  <td className="p-2 font-mono">{totalPlanned.toFixed(2)}</td>
                  <td className="p-2 font-mono">{totalActualOnTasks.toFixed(2)}</td>
                  <td className={`p-2 font-mono ${variance > 0 ? "text-red-600" : "text-green-600"}`}>
                    {variance >= 0 ? "+" : ""}{variance.toFixed(2)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </CardContent>
      </Card>

      {expenses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">مصاريف رسمية مرتبطة (من سجل المالية)</CardTitle>
            <p className="text-xs text-muted-foreground">مصاريف سُجِّلت في /financial/expenses وارتبطت بهذا المشروع</p>
          </CardHeader>
          <CardContent className="divide-y p-0">
            {expenses.map((e) => {
              const plan = e.planId ? planById[e.planId] : null;
              return (
                <div key={e.id} className="flex items-center gap-3 p-3 text-sm">
                  <div className="flex-1">
                    <p className="font-medium">{e.description}</p>
                    <div className="flex gap-2 text-xs text-muted-foreground mt-1 flex-wrap">
                      <span>{e.expenseDate.slice(0, 10)}</span>
                      <Badge variant="outline" className="text-[10px]">{e.category}</Badge>
                      {plan && <Badge variant="secondary" className="text-[10px]">{plan.name}</Badge>}
                    </div>
                  </div>
                  <span className="font-mono font-bold">{Number(e.amount).toFixed(2)} د.م</span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function PublishShareDialog({
  open,
  onClose,
  url,
  projectName,
}: {
  open: boolean;
  onClose: () => void;
  url: string;
  projectName: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("تم النسخ");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("تعذّر النسخ");
    }
  };

  const whatsappShare = `https://wa.me/?text=${encodeURIComponent(`${projectName}\n${url}`)}`;
  const fbShare = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>🌐 صفحة عامة منشورة</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">شارك هذا الرابط مع المتبرعين والشركاء. الصفحة لا تتطلب تسجيل دخول.</p>

          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg border">
            <input
              readOnly
              value={url}
              dir="ltr"
              className="flex-1 bg-transparent text-sm font-mono outline-none"
              onClick={(e) => (e.currentTarget as HTMLInputElement).select()}
            />
            <Button size="sm" onClick={copy}>
              {copied ? "✓" : "📋"} {copied ? "تم" : "نسخ"}
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <a href={whatsappShare} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white text-sm hover:bg-green-700">
              💬 واتساب
            </a>
            <a href={fbShare} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700">
              📘 فيسبوك
            </a>
          </div>

          <a href={url} target="_blank" rel="noopener noreferrer" className="block text-center text-sm text-blue-600 underline">
            معاينة الصفحة العامة في تبويب جديد ↗
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
}
