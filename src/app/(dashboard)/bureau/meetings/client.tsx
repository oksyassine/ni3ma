"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useT } from "@/components/i18n/provider";
import {
  CheckCircle2,
  XCircle,
  Plus,
  Trash2,
  Pencil,
  ChevronDown,
  ChevronUp,
  Gavel,
} from "lucide-react";

type Decision = {
  title: string;
  body: string | null;
  votesFor: number;
  votesAgainst: number;
  votesAbstain: number;
  passed: boolean;
};

type Meeting = {
  id: string;
  kind: string;
  title: string;
  heldAt: string;
  location: string | null;
  convocationMethod: string | null;
  agenda: string | null;
  minutes: string | null;
  minutesUrl: string | null;
  expectedCount: number;
  presentCount: number;
  quorumPct: number;
  decisions: Decision[];
};

const KINDS = ["AGO", "AGE", "BUREAU", "OTHER"] as const;

function emptyForm() {
  return {
    kind: "AGO",
    title: "",
    heldAt: "",
    location: "",
    convocationMethod: "",
    agenda: "",
    minutes: "",
    minutesUrl: "",
    expectedCount: "0",
    presentCount: "0",
    quorumPct: "50",
  };
}

export function MeetingsClient({ initial, canWrite }: { initial: Meeting[]; canWrite: boolean }) {
  const { t, locale } = useT();
  const [rows, setRows] = useState(initial);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [decisionDrafts, setDecisionDrafts] = useState<Record<string, Decision[]>>({});

  const fmtDate = (d: string) =>
    new Date(d + "T12:00:00").toLocaleDateString(locale);

  function openCreate() {
    setEditingId(null);
    setForm({ ...emptyForm(), heldAt: new Date().toISOString().slice(0, 10) });
    setDialogOpen(true);
  }

  function openEdit(m: Meeting) {
    setEditingId(m.id);
    setForm({
      kind: m.kind,
      title: m.title,
      heldAt: m.heldAt,
      location: m.location ?? "",
      convocationMethod: m.convocationMethod ?? "",
      agenda: m.agenda ?? "",
      minutes: m.minutes ?? "",
      minutesUrl: m.minutesUrl ?? "",
      expectedCount: String(m.expectedCount),
      presentCount: String(m.presentCount),
      quorumPct: String(m.quorumPct),
    });
    setDialogOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.heldAt) {
      toast.error(t("gov.common.toastFailed"));
      return;
    }
    setBusy(true);
    const payload = {
      kind: form.kind,
      title: form.title.trim(),
      heldAt: form.heldAt,
      location: form.location || null,
      convocationMethod: form.convocationMethod || null,
      agenda: form.agenda || null,
      minutes: form.minutes || null,
      minutesUrl: form.minutesUrl || null,
      expectedCount: Number(form.expectedCount) || 0,
      presentCount: Number(form.presentCount) || 0,
      quorumPct: Number(form.quorumPct) || 50,
    };
    try {
      const res = await fetch(editingId ? `/api/meetings/${editingId}` : "/api/meetings", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      const saved = await res.json();
      const normalized: Meeting = {
        ...saved,
        heldAt: new Date(saved.heldAt).toISOString().slice(0, 10),
        decisions: (saved.decisions ?? []).map((d: Record<string, unknown>) => ({
          title: d.title as string,
          body: (d.body as string | null) ?? null,
          votesFor: d.votesFor as number,
          votesAgainst: d.votesAgainst as number,
          votesAbstain: d.votesAbstain as number,
          passed: d.passed as boolean,
        })),
      };
      setRows((prev) =>
        editingId
          ? prev.map((r) => (r.id === editingId ? normalized : r))
          : [normalized, ...prev]
      );
      toast.success(t(editingId ? "gov.common.toastUpdated" : "gov.common.toastCreated"));
      setDialogOpen(false);
    } catch {
      toast.error(t("gov.common.toastFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function saveDecisions(m: Meeting) {
    const decisions = decisionDrafts[m.id];
    if (!decisions) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/meetings/${m.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decisions: decisions.map((d) => ({
            title: d.title,
            body: d.body,
            votesFor: d.votesFor,
            votesAgainst: d.votesAgainst,
            votesAbstain: d.votesAbstain,
            passed: d.passed,
          })),
        }),
      });
      if (!res.ok) throw new Error();
      const saved = await res.json();
      setRows((prev) =>
        prev.map((r) =>
          r.id === m.id
            ? {
                ...r,
                decisions: (saved.decisions ?? []).map((d: Record<string, unknown>) => ({
                  title: d.title as string,
                  body: (d.body as string | null) ?? null,
                  votesFor: d.votesFor as number,
                  votesAgainst: d.votesAgainst as number,
                  votesAbstain: d.votesAbstain as number,
                  passed: d.passed as boolean,
                })),
              }
            : r
        )
      );
      setDecisionDrafts((prev) => {
        const next = { ...prev };
        delete next[m.id];
        return next;
      });
      toast.success(t("gov.common.toastUpdated"));
    } catch {
      toast.error(t("gov.common.toastFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm(t("gov.meetings.confirmDelete"))) return;
    try {
      const res = await fetch(`/api/meetings/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setRows((prev) => prev.filter((r) => r.id !== id));
      toast.success(t("gov.common.toastDeleted"));
    } catch {
      toast.error(t("gov.common.toastFailed"));
    }
  }

  function draftFor(m: Meeting): Decision[] {
    return decisionDrafts[m.id] ?? m.decisions;
  }

  function updateDraft(m: Meeting, i: number, patch: Partial<Decision>) {
    setDecisionDrafts((prev) => {
      const list = (prev[m.id] ?? m.decisions).map((d, j) => (j === i ? { ...d, ...patch } : d));
      return { ...prev, [m.id]: list };
    });
  }

  return (
    <div className="space-y-4">
      {canWrite && (
        <div className="flex justify-end">
          <Button onClick={openCreate}>
            <Plus size={14} /> {t("gov.meetings.add")}
          </Button>
        </div>
      )}

      <div className="space-y-3">
        {rows.map((m) => {
          const quorumMet =
            m.expectedCount > 0 ? m.presentCount * 100 >= m.expectedCount * m.quorumPct : true;
          const isExpanded = expanded === m.id;
          const drafts = draftFor(m);
          const dirty = decisionDrafts[m.id] !== undefined;
          return (
            <div key={m.id} className="rounded-xl border bg-card">
              <div className="flex flex-wrap items-center gap-3 p-4">
                <div className="flex-1 min-w-[220px]">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold">{m.title}</span>
                    <Badge variant="outline">{t(`gov.meetingKind.${m.kind}`)}</Badge>
                    {quorumMet ? (
                      <Badge className="gap-1 bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300">
                        <CheckCircle2 size={12} /> {t("gov.meetings.quorumMet")}
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="gap-1">
                        <XCircle size={12} /> {t("gov.meetings.quorumNotMet")}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground" dir="auto">
                    {fmtDate(m.heldAt)}
                    {m.location ? ` · ${m.location}` : ""}
                    {` · ${m.presentCount}/${m.expectedCount} · ${t("gov.meetings.quorumPct")} ${m.quorumPct}%`}
                  </p>
                </div>
                <div className="flex gap-1.5">
                  <Button size="sm" variant="ghost" onClick={() => setExpanded(isExpanded ? null : m.id)}>
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    {isExpanded ? "" : `${m.decisions.length} ⚖`}
                  </Button>
                  {canWrite && (
                    <>
                      <Button size="icon-sm" variant="ghost" onClick={() => openEdit(m)} title={t("gov.common.edit")}>
                        <Pencil size={14} />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => remove(m.id)}
                        title={t("gov.common.delete")}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {isExpanded && (
                <div className="border-t px-4 py-4 space-y-5 text-sm">
                  {(m.agenda || m.minutesUrl) && (
                    <div className="space-y-1">
                      {m.agenda && (
                        <div>
                          <span className="font-semibold">📋 </span>
                          <span className="whitespace-pre-wrap">{m.agenda}</span>
                        </div>
                      )}
                      {m.minutesUrl && (
                        <a href={m.minutesUrl} target="_blank" rel="noreferrer" className="text-primary underline text-xs" dir="ltr">
                          {t("gov.meetings.minutesUrl")}
                        </a>
                      )}
                    </div>
                  )}
                  {m.decisions.length === 0 && drafts.length === 0 && (
                    <p className="text-muted-foreground text-xs">{t("gov.decisions.title")}: —</p>
                  )}
                  {(drafts.length > 0 || canWrite) && (
                    <div className="space-y-3">
                      <p className="font-semibold flex items-center gap-1.5">
                        <Gavel size={14} /> {t("gov.decisions.title")}
                      </p>
                      {drafts.map((d, i) => (
                        <div key={i} className="space-y-2 rounded-lg border p-3">
                          <div className="grid gap-2 md:grid-cols-[1fr_auto_auto_auto_auto]">
                            <Input
                              value={d.title}
                              disabled={!canWrite}
                              placeholder={t("gov.decisions.titleField")}
                              onChange={(e) => updateDraft(m, i, { title: e.target.value })}
                            />
                            {(["votesFor", "votesAgainst", "votesAbstain"] as const).map((k) => (
                              <Input
                                key={k}
                                type="number"
                                min={0}
                                className="w-20"
                                value={String(d[k])}
                                disabled={!canWrite}
                                title={t(
                                  k === "votesFor"
                                    ? "gov.decisions.votesFor"
                                    : k === "votesAgainst"
                                      ? "gov.decisions.votesAgainst"
                                      : "gov.decisions.votesAbstain"
                                )}
                                onChange={(e) => updateDraft(m, i, { [k]: Math.trunc(Number(e.target.value)) || 0 })}
                              />
                            ))}
                            <Badge variant={d.passed ? "default" : "destructive"}>
                              {d.passed ? t("gov.decisions.passed") : t("gov.decisions.rejected")}
                            </Badge>
                            {canWrite && (
                              <Button
                                size="icon-sm"
                                variant="ghost"
                                className="text-destructive hover:text-destructive"
                                onClick={() =>
                                  setDecisionDrafts((prev) => ({
                                    ...prev,
                                    [m.id]: drafts.filter((_, j) => j !== i),
                                  }))
                                }
                                title={t("common.delete")}
                              >
                                <Trash2 size={13} />
                              </Button>
                            )}
                          </div>
                          {canWrite ? (
                            <Textarea
                              value={d.body ?? ""}
                              placeholder={t("gov.decisions.body")}
                              rows={2}
                              onChange={(e) => updateDraft(m, i, { body: e.target.value || null })}
                            />
                          ) : d.body ? (
                            <pre className="whitespace-pre-wrap rounded-md bg-muted/50 p-2 text-xs text-muted-foreground" dir="auto">
                              {d.body}
                            </pre>
                          ) : null}
                        </div>
                      ))}
                      {canWrite && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setDecisionDrafts((prev) => ({
                                ...prev,
                                [m.id]: [
                                  ...drafts,
                                  {
                                    title: "",
                                    body: null,
                                    votesFor: 0,
                                    votesAgainst: 0,
                                    votesAbstain: 0,
                                    passed: true,
                                  },
                                ],
                              }))
                            }
                          >
                            <Plus size={13} /> {t("gov.decisions.add")}
                          </Button>
                          {dirty && (
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  setDecisionDrafts((prev) => {
                                    const next = { ...prev };
                                    delete next[m.id];
                                    return next;
                                  })
                                }
                                title={t("gov.common.cancel")}
                              >
                                ✕
                              </Button>
                              <Button size="sm" disabled={busy} onClick={() => saveDecisions(m)}>
                                {t("gov.common.save")}
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  {m.minutes && (
                    <div>
                      <p className="mb-1 font-semibold">📝 {t("gov.meetings.minutes")}</p>
                      <pre className="whitespace-pre-wrap rounded-lg bg-muted/50 p-3 text-xs leading-relaxed" dir="auto">
                        {m.minutes}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {rows.length === 0 && (
          <p className="py-10 text-center text-muted-foreground">{t("gov.meetings.none")}</p>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
          <form onSubmit={submit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>{t(editingId ? "gov.meetings.edit" : "gov.meetings.add")}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>{t("gov.meetings.kind")}</Label>
                <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v ?? "AGO" })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {KINDS.map((k) => (
                      <SelectItem key={k} value={k}>
                        {t(`gov.meetingKind.${k}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t("gov.meetings.heldAt")}</Label>
                <Input type="date" value={form.heldAt} onChange={(e) => setForm({ ...form, heldAt: e.target.value })} required />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>{t("gov.meetings.titleField")}</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <Label>{t("gov.meetings.location")}</Label>
                <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("gov.meetings.convocation")}</Label>
                <Input placeholder="WhatsApp / هاتف / بريد" value={form.convocationMethod} onChange={(e) => setForm({ ...form, convocationMethod: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("gov.meetings.expected")}</Label>
                <Input type="number" min={0} value={form.expectedCount} onChange={(e) => setForm({ ...form, expectedCount: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("gov.meetings.present")}</Label>
                <Input type="number" min={0} value={form.presentCount} onChange={(e) => setForm({ ...form, presentCount: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("gov.meetings.quorumPct")}</Label>
                <Input type="number" min={1} max={100} value={form.quorumPct} onChange={(e) => setForm({ ...form, quorumPct: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("gov.meetings.minutesUrl")}</Label>
                <Input dir="ltr" value={form.minutesUrl} onChange={(e) => setForm({ ...form, minutesUrl: e.target.value })} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>{t("gov.meetings.agenda")}</Label>
                <Textarea rows={2} value={form.agenda} onChange={(e) => setForm({ ...form, agenda: e.target.value })} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>{t("gov.meetings.minutes")}</Label>
                <Textarea rows={6} value={form.minutes} onChange={(e) => setForm({ ...form, minutes: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                {t("gov.common.cancel")}
              </Button>
              <Button type="submit" disabled={busy}>
                {t("gov.common.save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
