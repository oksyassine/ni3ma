"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EDUCATIONAL_LEVELS } from "@/lib/constants";
import { ROLE_LABELS } from "@/lib/rbac";
import { toast } from "sonner";
import type { Role } from "@/lib/rbac";
import { validateUsernameFormat, suggestUsernameFromName } from "@/lib/validations/username";

const ALL_ROLES: Role[] = ["ADMIN", "BUREAU", "FINANCIAL", "EDUCATIONAL", "SOCIAL", "QURAN", "MEMBER", "BAHT_IJTIMA3I_TEAM"];

const REGISTRATION_TYPES = [
  { value: "TAMM",          label: "تسجيل تام" },
  { value: "DAAM_MADRASSI", label: "دعم مدرسي" },
  { value: "QURAN_TAJWEED", label: "حفظ وتجويد القرآن" },
  { value: "MOKHAYAM",      label: "مخيم" },
];
const REG_TYPE_LABEL: Record<string, string> = Object.fromEntries(REGISTRATION_TYPES.map((t) => [t.value, t.label]));
const GENDER_LABEL: Record<string, string> = { MALE: "ذكر", FEMALE: "أنثى" };
const MARITAL_LABEL: Record<string, string> = { SINGLE: "أعزب", MARRIED: "متزوج", DIVORCED: "مطلق", WIDOWED: "أرمل" };
const HEALTH_LABEL: Record<string, string> = { HEALTHY: "عادي", SICK: "مريض" };
const labelOr = (map: Record<string, string>, v: unknown) => (typeof v === "string" && map[v]) || "";

type AccessInfo = {
  username: string | null;
  userIsActive: boolean;
  roles: Role[];
};

