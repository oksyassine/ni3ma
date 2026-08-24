"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useT } from "@/components/i18n/provider";

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

const SECTIONS = ["EDUCATIONAL", "SOCIAL", "QURAN", "QUDAT", "MEDIA"] as const;
const SECTION_LABEL_KEYS: Record<string, string> = {
  EDUCATIONAL: "admin.permissions.section.educational",
  SOCIAL: "admin.permissions.section.social",
  QURAN: "admin.permissions.section.quran",
  QUDAT: "admin.permissions.section.qudat",
  MEDIA: "admin.permissions.section.media",
};
const SECTION_LEVELS = ["READ", "RW", "ADMIN"] as const;
const BUREAU_LEVELS = ["READ", "RW"] as const;
const LEVEL_LABEL_KEYS: Record<string, string> = {
  READ: "admin.permissions.level.read",
  RW: "admin.permissions.level.rw",
  ADMIN: "admin.permissions.level.admin",
};

export default function PermissionsPage() {
  const { t } = useT();
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
    const timer = setTimeout(async () => {
      if (!memberQ.trim()) { setMemberHits([]); return; }
      const r = await fetch(`/api/members?search=${encodeURIComponent(memberQ)}&limit=8`).then((r) => r.json());
      setMemberHits(r.members ?? []);
    }, 250);
    return () => clearTimeout(timer);
  }, [memberQ]);

  const grant = async () => {
    if (!picked) return toast.error(t("admin.permissions.toastPickFirst"));
    if (grantKind === "baht") {
      const r = await fetch(`/api/members/${picked.id}/baht-team`, { method: "PUT" });
      const data = await r.json().catch(() => ({}));
      if (r.ok) { toast.success(t("admin.permissions.toastBahtAssigned")); load(); }
      else toast.error(data.error ?? t("admin.permissions.toastFailed"));
      return;
    }
    const body: Record<string, unknown> = {
      kind: grantKind, subjectType: "member", subjectId: picked.id, level: grantLevel,
    };
    if (grantKind === "section") body.section = grantSection;
    const r = await fetch("/api/permissions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await r.json().catch(() => ({}));
    if (r.ok) { toast.success(t("admin.permissions.toastGranted")); load(); }
    else toast.error(data.error ?? t("admin.permissions.toastFailed"));
  };

  const revokeSection = async (g: SectionGrant) => {
    if (!confirm(t("admin.permissions.confirmRevoke"))) return;
    const subj = g.member ? { subjectType: "member", subjectId: g.member.id } : { subjectType: "user", subjectId: g.user!.id };
    const r = await fetch("/api/permissions", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "section", section: g.section, ...subj }) });
    if (r.ok) { toast.success(t("admin.permissions.toastDone")); load(); } else toast.error(t("admin.permissions.toastFailed"));
  };

  const revokeBureau = async (g: BureauGrant) => {
    if (!confirm(t("admin.permissions.confirmRevoke"))) return;
    const subj = g.member ? { subjectType: "member", subjectId: g.member.id } : { subjectType: "user", subjectId: g.user!.id };
    const r = await fetch("/api/permissions", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "bureau", ...subj }) });
    const data = await r.json().catch(() => ({}));
    if (r.ok) { toast.success(t("admin.permissions.toastDone")); load(); }
    else if (data.code === "LAST_BUREAU_RW") {
      if (confirm(t("admin.permissions.confirmForce", { error: data.error }))) {
        const r2 = await fetch("/api/permissions", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "bureau", force: true, ...subj }) });
        if (r2.ok) { toast.success(t("admin.permissions.toastDone")); load(); } else toast.error(t("admin.permissions.toastFailed"));
      }
    } else toast.error(data.error ?? t("admin.permissions.toastFailed"));
  };

  const subjectName = (g: SectionGrant | BureauGrant) =>
    g.user?.fullName ?? g.member?.fullName ?? "—";

  const sectionLabel = (s: string) => {
    const k = SECTION_LABEL_KEYS[s];
    return k ? t(k) : s;
  };

  const levelLabel = (l: string) => {
    const k = LEVEL_LABEL_KEYS[l];
    return k ? t(k) : l;
  };

  const groupedSection = section.reduce((acc, g) => {
    (acc[g.section] = acc[g.section] ?? []).push(g);
    return acc;
  }, {} as Record<string, SectionGrant[]>);

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">{t("admin.permissions.title")}</h1>
        <p className="text-muted-foreground">{t("admin.permissions.subtitle")}</p>
      </div>

      {/* Grant card */}
      <Card>
        <CardHeader><CardTitle>{t("admin.permissions.grantNew")}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t("admin.permissions.memberLabel")}</Label>
            <Input value={memberQ} onChange={(e) => setMemberQ(e.target.value)} placeholder={t("admin.permissions.searchPlaceholder")} />
            {picked && (
              <div className="flex items-center gap-2 text-sm">
                <Badge>{picked.fullName}</Badge>
                <Button size="sm" variant="ghost" onClick={() => setPicked(null)}>{t("admin.permissions.change")}</Button>
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
              <Label>{t("admin.permissions.grantKind")}</Label>
              <select className="border rounded-md w-full h-9 px-2 text-sm" value={grantKind} onChange={(e) => {
                const next = e.target.value as "section" | "bureau" | "baht";
                setGrantKind(next);
                // Bureau only allows READ/RW — reset if "ADMIN" was selected for a section.
                if (next === "bureau" && grantLevel === "ADMIN") setGrantLevel("READ");
              }}>
                <option value="section">{t("admin.permissions.kindSection")}</option>
                <option value="bureau">{t("admin.permissions.kindBureau")}</option>
                <option value="baht">{t("admin.permissions.kindBaht")}</option>
              </select>
            </div>
            {grantKind === "section" && (
              <div className="space-y-1">
                <Label>{t("admin.permissions.sectionLabel")}</Label>
                <select className="border rounded-md w-full h-9 px-2 text-sm" value={grantSection} onChange={(e) => setGrantSection(e.target.value)}>
                  {SECTIONS.map((s) => <option key={s} value={s}>{t(SECTION_LABEL_KEYS[s])}</option>)}
                </select>
              </div>
            )}
            {grantKind !== "baht" && (
              <div className="space-y-1">
                <Label>{t("admin.permissions.levelLabel")}</Label>
                <select className="border rounded-md w-full h-9 px-2 text-sm" value={grantLevel} onChange={(e) => setGrantLevel(e.target.value)}>
                  {(grantKind === "bureau" ? BUREAU_LEVELS : SECTION_LEVELS).map((l) => <option key={l} value={l}>{t(LEVEL_LABEL_KEYS[l])}</option>)}
                </select>
              </div>
            )}
          </div>

          <Button onClick={grant} disabled={!picked}>{t("admin.permissions.grantBtn")}</Button>
        </CardContent>
      </Card>

      {/* Bureau grants */}
      <Card>
        <CardHeader><CardTitle>{t("admin.permissions.bureauGrants")}</CardTitle></CardHeader>
        <CardContent className="divide-y p-0">
          {loading && <p className="p-4 text-sm text-muted-foreground">{t("admin.loading")}</p>}
          {!loading && bureau.length === 0 && <p className="p-4 text-sm text-muted-foreground">{t("admin.permissions.noGrants")}</p>}
          {bureau.map((g) => (
            <div key={g.id} className="flex items-center justify-between p-3 text-sm">
              <div>
                <span className="font-medium">{subjectName(g)}</span>
                <Badge variant={g.level === "RW" ? "default" : "secondary"} className="mx-2">
                  {g.level === "RW" ? t("admin.permissions.level.rw") : t("admin.permissions.level.read")}
                </Badge>
              </div>
              <Button size="sm" variant="destructive" onClick={() => revokeBureau(g)}>{t("admin.permissions.revoke")}</Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Section grants */}
      {SECTIONS.map((s) => (
        <Card key={s}>
          <CardHeader><CardTitle>{t("admin.permissions.sectionCardTitle", { section: sectionLabel(s) })}</CardTitle></CardHeader>
          <CardContent className="divide-y p-0">
            {loading && <p className="p-4 text-sm text-muted-foreground">...</p>}
            {!loading && (groupedSection[s] ?? []).length === 0 && <p className="p-4 text-sm text-muted-foreground">{t("admin.permissions.noGrantsSection")}</p>}
            {(groupedSection[s] ?? []).map((g) => (
              <div key={g.id} className="flex items-center justify-between p-3 text-sm">
                <div>
                  <span className="font-medium">{subjectName(g)}</span>
                  <Badge className="mx-2">{levelLabel(g.level)}</Badge>
                </div>
                <Button size="sm" variant="destructive" onClick={() => revokeSection(g)}>{t("admin.permissions.revoke")}</Button>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
