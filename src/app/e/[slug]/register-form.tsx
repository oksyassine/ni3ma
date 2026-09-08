"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/i18n/provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export function EventRegisterForm({
  eventId,
  priceMad,
}: {
  eventId: string;
  priceMad: number;
}) {
  const { t } = useT();
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch(`/api/events/${eventId}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attendeeName: name, attendeePhone: phone, attendeeEmail: email }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? t("events.registerFailed"));
        return;
      }
      if (data.payUrl) {
        // Online payment: redirect to YouCan.
        window.location.href = data.payUrl;
      } else {
        toast.success(t("events.registerSuccess"));
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-xl border bg-card p-6 space-y-4">
      <h2 className="font-bold">{t("events.registerTitle")}</h2>
      {priceMad > 0 && (
        <p className="text-sm text-amber-700">
          💳 {t("events.paymentOnlineNotice")}
        </p>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="name">{t("events.attendeeName")}</Label>
        <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="phone">{t("events.attendeePhone")}</Label>
        <Input id="phone" type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="email">{t("events.attendeeEmail")} ({t("common.optional")})</Label>
        <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <Button type="submit" disabled={busy} className="w-full">
        🎟 {t("events.registerSubmit")}{priceMad > 0 ? ` — ${t("events.payOnline")}` : ""}
      </Button>
    </form>
  );
}
