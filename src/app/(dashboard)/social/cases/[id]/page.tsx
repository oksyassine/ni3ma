"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

type CaseDetail = {
  id: string;
  caseNumber: number;
  type: "GENERAL" | "YATIM" | "MOZWIZ";
  fullName: string;
  dateOfBirth: string | null;
  gender: "MALE" | "FEMALE" | null;
  cin: string | null;
  phone: string | null;
  address: string | null;
  fatherName: string | null;
  fatherDeceased: boolean | null;
  motherName: string | null;
  motherDeceased: boolean | null;
  guardianName: string | null;
  guardianRelation: string | null;
  guardianPhone: string | null;
  monthlyIncome: string | null;
  familySize: number | null;
  housingStatus: string | null;
  financialProofUrl: string | null;
  yatimOverrideReason: string | null;
  notes: string | null;
  schoolFollowups: SchoolFollowup[];
  healthFollowups: HealthFollowup[];
  projectLinks: { id: string; project: { id: string; name: string; status: string } }[];
};

type SchoolFollowup = { id: string; semester: string | null; gpa: string | null; progressNotes: string | null; createdAt: string };
type HealthFollowup = { id: string; hasSpecialOperation: boolean; illness: string | null; treatmentNotes: string | null; progressNotes: string | null; createdAt: string };

