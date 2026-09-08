"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
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
import { Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { renderTemplateClient } from "@/lib/messaging-client";

type Template = { key: string; name: string; channel: "WHATSAPP" | "SMS" | "EMAIL"; body: string };
type MemberRef = { id: string; fullName: string; phone: string; daysSince: number | null };

export function BulkReminderSend({
  members,
  templates,
  assocName,
}: {
  members: MemberRef[];
  templates: Template[];
  assocName: string;
}) {
  const { t } = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [templateKey, setTemplateKey] = useState(templates[0]?.key ?? "");
  const [busy, setBusy] = useState(false);

  const tpl = templates.find((t) => t.key === templateKey);
  const validRecipients = members.filter((m) => m.phone);
  const sample = validRecipients[0];
  const preview = tpl && sample
    ? renderTemplateClient(tpl.body, {
        member: sample.fullName,
        name: assocName,
        days: sample.daysSince === null ? "∞" : String(sample.daysSince),
      })
    : "";

  async function doSend() {
    if (!tpl || validRecipients.length === 0) {
      toast.error(t("gov.messages.selectRecipients"));
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateKey: tpl.key,
          channel: tpl.channel,
          recipients: validRecipients.map((m) => ({
            phone: m.phone,
            memberId: m.id,
            name: m.fullName,
            variables: { days: m.daysSince === null ? "∞" : String(m.daysSince) },
          })),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "failed");
      }
      const data: { success: number; failed: number } = await res.json();
      toast.success(`✅ ${data.success} / ${data.success + data.failed}`);
      setOpen(false);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("gov.common.toastFailed"));
    } finally {
      setBusy(false);
    }
  }

  if (templates.length === 0 || validRecipients.length === 0) return null;

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Send size={14} /> {t("gov.dashboard.sendReminders")} ({validRecipients.length})
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>📤 {t("gov.messages.bulkSend")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">{t("gov.messages.templates")}</Label>
              <Select value={templateKey} onValueChange={(v) => setTemplateKey(v ?? "")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.key} value={t.key}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {preview && (
              <div>
                <Label className="text-xs">Aperçu ({sample?.fullName})</Label>
                <pre className="whitespace-pre-wrap rounded-md bg-muted/40 p-2 text-xs leading-relaxed" dir="auto">{preview}</pre>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              {t("gov.messages.selected", { n: validRecipients.length })}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t("gov.common.cancel")}
            </Button>
            <Button onClick={doSend} disabled={busy}>
              <Send size={12} /> {t("gov.messages.bulkSend")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// inline duplicate of the label — shadcn's label slot needs a real import
function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <label className={`text-xs ${className ?? ""}`}>{children}</label>;
}
