"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useT } from "@/components/i18n/provider";
import { toast } from "sonner";

type MemberDetail = {
  id: string;
  registrationNumber: number;
  memberType: string;
  photoUrl: string | null;
  fullName: string;
  dateOfBirth: string | null;
  placeOfBirth: string | null;
  gender: string | null;
  cin: string | null;
  parentCin: string | null;
  fatherName: string | null;
  fatherPhone: string | null;
  motherName: string | null;
  motherPhone: string | null;
  siblingsCount: number | null;
  siblingOrder: number | null;
  healthConditions: string | null;
  educationalLevel: string | null;
  address: string | null;
  phone: string | null;
  profession: string | null;
  interests: string | null;
  associationRole: string | null;
  registrationDate: string;
  subscriptionAmount: string | null;
  isActive: boolean;
  sections: { id: string; section: string; isActive: boolean }[];
  notes: { id: string; content: string; createdAt: string; author: { fullName: string } }[];
  contributions: { id: string; amount: string; weekStart: string; paidAt: string }[];
};

const SECTION_LABELS: Record<string, string> = {
  EDUCATIONAL: "members.sectionFull.EDUCATIONAL",
  SOCIAL: "members.sectionFull.SOCIAL",
  QURAN: "members.sectionFull.QURAN",
};

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex justify-between py-2 border-b last:border-0">
      <span className="text-muted-foreground text-sm">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

