"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useT } from "@/components/i18n/provider";
import { toast } from "sonner";

export function CreateEventForm() {
  const { t } = useT();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [slug, setSlug] = useState("");
  const [startsAt, setStartsAt] = useState(new Date().toISOString().slice(0, 16));
  const [endsAt, setEndsAt] = useState("");
  const [venue, setVenue] = useState("");
  const [city, setCity] = useState("");
  const [capacity, setCapacity] = useState("");
  const [ticketPrice, setTicketPrice] = useState("0");
  const [paymentMode, setPaymentMode] = useState<"FREE" | "ONLINE" | "ONSITE">("FREE");
  const [memberDiscount, setMemberDiscount] = useState("50");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title, description, slug,
          startsAt: new Date(startsAt).toISOString(),
          endsAt: endsAt ? new Date(endsAt).toISOString() : null,
          venue: venue || null,
          city: city || null,
          capacity: capacity ? Number(capacity) : null,
          ticketPrice: Number(ticketPrice),
          paymentMode,
          memberDiscountPct: Number(memberDiscount),
          visibility: "DRAFT",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? t("common.failed"));
        return;
      }
      router.push(`/bureau/events/${data.id}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="title">{t("gov.events.title")}</Label>
            <Input id="title" required value={title} onChange={(e) => {
              setTitle(e.target.value);
              if (!slug) setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 60));
            }} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="slug">Slug (URL path)</Label>
            <Input id="slug" required value={slug} onChange={(e) => setSlug(e.target.value)} dir="ltr" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description">{t("gov.events.description")}</Label>
            <Textarea id="description" required rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="startsAt">{t("gov.events.startsAt")}</Label>
              <Input id="startsAt" type="datetime-local" required value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="endsAt">{t("gov.events.endsAt")}</Label>
              <Input id="endsAt" type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="venue">{t("gov.events.venue")}</Label>
              <Input id="venue" value={venue} onChange={(e) => setVenue(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="city">{t("gov.events.city")}</Label>
              <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="capacity">{t("gov.events.capacity")}</Label>
              <Input id="capacity" type="number" min="0" value={capacity} onChange={(e) => setCapacity(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ticketPrice">{t("gov.events.price")} (MAD)</Label>
              <Input id="ticketPrice" type="number" min="0" step="0.01" value={ticketPrice} onChange={(e) => setTicketPrice(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="memberDiscount">Member discount (%)</Label>
              <Input id="memberDiscount" type="number" min="0" max="100" value={memberDiscount} onChange={(e) => setMemberDiscount(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="paymentMode">{t("gov.events.paymentMode")}</Label>
            <select
              id="paymentMode"
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value as "FREE" | "ONLINE" | "ONSITE")}
              className="h-9 px-3 rounded-md border bg-background"
            >
              <option value="FREE">{t("gov.events.paymentModeFree")}</option>
              <option value="ONLINE">{t("gov.events.paymentModeOnline")}</option>
              <option value="ONSITE">{t("gov.events.paymentModeOnsite")}</option>
            </select>
          </div>
          <Button type="submit" disabled={busy} className="w-full">
            {t("common.create")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