export default function EditMemberPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [memberType, setMemberType] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [access, setAccess] = useState<AccessInfo | null>(null);
  const [accessForm, setAccessForm] = useState({ username: "", password: "", roles: [] as Role[] });
  const [savingAccess, setSavingAccess] = useState(false);
  const [revokingAccess, setRevokingAccess] = useState(false);

  const [form, setForm] = useState({
    registrationDate: "",
    registrationType: "",
    fullName: "",
    dateOfBirth: "",
    placeOfBirth: "",
    gender: "",
    educationalLevel: "",
    address: "",
    phone: "",
    subscriptionAmount: "",
    parentCin: "",
    fatherName: "",
    fatherCin: "",
    fatherProfession: "",
    fatherEducation: "",
    fatherPhone: "",
    fatherLandline: "",
    fatherAddress: "",
    motherName: "",
    motherCin: "",
    motherProfession: "",
    motherEducation: "",
    motherPhone: "",
    motherLandline: "",
    motherAddress: "",
    siblingsBoys: "",
    siblingsGirls: "",
    siblingOrder: "",
    healthStatus: "",
    healthConditions: "",
    cin: "",
    landline: "",
    profession: "",
    maritalStatus: "",
    childrenBoys: "",
    childrenGirls: "",
    interestJtima3iya: false,
    interestTarbawiya: false,
    interestFikriya: false,
    interests: "",
    associationRole: "",
    sections: [] as string[],
  });

  useEffect(() => {
    Promise.all([
      fetch(`/api/members/${id}`).then((r) => r.json()),
      fetch(`/api/members/${id}/access`).then((r) => r.json()),
    ]).then(([data, acc]: [Record<string, unknown>, AccessInfo]) => {
      setMemberType(String(data.memberType ?? ""));
      setPhotoUrl((data.photoUrl as string) ?? null);
      const sections = (data.sections as { section: string; isActive: boolean }[] | undefined) ?? [];
      const dob = data.dateOfBirth as string | null;
      const reg = data.registrationDate as string | null;
      setForm({
        registrationDate: reg ? reg.split("T")[0] : "",
        registrationType: (data.registrationType as string) || "",
        fullName: (data.fullName as string) || "",
        dateOfBirth: dob ? dob.split("T")[0] : "",
        placeOfBirth: (data.placeOfBirth as string) || "",
        gender: (data.gender as string) || "",
        educationalLevel: (data.educationalLevel as string) || "",
        address: (data.address as string) || "",
        phone: (data.phone as string) || "",
        subscriptionAmount: (data.subscriptionAmount as string) || "",
        parentCin: (data.parentCin as string) || "",
        fatherName: (data.fatherName as string) || "",
        fatherCin: (data.fatherCin as string) || "",
        fatherProfession: (data.fatherProfession as string) || "",
        fatherEducation: (data.fatherEducation as string) || "",
        fatherPhone: (data.fatherPhone as string) || "",
        fatherLandline: (data.fatherLandline as string) || "",
        fatherAddress: (data.fatherAddress as string) || "",
        motherName: (data.motherName as string) || "",
        motherCin: (data.motherCin as string) || "",
        motherProfession: (data.motherProfession as string) || "",
        motherEducation: (data.motherEducation as string) || "",
        motherPhone: (data.motherPhone as string) || "",
        motherLandline: (data.motherLandline as string) || "",
        motherAddress: (data.motherAddress as string) || "",
        siblingsBoys: data.siblingsBoys != null ? String(data.siblingsBoys) : "",
        siblingsGirls: data.siblingsGirls != null ? String(data.siblingsGirls) : "",
        siblingOrder: data.siblingOrder != null ? String(data.siblingOrder) : "",
        healthStatus: (data.healthStatus as string) || "",
        healthConditions: (data.healthConditions as string) || "",
        cin: (data.cin as string) || "",
        landline: (data.landline as string) || "",
        profession: (data.profession as string) || "",
        maritalStatus: (data.maritalStatus as string) || "",
        childrenBoys: data.childrenBoys != null ? String(data.childrenBoys) : "",
        childrenGirls: data.childrenGirls != null ? String(data.childrenGirls) : "",
        interestJtima3iya: !!data.interestJtima3iya,
        interestTarbawiya: !!data.interestTarbawiya,
        interestFikriya: !!data.interestFikriya,
        interests: (data.interests as string) || "",
        associationRole: (data.associationRole as string) || "",
        sections: sections.filter((s) => s.isActive).map((s) => s.section),
      });
      setAccess(acc);
      if (acc.username) {
        setAccessForm({ username: acc.username, password: "", roles: acc.roles });
      }
      setLoading(false);
    });
  }, [id]);

  const update = (field: string, value: string | boolean | null) =>
    setForm((p) => ({ ...p, [field]: value ?? "" }));

  const toggleSection = (section: string) => {
    setForm((prev) => ({
      ...prev,
      sections: prev.sections.includes(section)
        ? prev.sections.filter((s) => s !== section)
        : [...prev.sections, section],
    }));
  };

  const toggleAccessRole = (role: Role) => {
    setAccessForm((prev) => ({
      ...prev,
      roles: prev.roles.includes(role) ? prev.roles.filter((r) => r !== role) : [...prev.roles, role],
    }));
  };

  const handleSaveAccess = async () => {
    if (!accessForm.username) { toast.error("اسم المستخدم مطلوب"); return; }
    const usernameErr = validateUsernameFormat(accessForm.username);
    if (usernameErr) { toast.error(usernameErr); return; }
    if (!access?.username && !accessForm.password) { toast.error("كلمة المرور مطلوبة عند إنشاء حساب جديد"); return; }
    if (accessForm.roles.length === 0) { toast.error("يجب اختيار دور واحد على الأقل"); return; }
    setSavingAccess(true);
    const res = await fetch(`/api/members/${id}/access`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...accessForm, userIsActive: true }),
    });
    if (res.ok) {
      const updated = await res.json();
      setAccess(updated);
      setAccessForm((prev) => ({ ...prev, password: "" }));
      toast.success("تم حفظ صلاحيات الدخول");
    } else if (res.status === 409) {
      toast.error("اسم المستخدم محجوز");
    } else {
      toast.error("حدث خطأ");
    }
    setSavingAccess(false);
  };

  const handleRevokeAccess = async () => {
    if (!confirm("هل تريد إلغاء صلاحيات الدخول لهذا المنخرط؟")) return;
    setRevokingAccess(true);
    const res = await fetch(`/api/members/${id}/access`, { method: "DELETE" });
    if (res.ok) {
      setAccess({ username: null, userIsActive: false, roles: [] });
      setAccessForm({ username: "", password: "", roles: [] });
      toast.success("تم إلغاء الصلاحيات");
    } else {
      toast.error("حدث خطأ");
    }
    setRevokingAccess(false);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    const fd = new FormData();
    fd.append("photo", file);
    const res = await fetch(`/api/members/${id}/photo`, { method: "POST", body: fd });
    if (res.ok) {
      const data = await res.json();
      setPhotoUrl(data.photoUrl + "?t=" + Date.now());
      toast.success("تم رفع الصورة بنجاح");
    } else {
      const data = await res.json();
      toast.error(data.error ?? "فشل رفع الصورة");
    }
    setUploadingPhoto(false);
    e.target.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName.trim()) { toast.error("الاسم الكامل مطلوب"); return; }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        fullName: form.fullName,
        sections: form.sections,
        registrationType: form.registrationType || null,
        registrationDate: form.registrationDate || null,
        dateOfBirth: form.dateOfBirth || null,
        placeOfBirth: form.placeOfBirth || null,
        gender: form.gender || null,
        educationalLevel: form.educationalLevel || null,
        address: form.address || null,
        phone: form.phone || null,
        subscriptionAmount: form.subscriptionAmount || null,
      };

      if (memberType === "CHILD") {
        Object.assign(payload, {
          parentCin: form.parentCin || null,
          fatherName: form.fatherName || null,
          fatherCin: form.fatherCin || null,
          fatherProfession: form.fatherProfession || null,
          fatherEducation: form.fatherEducation || null,
          fatherPhone: form.fatherPhone || null,
          fatherLandline: form.fatherLandline || null,
          fatherAddress: form.fatherAddress || null,
          motherName: form.motherName || null,
          motherCin: form.motherCin || null,
          motherProfession: form.motherProfession || null,
          motherEducation: form.motherEducation || null,
          motherPhone: form.motherPhone || null,
          motherLandline: form.motherLandline || null,
          motherAddress: form.motherAddress || null,
          siblingsBoys: form.siblingsBoys ? parseInt(form.siblingsBoys) : null,
          siblingsGirls: form.siblingsGirls ? parseInt(form.siblingsGirls) : null,
          siblingOrder: form.siblingOrder ? parseInt(form.siblingOrder) : null,
          healthStatus: form.healthStatus || null,
          healthConditions: form.healthConditions || null,
        });
      } else {
        Object.assign(payload, {
          cin: form.cin || null,
          landline: form.landline || null,
          profession: form.profession || null,
          maritalStatus: form.maritalStatus || null,
          childrenBoys: form.childrenBoys ? parseInt(form.childrenBoys) : null,
          childrenGirls: form.childrenGirls ? parseInt(form.childrenGirls) : null,
          interestJtima3iya: form.interestJtima3iya,
          interestTarbawiya: form.interestTarbawiya,
          interestFikriya: form.interestFikriya,
          interests: form.interests || null,
          associationRole: form.associationRole || null,
        });
      }

      const res = await fetch(`/api/members/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "فشل في الحفظ");
      }
      toast.success("تم تحديث المعلومات بنجاح");
      router.push(`/admin/members/${id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "حدث خطأ أثناء التحديث");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-center py-12">جاري التحميل...</div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">تعديل بيانات المنخرط</h1>
          <p className="text-muted-foreground">{form.fullName}</p>
        </div>
        <Button variant="outline" onClick={() => router.back()}>رجوع</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>الصورة الشخصية</CardTitle></CardHeader>
        <CardContent className="flex items-center gap-6">
          <div className="w-24 h-24 rounded-full overflow-hidden bg-muted border-2 border-border shrink-0">
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoUrl} alt="صورة المنخرط" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl text-muted-foreground">👤</div>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="photo-upload">رفع صورة جديدة</Label>
            <input id="photo-upload" type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoUpload} disabled={uploadingPhoto}
              className="block text-sm text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground cursor-pointer" />
            <p className="text-xs text-muted-foreground">JPG أو PNG أو WEBP، بحد أقصى 5 ميغابايت</p>
            {uploadingPhoto && <p className="text-xs text-muted-foreground">جاري الرفع...</p>}
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>معطيات التسجيل</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>تاريخ التسجيل</Label>
              <Input type="date" value={form.registrationDate} onChange={(e) => update("registrationDate", e.target.value)} dir="ltr" />
            </div>
            <div className="space-y-2">
              <Label>نوع التسجيل</Label>
              <Select value={form.registrationType} onValueChange={(v) => update("registrationType", v)}>
                <SelectTrigger><SelectValue placeholder="اختر النوع">{labelOr(REG_TYPE_LABEL, form.registrationType) || "اختر النوع"}</SelectValue></SelectTrigger>
                <SelectContent>
                  {REGISTRATION_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 max-w-xs md:col-span-2">
              <Label>مبلغ الانخراط (درهم)</Label>
              <Input type="number" value={form.subscriptionAmount} onChange={(e) => update("subscriptionAmount", e.target.value)}
                placeholder="0.00" dir="ltr" className="text-right" step="0.01" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>المعلومات الشخصية</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label>الاسم الكامل *</Label>
              <Input value={form.fullName} onChange={(e) => update("fullName", e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>تاريخ الازدياد</Label>
              <Input type="date" value={form.dateOfBirth} onChange={(e) => update("dateOfBirth", e.target.value)} dir="ltr" />
            </div>
            <div className="space-y-2">
              <Label>مكان الازدياد</Label>
              <Input value={form.placeOfBirth} onChange={(e) => update("placeOfBirth", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>الجنس</Label>
              <Select value={form.gender} onValueChange={(v) => update("gender", v)}>
                <SelectTrigger><SelectValue placeholder="اختر الجنس">{labelOr(GENDER_LABEL, form.gender) || "اختر الجنس"}</SelectValue></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MALE">ذكر</SelectItem>
                  <SelectItem value="FEMALE">أنثى</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>المستوى الدراسي</Label>
              <Select value={form.educationalLevel} onValueChange={(v) => update("educationalLevel", v)}>
                <SelectTrigger><SelectValue placeholder="اختر المستوى">{form.educationalLevel || "اختر المستوى"}</SelectValue></SelectTrigger>
                <SelectContent>
                  {EDUCATIONAL_LEVELS.map((level) => (
                    <SelectItem key={level} value={level}>{level}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {memberType === "CHILD" ? (
          <>
            <Card>
              <CardHeader><CardTitle>الوضع الصحي</CardTitle></CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>الوضع الصحي</Label>
                  <Select value={form.healthStatus} onValueChange={(v) => update("healthStatus", v)}>
                    <SelectTrigger><SelectValue placeholder="اختر الوضع">{labelOr(HEALTH_LABEL, form.healthStatus) || "اختر الوضع"}</SelectValue></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="HEALTHY">عادي</SelectItem>
                      <SelectItem value="SICK">مريض</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {form.healthStatus === "SICK" && (
                  <div className="space-y-2">
                    <Label>نوع المرض / الأمراض</Label>
                    <Input value={form.healthConditions} onChange={(e) => update("healthConditions", e.target.value)} />
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>الإخوة</CardTitle></CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>عدد الإخوة الذكور</Label>
                  <Input type="number" min="0" value={form.siblingsBoys} onChange={(e) => update("siblingsBoys", e.target.value)} dir="ltr" className="text-right" />
                </div>
                <div className="space-y-2">
                  <Label>عدد الأخوات الإناث</Label>
                  <Input type="number" min="0" value={form.siblingsGirls} onChange={(e) => update("siblingsGirls", e.target.value)} dir="ltr" className="text-right" />
                </div>
                <div className="space-y-2">
                  <Label>الرتبة بين الإخوة</Label>
                  <Input type="number" min="1" value={form.siblingOrder} onChange={(e) => update("siblingOrder", e.target.value)} dir="ltr" className="text-right" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>معلومات الأب</CardTitle></CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2"><Label>اسم الأب</Label><Input value={form.fatherName} onChange={(e) => update("fatherName", e.target.value)} /></div>
                <div className="space-y-2"><Label>المهنة</Label><Input value={form.fatherProfession} onChange={(e) => update("fatherProfession", e.target.value)} /></div>
                <div className="space-y-2"><Label>رقم ب.و.ت</Label><Input value={form.fatherCin} onChange={(e) => update("fatherCin", e.target.value)} dir="ltr" className="text-right" /></div>
                <div className="space-y-2"><Label>المستوى الدراسي</Label><Input value={form.fatherEducation} onChange={(e) => update("fatherEducation", e.target.value)} /></div>
                <div className="space-y-2"><Label>الهاتف المحمول</Label><Input value={form.fatherPhone} onChange={(e) => update("fatherPhone", e.target.value)} dir="ltr" className="text-right" /></div>
                <div className="space-y-2"><Label>الهاتف الثابت</Label><Input value={form.fatherLandline} onChange={(e) => update("fatherLandline", e.target.value)} dir="ltr" className="text-right" /></div>
                <div className="space-y-2 md:col-span-2"><Label>العنوان</Label><Textarea rows={2} value={form.fatherAddress} onChange={(e) => update("fatherAddress", e.target.value)} /></div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>معلومات الأم</CardTitle></CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2"><Label>اسم الأم</Label><Input value={form.motherName} onChange={(e) => update("motherName", e.target.value)} /></div>
                <div className="space-y-2"><Label>المهنة</Label><Input value={form.motherProfession} onChange={(e) => update("motherProfession", e.target.value)} /></div>
                <div className="space-y-2"><Label>رقم ب.و.ت</Label><Input value={form.motherCin} onChange={(e) => update("motherCin", e.target.value)} dir="ltr" className="text-right" /></div>
                <div className="space-y-2"><Label>المستوى الدراسي</Label><Input value={form.motherEducation} onChange={(e) => update("motherEducation", e.target.value)} /></div>
                <div className="space-y-2"><Label>الهاتف المحمول</Label><Input value={form.motherPhone} onChange={(e) => update("motherPhone", e.target.value)} dir="ltr" className="text-right" /></div>
                <div className="space-y-2"><Label>الهاتف الثابت</Label><Input value={form.motherLandline} onChange={(e) => update("motherLandline", e.target.value)} dir="ltr" className="text-right" /></div>
                <div className="space-y-2 md:col-span-2"><Label>العنوان</Label><Textarea rows={2} value={form.motherAddress} onChange={(e) => update("motherAddress", e.target.value)} /></div>
                <div className="space-y-2 md:col-span-2"><Label>رقم ب.و.ت للولي (إن لم يكن أحد الوالدين)</Label><Input value={form.parentCin} onChange={(e) => update("parentCin", e.target.value)} dir="ltr" className="text-right" /></div>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            <Card>
              <CardHeader><CardTitle>معلومات المنخرط</CardTitle></CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2"><Label>رقم ب.و.ت</Label><Input value={form.cin} onChange={(e) => update("cin", e.target.value)} dir="ltr" className="text-right" /></div>
                <div className="space-y-2"><Label>المهنة</Label><Input value={form.profession} onChange={(e) => update("profession", e.target.value)} /></div>
                <div className="space-y-2">
                  <Label>الحالة العائلية</Label>
                  <Select value={form.maritalStatus} onValueChange={(v) => update("maritalStatus", v)}>
                    <SelectTrigger><SelectValue placeholder="اختر الحالة">{labelOr(MARITAL_LABEL, form.maritalStatus) || "اختر الحالة"}</SelectValue></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SINGLE">أعزب</SelectItem>
                      <SelectItem value="MARRIED">متزوج</SelectItem>
                      <SelectItem value="DIVORCED">مطلق</SelectItem>
                      <SelectItem value="WIDOWED">أرمل</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>الدور في الجمعية</Label><Input value={form.associationRole} onChange={(e) => update("associationRole", e.target.value)} /></div>
                <div className="space-y-2"><Label>عدد الأبناء الذكور</Label><Input type="number" min="0" value={form.childrenBoys} onChange={(e) => update("childrenBoys", e.target.value)} dir="ltr" className="text-right" /></div>
                <div className="space-y-2"><Label>عدد البنات</Label><Input type="number" min="0" value={form.childrenGirls} onChange={(e) => update("childrenGirls", e.target.value)} dir="ltr" className="text-right" /></div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>الاهتمامات</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="flex items-center gap-2">
                    <Checkbox id="ij" checked={form.interestJtima3iya} onCheckedChange={(v) => update("interestJtima3iya", !!v)} />
                    <Label htmlFor="ij" className="font-normal cursor-pointer">اجتماعية</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox id="it" checked={form.interestTarbawiya} onCheckedChange={(v) => update("interestTarbawiya", !!v)} />
                    <Label htmlFor="it" className="font-normal cursor-pointer">تربوية</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox id="if" checked={form.interestFikriya} onCheckedChange={(v) => update("interestFikriya", !!v)} />
                    <Label htmlFor="if" className="font-normal cursor-pointer">فكرية</Label>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>اهتمامات أخرى</Label>
                  <Input value={form.interests} onChange={(e) => update("interests", e.target.value)} placeholder="مثال: التربية، القرآن الكريم، الرياضة..." />
                </div>
              </CardContent>
            </Card>
          </>
        )}

        <Card>
          <CardHeader><CardTitle>معلومات الاتصال</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2"><Label>الهاتف المحمول</Label><Input value={form.phone} onChange={(e) => update("phone", e.target.value)} dir="ltr" className="text-right" /></div>
            {memberType === "ADULT" && (
              <div className="space-y-2"><Label>الهاتف الثابت</Label><Input value={form.landline} onChange={(e) => update("landline", e.target.value)} dir="ltr" className="text-right" /></div>
            )}
            <div className="space-y-2 md:col-span-2"><Label>العنوان</Label><Textarea value={form.address} onChange={(e) => update("address", e.target.value)} rows={2} /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>الانخراط في الأقسام</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Label>الأقسام</Label>
              <div className="flex gap-6 flex-wrap">
                {[
                  { value: "EDUCATIONAL", label: "القسم التربوي" },
                  { value: "SOCIAL", label: "القسم الاجتماعي" },
                  { value: "QURAN", label: "قسم القرآن الكريم" },
                  { value: "QUDAT", label: "مركز تأهيل القادة" },
                  { value: "MEDIA", label: "القسم الإعلامي" },
                ].map((section) => (
                  <div key={section.value} className="flex items-center gap-2">
                    <Checkbox
                      id={`edit-${section.value}`}
                      checked={form.sections.includes(section.value)}
                      onCheckedChange={() => toggleSection(section.value)}
                    />
                    <Label htmlFor={`edit-${section.value}`} className="cursor-pointer font-normal">
                      {section.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={saving}>
            {saving ? "جاري الحفظ..." : "حفظ التعديلات"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>إلغاء</Button>
        </div>
      </form>

      {memberType === "ADULT" && (
        <Card className="border-blue-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">صلاحيات الدخول</CardTitle>
              {access?.username ? (
                <Badge variant={access.userIsActive ? "default" : "secondary"}>
                  {access.userIsActive ? "مفعّل" : "معطّل"}
                </Badge>
              ) : (
                <Badge variant="outline">بدون حساب</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>اسم المستخدم</Label>
                <div className="flex gap-2">
                  <Input
                    value={accessForm.username}
                    onChange={(e) => setAccessForm((p) => ({ ...p, username: e.target.value.toLowerCase() }))}
                    placeholder="مثال: ahmed.alaoui"
                    dir="ltr"
                    className="text-right flex-1 min-w-0"
                  />
                  {form.fullName && !access?.username && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setAccessForm((p) => ({ ...p, username: suggestUsernameFromName(form.fullName) }))}
                      className="whitespace-nowrap"
                    >
                      ✨ اقتراح
                    </Button>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground">a-z و 0-9 والرموز . _ - فقط، 3-30 حرفا.</p>
              </div>
              <div className="space-y-2">
                <Label>{access?.username ? "كلمة مرور جديدة (اتركها فارغة للإبقاء)" : "كلمة المرور *"}</Label>
                <Input type="password" value={accessForm.password} onChange={(e) => setAccessForm((p) => ({ ...p, password: e.target.value }))} dir="ltr" className="text-right" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>الأدوار</Label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {ALL_ROLES.map((role) => (
                  <div key={role} className="flex items-center gap-2">
                    <Checkbox id={`access-role-${role}`} checked={accessForm.roles.includes(role)} onCheckedChange={() => toggleAccessRole(role)} />
                    <Label htmlFor={`access-role-${role}`} className="font-normal cursor-pointer text-sm">{ROLE_LABELS[role]}</Label>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 sm:gap-3 pt-2">
              <Button onClick={handleSaveAccess} disabled={savingAccess} className="flex-1 sm:flex-none min-w-0">
                {savingAccess ? "جاري الحفظ..." : access?.username ? "تحديث الصلاحيات" : "منح صلاحيات الدخول"}
              </Button>
              {access?.username && (
                <Button variant="destructive" onClick={handleRevokeAccess} disabled={revokingAccess} className="flex-1 sm:flex-none min-w-0">
                  {revokingAccess ? "جاري الإلغاء..." : "إلغاء الصلاحيات"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
