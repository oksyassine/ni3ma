"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

type AssociationData = {
  name: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  facebookUrl: string;
  cndpRegistration: string;
  privacyNotice: string;
  registrationFees: Record<string, string>;
};

const REGISTRATION_TYPES = [
  { value: "TAMM",          label: "تسجيل تام" },
  { value: "DAAM_MADRASSI", label: "دعم مدرسي" },
  { value: "QURAN_TAJWEED", label: "حفظ وتجويد القرآن" },
  { value: "MOKHAYAM",      label: "مخيم" },
];

export default function AssociationPage() {
  const [data, setData] = useState<AssociationData>({
    name: "",
    address: "",
    city: "",
    phone: "",
    email: "",
    facebookUrl: "",
    cndpRegistration: "",
    privacyNotice: "",
    registrationFees: {},
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/association")
      .then((res) => res.json())
      .then((d) => {
        if (d) {
          const feesObj = d.registrationFees ?? {};
          const feesStr: Record<string, string> = {};
          for (const [k, v] of Object.entries(feesObj)) {
            feesStr[k] = v == null ? "" : String(v);
          }
          setData({
            name: d.name ?? "",
            address: d.address ?? "",
            city: d.city ?? "",
            phone: d.phone ?? "",
            email: d.email ?? "",
            facebookUrl: d.facebookUrl ?? "",
            cndpRegistration: d.cndpRegistration ?? "",
            privacyNotice: d.privacyNotice ?? "",
            registrationFees: feesStr,
          });
        }
        setLoading(false);
      });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const feesNum: Record<string, number> = {};
    for (const [k, v] of Object.entries(data.registrationFees)) {
      const n = parseFloat(v);
      if (!isNaN(n)) feesNum[k] = n;
    }
    const res = await fetch("/api/association", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, registrationFees: feesNum }),
    });

    if (res.ok) {
      toast.success("تم حفظ المعلومات");
    } else {
      toast.error("حدث خطأ");
    }
    setSaving(false);
  };

  if (loading) return <div className="text-center py-12">جاري التحميل...</div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">معلومات الجمعية</h1>
        <p className="text-muted-foreground">إدارة المعلومات الأساسية للجمعية</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>المعلومات الأساسية</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label>اسم الجمعية</Label>
              <Input
                value={data.name}
                onChange={(e) => setData({ ...data, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>المدينة</Label>
              <Input
                value={data.city}
                onChange={(e) => setData({ ...data, city: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>الهاتف</Label>
              <Input
                value={data.phone}
                onChange={(e) => setData({ ...data, phone: e.target.value })}
                dir="ltr"
                className="text-right"
              />
            </div>
            <div className="space-y-2">
              <Label>البريد الإلكتروني</Label>
              <Input
                type="email"
                value={data.email}
                onChange={(e) => setData({ ...data, email: e.target.value })}
                dir="ltr"
                className="text-right"
              />
            </div>
            <div className="space-y-2">
              <Label>رابط فيسبوك</Label>
              <Input
                value={data.facebookUrl}
                onChange={(e) => setData({ ...data, facebookUrl: e.target.value })}
                dir="ltr"
                className="text-right"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>العنوان</Label>
              <Textarea
                value={data.address}
                onChange={(e) => setData({ ...data, address: e.target.value })}
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>CNDP - حماية المعطيات الشخصية</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>رقم التسجيل في CNDP</Label>
              <Input
                value={data.cndpRegistration}
                onChange={(e) => setData({ ...data, cndpRegistration: e.target.value })}
                dir="ltr"
                className="text-right"
              />
            </div>
            <div className="space-y-2">
              <Label>سياسة الخصوصية</Label>
              <Textarea
                value={data.privacyNotice}
                onChange={(e) => setData({ ...data, privacyNotice: e.target.value })}
                rows={4}
                placeholder="نص سياسة الخصوصية وحماية المعطيات الشخصية"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>رسوم الانخراط حسب نوع التسجيل</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {REGISTRATION_TYPES.map((t) => (
              <div key={t.value} className="space-y-2">
                <Label>{t.label} (درهم)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={data.registrationFees[t.value] ?? ""}
                  onChange={(e) =>
                    setData((p) => ({
                      ...p,
                      registrationFees: { ...p.registrationFees, [t.value]: e.target.value },
                    }))
                  }
                  placeholder="0.00"
                  dir="ltr"
                  className="text-right"
                />
              </div>
            ))}
            <p className="text-sm text-muted-foreground md:col-span-2">
              المبلغ سيُملأ تلقائيا في استمارة التسجيل عند اختيار النوع، ويمكن تعديله يدويا عند الحاجة.
            </p>
          </CardContent>
        </Card>

        <Button type="submit" disabled={saving}>
          {saving ? "جاري الحفظ..." : "حفظ التغييرات"}
        </Button>
      </form>
    </div>
  );
}
