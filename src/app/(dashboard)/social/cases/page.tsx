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
import { useT } from "@/components/i18n/provider";

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
  const { t } = useT();
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
      <Card><CardContent className="py-12 text-center text-muted-foreground">{t("social.casesPageRestricted")}</CardContent></Card>
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
          <h1 className="text-2xl font-bold">{t("social.casesTitle")}</h1>
          <p className="text-muted-foreground">{t("social.casesSubtitle")}</p>
        </div>
        <div className="flex gap-2 items-center">
          <ImportDialog onImported={load} />
          <NewCaseDialog onCreated={load} />
        </div>
      </div>

      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <Card><CardHeader className="pb-1"><CardTitle className="text-sm text-muted-foreground">{t("common.total")}</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold">{stats.total}</div></CardContent></Card>
        <Card><CardHeader className="pb-1"><CardTitle className="text-sm text-muted-foreground">{t("social.orphans")}</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold text-amber-600">{stats.yatim}</div></CardContent></Card>
        <Card><CardHeader className="pb-1"><CardTitle className="text-sm text-muted-foreground">{t("social.needy")}</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold text-blue-600">{stats.mozwiz}</div></CardContent></Card>
        <Card><CardHeader className="pb-1"><CardTitle className="text-sm text-muted-foreground">{t("social.needsFollowup")}</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold">{stats.needsFollowup}</div></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-4 flex flex-wrap gap-3 items-center">
          <Input placeholder={t("social.searchByNamePlaceholder")} value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
          <select className="border rounded-md h-9 px-2 text-sm" value={type} onChange={(e) => setType(e.target.value as "" | "YATIM" | "MOZWIZ" | "GENERAL")}>
            <option value="">{t("social.allTypes")}</option>
            <option value="YATIM">{t("social.typeOrphans")}</option>
            <option value="MOZWIZ">{t("social.typeNeedy")}</option>
            <option value="GENERAL">{t("social.typeGeneral")}</option>
          </select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 divide-y">
          {loading && <p className="p-6 text-center text-muted-foreground">{t("common.loading")}</p>}
          {!loading && cases.length === 0 && <p className="p-12 text-center text-muted-foreground">{t("social.noCases")}</p>}
          {!loading && cases.map((c) => {
            const age = ageOf(c.dateOfBirth);
            return (
              <Link key={c.id} href={`/social/cases/${c.id}`} className="flex items-center gap-3 p-3 hover:bg-muted/50 transition">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {c.type === "YATIM" && <Badge className="bg-amber-100 text-amber-800 text-[10px]">{t("social.badgeOrphan")}</Badge>}
                    {c.type === "MOZWIZ" && <Badge className="bg-blue-100 text-blue-800 text-[10px]">{t("social.badgeNeedy")}</Badge>}
                    {c.type === "GENERAL" && <Badge variant="outline" className="text-[10px]">{t("social.typeGeneral")}</Badge>}
                    <span className="text-xs text-muted-foreground" dir="ltr">#{c.caseNumber}</span>
                    <span className="font-medium">{c.fullName}</span>
                    {age != null && <span className="text-xs text-muted-foreground">{t("social.yearsOld", { age })}</span>}
                    {c.gender === "MALE" && <span className="text-xs">♂</span>}
                    {c.gender === "FEMALE" && <span className="text-xs">♀</span>}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-3">
                    {c.phone && <span dir="ltr">{c.phone}</span>}
                    {c.familySize != null && <span>{t("social.familyLabel")}: {c.familySize}</span>}
                    {c.monthlyIncome && <span>{t("social.incomeLabel")}: {Number(c.monthlyIncome).toFixed(0)} {t("social.mad")}</span>}
                    {c._count.projectLinks > 0 && <span>{t("social.projectsLabel")}: {c._count.projectLinks}</span>}
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
  const { t } = useT();
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
    if (!form.fullName.trim()) return toast.error(t("social.nameRequired"));
    setSaving(true);
    const r = await fetch("/api/social-cases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const d = await r.json().catch(() => ({}));
    if (r.ok) { toast.success(t("social.caseCreated")); setOpen(false); onCreated(); }
    else toast.error(d.error ?? t("social.failed"));
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button><Plus size={14} />{t("social.newCase")}</Button>} />
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{t("social.addCaseTitle")}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1">
            <Label>{t("social.caseType")}</Label>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant={form.type === "YATIM" ? "default" : "outline"} onClick={() => setForm({ ...form, type: "YATIM" })}>{t("social.badgeOrphan")}</Button>
              <Button type="button" size="sm" variant={form.type === "MOZWIZ" ? "default" : "outline"} onClick={() => setForm({ ...form, type: "MOZWIZ" })}>{t("social.badgeNeedy")}</Button>
              <Button type="button" size="sm" variant={form.type === "GENERAL" ? "default" : "outline"} onClick={() => setForm({ ...form, type: "GENERAL" })}>{t("social.typeGeneral")}</Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div><Label>{t("social.fullNameLabel")}</Label><Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required /></div>
            <div><Label>{t("common.phone")}</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} dir="ltr" className="text-right" /></div>
            <div><Label>{t("social.dobLabel")}</Label><Input type="date" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} dir="ltr" /></div>
            <div>
              <Label>{t("social.genderLabel")}</Label>
              <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} className="border rounded-md w-full h-9 px-2 text-sm">
                <option value="">—</option><option value="MALE">{t("social.male")}</option><option value="FEMALE">{t("social.female")}</option>
              </select>
            </div>
            <div><Label>{t("social.cin")}</Label><Input value={form.cin} onChange={(e) => setForm({ ...form, cin: e.target.value })} dir="ltr" className="text-right" /></div>
            <div className="col-span-2"><Label>{t("common.address")}</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
          </div>

          {form.type === "YATIM" && (
            <div className="border rounded-md p-3 space-y-3 bg-amber-50/40">
              <p className="text-sm font-medium">{t("social.orphanInfoTitle")}</p>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">{t("social.fatherName")}</Label><Input value={form.fatherName} onChange={(e) => setForm({ ...form, fatherName: e.target.value })} /></div>
                <label className="flex items-center gap-2 text-sm self-end pb-2"><input type="checkbox" checked={form.fatherDeceased} onChange={(e) => setForm({ ...form, fatherDeceased: e.target.checked })} />{t("social.fatherDeceased")}</label>
                <div><Label className="text-xs">{t("social.motherName")}</Label><Input value={form.motherName} onChange={(e) => setForm({ ...form, motherName: e.target.value })} /></div>
                <label className="flex items-center gap-2 text-sm self-end pb-2"><input type="checkbox" checked={form.motherDeceased} onChange={(e) => setForm({ ...form, motherDeceased: e.target.checked })} />{t("social.motherDeceased")}</label>
                <div><Label className="text-xs">{t("social.guardianName")}</Label><Input value={form.guardianName} onChange={(e) => setForm({ ...form, guardianName: e.target.value })} /></div>
                <div><Label className="text-xs">{t("social.guardianRelation")}</Label><Input value={form.guardianRelation} onChange={(e) => setForm({ ...form, guardianRelation: e.target.value })} /></div>
                <div className="col-span-2"><Label className="text-xs">{t("social.guardianPhone")}</Label><Input value={form.guardianPhone} onChange={(e) => setForm({ ...form, guardianPhone: e.target.value })} dir="ltr" className="text-right" /></div>
              </div>
              {!form.fatherDeceased && (
                <div>
                  <Label className="text-xs text-red-600">{t("social.overrideReasonLabel")}</Label>
                  <Textarea rows={2} value={form.yatimOverrideReason} onChange={(e) => setForm({ ...form, yatimOverrideReason: e.target.value })} placeholder={t("social.overrideReasonPlaceholder")} />
                </div>
              )}
            </div>
          )}

          {form.type === "MOZWIZ" && (
            <div className="border rounded-md p-3 space-y-3 bg-blue-50/40">
              <p className="text-sm font-medium">{t("social.socialStatusLabel")}</p>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">{t("social.monthlyIncomeLabel")}</Label><Input type="number" step="0.01" value={form.monthlyIncome} onChange={(e) => setForm({ ...form, monthlyIncome: e.target.value })} dir="ltr" className="text-right" /></div>
                <div><Label className="text-xs">{t("social.familySizeLabel")}</Label><Input type="number" min="1" value={form.familySize} onChange={(e) => setForm({ ...form, familySize: e.target.value })} dir="ltr" className="text-right" /></div>
                <div className="col-span-2"><Label className="text-xs">{t("social.housingLabel")}</Label><Input value={form.housingStatus} onChange={(e) => setForm({ ...form, housingStatus: e.target.value })} placeholder={t("social.housingPlaceholder")} /></div>
              </div>
            </div>
          )}

          <div><Label>{t("common.notes")}</Label><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          <Button type="submit" className="w-full" disabled={saving}>{saving ? "..." : t("common.add")}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ImportDialog({ onImported }: { onImported: () => void }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<{ total: number; valid: number; errors: { row: number; error: string }[]; preview: Record<string, unknown>[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = async (dryRun: boolean) => {
    if (!file) return toast.error(t("social.chooseFileFirst"));
    setBusy(true);
    const fd = new FormData();
    fd.append("file", file);
    const r = await fetch(`/api/social-cases/import?dryRun=${dryRun ? "1" : "0"}`, { method: "POST", body: fd });
    const data = await r.json();
    if (!r.ok) { toast.error(data.error ?? t("social.failed")); setBusy(false); return; }
    if (dryRun) {
      setPreview(data);
    } else {
      toast.success(t("social.importedCount", { count: data.inserted }));
      setOpen(false);
      setPreview(null);
      setFile(null);
      onImported();
    }
    setBusy(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setPreview(null); setFile(null); } }}>
      <DialogTrigger render={<Button variant="outline"><Upload size={14} />{t("social.importExcel")}</Button>} />
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{t("social.importDialogTitle")}</DialogTitle></DialogHeader>
        <div className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            {t("social.columnsHelp")}
          </p>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-sm file:bg-primary file:text-primary-foreground cursor-pointer"
          />

          <div className="flex gap-2">
            <Button variant="outline" disabled={!file || busy} onClick={() => upload(true)}>{busy ? "..." : t("social.previewBtn")}</Button>
            <Button disabled={!preview || (preview && preview.valid === 0) || busy} onClick={() => upload(false)}>{busy ? "..." : t("social.importCountBtn", { count: preview?.valid ?? 0 })}</Button>
          </div>

          {preview && (
            <div className="border rounded-md p-3 space-y-2 bg-muted/30">
              <div>{t("social.summaryTotal")}: <strong>{preview.total}</strong> · {t("social.summaryValid")}: <strong className="text-green-700">{preview.valid}</strong> · {t("social.summaryErrors")}: <strong className="text-red-600">{preview.errors.length}</strong></div>
              {preview.errors.length > 0 && (
                <details>
                  <summary className="cursor-pointer">{t("social.errorsSummary", { count: preview.errors.length })}</summary>
                  <ul className="mt-2 space-y-1 text-xs">
                    {preview.errors.slice(0, 50).map((e, i) => (
                      <li key={i}>{t("social.rowError", { row: e.row, error: e.error })}</li>
                    ))}
                  </ul>
                </details>
              )}
              {preview.preview.length > 0 && (
                <details open>
                  <summary className="cursor-pointer">{t("social.previewRows", { count: preview.preview.length })}</summary>
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
