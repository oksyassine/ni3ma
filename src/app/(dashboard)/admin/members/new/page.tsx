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
import { useT } from "@/components/i18n/provider";
import { toast } from "sonner";

const REGISTRATION_TYPES: { value: string; key: string }[] = [
  { value: "TAMM",          key: "members.reg.type.TAMM" },
  { value: "DAAM_MADRASSI", key: "members.reg.type.DAAM_MADRASSI" },
  { value: "QURAN_TAJWEED", key: "members.reg.type.QURAN_TAJWEED" },
  { value: "MOKHAYAM",      key: "members.reg.type.MOKHAYAM" },
];
const REG_TYPE_KEY: Record<string, string> = Object.fromEntries(REGISTRATION_TYPES.map((rt) => [rt.value, rt.key]));
const GENDER_KEY: Record<string, string> = { MALE: "members.gender.MALE", FEMALE: "members.gender.FEMALE" };
const MARITAL_KEY: Record<string, string> = { SINGLE: "members.marital.SINGLE", MARRIED: "members.marital.MARRIED", DIVORCED: "members.marital.DIVORCED", WIDOWED: "members.marital.WIDOWED" };
const HEALTH_KEY: Record<string, string> = { HEALTHY: "members.health.HEALTHY", SICK: "members.health.SICK" };
const keyOr = (map: Record<string, string>, v: unknown) => (typeof v === "string" && map[v]) || "";

const todayISO = () => new Date().toISOString().split("T")[0];

