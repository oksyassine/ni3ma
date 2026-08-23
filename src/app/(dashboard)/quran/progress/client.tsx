"use client";

import { useEffect, useState } from "react";
import { usePermissions } from "@/lib/use-permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { HIFZ_GRADE_LABELS, HIFZ_GRADE_COLORS, TAJWEED_GROUPS, TAJWEED_FIELDS, SURAH_NAMES } from "@/lib/quran";
import type { HifzGrade } from "@prisma/client";
import { Plus, Trash2, BookOpen, Pencil } from "lucide-react";

type Member = { id: string; fullName: string; registrationNumber: number };
type Progress = {
  id: string;
  memberId: string;
  recitationDate: string;
  currentSurah: string | null;
  surahFromAyah: number | null;
  surahToAyah: number | null;
  hizb: number | null;
  juz: number | null;
  pagesMemorized: number | null;
  hifzGrade: HifzGrade | null;
  notes: string | null;
  member: { fullName: string };
  [key: string]: unknown;
};

const TAJWEED_KEYS = TAJWEED_FIELDS.map((f) => f.key);

const blank: Record<string, string> & { hifzGrade: HifzGrade | "" } = {
  recitationDate: new Date().toISOString().slice(0, 10),
  currentSurah: "",
  surahFromAyah: "",
  surahToAyah: "",
  hizb: "",
  juz: "",
  pagesMemorized: "",
  hifzGrade: "",
  notes: "",
  ...Object.fromEntries(TAJWEED_KEYS.map((k) => [k, ""])),
};

