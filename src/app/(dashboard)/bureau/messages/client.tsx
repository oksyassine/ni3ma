"use client";

import { useMemo, useState } from "react";
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
import { fmtMoney } from "@/lib/i18n/format";
import {
  Plus,
  Trash2,
  Pencil,
  Send,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Eye,
} from "lucide-react";
import type { MessageChannel, MessageStatus } from "@prisma/client";

type Template = {
  id: string;
  key: string;
  name: string;
  channel: MessageChannel;
  body: string;
  variables: string | null;
  isActive: boolean;
};

type RecentMessage = {
  id: string;
  status: MessageStatus;
  channel: MessageChannel;
  recipientPhone: string;
  recipientName: string | null;
  templateKey: string | null;
  body: string;
  cost: number | null;
  provider: string;
  error: string | null;
  sentAt: string | null;
  createdAt: string;
};

type MemberOpt = { id: string; fullName: string; registrationNumber: number; phone: string | null };

const STATUS_STYLES: Record<MessageStatus, string> = {
  QUEUED: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  SENT: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  DELIVERED: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  FAILED: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
};

const STATUS_ICONS: Record<MessageStatus, React.ElementType> = {
  QUEUED: Clock,
  SENT: Send,
  DELIVERED: CheckCircle2,
  FAILED: AlertTriangle,
};

function emptyForm() {
  return { key: "", name: "", channel: "WHATSAPP" as MessageChannel, body: "", variables: "" };
}

