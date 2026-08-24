"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useT } from "@/components/i18n/provider";

const ROOT = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "neimaa.carbtrim.online";

type Phase = "form" | "submitting" | "active" | "pending";

export default function StartPage() {
  const { t } = useT();
  const [phase, setPhase] = useState<Phase>("form");
  const [error, setError] = useState<string | null>(null);
  const [slugState, setSlugState] = useState<"idle" | "checking" | "ok" | "taken" | "invalid">("idle");
  const [loginUrl, setLoginUrl] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [slug, setSlug] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  function normalizeSlug(v: string) {
    return v.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/^-+|-+$/g, "").slice(0, 30);
  }

  const slugTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  function onSlugChange(v: string) {
    const s = normalizeSlug(v);
    setSlug(s);
    setSlugState(s.length < 3 ? "invalid" : "checking");
    clearTimeout(slugTimer.current);
    if (s.length >= 3) {
      slugTimer.current = setTimeout(async () => {
        try {
          const res = await fetch(`/api/start/check-slug?slug=${encodeURIComponent(s)}`);
          const json = await res.json();
          setSlugState(json.available ? "ok" : json.reason === "reserved" ? "taken" : "taken");
        } catch {
          setSlugState("idle");
        }
      }, 400);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (slugState !== "ok") {
      setError(t("start.error.slug"));
      return;
    }
    if (adminPassword.length < 8) {
      setError(t("start.error.password"));
      return;
    }
    setError(null);
    setPhase("submitting");
    try {
      const res = await fetch("/api/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          city: city || undefined,
          slug,
          adminName,
          adminUsername,
          adminPassword,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? t("common.error"));
      setLoginUrl(json.loginUrl ?? null);
      setPhase(json.status === "ACTIVE" ? "active" : "pending");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
      setPhase("form");
    }
  }

  if (phase === "active") {
    return (
      <Success
        title={t("start.success.title")}
        body={
          loginUrl && (
            <>
              <p>{t("start.success.body")}</p>
              <a className="mt-4 inline-block font-bold text-primary underline" href={loginUrl}>
                {loginUrl}
              </a>
            </>
          )
        }
      />
    );
  }
  if (phase === "pending") {
    return (
      <Success
        title={t("start.pending.title")}
        body={
          <>
            <p>
              {t("start.pending.body")}
            </p>
            <p className="mt-3 text-muted-foreground">{t("start.futureUrl", { url: `https://${slug}.${ROOT}` })}</p>
          </>
        }
      />
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <h1 className="text-2xl font-extrabold">{t("start.title")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {t("start.subtitle")}
      </p>

      <form onSubmit={submit} className="mt-8 space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="name">{t("start.assocName")}</Label>
          <Input id="name" required minLength={2} maxLength={80} value={name} onChange={(e) => setName(e.target.value)} placeholder={t("start.assocPlaceholder")} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="city">{t("common.city")}</Label>
          <Input id="city" maxLength={60} value={city} onChange={(e) => setCity(e.target.value)} placeholder={t("common.city")} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="slug">{t("start.slugLabel")}</Label>
          <div dir="ltr" className="flex items-center gap-0 rounded-md border focus-within:ring-2 focus-within:ring-ring">
            <input
              id="slug"
              required
              value={slug}
              onChange={(e) => onSlugChange(e.target.value)}
              placeholder="my-association"
              className="w-full bg-transparent px-3 py-2 text-sm outline-none"
            />
            <span className="shrink-0 border-r px-3 py-2 text-sm text-muted-foreground">.neimaa.carbtrim.online</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {slugState === "ok" && <span className="text-green-600">{t("start.slugAvailable")}</span>}
            {slugState === "taken" && <span className="text-red-600">{t("start.slugTaken")}</span>}
            {slugState === "invalid" && t("start.slugHint")}
          </p>
        </div>

        <hr />

        <div className="space-y-1.5">
          <Label htmlFor="adminName">{t("start.adminName")}</Label>
          <Input id="adminName" required minLength={2} maxLength={80} value={adminName} onChange={(e) => setAdminName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="adminUsername">{t("auth.login.username")}</Label>
          <Input id="adminUsername" required dir="ltr" minLength={3} maxLength={30} value={adminUsername}
            onChange={(e) => setAdminUsername(e.target.value.replace(/[^a-zA-Z0-9_.-]/g, ""))} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="adminPassword">{t("auth.login.password")}</Label>
          <Input id="adminPassword" required type="password" dir="ltr" minLength={8} maxLength={72} value={adminPassword}
            onChange={(e) => setAdminPassword(e.target.value)} />
          <p className="text-xs text-muted-foreground">{t("start.passwordHint")}</p>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button type="submit" className="w-full" disabled={phase === "submitting"}>
          {phase === "submitting" ? t("start.creating") : t("start.submit")}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          {t("start.haveAccount")} <Link href="/login" className="underline">{t("landing.nav.login")}</Link>
        </p>
      </form>
    </div>
  );
}

function Success({ title, body }: { title: string; body: React.ReactNode }) {
  const { t } = useT();
  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center">
      <h1 className="text-2xl font-extrabold">{title}</h1>
      <div className="mt-6 text-muted-foreground">{body}</div>
      <Link href="/" className={buttonVariants({ variant: "outline", className: "mt-10" })}>
        {t("suspended.cta.home")}
      </Link>
    </div>
  );
}
