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
import { roleLabel } from "@/lib/rbac";
import { useT } from "@/components/i18n/provider";
import { toast } from "sonner";
import type { Role, Locale } from "@/lib/rbac";
import { validateUsernameFormat, suggestUsernameFromName } from "@/lib/validations/username";

const ALL_ROLES: Role[] = ["ADMIN", "BUREAU", "FINANCIAL", "EDUCATIONAL", "SOCIAL", "QURAN", "MEMBER", "BAHT_IJTIMA3I_TEAM"];

const REGISTRATION_TYPES = [
  { value: "TAMM",          label: "members.reg.type.TAMM" },
  { value: "DAAM_MADRASSI", label: "members.reg.type.DAAM_MADRASSI" },
  { value: "QURAN_TAJWEED", label: "members.reg.type.QURAN_TAJWEED" },
  { value: "MOKHAYAM",      label: "members.reg.type.MOKHAYAM" },
];
const REG_TYPE_KEY: Record<string, string> = Object.fromEntries(REGISTRATION_TYPES.map((rt) => [rt.value, rt.label]));
const GENDER_KEY: Record<string, string> = { MALE: "members.gender.MALE", FEMALE: "members.gender.FEMALE" };
const MARITAL_KEY: Record<string, string> = { SINGLE: "members.marital.SINGLE", MARRIED: "members.marital.MARRIED", DIVORCED: "members.marital.DIVORCED", WIDOWED: "members.marital.WIDOWED" };
const HEALTH_KEY: Record<string, string> = { HEALTHY: "members.health.HEALTHY", SICK: "members.health.SICK" };
const keyOr = (map: Record<string, string>, v: unknown) => (typeof v === "string" && map[v]) || "";

type AccessInfo = {
  username: string | null;
  userIsActive: boolean;
  roles: Role[];
};