export function MessagesClient({
  templates,
  recent,
  members,
  canWrite,
}: {
  templates: Template[];
  recent: RecentMessage[];
  members: MemberOpt[];
  canWrite: boolean;
}) {
  const { t, locale } = useT();
  const [list, setList] = useState(templates);
  const [log, setLog] = useState(recent);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [busy, setBusy] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [sendTemplateKey, setSendTemplateKey] = useState<string>("");
  const [sendChannel, setSendChannel] = useState<MessageChannel>("WHATSAPP");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sendPreview, setSendPreview] = useState<string | null>(null);

  const fmtDate = (d: string) => new Date(d + "T12:00:00").toLocaleString(locale);
  const fmtMoney = (n: number) => n.toLocaleString(locale, { maximumFractionDigits: 2 });

  const adults = useMemo(() => members.filter((m) => m.phone), [members]);
  const totalCost = log.reduce((s, m) => s + (m.cost ?? 0), 0);
  const failedCount = log.filter((m) => m.status === "FAILED").length;

  const sendPreviewText = useMemo(() => {
    if (!sendPreview) return null;
    return sendPreview;
  }, [sendPreview]);

  function openCreate() {
    setEditingKey(null);
    setForm(emptyForm());
    setDialogOpen(true);
  }
  function openEdit(t: Template) {
    setEditingKey(t.key);
    setForm({
      key: t.key,
      name: t.name,
      channel: t.channel,
      body: t.body,
      variables: t.variables ?? "",
    });
    setDialogOpen(true);
  }
  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!form.key.trim() || !form.name.trim() || !form.body.trim()) {
      toast.error(t("gov.common.toastFailed"));
      return;
    }
    setBusy(true);
    const payload = {
      key: form.key.trim(),
      name: form.name.trim(),
      channel: form.channel,
      body: form.body,
      variables: form.variables || null,
    };
    try {
      const res = await fetch(editingKey ? `/api/message-templates/${encodeURIComponent(editingKey)}` : "/api/message-templates", {
        method: editingKey ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "failed");
      }
      const saved = await res.json();
      const normalized: Template = { ...saved, variables: saved.variables ?? null };
      setList((prev) => {
        const idx = prev.findIndex((t) => t.key === normalized.key);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = normalized;
          return next;
        }
        return [...prev, normalized].sort((a, b) => a.key.localeCompare(b.key));
      });
      toast.success(t(editingKey ? "gov.common.toastUpdated" : "gov.common.toastCreated"));
      setDialogOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("gov.common.toastFailed"));
    } finally {
      setBusy(false);
    }
  }
  async function remove(key: string) {
    if (!confirm(t("gov.messages.confirmDelete"))) return;
    try {
      const res = await fetch(`/api/message-templates/${encodeURIComponent(key)}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setList((prev) => prev.filter((t) => t.key !== key));
      toast.success(t("gov.common.toastDeleted"));
    } catch {
      toast.error(t("gov.common.toastFailed"));
    }
  }

  function openSendDialog() {
    if (list.length === 0) {
      toast.error(t("gov.messages.none"));
      return;
    }
    setSendTemplateKey(list[0].key);
    setSendChannel(list[0].channel);
    setSelected(new Set());
    setSendPreview(null);
    setSendOpen(true);
  }

  const sendTemplate = list.find((t) => t.key === sendTemplateKey);

  function renderForPreview(member: MemberOpt | null): string {
    if (!sendTemplate) return "";
    return sendTemplate.body
      .replace(/\{member\}/g, member?.fullName ?? "")
      .replace(/\{name\}/g, member?.fullName ?? "")
      .replace(/\{regNum\}/g, member ? String(member.registrationNumber) : "")
      .replace(/\{phone\}/g, member?.phone ?? "")
      .replace(/\{days\}/g, "30")
      .replace(/\{amount\}/g, "")
      .replace(/\{date\}/g, new Date().toLocaleDateString(locale));
  }

  function toggleAll() {
    if (selected.size === adults.length) setSelected(new Set());
    else setSelected(new Set(adults.map((m) => m.id)));
  }
  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function doSend() {
    if (!sendTemplate || selected.size === 0) {
      toast.error(t("gov.messages.selectRecipients"));
      return;
    }
    setBusy(true);
    const recipients = Array.from(selected)
      .map((id) => adults.find((m) => m.id === id))
      .filter((m): m is MemberOpt & { phone: string } => !!m && !!m.phone)
      .map((m) => ({
        phone: m.phone,
        memberId: m.id,
        name: m.fullName,
        variables: { regNum: m.registrationNumber, member: m.fullName },
      }));
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateKey: sendTemplateKey, channel: sendChannel, recipients }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "failed");
      }
      const data: { success: number; failed: number } = await res.json();
      toast.success(t("common.save") + ` (${data.success} / ${data.success + data.failed})`);
      setSendOpen(false);
      // Refresh log
      const logRes = await fetch("/api/messages");
      if (logRes.ok) {
        const d = await logRes.json();
        setLog(d.messages ?? []);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("gov.common.toastFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">{t("gov.messages.templates")}</p>
          <p className="mt-1 text-2xl font-bold">{list.length}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">{t("gov.messages.log")}</p>
          <p className="mt-1 text-2xl font-bold">{log.length}</p>
          {failedCount > 0 && (
            <p className="text-xs text-red-600 dark:text-red-400">⚠️ {failedCount} {t("gov.messages.failed")}</p>
          )}
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">💰 {t("gov.messages.cost")}</p>
          <p className="mt-1 text-2xl font-bold">{fmtMoney(totalCost)} MAD</p>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-3 text-xs text-muted-foreground">
        💡 {t("gov.messages.providerHint")}
      </div>

      <div className="flex flex-wrap gap-2">
        {canWrite && (
          <>
            <Button onClick={openCreate}>
              <Plus size={14} /> {t("gov.messages.add")}
            </Button>
            <Button variant="outline" onClick={openSendDialog}>
              <Send size={14} /> {t("gov.messages.bulkSend")}
            </Button>
          </>
        )}
      </div>

      <div className="space-y-2">
        {list.map((tpl) => (
          <div key={tpl.key} className="rounded-xl border bg-card p-4">
            <div className="flex flex-wrap items-center gap-2">
              <MessageSquare size={16} className="text-muted-foreground" />
              <span className="font-bold">{tpl.name}</span>
              <code dir="ltr" className="rounded bg-muted px-1.5 py-0.5 text-[10px]">{tpl.key}</code>
              <Badge variant="outline" className="text-[10px]">{tpl.channel}</Badge>
              {!tpl.isActive && <Badge variant="destructive" className="text-[10px]">disabled</Badge>}
              {canWrite && (
                <span className="ms-auto flex gap-1.5">
                  <Button size="icon-sm" variant="ghost" onClick={() => openEdit(tpl)} title={t("gov.common.edit")}>
                    <Pencil size={13} />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => remove(tpl.key)}
                    title={t("common.delete")}
                  >
                    <Trash2 size={13} />
                  </Button>
                </span>
              )}
            </div>
            <pre className="mt-2 whitespace-pre-wrap rounded-md bg-muted/40 p-2 text-xs leading-relaxed" dir="auto">{tpl.body}</pre>
            {tpl.variables && (
              <p className="mt-1 text-[10px] text-muted-foreground" dir="ltr">vars: {tpl.variables}</p>
            )}
          </div>
        ))}
        {list.length === 0 && (
          <p className="py-10 text-center text-muted-foreground">{t("gov.messages.none")}</p>
        )}
      </div>

      <h2 className="text-lg font-bold">📤 {t("gov.messages.log")}</h2>
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-xs text-muted-foreground">
            <tr>
              <th className="p-2 text-start">📅</th>
              <th className="p-2 text-start">{t("gov.messages.recipient")}</th>
              <th className="p-2 text-start">{t("gov.messages.templateKey")}</th>
              <th className="p-2 text-start">{t("gov.messages.status")}</th>
              <th className="p-2 text-start">{t("gov.messages.provider")}</th>
              <th className="p-2 text-start">💰</th>
            </tr>
          </thead>
          <tbody>
            {log.map((m) => {
              const StatusIcon = STATUS_ICONS[m.status];
              return (
                <tr key={m.id} className="border-t">
                  <td className="p-2 text-xs" dir="ltr">{fmtDate(m.createdAt)}</td>
                  <td className="p-2" dir="auto">
                    {m.recipientName ?? m.recipientPhone}
                    <div className="text-[10px] text-muted-foreground" dir="ltr">{m.recipientPhone}</div>
                  </td>
                  <td className="p-2 text-xs" dir="ltr">{m.templateKey ?? "—"}</td>
                  <td className="p-2">
                    <Badge className={`gap-1 rounded-full text-[10px] font-semibold ${STATUS_STYLES[m.status]}`}>
                      <StatusIcon size={10} />
                      {t(`gov.messages.${m.status.toLowerCase()}`)}
                    </Badge>
                    {m.error && <p className="mt-1 text-[10px] text-red-600">{m.error}</p>}
                  </td>
                  <td className="p-2 text-xs" dir="ltr">{m.provider}</td>
                  <td className="p-2 text-xs" dir="ltr">{m.cost === null ? "—" : `${fmtMoney(m.cost)} MAD`}</td>
                </tr>
              );
            })}
            {log.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-muted-foreground">
                  {t("gov.messages.noMessages")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Edit/Create dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <form onSubmit={submit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>{t(editingKey ? "gov.messages.edit" : "gov.messages.add")}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>{t("gov.messages.templateKey")}</Label>
                <Input
                  dir="ltr"
                  placeholder="reminder.cotisation"
                  value={form.key}
                  onChange={(e) => setForm({ ...form, key: e.target.value.replace(/[^a-z0-9._-]/g, "").toLowerCase() })}
                  disabled={!!editingKey}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("gov.messages.templateName")}</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>{t("gov.messages.channel")}</Label>
                <Select value={form.channel} onValueChange={(v) => setForm({ ...form, channel: (v ?? "WHATSAPP") as MessageChannel })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                    <SelectItem value="SMS">SMS</SelectItem>
                    <SelectItem value="EMAIL">Email</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>{t("gov.messages.body")}</Label>
                <Textarea rows={6} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} required dir="auto" />
                <p className="text-[10px] text-muted-foreground" dir="ltr">{t("gov.messages.variablesHint")}</p>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs">{t("gov.messages.variables")}</Label>
                <Input dir="ltr" placeholder='["member","name","days"]' value={form.variables} onChange={(e) => setForm({ ...form, variables: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                {t("gov.common.cancel")}
              </Button>
              <Button type="submit" disabled={busy}>{t("gov.common.save")}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Bulk-send dialog */}
      <Dialog open={sendOpen} onOpenChange={setSendOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>📤 {t("gov.messages.bulkSend")}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>{t("gov.messages.templates")}</Label>
              <Select value={sendTemplateKey} onValueChange={(v) => { setSendTemplateKey(v ?? ""); setSendPreview(null); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {list.map((t) => (
                    <SelectItem key={t.key} value={t.key}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t("gov.messages.channel")}</Label>
              <Select value={sendChannel} onValueChange={(v) => setSendChannel((v ?? "WHATSAPP") as MessageChannel)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                  <SelectItem value="SMS">SMS</SelectItem>
                  <SelectItem value="EMAIL">Email</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={toggleAll}>
              {selected.size === adults.length ? "—" : t("members.all")}
            </Button>
            <span className="text-sm text-muted-foreground">
              {t("gov.messages.selected", { n: selected.size })} / {adults.length}
            </span>
            {sendTemplate && (
              <Button
                size="sm"
                variant="ghost"
                className="ms-auto"
                onClick={() => setSendPreview(renderForPreview(adults[0] ?? null))}
              >
                <Eye size={12} /> {t("gov.messages.preview")}
              </Button>
            )}
          </div>
          {sendPreviewText && (
            <pre className="whitespace-pre-wrap rounded-md bg-muted/40 p-3 text-xs leading-relaxed" dir="auto">{sendPreviewText}</pre>
          )}
          <div className="max-h-60 overflow-y-auto rounded-md border">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-muted/60">
                <tr>
                  <th className="w-8 p-1.5"></th>
                  <th className="p-1.5 text-start">{t("members.fullName")}</th>
                  <th className="p-1.5 text-start">📱</th>
                </tr>
              </thead>
              <tbody>
                {adults.slice(0, 300).map((m) => (
                  <tr key={m.id} className="border-t">
                    <td className="p-1.5 text-center">
                      <input
                        type="checkbox"
                        checked={selected.has(m.id)}
                        onChange={() => toggleOne(m.id)}
                        aria-label={m.fullName}
                      />
                    </td>
                    <td className="p-1.5" dir="auto">{m.fullName}</td>
                    <td className="p-1.5" dir="ltr">{m.phone}</td>
                  </tr>
                ))}
                {adults.length === 0 && (
                  <tr><td colSpan={3} className="p-4 text-center text-muted-foreground">no contacts</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setSendOpen(false)}>
              {t("gov.common.cancel")}
            </Button>
            <Button onClick={doSend} disabled={busy || selected.size === 0}>
              <Send size={12} /> {t("gov.messages.bulkSend")} {selected.size > 0 ? `(${selected.size})` : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