export default function MemberDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { t, locale } = useT();
  const [member, setMember] = useState<MemberDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const dateLocale = locale === "fr" ? "fr-MA" : "ar-MA";

  useEffect(() => {
    fetch(`/api/members/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setMember(data);
        setLoading(false);
      });
  }, [id]);

  const toggleActive = async () => {
    if (!member) return;
    const res = await fetch(`/api/members/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !member.isActive }),
    });
    if (res.ok) {
      setMember({ ...member, isActive: !member.isActive });
      toast.success(member.isActive ? t("members.deactivatedToast") : t("members.activatedToast"));
    }
  };

  if (loading) return <div className="text-center py-12">{t("members.loading")}</div>;
  if (!member) return <div className="text-center py-12">{t("members.notFound")}</div>;

  const formatDate = (d: string | null) => {
    if (!d) return null;
    return new Date(d).toLocaleDateString(dateLocale);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full overflow-hidden bg-muted border-2 border-border shrink-0">
            {member.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={member.photoUrl} alt={member.fullName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl text-muted-foreground">
                👤
              </div>
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{member.fullName}</h1>
            <p className="text-muted-foreground">
              {t("members.regNumberLabel")} {member.registrationNumber} |{" "}
              {member.memberType === "CHILD" ? t("members.type.CHILD") : t("members.tab.adult")}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => router.push(`/admin/members/${id}/edit`)}>
            {t("members.editData")}
          </Button>
          <Button variant="outline" onClick={toggleActive}>
            {member.isActive ? t("members.deactivate") : t("members.activate")}
          </Button>
          <Button variant="outline" onClick={() => router.back()}>
            {t("members.back")}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Personal Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("members.personalInfoCard")}</CardTitle>
          </CardHeader>
          <CardContent>
            <InfoRow label={t("members.col.fullName")} value={member.fullName} />
            <InfoRow label={t("members.dateOfBirth")} value={formatDate(member.dateOfBirth)} />
            <InfoRow label={t("members.placeOfBirth")} value={member.placeOfBirth} />
            <InfoRow label={t("members.gender")} value={member.gender === "MALE" ? t("members.gender.MALE") : member.gender === "FEMALE" ? t("members.gender.FEMALE") : null} />
            <InfoRow label={t("members.educationalLevel")} value={member.educationalLevel} />
          </CardContent>
        </Card>

        {/* Guardian / ID Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {member.memberType === "CHILD" ? t("members.familyInfoCard") : t("members.additionalInfoCard")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {member.memberType === "CHILD" ? (
              <>
                <InfoRow label={t("members.fatherName")} value={member.fatherName} />
                <InfoRow label={t("members.fatherPhone")} value={member.fatherPhone} />
                <InfoRow label={t("members.motherName")} value={member.motherName} />
                <InfoRow label={t("members.motherPhone")} value={member.motherPhone} />
                <InfoRow label={t("members.parentCinShort")} value={member.parentCin} />
                <InfoRow label={t("members.siblingsCount")} value={member.siblingsCount != null ? String(member.siblingsCount) : null} />
                <InfoRow label={t("members.siblingOrder")} value={member.siblingOrder != null ? String(member.siblingOrder) : null} />
                <InfoRow label={t("members.healthCondition")} value={member.healthConditions} />
              </>
            ) : (
              <>
                <InfoRow label={t("members.cin")} value={member.cin} />
                <InfoRow label={t("members.profession")} value={member.profession} />
                <InfoRow label={t("members.assocRole")} value={member.associationRole} />
                <InfoRow label={t("members.interestsCard")} value={member.interests} />
              </>
            )}
          </CardContent>
        </Card>

        {/* Contact */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("members.contactCard")}</CardTitle>
          </CardHeader>
          <CardContent>
            <InfoRow label={t("members.col.phone")} value={member.phone} />
            <InfoRow label={t("members.address")} value={member.address} />
          </CardContent>
        </Card>

        {/* Enrollment */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("members.enrollmentCard")}</CardTitle>
          </CardHeader>
          <CardContent>
            <InfoRow label={t("members.reg.date")} value={formatDate(member.registrationDate)} />
            <InfoRow label={t("members.subscriptionAmountPlain")} value={member.subscriptionAmount ? `${member.subscriptionAmount} ${t("members.dh")}` : null} />
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground text-sm">{t("members.col.status")}</span>
              <Badge variant={member.isActive ? "default" : "destructive"}>
                {member.isActive ? t("members.active") : t("members.inactive")}
              </Badge>
            </div>
            <div className="py-2">
              <span className="text-muted-foreground text-sm block mb-2">{t("members.col.sections")}</span>
              <div className="flex gap-1 flex-wrap">
                {member.sections
                  .filter((s) => s.isActive)
                  .map((s) => (
                    <Badge key={s.id} variant="secondary">
                      {t(SECTION_LABELS[s.section])}
                    </Badge>
                  ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notes — full CRUD */}
      <NotesPanel memberId={id} />


      {/* Recent Contributions */}
      {member.contributions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("members.recentContributions")}</CardTitle>
          </CardHeader>
          <CardContent>
            {member.contributions.map((c) => (
              <div key={c.id} className="flex justify-between py-2 border-b last:border-0">
                <span>{formatDate(c.weekStart)}</span>
                <span className="font-medium">{c.amount} {t("members.dh")}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

type Note = {
  id: string;
  content: string;
  isPrivate: boolean;
  createdAt: string;
  author: { fullName: string };
  authorId?: string;
};

function NotesPanel({ memberId }: { memberId: string }) {
  const { t, locale } = useT();
  const noteDateLocale = locale === "fr" ? "fr-MA" : "ar-MA";
  const [notes, setNotes] = useState<Note[]>([]);
  const [content, setContent] = useState("");
  const [isPrivate, setIsPrivate] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  const load = async () => {
    const r = await fetch(`/api/notes?memberId=${memberId}`);
    if (r.ok) setNotes(await r.json());
  };

  useEffect(() => { load(); }, [memberId]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    const r = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId, content, isPrivate }),
    });
    if (r.ok) {
      setContent("");
      load();
      toast.success(t("members.noteAdded"));
    } else toast.error(t("members.failed"));
  };

  const saveEdit = async (id: string) => {
    const r = await fetch(`/api/notes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: editContent }),
    });
    if (r.ok) {
      setEditingId(null);
      load();
      toast.success(t("members.done"));
    } else toast.error(t("members.failed"));
  };

  const del = async (id: string) => {
    if (!confirm(t("members.deleteNoteConfirm"))) return;
    const r = await fetch(`/api/notes/${id}`, { method: "DELETE" });
    if (r.ok) {
      load();
      toast.success(t("members.deleted"));
    }
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-lg">{t("members.notesCard")}</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <form onSubmit={create} className="space-y-2 border rounded-lg p-3 bg-muted/20">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={t("members.notePlaceholder")}
            className="w-full min-h-[60px] p-2 rounded-md border bg-background text-sm"
          />
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} />
              {t("members.notePrivate")}
            </label>
            <Button type="submit" size="sm" disabled={!content.trim()}>{t("members.add")}</Button>
          </div>
        </form>

        {notes.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-2">{t("members.noNotes")}</p>
        ) : (
          notes.map((note) => (
            <div key={note.id} className="p-3 bg-muted rounded-lg">
              {editingId === note.id ? (
                <div className="space-y-2">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full min-h-[60px] p-2 rounded-md border bg-background text-sm"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => saveEdit(note.id)}>{t("members.save")}</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>{t("members.cancel")}</Button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="whitespace-pre-wrap">{note.content}</p>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-muted-foreground">
                      {note.author.fullName} · {new Date(note.createdAt).toLocaleDateString(noteDateLocale)}
                      {note.isPrivate && ` · ${t("members.privateTag")}`}
                    </p>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => { setEditingId(note.id); setEditContent(note.content); }} title={t("members.editTitle")}>
                        ✎
                      </Button>
                      <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => del(note.id)} title={t("members.deleteTitle")}>
                        ×
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
