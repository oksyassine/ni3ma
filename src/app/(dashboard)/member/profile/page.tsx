"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const REG_TYPE_LABEL: Record<string, string> = {
  TAMM: "تسجيل تام",
  DAAM_MADRASSI: "دعم مدرسي",
  QURAN_TAJWEED: "حفظ وتجويد القرآن",
  MOKHAYAM: "مخيم",
};

type Me = {
  id: string;
  fullName: string;
  registrationNumber: number;
  memberType: string;
  cin: string | null;
  phone: string | null;
  landline: string | null;
  address: string | null;
  profession: string | null;
  interests: string | null;
  interestJtima3iya: boolean;
  interestTarbawiya: boolean;
  interestFikriya: boolean;
  registrationType: string | null;
  registrationDate: string | null;
  photoUrl: string | null;
};

export default function MemberProfilePage() {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [form, setForm] = useState({
    phone: "", landline: "", address: "", profession: "", interests: "",
    interestJtima3iya: false, interestTarbawiya: false, interestFikriya: false,
  });

  const load = async () => {
    setLoading(true);
    const r = await fetch("/api/member/me");
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      setError(d.error ?? "تعذّر جلب الملف");
      setLoading(false);
      return;
    }
    const data: Me = await r.json();
    setMe(data);
    setForm({
      phone: data.phone ?? "",
      landline: data.landline ?? "",
      address: data.address ?? "",
      profession: data.profession ?? "",
      interests: data.interests ?? "",
      interestJtima3iya: !!data.interestJtima3iya,
      interestTarbawiya: !!data.interestTarbawiya,
      interestFikriya: !!data.interestFikriya,
    });
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const update = (k: keyof typeof form, v: string | boolean) => setForm((p) => ({ ...p, [k]: v }));

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!me) return;
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    const fd = new FormData();
    fd.append("photo", file);
    const r = await fetch(`/api/members/${me.id}/photo`, { method: "POST", body: fd });
    if (r.ok) {
      const data = await r.json();
      setMe({ ...me, photoUrl: (data.photoUrl as string) + "?t=" + Date.now() });
      toast.success("تم رفع الصورة");
    } else {
      const data = await r.json().catch(() => ({}));
      toast.error(data.error ?? "فشل رفع الصورة");
    }
    setUploadingPhoto(false);
    e.target.value = "";
  };

  const save = async () => {
    setSaving(true);
    const r = await fetch("/api/member/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (r.ok) { toast.success("تم تحديث المعلومات"); load(); }
    else {
      const d = await r.json().catch(() => ({}));
      toast.error(d.error ?? "فشل");
    }
    setSaving(false);
  };

  if (loading) return <div className="text-center py-12">جاري التحميل...</div>;
  if (error) {
    return (
      <Card className="max-w-lg">
        <CardContent className="py-8 text-center text-muted-foreground">{error}</CardContent>
      </Card>
    );
  }
  if (!me) return null;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">ملفي الشخصي</h1>
        <p className="text-muted-foreground">يمكنك تحديث معلومات الاتصال الخاصة بك. باقي المعلومات تتطلب موافقة الإدارة.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>الصورة الشخصية</CardTitle></CardHeader>
        <CardContent className="flex items-center gap-6">
          <div className="w-24 h-24 rounded-full overflow-hidden bg-muted border-2 border-border shrink-0">
            {me.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={me.photoUrl} alt="صورتي" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl text-muted-foreground">👤</div>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="photo-upload">رفع صورة جديدة</Label>
            <input
              id="photo-upload"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handlePhotoUpload}
              disabled={uploadingPhoto}
              className="block text-sm text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground cursor-pointer"
            />
            <p className="text-xs text-muted-foreground">JPG / PNG / WEBP، أقل من 5 ميغابايت</p>
            {uploadingPhoto && <p className="text-xs text-muted-foreground">جاري الرفع...</p>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>المعلومات الأساسية</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 text-sm">
          <div><div className="text-muted-foreground">الاسم الكامل</div><div className="font-medium">{me.fullName}</div></div>
          <div><div className="text-muted-foreground">رقم التسجيل</div><div className="font-medium" dir="ltr">{me.registrationNumber}</div></div>
          {me.cin && <div><div className="text-muted-foreground">ب.و.ت</div><div className="font-medium" dir="ltr">{me.cin}</div></div>}
          {me.registrationType && <div><div className="text-muted-foreground">نوع التسجيل</div><div><Badge variant="outline">{REG_TYPE_LABEL[me.registrationType] ?? me.registrationType}</Badge></div></div>}
          <p className="md:col-span-2 text-xs text-muted-foreground">
            ⓘ لتعديل الاسم أو رقم البطاقة، تواصل مع الإدارة.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>معلومات الاتصال</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <Label>الهاتف المحمول</Label>
            <Input value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="06XXXXXXXX" dir="ltr" className="text-right" />
          </div>
          <div className="space-y-1">
            <Label>الهاتف الثابت</Label>
            <Input value={form.landline} onChange={(e) => update("landline", e.target.value)} placeholder="05XXXXXXXX" dir="ltr" className="text-right" />
          </div>
          <div className="md:col-span-2 space-y-1">
            <Label>العنوان</Label>
            <Textarea rows={2} value={form.address} onChange={(e) => update("address", e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {me.memberType === "ADULT" && (
        <Card>
          <CardHeader><CardTitle>المهنة والاهتمامات</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label>المهنة</Label>
              <Input value={form.profession} onChange={(e) => update("profession", e.target.value)} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.interestJtima3iya} onChange={(e) => update("interestJtima3iya", e.target.checked)} />
                اجتماعية
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.interestTarbawiya} onChange={(e) => update("interestTarbawiya", e.target.checked)} />
                تربوية
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.interestFikriya} onChange={(e) => update("interestFikriya", e.target.checked)} />
                فكرية
              </label>
            </div>
            <div className="space-y-1">
              <Label>اهتمامات أخرى</Label>
              <Input value={form.interests} onChange={(e) => update("interests", e.target.value)} placeholder="مثال: التربية، القرآن الكريم، الرياضة..." />
            </div>
          </CardContent>
        </Card>
      )}

      <Button onClick={save} disabled={saving}>
        {saving ? "جاري الحفظ..." : "حفظ التغييرات"}
      </Button>
    </div>
  );
}