export default function EditMemberPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { t, locale } = useT();
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
    if (!accessForm.username) { toast.error(t("members.errUsername")); return; }
    const usernameErr = validateUsernameFormat(accessForm.username);
    if (usernameErr) { toast.error(usernameErr); return; }
    if (!access?.username && !accessForm.password) { toast.error(t("members.errPasswordNew")); return; }
    if (accessForm.roles.length === 0) { toast.error(t("members.errRoleAtLeast")); return; }
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
      toast.success(t("members.accessSaved"));
    } else if (res.status === 409) {
      toast.error(t("members.usernameTaken"));
    } else {
      toast.error(t("members.genericError"));
    }
    setSavingAccess(false);
  };

  const handleRevokeAccess = async () => {
    if (!confirm(t("members.revokeConfirm"))) return;
    setRevokingAccess(true);
    const res = await fetch(`/api/members/${id}/access`, { method: "DELETE" });
    if (res.ok) {
      setAccess({ username: null, userIsActive: false, roles: [] });
      setAccessForm({ username: "", password: "", roles: [] });
      toast.success(t("members.accessRevoked"));
    } else {
      toast.error(t("members.genericError"));
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
      toast.success(t("members.photoUploaded"));
    } else {
      const data = await res.json();
      toast.error(data.error ?? t("members.errPhotoUpload"));
    }
    setUploadingPhoto(false);
    e.target.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName.trim()) { toast.error(t("members.errFullName")); return; }

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
        throw new Error(data.error ?? t("members.errSave"));
      }
      toast.success(t("members.updated"));
      router.push(`/admin/members/${id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("members.errDuringUpdate"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-center py-12">{t("members.loading")}</div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("members.editPageTitle")}</h1>
          <p className="text-muted-foreground">{form.fullName}</p>
        </div>
        <Button variant="outline" onClick={() => router.back()}>{t("members.back")}</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>{t("members.photoCard")}</CardTitle></CardHeader>
        <CardContent className="flex items-center gap-6">
          <div className="w-24 h-24 rounded-full overflow-hidden bg-muted border-2 border-border shrink-0">
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoUrl} alt={t("members.photoAlt")} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl text-muted-foreground">👤</div>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="photo-upload">{t("members.uploadNewPhoto")}</Label>
            <input id="photo-upload" type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoUpload} disabled={uploadingPhoto}
              className="block text-sm text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground cursor-pointer" />
            <p className="text-xs text-muted-foreground">{t("members.photoHint")}</p>
            {uploadingPhoto && <p className="text-xs text-muted-foreground">{t("members.uploading")}</p>}
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>{t("members.reg.registrationData")}</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>{t("members.reg.date")}</Label>
              <Input type="date" value={form.registrationDate} onChange={(e) => update("registrationDate", e.target.value)} dir="ltr" />
            </div>
            <div className="space-y-2">
              <Label>{t("members.reg.type")}</Label>
              <Select value={form.registrationType} onValueChange={(v) => update("registrationType", v)}>
                <SelectTrigger><SelectValue placeholder={t("members.selectType")}>{keyOr(REG_TYPE_KEY, form.registrationType) ? t(keyOr(REG_TYPE_KEY, form.registrationType)) : t("members.selectType")}</SelectValue></SelectTrigger>
                <SelectContent>
                  {REGISTRATION_TYPES.map((rt) => (
                    <SelectItem key={rt.value} value={rt.value}>{t(rt.label)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 max-w-xs md:col-span-2">
              <Label>{t("members.reg.subscriptionAmount")}</Label>
              <Input type="number" value={form.subscriptionAmount} onChange={(e) => update("subscriptionAmount", e.target.value)}
                placeholder="0.00" dir="ltr" className="text-right" step="0.01" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{t("members.personalInfoCard")}</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label>{t("members.fullNameRequired")}</Label>
              <Input value={form.fullName} onChange={(e) => update("fullName", e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>{t("members.dateOfBirth")}</Label>
              <Input type="date" value={form.dateOfBirth} onChange={(e) => update("dateOfBirth", e.target.value)} dir="ltr" />
            </div>
            <div className="space-y-2">
              <Label>{t("members.placeOfBirth")}</Label>
              <Input value={form.placeOfBirth} onChange={(e) => update("placeOfBirth", e.target.value)} />
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

        {memberType === "CHILD" ? (
          <>
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
                    <Input value={form.healthConditions} onChange={(e) => update("healthConditions", e.target.value)} />
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
                <div className="space-y-2"><Label>{t("members.fatherName")}</Label><Input value={form.fatherName} onChange={(e) => update("fatherName", e.target.value)} /></div>
                <div className="space-y-2"><Label>{t("members.profession")}</Label><Input value={form.fatherProfession} onChange={(e) => update("fatherProfession", e.target.value)} /></div>
                <div className="space-y-2"><Label>{t("members.cin")}</Label><Input value={form.fatherCin} onChange={(e) => update("fatherCin", e.target.value)} dir="ltr" className="text-right" /></div>
                <div className="space-y-2"><Label>{t("members.educationalLevel")}</Label><Input value={form.fatherEducation} onChange={(e) => update("fatherEducation", e.target.value)} /></div>
                <div className="space-y-2"><Label>{t("members.mobilePhone")}</Label><Input value={form.fatherPhone} onChange={(e) => update("fatherPhone", e.target.value)} dir="ltr" className="text-right" /></div>
                <div className="space-y-2"><Label>{t("members.landline")}</Label><Input value={form.fatherLandline} onChange={(e) => update("fatherLandline", e.target.value)} dir="ltr" className="text-right" /></div>
                <div className="space-y-2 md:col-span-2"><Label>{t("members.address")}</Label><Textarea rows={2} value={form.fatherAddress} onChange={(e) => update("fatherAddress", e.target.value)} /></div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>{t("members.motherCard")}</CardTitle></CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2"><Label>{t("members.motherName")}</Label><Input value={form.motherName} onChange={(e) => update("motherName", e.target.value)} /></div>
                <div className="space-y-2"><Label>{t("members.profession")}</Label><Input value={form.motherProfession} onChange={(e) => update("motherProfession", e.target.value)} /></div>
                <div className="space-y-2"><Label>{t("members.cin")}</Label><Input value={form.motherCin} onChange={(e) => update("motherCin", e.target.value)} dir="ltr" className="text-right" /></div>
                <div className="space-y-2"><Label>{t("members.educationalLevel")}</Label><Input value={form.motherEducation} onChange={(e) => update("motherEducation", e.target.value)} /></div>
                <div className="space-y-2"><Label>{t("members.mobilePhone")}</Label><Input value={form.motherPhone} onChange={(e) => update("motherPhone", e.target.value)} dir="ltr" className="text-right" /></div>
                <div className="space-y-2"><Label>{t("members.landline")}</Label><Input value={form.motherLandline} onChange={(e) => update("motherLandline", e.target.value)} dir="ltr" className="text-right" /></div>
                <div className="space-y-2 md:col-span-2"><Label>{t("members.address")}</Label><Textarea rows={2} value={form.motherAddress} onChange={(e) => update("motherAddress", e.target.value)} /></div>
                <div className="space-y-2 md:col-span-2"><Label>{t("members.parentCin")}</Label><Input value={form.parentCin} onChange={(e) => update("parentCin", e.target.value)} dir="ltr" className="text-right" /></div>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            <Card>
              <CardHeader><CardTitle>{t("members.memberInfoCard")}</CardTitle></CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2"><Label>{t("members.cin")}</Label><Input value={form.cin} onChange={(e) => update("cin", e.target.value)} dir="ltr" className="text-right" /></div>
                <div className="space-y-2"><Label>{t("members.profession")}</Label><Input value={form.profession} onChange={(e) => update("profession", e.target.value)} /></div>
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
                <div className="space-y-2"><Label>{t("members.assocRole")}</Label><Input value={form.associationRole} onChange={(e) => update("associationRole", e.target.value)} /></div>
                <div className="space-y-2"><Label>{t("members.childrenBoys")}</Label><Input type="number" min="0" value={form.childrenBoys} onChange={(e) => update("childrenBoys", e.target.value)} dir="ltr" className="text-right" /></div>
                <div className="space-y-2"><Label>{t("members.childrenGirls")}</Label><Input type="number" min="0" value={form.childrenGirls} onChange={(e) => update("childrenGirls", e.target.value)} dir="ltr" className="text-right" /></div>
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
          </>
        )}

        <Card>
          <CardHeader><CardTitle>{t("members.contactCard")}</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2"><Label>{t("members.mobilePhone")}</Label><Input value={form.phone} onChange={(e) => update("phone", e.target.value)} dir="ltr" className="text-right" /></div>
            {memberType === "ADULT" && (
              <div className="space-y-2"><Label>{t("members.landline")}</Label><Input value={form.landline} onChange={(e) => update("landline", e.target.value)} dir="ltr" className="text-right" /></div>
            )}
            <div className="space-y-2 md:col-span-2"><Label>{t("members.address")}</Label><Textarea value={form.address} onChange={(e) => update("address", e.target.value)} rows={2} /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{t("members.sectionsCard")}</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Label>{t("members.sectionsLabel")}</Label>
              <div className="flex gap-6 flex-wrap">
                {[
                  { value: "EDUCATIONAL", key: "members.sectionFull.EDUCATIONAL" },
                  { value: "SOCIAL", key: "members.sectionFull.SOCIAL" },
                  { value: "QURAN", key: "members.sectionFull.QURAN" },
                  { value: "QUDAT", key: "members.sectionFull.QUDAT" },
                  { value: "MEDIA", key: "members.sectionFull.MEDIA" },
                ].map((section) => (
                  <div key={section.value} className="flex items-center gap-2">
                    <Checkbox
                      id={`edit-${section.value}`}
                      checked={form.sections.includes(section.value)}
                      onCheckedChange={() => toggleSection(section.value)}
                    />
                    <Label htmlFor={`edit-${section.value}`} className="cursor-pointer font-normal">
                      {t(section.key)}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={saving}>
            {saving ? t("members.saving") : t("members.saveChanges")}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>{t("members.cancel")}</Button>
        </div>
      </form>

      {memberType === "ADULT" && (
        <Card className="border-blue-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{t("members.accessCard")}</CardTitle>
              {access?.username ? (
                <Badge variant={access.userIsActive ? "default" : "secondary"}>
                  {access.userIsActive ? t("members.accessEnabled") : t("members.accessDisabled")}
                </Badge>
              ) : (
                <Badge variant="outline">{t("members.noAccount")}</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>{t("members.username")}</Label>
                <div className="flex gap-2">
                  <Input
                    value={accessForm.username}
                    onChange={(e) => setAccessForm((p) => ({ ...p, username: e.target.value.toLowerCase() }))}
                    placeholder={t("members.usernameExample")}
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
                      ✨ {t("members.suggest")}
                    </Button>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground">{t("members.usernameHint")}</p>
              </div>
              <div className="space-y-2">
                <Label>{access?.username ? t("members.passwordNew") : t("members.password")}</Label>
                <Input type="password" value={accessForm.password} onChange={(e) => setAccessForm((p) => ({ ...p, password: e.target.value }))} dir="ltr" className="text-right" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("members.roles")}</Label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {ALL_ROLES.map((role) => (
                  <div key={role} className="flex items-center gap-2">
                    <Checkbox id={`access-role-${role}`} checked={accessForm.roles.includes(role)} onCheckedChange={() => toggleAccessRole(role)} />
                    <Label htmlFor={`access-role-${role}`} className="font-normal cursor-pointer text-sm">{roleLabel(role, locale as Locale)}</Label>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 sm:gap-3 pt-2">
              <Button onClick={handleSaveAccess} disabled={savingAccess} className="flex-1 sm:flex-none min-w-0">
                {savingAccess ? t("members.saving") : access?.username ? t("members.updateAccess") : t("members.grantAccess")}
              </Button>
              {access?.username && (
                <Button variant="destructive" onClick={handleRevokeAccess} disabled={revokingAccess} className="flex-1 sm:flex-none min-w-0">
                  {revokingAccess ? t("members.revoking") : t("members.revokeAccess")}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
