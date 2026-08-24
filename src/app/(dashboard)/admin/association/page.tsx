"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useT } from "@/components/i18n/provider";

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
  defaultLocale: string;
};

const REGISTRATION_TYPES = [
  { value: "TAMM",          labelKey: "admin.association.typeTamm" },
  { value: "DAAM_MADRASSI", labelKey: "admin.association.typeDaamMadrassi" },
  { value: "QURAN_TAJWEED", labelKey: "admin.association.typeQuranTajweed" },
  { value: "MOKHAYAM",      labelKey: "admin.association.typeMokhayam" },
] as const;

export default function AssociationPage() {
  const { t } = useT();
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
    defaultLocale: "ar",
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
            defaultLocale: d.defaultLocale ?? "ar",
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
      toast.success(t("admin.association.toastSaved"));
    } else {
      toast.error(t("admin.error"));
    }
    setSaving(false);
  };

  if (loading) return <div className="text-center py-12">{t("admin.loading")}</div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">{t("admin.association.title")}</h1>
        <p className="text-muted-foreground">{t("admin.association.subtitle")}</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{t("admin.association.basicInfo")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label>{t("admin.association.name")}</Label>
              <Input
                value={data.name}
                onChange={(e) => setData({ ...data, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("admin.association.city")}</Label>
              <Input
                value={data.city}
                onChange={(e) => setData({ ...data, city: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("admin.association.phone")}</Label>
              <Input
                value={data.phone}
                onChange={(e) => setData({ ...data, phone: e.target.value })}
                dir="ltr"
                className="text-right"
              />
            </div>
            <div className="space-y-2">
              <Label>{t("admin.association.email")}</Label>
              <Input
                type="email"
                value={data.email}
                onChange={(e) => setData({ ...data, email: e.target.value })}
                dir="ltr"
                className="text-right"
              />
            </div>
            <div className="space-y-2">
              <Label>{t("admin.association.facebook")}</Label>
              <Input
                value={data.facebookUrl}
                onChange={(e) => setData({ ...data, facebookUrl: e.target.value })}
                dir="ltr"
                className="text-right"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>{t("admin.association.address")}</Label>
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
            <CardTitle>{t("admin.association.cndpTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{t("admin.association.cndpNumber")}</Label>
              <Input
                value={data.cndpRegistration}
                onChange={(e) => setData({ ...data, cndpRegistration: e.target.value })}
                dir="ltr"
                className="text-right"
              />
            </div>
            <div className="space-y-2">
              <Label>{t("admin.association.privacyPolicy")}</Label>
              <Textarea
                value={data.privacyNotice}
                onChange={(e) => setData({ ...data, privacyNotice: e.target.value })}
                rows={4}
                placeholder={t("admin.association.privacyPlaceholder")}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("admin.association.feesByType")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {REGISTRATION_TYPES.map((rt) => (
              <div key={rt.value} className="space-y-2">
                <Label>{t("admin.association.feeLabel", { label: t(rt.labelKey) })}</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={data.registrationFees[rt.value] ?? ""}
                  onChange={(e) =>
                    setData((p) => ({
                      ...p,
                      registrationFees: { ...p.registrationFees, [rt.value]: e.target.value },
                    }))
                  }
                  placeholder="0.00"
                  dir="ltr"
                  className="text-right"
                />
              </div>
            ))}
            <p className="text-sm text-muted-foreground md:col-span-2">
              {t("admin.association.feesHint")}
            </p>
          </CardContent>
        </Card>

        {/* Default UI language */}

        <div className="space-y-1.5">

          <label className="text-sm font-medium">{t("admin.association.defaultLang")}</label>

          <select

            className="w-full rounded-md border bg-background px-3 py-2 text-sm"

            value={data.defaultLocale}

            onChange={(e) => setData((p) => ({ ...p, defaultLocale: e.target.value }))}

          >

            <option value="ar">{t("common.arabic")}</option>

            <option value="fr">{t("common.french")}</option>

          </select>

        </div>


        <Button type="submit" disabled={saving}>
          {saving ? t("admin.association.saving") : t("admin.association.saveChanges")}
        </Button>
      </form>
    </div>
  );
}