export default function NewMemberPage() {
  const router = useRouter();
  const { t } = useT();
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
      toast.error(t("members.errFullName"));
      return;
    }
    if (!form.registrationType) {
      toast.error(t("members.errRegType"));
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
        throw new Error(data.error ?? t("members.errRegister"));
      }

      toast.success(t("members.registered"));
      router.push("/admin/members");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("members.errDuringRegister"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">{t("members.newTitle")}</h1>
        <p className="text-muted-foreground">{t("members.newSubtitle")}</p>
      </div>

      <Tabs value={memberType} onValueChange={(v) => setMemberType(v as "CHILD" | "ADULT")}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="CHILD">{t("members.tab.child")}</TabsTrigger>
          <TabsTrigger value="ADULT">{t("members.tab.adult")}</TabsTrigger>
        </TabsList>

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          {/* Registration meta */}
          <Card>
            <CardHeader><CardTitle>{t("members.reg.registrationData")}</CardTitle></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="registrationDate">{t("members.reg.date")}</Label>
                <Input
                  id="registrationDate"
                  type="date"
                  value={form.registrationDate}
                  onChange={(e) => update("registrationDate", e.target.value)}
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <Label>{t("members.reg.typeRequired")}</Label>
                <Select value={form.registrationType} onValueChange={(v) => update("registrationType", v)}>
                  <SelectTrigger><SelectValue placeholder={t("members.selectType")}>{keyOr(REG_TYPE_KEY, form.registrationType) ? t(keyOr(REG_TYPE_KEY, form.registrationType)) : t("members.selectType")}</SelectValue></SelectTrigger>
                  <SelectContent>
                    {REGISTRATION_TYPES.map((rt) => (
                      <SelectItem key={rt.value} value={rt.value}>
                        {t(rt.key)}{fees[rt.value] != null ? ` ${t("members.reg.feeSuffix", { fee: fees[rt.value] })}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 max-w-xs">
                <Label htmlFor="subscriptionAmount">{t("members.reg.subscriptionAmount")}</Label>
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
            <CardHeader><CardTitle>{t("members.personalInfoCard")}</CardTitle></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="fullName">{t("members.fullNameRequired")}</Label>
                <Input id="fullName" value={form.fullName} onChange={(e) => update("fullName", e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>{t("members.dateOfBirth")}</Label>
                <Input type="date" value={form.dateOfBirth} onChange={(e) => update("dateOfBirth", e.target.value)} dir="ltr" />
              </div>
              <div className="space-y-2">
                <Label>{t("members.placeOfBirth")}</Label>
                <Input value={form.placeOfBirth} onChange={(e) => update("placeOfBirth", e.target.value)} placeholder={t("members.placeOfBirthExample")} />
              </div>
              <div className="space-y-2">
                <Label>{t("members.gender")}</Label>
                <Select value={form.gender} onValueChange={(v) => update("gender", v)}>
                  <SelectTrigger><SelectValue placeholder={t("members.selectGender")}>{keyOr(GENDER_KEY, form.gender) ? t(keyOr(GENDER_KEY, form.gender)) : t("members.selectGender")}</SelectValue></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MALE">{t("members.gender.MALE")}</SelectItem>
                    <SelectItem value="FEMALE">{t("members.gender.FEMALE")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("members.educationalLevel")}</Label>
                <Select value={form.educationalLevel} onValueChange={(v) => update("educationalLevel", v)}>
                  <SelectTrigger><SelectValue placeholder={t("members.selectLevel")}>{form.educationalLevel || t("members.selectLevel")}</SelectValue></SelectTrigger>
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
              <CardHeader><CardTitle>{t("members.healthCard")}</CardTitle></CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t("members.healthStatusLabel")}</Label>
                  <Select value={form.healthStatus} onValueChange={(v) => update("healthStatus", v)}>
                    <SelectTrigger><SelectValue placeholder={t("members.selectStatus")}>{keyOr(HEALTH_KEY, form.healthStatus) ? t(keyOr(HEALTH_KEY, form.healthStatus)) : t("members.selectStatus")}</SelectValue></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="HEALTHY">{t("members.health.HEALTHY")}</SelectItem>
                      <SelectItem value="SICK">{t("members.health.SICK")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {form.healthStatus === "SICK" && (
                  <div className="space-y-2">
                    <Label>{t("members.illnessType")}</Label>
                    <Input value={form.healthConditions} onChange={(e) => update("healthConditions", e.target.value)} placeholder={t("members.illnessPlaceholder")} />
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>{t("members.siblingsCard")}</CardTitle></CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>{t("members.siblingsBoys")}</Label>
                  <Input type="number" min="0" value={form.siblingsBoys} onChange={(e) => update("siblingsBoys", e.target.value)} dir="ltr" className="text-right" />
                </div>
                <div className="space-y-2">
                  <Label>{t("members.siblingsGirls")}</Label>
                  <Input type="number" min="0" value={form.siblingsGirls} onChange={(e) => update("siblingsGirls", e.target.value)} dir="ltr" className="text-right" />
                </div>
                <div className="space-y-2">
                  <Label>{t("members.siblingOrder")}</Label>
                  <Input type="number" min="1" value={form.siblingOrder} onChange={(e) => update("siblingOrder", e.target.value)} dir="ltr" className="text-right" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>{t("members.fatherCard")}</CardTitle></CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t("members.fatherName")}</Label>
                  <Input value={form.fatherName} onChange={(e) => update("fatherName", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>{t("members.profession")}</Label>
                  <Input value={form.fatherProfession} onChange={(e) => update("fatherProfession", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>{t("members.cin")}</Label>
                  <Input value={form.fatherCin} onChange={(e) => update("fatherCin", e.target.value)} dir="ltr" className="text-right" />
                </div>
                <div className="space-y-2">
                  <Label>{t("members.educationalLevel")}</Label>
                  <Input value={form.fatherEducation} onChange={(e) => update("fatherEducation", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>{t("members.mobilePhone")}</Label>
                  <Input value={form.fatherPhone} onChange={(e) => update("fatherPhone", e.target.value)} placeholder="06XXXXXXXX" dir="ltr" className="text-right" />
                </div>
                <div className="space-y-2">
                  <Label>{t("members.landline")}</Label>
                  <Input value={form.fatherLandline} onChange={(e) => update("fatherLandline", e.target.value)} placeholder="05XXXXXXXX" dir="ltr" className="text-right" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>{t("members.address")}</Label>
                  <Textarea rows={2} value={form.fatherAddress} onChange={(e) => update("fatherAddress", e.target.value)} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>{t("members.motherCard")}</CardTitle></CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t("members.motherName")}</Label>
                  <Input value={form.motherName} onChange={(e) => update("motherName", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>{t("members.profession")}</Label>
                  <Input value={form.motherProfession} onChange={(e) => update("motherProfession", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>{t("members.cin")}</Label>
                  <Input value={form.motherCin} onChange={(e) => update("motherCin", e.target.value)} dir="ltr" className="text-right" />
                </div>
                <div className="space-y-2">
                  <Label>{t("members.educationalLevel")}</Label>
                  <Input value={form.motherEducation} onChange={(e) => update("motherEducation", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>{t("members.mobilePhone")}</Label>
                  <Input value={form.motherPhone} onChange={(e) => update("motherPhone", e.target.value)} placeholder="06XXXXXXXX" dir="ltr" className="text-right" />
                </div>
                <div className="space-y-2">
                  <Label>{t("members.landline")}</Label>
                  <Input value={form.motherLandline} onChange={(e) => update("motherLandline", e.target.value)} placeholder="05XXXXXXXX" dir="ltr" className="text-right" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>{t("members.address")}</Label>
                  <Textarea rows={2} value={form.motherAddress} onChange={(e) => update("motherAddress", e.target.value)} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>{t("members.parentCin")}</Label>
                  <Input value={form.parentCin} onChange={(e) => update("parentCin", e.target.value)} dir="ltr" className="text-right" />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Adult branch */}
          <TabsContent value="ADULT" className="mt-0 space-y-6">
            <Card>
              <CardHeader><CardTitle>{t("members.memberInfoCard")}</CardTitle></CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t("members.cin")}</Label>
                  <Input value={form.cin} onChange={(e) => update("cin", e.target.value)} dir="ltr" className="text-right" />
                </div>
                <div className="space-y-2">
                  <Label>{t("members.profession")}</Label>
                  <Input value={form.profession} onChange={(e) => update("profession", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>{t("members.maritalStatus")}</Label>
                  <Select value={form.maritalStatus} onValueChange={(v) => update("maritalStatus", v)}>
                    <SelectTrigger><SelectValue placeholder={t("members.selectMarital")}>{keyOr(MARITAL_KEY, form.maritalStatus) ? t(keyOr(MARITAL_KEY, form.maritalStatus)) : t("members.selectMarital")}</SelectValue></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SINGLE">{t("members.marital.SINGLE")}</SelectItem>
                      <SelectItem value="MARRIED">{t("members.marital.MARRIED")}</SelectItem>
                      <SelectItem value="DIVORCED">{t("members.marital.DIVORCED")}</SelectItem>
                      <SelectItem value="WIDOWED">{t("members.marital.WIDOWED")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("members.assocRole")}</Label>
                  <Input value={form.associationRole} onChange={(e) => update("associationRole", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>{t("members.childrenBoys")}</Label>
                  <Input type="number" min="0" value={form.childrenBoys} onChange={(e) => update("childrenBoys", e.target.value)} dir="ltr" className="text-right" />
                </div>
                <div className="space-y-2">
                  <Label>{t("members.childrenGirls")}</Label>
                  <Input type="number" min="0" value={form.childrenGirls} onChange={(e) => update("childrenGirls", e.target.value)} dir="ltr" className="text-right" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>{t("members.interestsCard")}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="flex items-center gap-2">
                    <Checkbox id="ij" checked={form.interestJtima3iya} onCheckedChange={(v) => update("interestJtima3iya", !!v)} />
                    <Label htmlFor="ij" className="font-normal cursor-pointer">{t("members.interest.social")}</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox id="it" checked={form.interestTarbawiya} onCheckedChange={(v) => update("interestTarbawiya", !!v)} />
                    <Label htmlFor="it" className="font-normal cursor-pointer">{t("members.interest.educational")}</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox id="if" checked={form.interestFikriya} onCheckedChange={(v) => update("interestFikriya", !!v)} />
                    <Label htmlFor="if" className="font-normal cursor-pointer">{t("members.interest.intellectual")}</Label>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{t("members.otherInterests")}</Label>
                  <Input value={form.interests} onChange={(e) => update("interests", e.target.value)} placeholder={t("members.interestsExample")} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Contact info — common */}
          <Card>
            <CardHeader><CardTitle>{t("members.contactCard")}</CardTitle></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>{t("members.mobilePhone")}</Label>
                <Input value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="06XXXXXXXX" dir="ltr" className="text-right" />
              </div>
              {memberType === "ADULT" && (
                <div className="space-y-2">
                  <Label>{t("members.landline")}</Label>
                  <Input value={form.landline} onChange={(e) => update("landline", e.target.value)} placeholder="05XXXXXXXX" dir="ltr" className="text-right" />
                </div>
              )}
              <div className="space-y-2 md:col-span-2">
                <Label>{t("members.address")}</Label>
                <Textarea value={form.address} onChange={(e) => update("address", e.target.value)} rows={2} placeholder={t("members.fullAddressPlaceholder")} />
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button type="submit" disabled={loading}>
              {loading ? t("members.registering") : t("members.submitRegister")}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              {t("members.cancel")}
            </Button>
          </div>
        </form>
      </Tabs>
    </div>
  );
}
