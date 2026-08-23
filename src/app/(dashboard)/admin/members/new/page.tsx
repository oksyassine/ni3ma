"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EDUCATIONAL_LEVELS } from "@/lib/constants";
import { toast } from "sonner";

const REGISTRATION_TYPES: { value: string; label: string }[] = [
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

const todayISO = () => new Date().toISOString().split("T")[0];

export default function NewMemberPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [memberType, setMemberType] = useState<"CHILD" | "ADULT">("CHILD");
  const [fees, setFees] = useState<Record<string, number>>({});

  const [form, setForm] = useState({
    // Common
    registrationDate: todayISO(),
    registrationType: "",
    fullName: "",
    dateOfBirth: "",
    placeOfBirth: "",
    gender: "",
    educationalLevel: "",
    address: "",
    phone: "",
    subscriptionAmount: "",
    // Child
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
    // Adult
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
  });

  // Load registration fees from association settings
  useEffect(() => {
    fetch("/api/association").then((r) => r.json()).then((info) => {
      const f = info?.registrationFees;
      if (f && typeof f === "object") setFees(f as Record<string, number>);
    }).catch(() => {});
  }, []);

  // Auto-fill subscription amount when type changes (user can override)
  useEffect(() => {
    if (form.registrationType && fees[form.registrationType] != null) {
      setForm((p) => ({ ...p, subscriptionAmount: String(fees[form.registrationType]) }));
    }
  }, [form.registrationType, fees]);

  const update = (field: string, value: string | boolean | null) =>
    setForm((p) => ({ ...p, [field]: value ?? "" }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName.trim()) {
      toast.error("الاسم الكامل مطلوب");
      return;
    }
    if (!form.registrationType) {
      toast.error("نوع التسجيل مطلوب");
      return;
    }

    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        memberType,
        registrationType: form.registrationType,
        registrationDate: form.registrationDate || undefined,
        fullName: form.fullName,
      };

      if (form.dateOfBirth) payload.dateOfBirth = form.dateOfBirth;
      if (form.placeOfBirth) payload.placeOfBirth = form.placeOfBirth;
      if (form.gender) payload.gender = form.gender;
      if (form.educationalLevel) payload.educationalLevel = form.educationalLevel;
      if (form.address) payload.address = form.address;
      if (form.phone) payload.phone = form.phone;
      if (form.subscriptionAmount) payload.subscriptionAmount = form.subscriptionAmount;

      if (memberType === "CHILD") {
        if (form.parentCin) payload.parentCin = form.parentCin;
        if (form.fatherName) payload.fatherName = form.fatherName;
        if (form.fatherCin) payload.fatherCin = form.fatherCin;
        if (form.fatherProfession) payload.fatherProfession = form.fatherProfession;
        if (form.fatherEducation) payload.fatherEducation = form.fatherEducation;
        if (form.fatherPhone) payload.fatherPhone = form.fatherPhone;
        if (form.fatherLandline) payload.fatherLandline = form.fatherLandline;
        if (form.fatherAddress) payload.fatherAddress = form.fatherAddress;
        if (form.motherName) payload.motherName = form.motherName;
        if (form.motherCin) payload.motherCin = form.motherCin;
        if (form.motherProfession) payload.motherProfession = form.motherProfession;
        if (form.motherEducation) payload.motherEducation = form.motherEducation;
        if (form.motherPhone) payload.motherPhone = form.motherPhone;
        if (form.motherLandline) payload.motherLandline = form.motherLandline;
        if (form.motherAddress) payload.motherAddress = form.motherAddress;
        if (form.siblingsBoys) payload.siblingsBoys = parseInt(form.siblingsBoys);
        if (form.siblingsGirls) payload.siblingsGirls = parseInt(form.siblingsGirls);
        if (form.siblingOrder) payload.siblingOrder = parseInt(form.siblingOrder);
        if (form.healthStatus) payload.healthStatus = form.healthStatus;
        if (form.healthConditions) payload.healthConditions = form.healthConditions;
      } else {
        if (form.cin) payload.cin = form.cin;
        if (form.landline) payload.landline = form.landline;
        if (form.profession) payload.profession = form.profession;
        if (form.maritalStatus) payload.maritalStatus = form.maritalStatus;
        if (form.childrenBoys) payload.childrenBoys = parseInt(form.childrenBoys);
        if (form.childrenGirls) payload.childrenGirls = parseInt(form.childrenGirls);
        payload.interestJtima3iya = form.interestJtima3iya;
        payload.interestTarbawiya = form.interestTarbawiya;
        payload.interestFikriya = form.interestFikriya;
        if (form.interests) payload.interests = form.interests;
        if (form.associationRole) payload.associationRole = form.associationRole;
      }

      const res = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "فشل في التسجيل");
      }

      toast.success("تم تسجيل المنخرط بنجاح");
      router.push("/admin/members");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "حدث خطأ أثناء التسجيل");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">تسجيل منخرط جديد</h1>
        <p className="text-muted-foreground">ملء استمارة التسجيل</p>
      </div>

      <Tabs value={memberType} onValueChange={(v) => setMemberType(v as "CHILD" | "ADULT")}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="CHILD">طفل / تلميذ</TabsTrigger>
          <TabsTrigger value="ADULT">كبير / منخرط</TabsTrigger>
        </TabsList>

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          {/* Registration meta */}
          <Card>
            <CardHeader><CardTitle>معطيات التسجيل</CardTitle></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="registrationDate">تاريخ التسجيل</Label>
                <Input
                  id="registrationDate"
                  type="date"
                  value={form.registrationDate}
                  onChange={(e) => update("registrationDate", e.target.value)}
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <Label>نوع التسجيل *</Label>
                <Select value={form.registrationType} onValueChange={(v) => update("registrationType", v)}>
                  <SelectTrigger><SelectValue placeholder="اختر النوع">{labelOr(REG_TYPE_LABEL, form.registrationType) || "اختر النوع"}</SelectValue></SelectTrigger>
                  <SelectContent>
                    {REGISTRATION_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}{fees[t.value] != null ? ` — ${fees[t.value]} درهم` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 max-w-xs">
                <Label htmlFor="subscriptionAmount">مبلغ الانخراط (درهم)</Label>
                <Input
                  id="subscriptionAmount"
                  type="number"
                  value={form.subscriptionAmount}
                  onChange={(e) => update("subscriptionAmount", e.target.value)}
                  placeholder="0.00"
                  dir="ltr" className="text-right" step="0.01"
                />
              </div>
            </CardContent>
          </Card>

          {/* Personal info — common */}
          <Card>
            <CardHeader><CardTitle>المعلومات الشخصية</CardTitle></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="fullName">الاسم الكامل *</Label>
                <Input id="fullName" value={form.fullName} onChange={(e) => update("fullName", e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>تاريخ الازدياد</Label>
                <Input type="date" value={form.dateOfBirth} onChange={(e) => update("dateOfBirth", e.target.value)} dir="ltr" />
              </div>
              <div className="space-y-2">
                <Label>مكان الازدياد</Label>
                <Input value={form.placeOfBirth} onChange={(e) => update("placeOfBirth", e.target.value)} placeholder="مثال: مكناس" />
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

          {/* Child branch */}
          <TabsContent value="CHILD" className="mt-0 space-y-6">
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
                    <Input value={form.healthConditions} onChange={(e) => update("healthConditions", e.target.value)} placeholder="حدد نوع المرض" />
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
                <div className="space-y-2">
                  <Label>اسم الأب</Label>
                  <Input value={form.fatherName} onChange={(e) => update("fatherName", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>المهنة</Label>
                  <Input value={form.fatherProfession} onChange={(e) => update("fatherProfession", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>رقم ب.و.ت</Label>
                  <Input value={form.fatherCin} onChange={(e) => update("fatherCin", e.target.value)} dir="ltr" className="text-right" />
                </div>
                <div className="space-y-2">
                  <Label>المستوى الدراسي</Label>
                  <Input value={form.fatherEducation} onChange={(e) => update("fatherEducation", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>الهاتف المحمول</Label>
                  <Input value={form.fatherPhone} onChange={(e) => update("fatherPhone", e.target.value)} placeholder="06XXXXXXXX" dir="ltr" className="text-right" />
                </div>
                <div className="space-y-2">
                  <Label>الهاتف الثابت</Label>
                  <Input value={form.fatherLandline} onChange={(e) => update("fatherLandline", e.target.value)} placeholder="05XXXXXXXX" dir="ltr" className="text-right" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>العنوان</Label>
                  <Textarea rows={2} value={form.fatherAddress} onChange={(e) => update("fatherAddress", e.target.value)} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>معلومات الأم</CardTitle></CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>اسم الأم</Label>
                  <Input value={form.motherName} onChange={(e) => update("motherName", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>المهنة</Label>
                  <Input value={form.motherProfession} onChange={(e) => update("motherProfession", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>رقم ب.و.ت</Label>
                  <Input value={form.motherCin} onChange={(e) => update("motherCin", e.target.value)} dir="ltr" className="text-right" />
                </div>
                <div className="space-y-2">
                  <Label>المستوى الدراسي</Label>
                  <Input value={form.motherEducation} onChange={(e) => update("motherEducation", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>الهاتف المحمول</Label>
                  <Input value={form.motherPhone} onChange={(e) => update("motherPhone", e.target.value)} placeholder="06XXXXXXXX" dir="ltr" className="text-right" />
                </div>
                <div className="space-y-2">
                  <Label>الهاتف الثابت</Label>
                  <Input value={form.motherLandline} onChange={(e) => update("motherLandline", e.target.value)} placeholder="05XXXXXXXX" dir="ltr" className="text-right" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>العنوان</Label>
                  <Textarea rows={2} value={form.motherAddress} onChange={(e) => update("motherAddress", e.target.value)} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>رقم ب.و.ت للولي (إن لم يكن أحد الوالدين)</Label>
                  <Input value={form.parentCin} onChange={(e) => update("parentCin", e.target.value)} dir="ltr" className="text-right" />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Adult branch */}
          <TabsContent value="ADULT" className="mt-0 space-y-6">
            <Card>
              <CardHeader><CardTitle>معلومات المنخرط</CardTitle></CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>رقم ب.و.ت</Label>
                  <Input value={form.cin} onChange={(e) => update("cin", e.target.value)} dir="ltr" className="text-right" />
                </div>
                <div className="space-y-2">
                  <Label>المهنة</Label>
                  <Input value={form.profession} onChange={(e) => update("profession", e.target.value)} />
                </div>
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
                <div className="space-y-2">
                  <Label>الدور في الجمعية</Label>
                  <Input value={form.associationRole} onChange={(e) => update("associationRole", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>عدد الأبناء الذكور</Label>
                  <Input type="number" min="0" value={form.childrenBoys} onChange={(e) => update("childrenBoys", e.target.value)} dir="ltr" className="text-right" />
                </div>
                <div className="space-y-2">
                  <Label>عدد البنات</Label>
                  <Input type="number" min="0" value={form.childrenGirls} onChange={(e) => update("childrenGirls", e.target.value)} dir="ltr" className="text-right" />
                </div>
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
          </TabsContent>

          {/* Contact info — common */}
          <Card>
            <CardHeader><CardTitle>معلومات الاتصال</CardTitle></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>الهاتف المحمول</Label>
                <Input value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="06XXXXXXXX" dir="ltr" className="text-right" />
              </div>
              {memberType === "ADULT" && (
                <div className="space-y-2">
                  <Label>الهاتف الثابت</Label>
                  <Input value={form.landline} onChange={(e) => update("landline", e.target.value)} placeholder="05XXXXXXXX" dir="ltr" className="text-right" />
                </div>
              )}
              <div className="space-y-2 md:col-span-2">
                <Label>العنوان</Label>
                <Textarea value={form.address} onChange={(e) => update("address", e.target.value)} rows={2} placeholder="العنوان الكامل" />
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button type="submit" disabled={loading}>
              {loading ? "جاري التسجيل..." : "تسجيل المنخرط"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              إلغاء
            </Button>
          </div>
        </form>
      </Tabs>
    </div>
  );
}