export default function CaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<CaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const r = await fetch(`/api/social-cases/${id}`);
    if (r.status === 403) { setDenied(true); setLoading(false); return; }
    if (r.status === 404) { setLoading(false); return; }
    const d = await r.json();
    setData(d);
    setLoading(false);
  };
  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveCase = async () => {
    if (!data) return;
    setSaving(true);
    const r = await fetch(`/api/social-cases/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: data.fullName, type: data.type,
        dateOfBirth: data.dateOfBirth, gender: data.gender,
        cin: data.cin, phone: data.phone, address: data.address,
        fatherName: data.fatherName, fatherDeceased: data.fatherDeceased,
        motherName: data.motherName, motherDeceased: data.motherDeceased,
        guardianName: data.guardianName, guardianRelation: data.guardianRelation, guardianPhone: data.guardianPhone,
        monthlyIncome: data.monthlyIncome, familySize: data.familySize, housingStatus: data.housingStatus, financialProofUrl: data.financialProofUrl,
        notes: data.notes,
      }),
    });
    const out = await r.json().catch(() => ({}));
    if (r.ok) { toast.success("تم الحفظ"); load(); }
    else toast.error(out.error ?? "فشل");
    setSaving(false);
  };

  const removeCase = async () => {
    if (!confirm("حذف هذه الحالة نهائيا؟")) return;
    const r = await fetch(`/api/social-cases/${id}`, { method: "DELETE" });
    if (r.ok) { toast.success("تم"); window.location.href = "/social/cases"; }
    else toast.error("فشل");
  };

  if (loading) return <div className="text-center py-12">جاري التحميل...</div>;
  if (denied) return <Card><CardContent className="py-12 text-center text-muted-foreground">صلاحية الوصول مقيدة بفريق البحث الاجتماعي والإدارة.</CardContent></Card>;
  if (!data) return <div>لم نجد الحالة.</div>;

  const set = <K extends keyof CaseDetail>(k: K, v: CaseDetail[K]) => setData({ ...data, [k]: v });

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            {data.type === "YATIM" && <Badge className="bg-amber-100 text-amber-800">يتيم</Badge>}
            {data.type === "MOZWIZ" && <Badge className="bg-blue-100 text-blue-800">محتاج</Badge>}
            {data.type === "GENERAL" && <Badge variant="outline">عام</Badge>}
            <span className="text-xs text-muted-foreground" dir="ltr">#{data.caseNumber}</span>
            <h1 className="text-2xl font-bold">{data.fullName}</h1>
          </div>
          {data.projectLinks.length > 0 && (
            <p className="text-sm text-muted-foreground mt-1">
              مشاريع مرتبطة: {data.projectLinks.map((l) => (
                <Link key={l.id} className="underline mx-1" href={`/social/projects/${l.project.id}`}>{l.project.name}</Link>
              ))}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Link href="/social/cases"><Button variant="outline">رجوع</Button></Link>
          <Button variant="destructive" onClick={removeCase}>حذف</Button>
        </div>
      </div>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">📋 المعلومات</TabsTrigger>
          <TabsTrigger value="school">📚 المتابعة المدرسية ({data.schoolFollowups.length})</TabsTrigger>
          <TabsTrigger value="health">🏥 المتابعة الصحية ({data.healthFollowups.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle>المعلومات الشخصية</CardTitle></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1"><Label>الاسم الكامل *</Label><Input value={data.fullName} onChange={(e) => set("fullName", e.target.value)} required /></div>
              <div className="space-y-1"><Label>تاريخ الازدياد</Label><Input type="date" value={data.dateOfBirth?.split("T")[0] ?? ""} onChange={(e) => set("dateOfBirth", e.target.value || null)} dir="ltr" /></div>
              <div className="space-y-1">
                <Label>الجنس</Label>
                <select className="border rounded-md w-full h-9 px-2 text-sm" value={data.gender ?? ""} onChange={(e) => set("gender", (e.target.value || null) as "MALE" | "FEMALE" | null)}>
                  <option value="">—</option><option value="MALE">ذكر</option><option value="FEMALE">أنثى</option>
                </select>
              </div>
              <div className="space-y-1"><Label>ب.و.ت</Label><Input value={data.cin ?? ""} onChange={(e) => set("cin", e.target.value || null)} dir="ltr" className="text-right" /></div>
              <div className="space-y-1"><Label>الهاتف</Label><Input value={data.phone ?? ""} onChange={(e) => set("phone", e.target.value || null)} dir="ltr" className="text-right" /></div>
              <div className="space-y-1 md:col-span-2"><Label>العنوان</Label><Input value={data.address ?? ""} onChange={(e) => set("address", e.target.value || null)} /></div>
            </CardContent>
          </Card>

          {data.type === "YATIM" && (
            <Card className="border-amber-200">
              <CardHeader><CardTitle>معلومات اليتيم</CardTitle></CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1"><Label>اسم الأب</Label><Input value={data.fatherName ?? ""} onChange={(e) => set("fatherName", e.target.value || null)} /></div>
                <label className="flex items-center gap-2 text-sm self-end pb-2"><input type="checkbox" checked={!!data.fatherDeceased} onChange={(e) => set("fatherDeceased", e.target.checked)} />الأب متوفى</label>
                <div className="space-y-1"><Label>اسم الأم</Label><Input value={data.motherName ?? ""} onChange={(e) => set("motherName", e.target.value || null)} /></div>
                <label className="flex items-center gap-2 text-sm self-end pb-2"><input type="checkbox" checked={!!data.motherDeceased} onChange={(e) => set("motherDeceased", e.target.checked)} />الأم متوفاة</label>
                <div className="space-y-1"><Label>اسم الولي</Label><Input value={data.guardianName ?? ""} onChange={(e) => set("guardianName", e.target.value || null)} /></div>
                <div className="space-y-1"><Label>صلة القرابة</Label><Input value={data.guardianRelation ?? ""} onChange={(e) => set("guardianRelation", e.target.value || null)} /></div>
                <div className="space-y-1 md:col-span-2"><Label>هاتف الولي</Label><Input value={data.guardianPhone ?? ""} onChange={(e) => set("guardianPhone", e.target.value || null)} dir="ltr" className="text-right" /></div>
                {data.fatherDeceased === false && (
                  <div className="md:col-span-2 p-3 rounded-md bg-red-50 border border-red-200 text-sm">
                    <p className="font-medium text-red-700">⚠️ تم تسجيله كيتيم رغم أن الأب على قيد الحياة</p>
                    <p className="text-red-600 mt-1">سبب الاستثناء: {data.yatimOverrideReason ?? "—"}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {data.type === "MOZWIZ" && (
            <Card className="border-blue-200">
              <CardHeader><CardTitle>الوضعية الاجتماعية</CardTitle></CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1"><Label>الدخل الشهري (د.م)</Label><Input type="number" step="0.01" value={data.monthlyIncome ?? ""} onChange={(e) => set("monthlyIncome", e.target.value || null)} dir="ltr" className="text-right" /></div>
                <div className="space-y-1"><Label>عدد أفراد الأسرة</Label><Input type="number" min="1" value={data.familySize ?? ""} onChange={(e) => set("familySize", e.target.value ? parseInt(e.target.value) : null)} dir="ltr" className="text-right" /></div>
                <div className="space-y-1 md:col-span-2"><Label>وضع السكن</Label><Input value={data.housingStatus ?? ""} onChange={(e) => set("housingStatus", e.target.value || null)} placeholder="ملك / كراء / إيواء..." /></div>
                <div className="space-y-1 md:col-span-2"><Label>رابط الإثبات المالي</Label><Input value={data.financialProofUrl ?? ""} onChange={(e) => set("financialProofUrl", e.target.value || null)} dir="ltr" className="text-right" placeholder="https://..." /></div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle>ملاحظات عامة</CardTitle></CardHeader>
            <CardContent><Textarea rows={4} value={data.notes ?? ""} onChange={(e) => set("notes", e.target.value || null)} /></CardContent>
          </Card>

          <Button onClick={saveCase} disabled={saving}>{saving ? "جاري الحفظ..." : "حفظ المعلومات"}</Button>
        </TabsContent>

        <TabsContent value="school" className="mt-4">
          <SchoolFollowupTab caseId={id} items={data.schoolFollowups} reload={load} />
        </TabsContent>
        <TabsContent value="health" className="mt-4">
          <HealthFollowupTab caseId={id} items={data.healthFollowups} reload={load} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SchoolFollowupTab({ caseId, items, reload }: { caseId: string; items: SchoolFollowup[]; reload: () => void }) {
  const [form, setForm] = useState({ semester: "", gpa: "", progressNotes: "" });
  const [saving, setSaving] = useState(false);

  const add = async () => {
    if (!form.semester && !form.gpa && !form.progressNotes) return toast.error("أدخل معطيات");
    setSaving(true);
    const r = await fetch(`/api/social-cases/${caseId}/school-followups`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
    });
    if (r.ok) { toast.success("تم"); setForm({ semester: "", gpa: "", progressNotes: "" }); reload(); }
    else toast.error("فشل");
    setSaving(false);
  };

  const del = async (fid: string) => {
    if (!confirm("حذف؟")) return;
    const r = await fetch(`/api/social-cases/${caseId}/school-followups/${fid}`, { method: "DELETE" });
    if (r.ok) { toast.success("تم"); reload(); }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>إضافة متابعة مدرسية</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <div className="space-y-1"><Label>الدورة</Label><Input value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })} placeholder="مثال: الدورة الأولى 2025-2026" /></div>
          <div className="space-y-1"><Label>المعدل</Label><Input type="number" step="0.01" min="0" max="20" value={form.gpa} onChange={(e) => setForm({ ...form, gpa: e.target.value })} dir="ltr" className="text-right" /></div>
          <div className="space-y-1 md:col-span-3"><Label>ملاحظات حول التقدم</Label><Textarea rows={2} value={form.progressNotes} onChange={(e) => setForm({ ...form, progressNotes: e.target.value })} /></div>
          <div className="md:col-span-3"><Button onClick={add} disabled={saving}>{saving ? "..." : "إضافة"}</Button></div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>السجل</CardTitle></CardHeader>
        <CardContent className="p-0 divide-y">
          {items.length === 0 && <p className="p-6 text-center text-muted-foreground">لا توجد متابعات بعد</p>}
          {items.map((f) => (
            <div key={f.id} className="p-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <div className="font-medium">{f.semester ?? "—"}</div>
                <div className="flex items-center gap-2">
                  {f.gpa && <Badge variant="outline">المعدل: {Number(f.gpa).toFixed(2)}/20</Badge>}
                  <span className="text-xs text-muted-foreground">{new Date(f.createdAt).toLocaleDateString("ar-MA")}</span>
                  <Button size="icon" variant="ghost" onClick={() => del(f.id)}><Trash2 size={13} /></Button>
                </div>
              </div>
              {f.progressNotes && <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{f.progressNotes}</p>}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function HealthFollowupTab({ caseId, items, reload }: { caseId: string; items: HealthFollowup[]; reload: () => void }) {
  const [form, setForm] = useState({ hasSpecialOperation: false, illness: "", treatmentNotes: "", progressNotes: "" });
  const [saving, setSaving] = useState(false);

  const add = async () => {
    if (!form.illness && !form.treatmentNotes && !form.progressNotes && !form.hasSpecialOperation) return toast.error("أدخل معطيات");
    setSaving(true);
    const r = await fetch(`/api/social-cases/${caseId}/health-followups`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
    });
    if (r.ok) { toast.success("تم"); setForm({ hasSpecialOperation: false, illness: "", treatmentNotes: "", progressNotes: "" }); reload(); }
    else toast.error("فشل");
    setSaving(false);
  };

  const del = async (fid: string) => {
    if (!confirm("حذف؟")) return;
    const r = await fetch(`/api/social-cases/${caseId}/health-followups/${fid}`, { method: "DELETE" });
    if (r.ok) { toast.success("تم"); reload(); }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>إضافة متابعة صحية</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.hasSpecialOperation} onChange={(e) => setForm({ ...form, hasSpecialOperation: e.target.checked })} />
            يحتاج إلى عملية خاصة
          </label>
          <div className="space-y-1"><Label>المرض / الحالة</Label><Input value={form.illness} onChange={(e) => setForm({ ...form, illness: e.target.value })} /></div>
          <div className="space-y-1"><Label>العلاج المتبع</Label><Textarea rows={2} value={form.treatmentNotes} onChange={(e) => setForm({ ...form, treatmentNotes: e.target.value })} /></div>
          <div className="space-y-1"><Label>تقدم الشفاء</Label><Textarea rows={2} value={form.progressNotes} onChange={(e) => setForm({ ...form, progressNotes: e.target.value })} /></div>
          <Button onClick={add} disabled={saving}>{saving ? "..." : "إضافة"}</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>السجل</CardTitle></CardHeader>
        <CardContent className="p-0 divide-y">
          {items.length === 0 && <p className="p-6 text-center text-muted-foreground">لا توجد متابعات بعد</p>}
          {items.map((f) => (
            <div key={f.id} className="p-3 text-sm space-y-1">
              <div className="flex items-center justify-between gap-2">
                <div className="font-medium flex items-center gap-2">
                  {f.illness ?? "—"}
                  {f.hasSpecialOperation && <Badge className="bg-red-100 text-red-700 text-[10px]">عملية خاصة</Badge>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{new Date(f.createdAt).toLocaleDateString("ar-MA")}</span>
                  <Button size="icon" variant="ghost" onClick={() => del(f.id)}><Trash2 size={13} /></Button>
                </div>
              </div>
              {f.treatmentNotes && <p className="text-xs"><strong>العلاج:</strong> {f.treatmentNotes}</p>}
              {f.progressNotes && <p className="text-xs"><strong>التقدم:</strong> {f.progressNotes}</p>}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