export function QuranProgressClient({ members }: { members: Member[] }) {
  const perms = usePermissions();
  const canWrite = perms.canWriteSection("QURAN");
  const [selected, setSelected] = useState<string>(members[0]?.id ?? "");
  const [history, setHistory] = useState<Progress[]>([]);
  const [form, setForm] = useState<typeof blank>(blank);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const loadForEdit = (h: Progress) => {
    setEditingId(h.id);
    const next: Record<string, string> & { hifzGrade: HifzGrade | "" } = {
      ...blank,
      recitationDate: h.recitationDate,
      currentSurah: h.currentSurah ?? "",
      surahFromAyah: h.surahFromAyah?.toString() ?? "",
      surahToAyah: h.surahToAyah?.toString() ?? "",
      hizb: h.hizb?.toString() ?? "",
      juz: h.juz?.toString() ?? "",
      pagesMemorized: h.pagesMemorized?.toString() ?? "",
      hifzGrade: h.hifzGrade ?? "",
      notes: h.notes ?? "",
    };
    TAJWEED_KEYS.forEach((k) => { next[k] = (h[k] as number | null)?.toString() ?? ""; });
    setForm(next);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const filteredMembers = members.filter((m) =>
    m.fullName.toLowerCase().includes(search.toLowerCase())
  );

  const load = async (memberId: string) => {
    const r = await fetch(`/api/quran-progress?memberId=${memberId}`);
    if (r.ok) {
      const data = await r.json();
      setHistory(
        data.map((d: Progress & { recitationDate: string }) => ({
          ...d,
          recitationDate: d.recitationDate.slice(0, 10),
        }))
      );
    }
  };

  useEffect(() => {
    if (selected) load(selected);
  }, [selected]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) {
      toast.error("اختر منخرطًا");
      return;
    }
    setSaving(true);
    const r = editingId
      ? await fetch(`/api/quran-progress/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        })
      : await fetch("/api/quran-progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ memberId: selected, ...form }),
        });
    if (r.ok) {
      toast.success(editingId ? "تم التعديل" : "تم حفظ التقدم");
      setEditingId(null);
      setForm({ ...blank, recitationDate: new Date().toISOString().slice(0, 10) });
      load(selected);
    } else toast.error("فشل الحفظ");
    setSaving(false);
  };

  const del = async (id: string) => {
    if (!confirm("حذف هذه السجلة؟")) return;
    const r = await fetch(`/api/quran-progress/${id}`, { method: "DELETE" });
    if (r.ok) {
      toast.success("تم الحذف");
      load(selected);
    }
  };

  const updateField = (key: string, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">المنخرطون في قسم القرآن</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Input
            placeholder="بحث..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="space-y-1 max-h-[600px] overflow-auto">
            {filteredMembers.map((m) => (
              <button
                key={m.id}
                onClick={() => setSelected(m.id)}
                className={`w-full text-right p-2 rounded-md text-sm ${selected === m.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
              >
                {m.fullName}
                <span className="text-xs opacity-70 ms-2">#{m.registrationNumber}</span>
              </button>
            ))}
            {filteredMembers.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-2">لا نتائج</p>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {canWrite && <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus size={18} />تسميع جديد
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-5">
              <div className="grid md:grid-cols-3 gap-3">
                <div>
                  <Label>التاريخ</Label>
                  <Input
                    type="date"
                    value={form.recitationDate}
                    onChange={(e) => updateField("recitationDate", e.target.value)}
                  />
                </div>
                <div>
                  <Label>السورة</Label>
                  <select
                    value={form.currentSurah}
                    onChange={(e) => updateField("currentSurah", e.target.value)}
                    className="w-full h-9 px-3 rounded-md border bg-background text-sm"
                  >
                    <option value="">— اختر —</option>
                    {SURAH_NAMES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>تقدير الحفظ</Label>
                  <select
                    value={form.hifzGrade}
                    onChange={(e) => updateField("hifzGrade", e.target.value)}
                    className="w-full h-9 px-3 rounded-md border bg-background text-sm"
                  >
                    <option value="">— اختر —</option>
                    {Object.entries(HIFZ_GRADE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid md:grid-cols-5 gap-3">
                <div>
                  <Label>من آية</Label>
                  <Input type="number" value={form.surahFromAyah} onChange={(e) => updateField("surahFromAyah", e.target.value)} />
                </div>
                <div>
                  <Label>إلى آية</Label>
                  <Input type="number" value={form.surahToAyah} onChange={(e) => updateField("surahToAyah", e.target.value)} />
                </div>
                <div>
                  <Label>الحزب</Label>
                  <Input type="number" min={1} max={60} value={form.hizb} onChange={(e) => updateField("hizb", e.target.value)} />
                </div>
                <div>
                  <Label>الجزء</Label>
                  <Input type="number" min={1} max={30} value={form.juz} onChange={(e) => updateField("juz", e.target.value)} />
                </div>
                <div>
                  <Label>الصفحات المحفوظة</Label>
                  <Input type="number" value={form.pagesMemorized} onChange={(e) => updateField("pagesMemorized", e.target.value)} />
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-base font-bold mb-1">تقييم التجويد (1 ضعيف ← 5 ممتاز)</h3>
                <p className="text-xs text-muted-foreground mb-4">قواعد التجويد الكلاسيكية — قيّم كل قاعدة على حدة</p>
                <div className="space-y-4">
                  {TAJWEED_GROUPS.map((group) => (
                    <div key={group.label} className="rounded-lg border bg-muted/20 p-3">
                      <h4 className="text-sm font-semibold mb-3">{group.label}</h4>
                      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {group.fields.map((f) => (
                          <div key={f.key}>
                            <Label className="text-xs">{f.label}</Label>
                            {f.hint && (
                              <p className="text-[10px] text-muted-foreground mt-0.5">{f.hint}</p>
                            )}
                            <select
                              value={form[f.key] ?? ""}
                              onChange={(e) => updateField(f.key, e.target.value)}
                              className="w-full h-9 px-3 mt-1 rounded-md border bg-background text-sm"
                            >
                              <option value="">— لم يُقيّم —</option>
                              {[1, 2, 3, 4, 5].map((n) => (
                                <option key={n} value={n}>{n}</option>
                              ))}
                            </select>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label>ملاحظات</Label>
                <Textarea value={form.notes} onChange={(e) => updateField("notes", e.target.value)} />
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={saving || !selected}>
                  {saving ? "..." : editingId ? "حفظ التعديلات" : "حفظ التقدم"}
                </Button>
                {editingId && (
                  <Button type="button" variant="ghost" onClick={() => { setEditingId(null); setForm({ ...blank, recitationDate: new Date().toISOString().slice(0, 10) }); }}>
                    إلغاء التعديل
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen size={18} />السجل
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {history.length === 0 && (
              <p className="text-center text-muted-foreground py-4">لا توجد تسميعات بعد</p>
            )}
            {history.map((h) => (
              <div key={h.id} className="border rounded-lg p-3 bg-muted/20">
                <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{h.recitationDate}</span>
                    {h.currentSurah && <Badge variant="outline">{h.currentSurah}</Badge>}
                    {h.hifzGrade && (
                      <span className={`text-xs px-2 py-0.5 rounded ${HIFZ_GRADE_COLORS[h.hifzGrade]}`}>
                        {HIFZ_GRADE_LABELS[h.hifzGrade]}
                      </span>
                    )}
                  </div>
                  {canWrite && (
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => loadForEdit(h)} title="تعديل">
                        <Pencil size={13} />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => del(h.id)} title="حذف">
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  {h.surahFromAyah && h.surahToAyah && (
                    <span>الآيات: {h.surahFromAyah}-{h.surahToAyah}</span>
                  )}
                  {h.hizb && <span>الحزب: {h.hizb}</span>}
                  {h.juz && <span>الجزء: {h.juz}</span>}
                  {h.pagesMemorized && <span>الصفحات: {h.pagesMemorized}</span>}
                </div>
                {TAJWEED_FIELDS.some((f) => h[f.key]) && (
                  <div className="mt-2 pt-2 border-t flex flex-wrap gap-1.5 text-[11px]">
                    {TAJWEED_FIELDS.map((f) => {
                      const v = h[f.key] as number | null;
                      if (!v) return null;
                      return (
                        <Badge key={f.key} variant="secondary" className="text-[10px] font-normal">
                          {f.label}: {v}/5
                        </Badge>
                      );
                    })}
                  </div>
                )}
                {h.notes && <p className="text-xs text-muted-foreground mt-2">{h.notes}</p>}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
