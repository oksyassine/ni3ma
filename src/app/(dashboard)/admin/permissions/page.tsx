"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type Subj = { id: string; fullName: string; username: string | null } | null;

type SectionGrant = {
  id: string;
  section: "EDUCATIONAL" | "SOCIAL" | "QURAN" | "QUDAT" | "MEDIA";
  level: "READ" | "RW" | "ADMIN";
  user: Subj;
  member: Subj;
  grantedAt: string;
};

type BureauGrant = {
  id: string;
  level: "READ" | "RW";
  user: Subj;
  member: Subj;
  grantedAt: string;
};

const SECTIONS = [
  { value: "EDUCATIONAL", label: "تربوي" },
  { value: "SOCIAL", label: "اجتماعي" },
  { value: "QURAN", label: "قرآن" },
  { value: "QUDAT", label: "مركز تأهيل القادة" },
  { value: "MEDIA", label: "إعلامي" },
];
const SECTION_LEVELS = [
  { value: "READ", label: "قراءة" },
  { value: "RW", label: "قراءة + كتابة" },
  { value: "ADMIN", label: "مدير القسم" },
];
const BUREAU_LEVELS = [
  { value: "READ", label: "قراءة" },
  { value: "RW", label: "قراءة + كتابة" },
];

export default function PermissionsPage() {
  const [section, setSection] = useState<SectionGrant[]>([]);
  const [bureau, setBureau] = useState<BureauGrant[]>([]);
  const [loading, setLoading] = useState(true);

  // Search picker
  const [memberQ, setMemberQ] = useState("");
  const [memberHits, setMemberHits] = useState<{ id: string; fullName: string; username: string | null }[]>([]);
  const [picked, setPicked] = useState<{ id: string; fullName: string } | null>(null);

  // Grant form
  const [grantKind, setGrantKind] = useState<"section" | "bureau" | "baht">("section");
  const [grantSection, setGrantSection] = useState<string>("EDUCATIONAL");
  const [grantLevel, setGrantLevel] = useState<string>("READ");

  const load = async () => {
    setLoading(true);
    const r = await fetch("/api/permissions").then((r) => r.json());
    setSection(r.section ?? []);
    setBureau(r.bureau ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Live search members
  useEffect(() => {
    const t = setTimeout(async () => {
      if (!memberQ.trim()) { setMemberHits([]); return; }
      const r = await fetch(`/api/members?search=${encodeURIComponent(memberQ)}&limit=8`).then((r) => r.json());
      setMemberHits(r.members ?? []);
    }, 250);
    return () => clearTimeout(t);
  }, [memberQ]);

  const grant = async () => {
    if (!picked) return toast.error("اختر منخرطا أولا");
    if (grantKind === "baht") {
      const r = await fetch(`/api/members/${picked.id}/baht-team`, { method: "PUT" });
      const data = await r.json().catch(() => ({}));
      if (r.ok) { toast.success("تم تعيينه في فريق البحث الاجتماعي"); load(); }
      else toast.error(data.error ?? "فشل");
      return;
    }
    const body: Record<string, unknown> = {
      kind: grantKind, subjectType: "member", subjectId: picked.id, level: grantLevel,
    };
    if (grantKind === "section") body.section = grantSection;
    const r = await fetch("/api/permissions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await r.json().catch(() => ({}));
    if (r.ok) { toast.success("تم منح الصلاحية"); load(); }
    else toast.error(data.error ?? "فشل");
  };

  const revokeSection = async (g: SectionGrant) => {
    if (!confirm("سحب الصلاحية؟")) return;
    const subj = g.member ? { subjectType: "member", subjectId: g.member.id } : { subjectType: "user", subjectId: g.user!.id };
    const r = await fetch("/api/permissions", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "section", section: g.section, ...subj }) });
    if (r.ok) { toast.success("تم"); load(); } else toast.error("فشل");
  };

  const revokeBureau = async (g: BureauGrant) => {
    if (!confirm("سحب الصلاحية؟")) return;
    const subj = g.member ? { subjectType: "member", subjectId: g.member.id } : { subjectType: "user", subjectId: g.user!.id };
    const r = await fetch("/api/permissions", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "bureau", ...subj }) });
    const data = await r.json().catch(() => ({}));
    if (r.ok) { toast.success("تم"); load(); }
    else if (data.code === "LAST_BUREAU_RW") {
      if (confirm(data.error + "\n\nالاستمرار رغم ذلك (force)؟")) {
        const r2 = await fetch("/api/permissions", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "bureau", force: true, ...subj }) });
        if (r2.ok) { toast.success("تم"); load(); } else toast.error("فشل");
      }
    } else toast.error(data.error ?? "فشل");
  };

  const subjectName = (g: SectionGrant | BureauGrant) =>
    g.user?.fullName ?? g.member?.fullName ?? "—";

  const sectionLabel = (s: string) =>
    SECTIONS.find((x) => x.value === s)?.label ?? s;

  const groupedSection = section.reduce((acc, g) => {
    (acc[g.section] = acc[g.section] ?? []).push(g);
    return acc;
  }, {} as Record<string, SectionGrant[]>);

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">الصلاحيات الموسعة</h1>
        <p className="text-muted-foreground">إدارة صلاحيات المكتب والأقسام وفريق البحث الاجتماعي</p>
      </div>

      {/* Grant card */}
      <Card>
        <CardHeader><CardTitle>منح صلاحية جديدة</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>المنخرط</Label>
            <Input value={memberQ} onChange={(e) => setMemberQ(e.target.value)} placeholder="ابحث بالاسم..." />
            {picked && (
              <div className="flex items-center gap-2 text-sm">
                <Badge>{picked.fullName}</Badge>
                <Button size="sm" variant="ghost" onClick={() => setPicked(null)}>تغيير</Button>
              </div>
            )}
            {!picked && memberHits.length > 0 && (
              <div className="border rounded-md divide-y">
                {memberHits.map((m) => (
                  <button key={m.id} type="button" className="w-full text-right p-2 text-sm hover:bg-muted" onClick={() => { setPicked({ id: m.id, fullName: m.fullName }); setMemberQ(""); setMemberHits([]); }}>
                    {m.fullName}{m.username ? ` (@${m.username})` : ""}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-1">
              <Label>نوع الصلاحية</Label>
              <select className="border rounded-md w-full h-9 px-2 text-sm" value={grantKind} onChange={(e) => {
                const next = e.target.value as "section" | "bureau" | "baht";
                setGrantKind(next);
                // Bureau only allows READ/RW — reset if "ADMIN" was selected for a section.
                if (next === "bureau" && grantLevel === "ADMIN") setGrantLevel("READ");
              }}>
                <option value="section">صلاحية قسم</option>
                <option value="bureau">صلاحية مكتب</option>
                <option value="baht">فريق البحث الاجتماعي</option>
              </select>
            </div>
            {grantKind === "section" && (
              <div className="space-y-1">
                <Label>القسم</Label>
                <select className="border rounded-md w-full h-9 px-2 text-sm" value={grantSection} onChange={(e) => setGrantSection(e.target.value)}>
                  {SECTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
            )}
            {grantKind !== "baht" && (
              <div className="space-y-1">
                <Label>المستوى</Label>
                <select className="border rounded-md w-full h-9 px-2 text-sm" value={grantLevel} onChange={(e) => setGrantLevel(e.target.value)}>
                  {(grantKind === "bureau" ? BUREAU_LEVELS : SECTION_LEVELS).map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
                </select>
              </div>
            )}
          </div>

          <Button onClick={grant} disabled={!picked}>منح</Button>
        </CardContent>
      </Card>

      {/* Bureau grants */}
      <Card>
        <CardHeader><CardTitle>صلاحيات المكتب المسير</CardTitle></CardHeader>
        <CardContent className="divide-y p-0">
          {loading && <p className="p-4 text-sm text-muted-foreground">جاري التحميل...</p>}
          {!loading && bureau.length === 0 && <p className="p-4 text-sm text-muted-foreground">لا توجد صلاحيات مسجلة</p>}
          {bureau.map((g) => (
            <div key={g.id} className="flex items-center justify-between p-3 text-sm">
              <div>
                <span className="font-medium">{subjectName(g)}</span>
                <Badge variant={g.level === "RW" ? "default" : "secondary"} className="mx-2">
                  {g.level === "RW" ? "قراءة + كتابة" : "قراءة"}
                </Badge>
              </div>
              <Button size="sm" variant="destructive" onClick={() => revokeBureau(g)}>سحب</Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Section grants */}
      {SECTIONS.map((s) => (
        <Card key={s.value}>
          <CardHeader><CardTitle>صلاحيات قسم {s.label}</CardTitle></CardHeader>
          <CardContent className="divide-y p-0">
            {loading && <p className="p-4 text-sm text-muted-foreground">...</p>}
            {!loading && (groupedSection[s.value] ?? []).length === 0 && <p className="p-4 text-sm text-muted-foreground">لا توجد صلاحيات</p>}
            {(groupedSection[s.value] ?? []).map((g) => (
              <div key={g.id} className="flex items-center justify-between p-3 text-sm">
                <div>
                  <span className="font-medium">{subjectName(g)}</span>
                  <Badge className="mx-2">{SECTION_LEVELS.find((l) => l.value === g.level)?.label ?? g.level}</Badge>
                </div>
                <Button size="sm" variant="destructive" onClick={() => revokeSection(g)}>سحب</Button>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
