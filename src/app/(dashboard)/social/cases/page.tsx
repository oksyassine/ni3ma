"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Upload } from "lucide-react";

type Case = {
  id: string;
  caseNumber: number;
  type: "YATIM" | "MOZWIZ" | "GENERAL";
  fullName: string;
  dateOfBirth: string | null;
  gender: "MALE" | "FEMALE" | null;
  phone: string | null;
  fatherDeceased: boolean | null;
  motherDeceased: boolean | null;
  monthlyIncome: string | null;
  familySize: number | null;
  housingStatus: string | null;
  createdAt: string;
  _count: { schoolFollowups: number; healthFollowups: number; projectLinks: number };
};

const ageOf = (dob: string | null) =>
  dob ? Math.floor((Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25)) : null;

export default function SocialCasesPage() {
  const [cases, setCases] = useState<Case[]>([]);
  const [search, setSearch] = useState("");
  const [type, setType] = useState<"" | "YATIM" | "MOZWIZ" | "GENERAL">("");
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);

  const load = async () => {
    setLoading(true);
    const r = await fetch(`/api/social-cases?search=${encodeURIComponent(search)}&type=${type}`);
    if (r.status === 403) { setDenied(true); setLoading(false); return; }
    const data = await r.json();
    setCases(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [search, type]); // eslint-disable-line react-hooks/exhaustive-deps

  if (denied) {
    return (
      <Card><CardContent className="py-12 text-center text-muted-foreground">هذه الصفحة مخصصة لفريق البحث الاجتماعي والإدارة فقط.</CardContent></Card>
    );
  }

  const stats = {
    total: cases.length,
    yatim: cases.filter((c) => c.type === "YATIM").length,
    mozwiz: cases.filter((c) => c.type === "MOZWIZ").length,
    needsFollowup: cases.filter((c) => c._count.schoolFollowups === 0 && c._count.healthFollowups === 0).length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">الحالات الاجتماعية</h1>
          <p className="text-muted-foreground">السجل المركزي للأيتام والمحتاجين — يديره فريق البحث الاجتماعي</p>
        </div>
        <div className="flex gap-2 items-center">
          <ImportDialog onImported={load} />
          <NewCaseDialog onCreated={load} />
        </div>
      </div>

      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <Card><CardHeader className="pb-1"><CardTitle className="text-sm text-muted-foreground">المجموع</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold">{stats.total}</div></CardContent></Card>
        <Card><CardHeader className="pb-1"><CardTitle className="text-sm text-muted-foreground">أيتام</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold text-amber-600">{stats.yatim}</div></CardContent></Card>
        <Card><CardHeader className="pb-1"><CardTitle className="text-sm text-muted-foreground">محتاجون</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold text-blue-600">{stats.mozwiz}</div></CardContent></Card>
        <Card><CardHeader className="pb-1"><CardTitle className="text-sm text-muted-foreground">يحتاج إلى متابعة</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold">{stats.needsFollowup}</div></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-4 flex flex-wrap gap-3 items-center">
          <Input placeholder="البحث بالاسم..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
          <select className="border rounded-md h-9 px-2 text-sm" value={type} onChange={(e) => setType(e.target.value as "" | "YATIM" | "MOZWIZ" | "GENERAL")}>
            <option value="">كل الأنواع</option>
            <option value="YATIM">أيتام</option>
            <option value="MOZWIZ">محتاجون</option>
            <option value="GENERAL">عام</option>
          </select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 divide-y">
          {loading && <p className="p-6 text-center text-muted-foreground">جاري التحميل...</p>}
          {!loading && cases.length === 0 && <p className="p-12 text-center text-muted-foreground">لا توجد حالات مسجلة</p>}
          {!loading && cases.map((c) => {
            const age = ageOf(c.dateOfBirth);
            return (
              <Link key={c.id} href={`/social/cases/${c.id}`} className="flex items-center gap-3 p-3 hover:bg-muted/50 transition">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {c.type === "YATIM" && <Badge className="bg-amber-100 text-amber-800 text-[10px]">يتيم</Badge>}
                    {c.type === "MOZWIZ" && <Badge className="bg-blue-100 text-blue-800 text-[10px]">محتاج</Badge>}
                    {c.type === "GENERAL" && <Badge variant="outline" className="text-[10px]">عام</Badge>}
                    <span className="text-xs text-muted-foreground" dir="ltr">#{c.caseNumber}</span>
                    <span className="font-medium">{c.fullName}</span>
                    {age != null && <span className="text-xs text-muted-foreground">{age} سنة</span>}
                    {c.gender === "MALE" && <span className="text-xs">♂</span>}
                    {c.gender === "FEMALE" && <span className="text-xs">♀</span>}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-3">
                    {c.phone && <span dir="ltr">{c.phone}</span>}
                    {c.familySize != null && <span>أسرة: {c.familySize}</span>}
                    {c.monthlyIncome && <span>دخل: {Number(c.monthlyIncome).toFixed(0)} د.م</span>}
                    {c._count.projectLinks > 0 && <span>مشاريع: {c._count.projectLinks}</span>}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground space-y-1 text-left">
                  <div>📚 {c._count.schoolFollowups}</div>
                  <div>🏥 {c._count.healthFollowups}</div>
                </div>
              </Link>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

function NewCaseDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    type: "YATIM" as "YATIM" | "MOZWIZ" | "GENERAL",
    fullName: "", dateOfBirth: "", gender: "", phone: "", address: "", cin: "",
    fatherName: "", fatherDeceased: false,
    motherName: "", motherDeceased: false,
    guardianName: "", guardianRelation: "", guardianPhone: "",
    monthlyIncome: "", familySize: "", housingStatus: "",
    notes: "",
    yatimOverrideReason: "",
  });
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName.trim()) return toast.error("الاسم مطلوب");
    setSaving(true);
    const r = await fetch("/api/social-cases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const d = await r.json().catch(() => ({}));
    if (r.ok) { toast.success("تم إنشاء الحالة"); setOpen(false); onCreated(); }
    else toast.error(d.error ?? "فشل");
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button><Plus size={14} />حالة جديدة</Button>} />
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>إضافة حالة اجتماعية</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1">
            <Label>نوع الحالة</Label>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant={form.type === "YATIM" ? "default" : "outline"} onClick={() => setForm({ ...form, type: "YATIM" })}>يتيم</Button>
              <Button type="button" size="sm" variant={form.type === "MOZWIZ" ? "default" : "outline"} onClick={() => setForm({ ...form, type: "MOZWIZ" })}>محتاج</Button>
              <Button type="button" size="sm" variant={form.type === "GENERAL" ? "default" : "outline"} onClick={() => setForm({ ...form, type: "GENERAL" })}>عام</Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div><Label>الاسم *</Label><Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required /></div>
            <div><Label>الهاتف</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} dir="ltr" className="text-right" /></div>
            <div><Label>تاريخ الازدياد</Label><Input type="date" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} dir="ltr" /></div>
            <div>
              <Label>الجنس</Label>
              <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} className="border rounded-md w-full h-9 px-2 text-sm">
                <option value="">—</option><option value="MALE">ذكر</option><option value="FEMALE">أنثى</option>
              </select>
            </div>
            <div><Label>ب.و.ت</Label><Input value={form.cin} onChange={(e) => setForm({ ...form, cin: e.target.value })} dir="ltr" className="text-right" /></div>
            <div className="col-span-2"><Label>العنوان</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
          </div>

          {form.type === "YATIM" && (
            <div className="border rounded-md p-3 space-y-3 bg-amber-50/40">
              <p className="text-sm font-medium">معلومات اليتيم</p>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">اسم الأب</Label><Input value={form.fatherName} onChange={(e) => setForm({ ...form, fatherName: e.target.value })} /></div>
                <label className="flex items-center gap-2 text-sm self-end pb-2"><input type="checkbox" checked={form.fatherDeceased} onChange={(e) => setForm({ ...form, fatherDeceased: e.target.checked })} />الأب متوفى</label>
                <div><Label className="text-xs">اسم الأم</Label><Input value={form.motherName} onChange={(e) => setForm({ ...form, motherName: e.target.value })} /></div>
                <label className="flex items-center gap-2 text-sm self-end pb-2"><input type="checkbox" checked={form.motherDeceased} onChange={(e) => setForm({ ...form, motherDeceased: e.target.checked })} />الأم متوفاة</label>
                <div><Label className="text-xs">اسم الولي</Label><Input value={form.guardianName} onChange={(e) => setForm({ ...form, guardianName: e.target.value })} /></div>
                <div><Label className="text-xs">صلة القرابة</Label><Input value={form.guardianRelation} onChange={(e) => setForm({ ...form, guardianRelation: e.target.value })} /></div>
                <div className="col-span-2"><Label className="text-xs">هاتف الولي</Label><Input value={form.guardianPhone} onChange={(e) => setForm({ ...form, guardianPhone: e.target.value })} dir="ltr" className="text-right" /></div>
              </div>
              {!form.fatherDeceased && (
                <div>
                  <Label className="text-xs text-red-600">سبب الاستثناء (الأب على قيد الحياة)</Label>
                  <Textarea rows={2} value={form.yatimOverrideReason} onChange={(e) => setForm({ ...form, yatimOverrideReason: e.target.value })} placeholder="ضروري لتسجيل اليتيم رغم أن الأب على قيد الحياة" />
                </div>
              )}
            </div>
          )}

          {form.type === "MOZWIZ" && (
            <div className="border rounded-md p-3 space-y-3 bg-blue-50/40">
              <p className="text-sm font-medium">الوضعية الاجتماعية</p>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">الدخل الشهري (د.م)</Label><Input type="number" step="0.01" value={form.monthlyIncome} onChange={(e) => setForm({ ...form, monthlyIncome: e.target.value })} dir="ltr" className="text-right" /></div>
                <div><Label className="text-xs">عدد أفراد الأسرة</Label><Input type="number" min="1" value={form.familySize} onChange={(e) => setForm({ ...form, familySize: e.target.value })} dir="ltr" className="text-right" /></div>
                <div className="col-span-2"><Label className="text-xs">وضع السكن</Label><Input value={form.housingStatus} onChange={(e) => setForm({ ...form, housingStatus: e.target.value })} placeholder="ملك / كراء / إيواء..." /></div>
              </div>
            </div>
          )}

          <div><Label>ملاحظات</Label><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          <Button type="submit" className="w-full" disabled={saving}>{saving ? "..." : "إضافة"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ImportDialog({ onImported }: { onImported: () => void }) {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<{ total: number; valid: number; errors: { row: number; error: string }[]; preview: Record<string, unknown>[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = async (dryRun: boolean) => {
    if (!file) return toast.error("اختر ملفا أولا");
    setBusy(true);
    const fd = new FormData();
    fd.append("file", file);
    const r = await fetch(`/api/social-cases/import?dryRun=${dryRun ? "1" : "0"}`, { method: "POST", body: fd });
    const data = await r.json();
    if (!r.ok) { toast.error(data.error ?? "فشل"); setBusy(false); return; }
    if (dryRun) {
      setPreview(data);
    } else {
      toast.success(`تم استيراد ${data.inserted} حالة`);
      setOpen(false);
      setPreview(null);
      setFile(null);
      onImported();
    }
    setBusy(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setPreview(null); setFile(null); } }}>
      <DialogTrigger render={<Button variant="outline"><Upload size={14} />استيراد Excel</Button>} />
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>استيراد من ملف Excel / CSV</DialogTitle></DialogHeader>
        <div className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            الأعمدة المقبولة: الاسم (مطلوب), النوع (YATIM/MOZWIZ/GENERAL), الجنس, تاريخ الازدياد, الهاتف, العنوان, ب.و.ت, اسم الأب, الأب متوفى, اسم الأم, الأم متوفاة, اسم الولي, صلة الولي, هاتف الولي, الدخل الشهري, حجم الأسرة, وضع السكن, ملاحظات
          </p>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-sm file:bg-primary file:text-primary-foreground cursor-pointer"
          />

          <div className="flex gap-2">
            <Button variant="outline" disabled={!file || busy} onClick={() => upload(true)}>{busy ? "..." : "معاينة"}</Button>
            <Button disabled={!preview || (preview && preview.valid === 0) || busy} onClick={() => upload(false)}>{busy ? "..." : `استيراد ${preview?.valid ?? 0} حالة`}</Button>
          </div>

          {preview && (
            <div className="border rounded-md p-3 space-y-2 bg-muted/30">
              <div>الإجمالي: <strong>{preview.total}</strong> · الصالح: <strong className="text-green-700">{preview.valid}</strong> · الأخطاء: <strong className="text-red-600">{preview.errors.length}</strong></div>
              {preview.errors.length > 0 && (
                <details>
                  <summary className="cursor-pointer">الأخطاء ({preview.errors.length})</summary>
                  <ul className="mt-2 space-y-1 text-xs">
                    {preview.errors.slice(0, 50).map((e, i) => (
                      <li key={i}>الصف {e.row}: {e.error}</li>
                    ))}
                  </ul>
                </details>
              )}
              {preview.preview.length > 0 && (
                <details open>
                  <summary className="cursor-pointer">معاينة أول {preview.preview.length} صف</summary>
                  <ul className="mt-2 space-y-1 text-xs">
                    {preview.preview.map((p, i) => (
                      <li key={i}>{String(p.fullName)} — {String(p.type)}</li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
