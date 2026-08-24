"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useT } from "@/components/i18n/provider";
import { Trash2, Link2, Pencil, Check, X } from "lucide-react";

type Adult = { id: string; fullName: string; registrationNumber: number };
type Child = { id: string; fullName: string; registrationNumber: number; fatherName: string | null; motherName: string | null };
type Link = {
  id: string;
  relation: string | null;
  parent: { id: string; fullName: string; registrationNumber: number };
  child: { id: string; fullName: string; registrationNumber: number };
};

export function FamilyLinksManager({
  adults,
  childOptions,
  initialLinks,
}: {
  adults: Adult[];
  childOptions: Child[];
  initialLinks: Link[];
}) {
  const { t } = useT();
  const [links, setLinks] = useState(initialLinks);
  const [parentId, setParentId] = useState("");
  const [childId, setChildId] = useState("");
  const [relation, setRelation] = useState("");

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parentId || !childId) {
      toast.error(t("members.fl.selectError"));
      return;
    }
    const r = await fetch("/api/family-links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ parentId, childId, relation }),
    });
    if (r.ok) {
      const link = await r.json();
      const enriched: Link = {
        ...link,
        parent: adults.find((a) => a.id === parentId)!,
        child: childOptions.find((c) => c.id === childId)!,
      };
      setLinks((p) => [enriched, ...p.filter((l) => !(l.parent.id === parentId && l.child.id === childId))]);
      setParentId("");
      setChildId("");
      setRelation("");
      toast.success(t("members.fl.linkedToast"));
    } else toast.error(t("misc.failed"));
  };

  const remove = async (id: string) => {
    if (!confirm(t("members.fl.deleteConfirm"))) return;
    const r = await fetch(`/api/family-links/${id}`, { method: "DELETE" });
    if (r.ok) {
      setLinks((p) => p.filter((l) => l.id !== id));
      toast.success(t("misc.deleted"));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("members.fl.title")}</h1>
        <p className="text-muted-foreground">{t("members.fl.desc")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Link2 size={18} />{t("members.fl.newLink")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={create} className="grid gap-3 md:grid-cols-4">
            <div>
              <Label>{t("members.fl.parentLabel")}</Label>
              <select
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                className="w-full h-9 px-3 rounded-md border bg-background text-sm"
              >
                <option value="">{t("members.fl.choose")}</option>
                {adults.map((a) => (
                  <option key={a.id} value={a.id}>{a.fullName} (#{a.registrationNumber})</option>
                ))}
              </select>
            </div>
            <div>
              <Label>{t("members.fl.childLabel")}</Label>
              <select
                value={childId}
                onChange={(e) => setChildId(e.target.value)}
                className="w-full h-9 px-3 rounded-md border bg-background text-sm"
              >
                <option value="">{t("members.fl.choose")}</option>
                {childOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.fullName} (#{c.registrationNumber})
                    {c.fatherName ? t("members.fl.childFather", { name: c.fatherName }) : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>{t("members.fl.relationLabel")}</Label>
              <select
                value={relation}
                onChange={(e) => setRelation(e.target.value)}
                className="w-full h-9 px-3 rounded-md border bg-background text-sm"
              >
                <option value="">—</option>
                <option value="أب">{t("members.fl.relation.father")}</option>
                <option value="أم">{t("members.fl.relation.mother")}</option>
                <option value="ولي">{t("members.fl.relation.guardian")}</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button type="submit" className="w-full">{t("members.fl.linkButton")}</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("members.fl.currentLinks", { count: links.length })}</CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          {links.length === 0 && (
            <p className="text-center text-muted-foreground py-4">{t("members.fl.noLinks")}</p>
          )}
          {links.map((l) => (
            <FamilyLinkRow key={l.id} link={l} onUpdate={(rel) => setLinks((p) => p.map((x) => x.id === l.id ? { ...x, relation: rel } : x))} onRemove={() => remove(l.id)} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function FamilyLinkRow({ link, onUpdate, onRemove }: { link: Link; onUpdate: (rel: string | null) => void; onRemove: () => void }) {
  const { t } = useT();
  const [editing, setEditing] = useState(false);
  const [rel, setRel] = useState(link.relation ?? "");

  const save = async () => {
    const r = await fetch(`/api/family-links/${link.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ relation: rel || null }),
    });
    if (r.ok) {
      toast.success(t("misc.done"));
      onUpdate(rel || null);
      setEditing(false);
    } else toast.error(t("misc.failed"));
  };

  return (
    <div className="flex items-center gap-3 py-3 text-sm">
      <div className="flex-1">
        <span className="font-medium">{link.parent.fullName}</span>
        <span className="text-muted-foreground"> (#{link.parent.registrationNumber}) </span>
        {editing ? (
          <select value={rel} onChange={(e) => setRel(e.target.value)} className="h-7 px-2 mx-1 rounded-md border bg-background text-xs">
            <option value="">—</option>
            <option value="أب">{t("members.fl.relation.father")}</option>
            <option value="أم">{t("members.fl.relation.mother")}</option>
            <option value="ولي">{t("members.fl.relation.guardian")}</option>
          </select>
        ) : (
          link.relation && <Badge variant="outline" className="text-xs">{link.relation}</Badge>
        )}
        <span className="mx-2">←→</span>
        <span className="font-medium">{link.child.fullName}</span>
        <span className="text-muted-foreground"> (#{link.child.registrationNumber})</span>
      </div>
      {editing ? (
        <>
          <Button size="icon" variant="ghost" onClick={save} title={t("misc.save")}><Check size={14} /></Button>
          <Button size="icon" variant="ghost" onClick={() => { setRel(link.relation ?? ""); setEditing(false); }} title={t("misc.cancel")}><X size={14} /></Button>
        </>
      ) : (
        <>
          <Button size="icon" variant="ghost" onClick={() => setEditing(true)} title={t("members.fl.editTitle")}><Pencil size={13} /></Button>
          <Button size="icon" variant="ghost" onClick={onRemove} title={t("members.fl.deleteTitle")}><Trash2 size={14} /></Button>
        </>
      )}
    </div>
  );
}
