"use client";

import { useState } from "react";
import Link from "next/link";
import { EDUCATIONAL_LEVELS } from "@/lib/constants";
import { useT } from "@/components/i18n/provider";

type MemberType = "CHILD" | "ADULT" | null;
type Step = "choose" | "form" | "success";

const REGISTRATION_TYPES = [
  { value: "TAMM",          key: "auth.signup.type.tamm" },
  { value: "DAAM_MADRASSI", key: "auth.signup.type.daamMadrassi" },
  { value: "QURAN_TAJWEED", key: "auth.signup.type.quranTajweed" },
  { value: "MOKHAYAM",      key: "auth.signup.type.mokhayam" },
];

export default function SignupPage() {
  const { t } = useT();
  const [step, setStep] = useState<Step>("choose");
  const [memberType, setMemberType] = useState<MemberType>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [form, setForm] = useState({
    // Common
    registrationType: "",
    fullName: "",
    dateOfBirth: "",
    placeOfBirth: "",
    gender: "",
    educationalLevel: "",
    phone: "",
    address: "",
    // Child
    fatherName: "", fatherCin: "", fatherProfession: "", fatherEducation: "", fatherPhone: "", fatherLandline: "", fatherAddress: "",
    motherName: "", motherCin: "", motherProfession: "", motherEducation: "", motherPhone: "", motherLandline: "", motherAddress: "",
    parentCin: "",
    siblingsBoys: "", siblingsGirls: "", siblingOrder: "",
    healthStatus: "", healthConditions: "",
    // Adult
    cin: "",
    landline: "",
    profession: "",
    maritalStatus: "",
    childrenBoys: "", childrenGirls: "",
    interestJtima3iya: false, interestTarbawiya: false, interestFikriya: false,
    interests: "",
  });

  const update = (field: string, value: string | boolean) =>
    setForm((p) => ({ ...p, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName.trim()) {
      setError(t("auth.signup.error.fullName"));
      return;
    }
    if (!form.registrationType) {
      setError(t("auth.signup.error.regType"));
      return;
    }
    setLoading(true);
    setError("");

    const payload: Record<string, unknown> = {
      memberType,
      registrationType: form.registrationType,
      fullName: form.fullName,
      isActive: false,
    };

    const optStrs: (keyof typeof form)[] = [
      "dateOfBirth", "placeOfBirth", "gender", "educationalLevel", "phone", "address",
    ];
    for (const k of optStrs) if (form[k]) payload[k] = form[k];

    if (memberType === "CHILD") {
      const childStrs: (keyof typeof form)[] = [
        "fatherName", "fatherCin", "fatherProfession", "fatherEducation", "fatherPhone", "fatherLandline", "fatherAddress",
        "motherName", "motherCin", "motherProfession", "motherEducation", "motherPhone", "motherLandline", "motherAddress",
        "parentCin", "healthStatus", "healthConditions",
      ];
      for (const k of childStrs) if (form[k]) payload[k] = form[k];
      if (form.siblingsBoys) payload.siblingsBoys = parseInt(form.siblingsBoys);
      if (form.siblingsGirls) payload.siblingsGirls = parseInt(form.siblingsGirls);
      if (form.siblingOrder) payload.siblingOrder = parseInt(form.siblingOrder);
    } else {
      const adultStrs: (keyof typeof form)[] = ["cin", "landline", "profession", "maritalStatus", "interests"];
      for (const k of adultStrs) if (form[k]) payload[k] = form[k];
      if (form.childrenBoys) payload.childrenBoys = parseInt(form.childrenBoys);
      if (form.childrenGirls) payload.childrenGirls = parseInt(form.childrenGirls);
      payload.interestJtima3iya = form.interestJtima3iya;
      payload.interestTarbawiya = form.interestTarbawiya;
      payload.interestFikriya = form.interestFikriya;
    }

    const res = await fetch("/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data = await res.json().catch(() => null);
      // Best-effort photo upload — failures shouldn't block the signup itself.
      if (photo && data?.id) {
        try {
          const fd = new FormData();
          fd.append("memberId", data.id);
          fd.append("photo", photo);
          await fetch("/api/signup/photo", { method: "POST", body: fd });
        } catch { /* ignore — admin can add the photo later */ }
      }
      setStep("success");
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? t("auth.signup.error.generic"));
    }
    setLoading(false);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setPhoto(file);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(file ? URL.createObjectURL(file) : null);
  };

  return (
    <div className="auth-bg min-h-screen flex items-center justify-center p-4 py-10">

      {step === "choose" && (
        <div className="w-full max-w-lg">
          <div className="text-center mb-8">
            <div className="logo-badge mx-auto mb-5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.jpg" alt={t("auth.org.name")} className="w-full h-full object-cover" />
            </div>
            <h1 className="text-2xl font-bold text-white">{t("auth.signup.choose.title")}</h1>
            <p className="text-sm mt-1.5" style={{ color: "oklch(0.72 0.07 130)" }}>
              {t("auth.signup.choose.subtitle")}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button className="type-card" onClick={() => { setMemberType("CHILD"); setStep("form"); }}>
              <span className="type-icon">👦</span>
              <span className="type-title">{t("auth.signup.childCard.title")}</span>
              <span className="type-desc">{t("auth.signup.childCard.desc")}</span>
            </button>
            <button className="type-card" onClick={() => { setMemberType("ADULT"); setStep("form"); }}>
              <span className="type-icon">🤝</span>
              <span className="type-title">{t("auth.signup.adultCard.title")}</span>
              <span className="type-desc">{t("auth.signup.adultCard.desc")}</span>
            </button>
          </div>

          <p className="text-center text-sm mt-8" style={{ color: "oklch(0.60 0.04 140)" }}>
            {t("auth.signup.haveAccount")}{" "}
            <Link href="/login" className="font-semibold" style={{ color: "oklch(0.82 0.16 82)" }}>
              {t("auth.login.title")}
            </Link>
          </p>
        </div>
      )}

      {step === "form" && (
        <div className="auth-card w-full max-w-xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <span
                className="text-xs font-bold px-2.5 py-1 rounded-full"
                style={{ background: "oklch(0.80 0.16 82 / 0.15)", color: "oklch(0.82 0.16 82)", border: "1px solid oklch(0.80 0.16 82 / 0.3)" }}
              >
                {memberType === "CHILD" ? `👦 ${t("auth.signup.badge.child")}` : `🤝 ${t("auth.signup.badge.adult")}`}
              </span>
              <h2 className="text-lg font-bold text-white">
                {memberType === "CHILD" ? t("auth.signup.form.childTitle") : t("auth.signup.form.adultTitle")}
              </h2>
            </div>
            <button type="button" onClick={() => { setStep("choose"); setError(""); }} className="text-sm" style={{ color: "oklch(0.65 0.07 140)" }}>
              ← {t("auth.signup.changeType")}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <section className="form-section">
              <h3 className="form-section-title">{t("auth.signup.photo.section")}</h3>
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden border-2 shrink-0" style={{ background: "oklch(0.20 0.07 155 / 0.6)", borderColor: "oklch(0.40 0.08 155)" }}>
                  {photoPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photoPreview} alt={t("auth.signup.photo.previewAlt")} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl sm:text-3xl" style={{ color: "oklch(0.55 0.06 140)" }}>👤</div>
                  )}
                </div>
                <div className="flex-1 min-w-0 space-y-1.5">
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer" style={{ background: "oklch(0.42 0.14 155)", color: "white" }}>
                    📷 {photo ? t("auth.signup.photo.change") : t("auth.signup.photo.pick")}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handlePhotoChange}
                      className="hidden"
                    />
                  </label>
                  {photo && (
                    <p className="text-[11px] truncate" style={{ color: "oklch(0.78 0.06 140)" }} title={photo.name}>{photo.name}</p>
                  )}
                  <p className="text-[10px]" style={{ color: "oklch(0.55 0.06 140)" }}>{t("auth.signup.photo.hint")}</p>
                </div>
              </div>
            </section>

            <section className="form-section">
              <h3 className="form-section-title">{t("auth.signup.regType.section")}</h3>
              <div className="space-y-1">
                <label className="auth-label">{t("auth.signup.regType.label")}</label>
                <select className="auth-input" value={form.registrationType} onChange={(e) => update("registrationType", e.target.value)} required>
                  <option value="">{t("auth.signup.selectPlaceholder")}</option>
                  {REGISTRATION_TYPES.map((r) => (
                    <option key={r.value} value={r.value}>{t(r.key)}</option>
                  ))}
                </select>
              </div>
            </section>

            <section className="form-section">
              <h3 className="form-section-title">{t("auth.signup.personal.section")}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2 space-y-1">
                  <label className="auth-label">{t("auth.signup.fullName.label")}</label>
                  <input className="auth-input" value={form.fullName} onChange={(e) => update("fullName", e.target.value)} required />
                </div>
                <div className="space-y-1">
                  <label className="auth-label">{t("auth.signup.birthDate.label")}</label>
                  <input type="date" className="auth-input" value={form.dateOfBirth} onChange={(e) => update("dateOfBirth", e.target.value)} dir="ltr" />
                </div>
                <div className="space-y-1">
                  <label className="auth-label">{t("auth.signup.birthPlace.label")}</label>
                  <input className="auth-input" value={form.placeOfBirth} onChange={(e) => update("placeOfBirth", e.target.value)} placeholder={t("auth.signup.city.placeholder")} />
                </div>
                <div className="space-y-1">
                  <label className="auth-label">{t("auth.signup.gender.label")}</label>
                  <select className="auth-input" value={form.gender} onChange={(e) => update("gender", e.target.value)}>
                    <option value="">{t("auth.signup.selectPlaceholder")}</option>
                    <option value="MALE">{t("auth.signup.gender.male")}</option>
                    <option value="FEMALE">{t("auth.signup.gender.female")}</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="auth-label">{t("auth.signup.eduLevel.label")}</label>
                  <select className="auth-input" value={form.educationalLevel} onChange={(e) => update("educationalLevel", e.target.value)}>
                    <option value="">{t("auth.signup.selectPlaceholder")}</option>
                    {EDUCATIONAL_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              </div>
            </section>

            {memberType === "CHILD" ? (
              <>
                <section className="form-section">
                  <h3 className="form-section-title">{t("auth.signup.health.section")}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="auth-label">{t("auth.signup.health.status.label")}</label>
                      <select className="auth-input" value={form.healthStatus} onChange={(e) => update("healthStatus", e.target.value)}>
                        <option value="">{t("auth.signup.selectPlaceholder")}</option>
                        <option value="HEALTHY">{t("auth.signup.health.healthy")}</option>
                        <option value="SICK">{t("auth.signup.health.sick")}</option>
                      </select>
                    </div>
                    {form.healthStatus === "SICK" && (
                      <div className="space-y-1">
                        <label className="auth-label">{t("auth.signup.health.condition.label")}</label>
                        <input className="auth-input" value={form.healthConditions} onChange={(e) => update("healthConditions", e.target.value)} />
                      </div>
                    )}
                  </div>
                </section>

                <section className="form-section">
                  <h3 className="form-section-title">{t("auth.signup.siblings.section")}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="auth-label">{t("auth.signup.siblings.brothers.label")}</label>
                      <input type="number" min="0" className="auth-input" value={form.siblingsBoys} onChange={(e) => update("siblingsBoys", e.target.value)} dir="ltr" />
                    </div>
                    <div className="space-y-1">
                      <label className="auth-label">{t("auth.signup.siblings.sisters.label")}</label>
                      <input type="number" min="0" className="auth-input" value={form.siblingsGirls} onChange={(e) => update("siblingsGirls", e.target.value)} dir="ltr" />
                    </div>
                    <div className="space-y-1">
                      <label className="auth-label">{t("auth.signup.siblings.order.label")}</label>
                      <input type="number" min="1" className="auth-input" value={form.siblingOrder} onChange={(e) => update("siblingOrder", e.target.value)} dir="ltr" />
                    </div>
                  </div>
                </section>

                <section className="form-section">
                  <h3 className="form-section-title">{t("auth.signup.father.section")}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1"><label className="auth-label">{t("auth.signup.father.name.label")}</label><input className="auth-input" value={form.fatherName} onChange={(e) => update("fatherName", e.target.value)} /></div>
                    <div className="space-y-1"><label className="auth-label">{t("auth.signup.profession.label")}</label><input className="auth-input" value={form.fatherProfession} onChange={(e) => update("fatherProfession", e.target.value)} /></div>
                    <div className="space-y-1"><label className="auth-label">{t("auth.signup.cin.label")}</label><input className="auth-input" value={form.fatherCin} onChange={(e) => update("fatherCin", e.target.value)} dir="ltr" /></div>
                    <div className="space-y-1"><label className="auth-label">{t("auth.signup.eduLevel.label")}</label><input className="auth-input" value={form.fatherEducation} onChange={(e) => update("fatherEducation", e.target.value)} /></div>
                    <div className="space-y-1"><label className="auth-label">{t("auth.signup.mobile.label")}</label><input className="auth-input" value={form.fatherPhone} onChange={(e) => update("fatherPhone", e.target.value)} placeholder="06XXXXXXXX" dir="ltr" /></div>
                    <div className="space-y-1"><label className="auth-label">{t("auth.signup.landline.label")}</label><input className="auth-input" value={form.fatherLandline} onChange={(e) => update("fatherLandline", e.target.value)} placeholder="05XXXXXXXX" dir="ltr" /></div>
                    <div className="sm:col-span-2 space-y-1"><label className="auth-label">{t("auth.signup.address.label")}</label><input className="auth-input" value={form.fatherAddress} onChange={(e) => update("fatherAddress", e.target.value)} /></div>
                  </div>
                </section>

                <section className="form-section">
                  <h3 className="form-section-title">{t("auth.signup.mother.section")}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1"><label className="auth-label">{t("auth.signup.mother.name.label")}</label><input className="auth-input" value={form.motherName} onChange={(e) => update("motherName", e.target.value)} /></div>
                    <div className="space-y-1"><label className="auth-label">{t("auth.signup.profession.label")}</label><input className="auth-input" value={form.motherProfession} onChange={(e) => update("motherProfession", e.target.value)} /></div>
                    <div className="space-y-1"><label className="auth-label">{t("auth.signup.cin.label")}</label><input className="auth-input" value={form.motherCin} onChange={(e) => update("motherCin", e.target.value)} dir="ltr" /></div>
                    <div className="space-y-1"><label className="auth-label">{t("auth.signup.eduLevel.label")}</label><input className="auth-input" value={form.motherEducation} onChange={(e) => update("motherEducation", e.target.value)} /></div>
                    <div className="space-y-1"><label className="auth-label">{t("auth.signup.mobile.label")}</label><input className="auth-input" value={form.motherPhone} onChange={(e) => update("motherPhone", e.target.value)} placeholder="06XXXXXXXX" dir="ltr" /></div>
                    <div className="space-y-1"><label className="auth-label">{t("auth.signup.landline.label")}</label><input className="auth-input" value={form.motherLandline} onChange={(e) => update("motherLandline", e.target.value)} placeholder="05XXXXXXXX" dir="ltr" /></div>
                    <div className="sm:col-span-2 space-y-1"><label className="auth-label">{t("auth.signup.address.label")}</label><input className="auth-input" value={form.motherAddress} onChange={(e) => update("motherAddress", e.target.value)} /></div>
                    <div className="sm:col-span-2 space-y-1"><label className="auth-label">{t("auth.signup.guardianCin.label")}</label><input className="auth-input" value={form.parentCin} onChange={(e) => update("parentCin", e.target.value)} dir="ltr" /></div>
                  </div>
                </section>
              </>
            ) : (
              <>
                <section className="form-section">
                  <h3 className="form-section-title">{t("auth.signup.member.section")}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1"><label className="auth-label">{t("auth.signup.cin.fullLabel")}</label><input className="auth-input" value={form.cin} onChange={(e) => update("cin", e.target.value)} dir="ltr" placeholder="AB123456" /></div>
                    <div className="space-y-1"><label className="auth-label">{t("auth.signup.profession.label")}</label><input className="auth-input" value={form.profession} onChange={(e) => update("profession", e.target.value)} /></div>
                    <div className="space-y-1">
                      <label className="auth-label">{t("auth.signup.marital.label")}</label>
                      <select className="auth-input" value={form.maritalStatus} onChange={(e) => update("maritalStatus", e.target.value)}>
                        <option value="">{t("auth.signup.selectPlaceholder")}</option>
                        <option value="SINGLE">{t("auth.signup.marital.single")}</option>
                        <option value="MARRIED">{t("auth.signup.marital.married")}</option>
                        <option value="DIVORCED">{t("auth.signup.marital.divorced")}</option>
                        <option value="WIDOWED">{t("auth.signup.marital.widowed")}</option>
                      </select>
                    </div>
                    <div className="space-y-1"><label className="auth-label">{t("auth.signup.landline.label")}</label><input className="auth-input" value={form.landline} onChange={(e) => update("landline", e.target.value)} placeholder="05XXXXXXXX" dir="ltr" /></div>
                    <div className="space-y-1"><label className="auth-label">{t("auth.signup.children.boys.label")}</label><input type="number" min="0" className="auth-input" value={form.childrenBoys} onChange={(e) => update("childrenBoys", e.target.value)} dir="ltr" /></div>
                    <div className="space-y-1"><label className="auth-label">{t("auth.signup.children.girls.label")}</label><input type="number" min="0" className="auth-input" value={form.childrenGirls} onChange={(e) => update("childrenGirls", e.target.value)} dir="ltr" /></div>
                  </div>
                </section>

                <section className="form-section">
                  <h3 className="form-section-title">{t("auth.signup.interests.section")}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
                    <label className="flex items-center gap-2 text-sm" style={{ color: "oklch(0.78 0.06 140)" }}>
                      <input type="checkbox" checked={form.interestJtima3iya} onChange={(e) => update("interestJtima3iya", e.target.checked)} />
                      {t("auth.signup.interests.social")}
                    </label>
                    <label className="flex items-center gap-2 text-sm" style={{ color: "oklch(0.78 0.06 140)" }}>
                      <input type="checkbox" checked={form.interestTarbawiya} onChange={(e) => update("interestTarbawiya", e.target.checked)} />
                      {t("auth.signup.interests.educational")}
                    </label>
                    <label className="flex items-center gap-2 text-sm" style={{ color: "oklch(0.78 0.06 140)" }}>
                      <input type="checkbox" checked={form.interestFikriya} onChange={(e) => update("interestFikriya", e.target.checked)} />
                      {t("auth.signup.interests.intellectual")}
                    </label>
                  </div>
                  <div className="space-y-1">
                    <label className="auth-label">{t("auth.signup.interests.other.label")}</label>
                    <input className="auth-input" value={form.interests} onChange={(e) => update("interests", e.target.value)} placeholder={t("auth.signup.interests.placeholder")} />
                  </div>
                </section>
              </>
            )}

            <section className="form-section">
              <h3 className="form-section-title">{t("auth.signup.contact.section")}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="auth-label">{t("auth.signup.phone.label")}</label>
                  <input className="auth-input" value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="06XXXXXXXX" dir="ltr" />
                </div>
                <div className="space-y-1">
                  <label className="auth-label">{t("auth.signup.address.label")}</label>
                  <input className="auth-input" value={form.address} onChange={(e) => update("address", e.target.value)} />
                </div>
              </div>
            </section>

            {error && (
              <p className="text-xs py-2 px-3 rounded-lg bg-red-500/15 text-red-300 text-center">
                {error}
              </p>
            )}

            <button type="submit" className="auth-btn" disabled={loading}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {t("auth.signup.submitting")}
                </span>
              ) : (
                t("auth.signup.submitRequest")
              )}
            </button>
          </form>
        </div>
      )}

      {step === "success" && (
        <div className="auth-card w-full max-w-sm text-center">
          <div className="success-check mx-auto mb-5">✓</div>
          <h2 className="text-xl font-bold text-white mb-3">{t("auth.signup.success.title")}</h2>
          <p className="text-sm leading-relaxed mb-6" style={{ color: "oklch(0.72 0.07 130)" }}>
            {memberType === "ADULT" ? t("auth.signup.success.bodyAdult") : t("auth.signup.success.body")}
          </p>
          <Link href="/login" className="auth-btn block text-center no-underline" style={{ textDecoration: "none" }}>
            {t("auth.signup.success.backToLogin")}
          </Link>
        </div>
      )}

      <style>{`
        .auth-bg {
          background-image:
            linear-gradient(oklch(0.18 0.08 155 / 0.88), oklch(0.18 0.08 155 / 0.92)),
            url('/cover.png');
          background-size: cover;
          background-position: center;
          background-attachment: fixed;
        }
        .auth-card {
          background: oklch(0.27 0.09 155 / 0.75);
          border: 1px solid oklch(0.40 0.08 155);
          border-radius: 1.25rem;
          padding: 2rem 1.75rem;
          backdrop-filter: blur(12px);
          box-shadow: 0 25px 60px oklch(0.10 0.05 155 / 0.5);
        }
        .logo-badge {
          width: 72px; height: 72px;
          border-radius: 50%; overflow: hidden;
          border: 3px solid white;
          box-shadow: 0 0 0 3px oklch(0.80 0.16 82 / 0.4), 0 8px 24px oklch(0.10 0.05 155 / 0.5);
        }
        .type-card {
          background: oklch(0.27 0.09 155 / 0.75);
          border: 1px solid oklch(0.40 0.08 155);
          border-radius: 1.25rem;
          padding: 2rem 1.5rem;
          backdrop-filter: blur(12px);
          display: flex; flex-direction: column;
          align-items: center; gap: 0.5rem;
          cursor: pointer;
          transition: all 0.2s;
          text-align: center;
        }
        .type-card:hover {
          border-color: oklch(0.80 0.16 82 / 0.6);
          background: oklch(0.30 0.10 155 / 0.9);
          transform: translateY(-3px);
          box-shadow: 0 16px 40px oklch(0.10 0.05 155 / 0.5);
        }
        .type-icon { font-size: 2.25rem; }
        .type-title { font-size: 1rem; font-weight: 700; color: white; }
        .type-desc { font-size: 0.8125rem; color: oklch(0.65 0.06 140); }
        .auth-label { display: block; font-size: 0.8rem; font-weight: 600; color: oklch(0.78 0.06 140); }
        .auth-input {
          width: 100%;
          background: oklch(0.20 0.07 155 / 0.6);
          border: 1px solid oklch(0.38 0.07 155);
          border-radius: 0.5rem;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          color: white; font-family: inherit;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
          text-align: right;
        }
        .auth-input option { background: oklch(0.22 0.08 155); color: white; }
        .auth-input::placeholder { color: oklch(0.48 0.04 155); }
        .auth-input:focus { border-color: oklch(0.55 0.12 155); box-shadow: 0 0 0 3px oklch(0.55 0.12 155 / 0.2); }
        .form-section {
          background: oklch(0.22 0.07 155 / 0.5);
          border: 1px solid oklch(0.35 0.06 155);
          border-radius: 0.875rem;
          padding: 0.875rem 1rem;
        }
        .form-section-title {
          font-size: 0.75rem; font-weight: 700;
          color: oklch(0.80 0.16 82);
          margin-bottom: 0.75rem;
          letter-spacing: 0.04em;
        }
        .auth-btn {
          width: 100%;
          background: linear-gradient(135deg, oklch(0.42 0.14 155), oklch(0.35 0.12 155));
          border: 1px solid oklch(0.50 0.12 155);
          border-radius: 0.625rem;
          padding: 0.75rem 1rem;
          font-size: 0.9375rem; font-weight: 600;
          color: white; font-family: inherit;
          cursor: pointer; transition: all 0.15s; display: block;
        }
        .auth-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, oklch(0.46 0.14 155), oklch(0.39 0.12 155));
          box-shadow: 0 4px 16px oklch(0.25 0.10 155 / 0.5);
        }
        .auth-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .success-check {
          width: 60px; height: 60px;
          background: oklch(0.42 0.16 155);
          border: 2px solid oklch(0.60 0.16 155);
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 1.5rem; color: white;
        }
      `}</style>
    </div>
  );
}
