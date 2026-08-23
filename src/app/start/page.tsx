"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ROOT = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "neimaa.carbtrim.online";

type Phase = "form" | "submitting" | "active" | "pending";

export default function StartPage() {
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
      setError("اختر عنوانا صحيحا ومتاحا للفضاء");
      return;
    }
    if (adminPassword.length < 8) {
      setError("كلمة المرور يجب أن تكون 8 أحرف على الأقل");
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
      if (!res.ok) throw new Error(json.error ?? "حدث خطأ، أعد المحاولة");
      setLoginUrl(json.loginUrl ?? null);
      setPhase(json.status === "ACTIVE" ? "active" : "pending");
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ، أعد المحاولة");
      setPhase("form");
    }
  }

  if (phase === "active") {
    return (
      <Success
        title="تم إنشاء فضاء جمعيتكم بنجاح"
        body={
          loginUrl && (
            <>
              <p>سجّل الدخول الآن باستخدام اسم المستخدم وكلمة المرور التي اخترتهما:</p>
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
        title="تم استلام طلبكم"
        body={
          <>
            <p>
              فضاء جمعيتكم قيد التهيئة النهائية. سيتوصل فريقنا بإشعارا وسيعمل على تفعيله في أقرب وقت — عادة خلال
              ساعات العمل.
            </p>
            <p className="mt-3 text-muted-foreground">عنوانكم المستقبلي: https://{slug}.{ROOT}</p>
          </>
        }
      />
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <h1 className="text-2xl font-extrabold">أنشئوا فضاء جمعيتكم</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        مجاني حتى 50 منخرطا وبدون بطاقة بنكية. بيانات جمعيتكم معزولة بالكامل في قاعدة بيانات خاصة.
      </p>

      <form onSubmit={submit} className="mt-8 space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="name">اسم الجمعية</Label>
          <Input id="name" required minLength={2} maxLength={80} value={name} onChange={(e) => setName(e.target.value)} placeholder="جمعية ... " />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="city">المدينة</Label>
          <Input id="city" maxLength={60} value={city} onChange={(e) => setCity(e.target.value)} placeholder="مكناس" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="slug">عنوان الفضاء</Label>
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
            {slugState === "ok" && <span className="text-green-600">العنوان متاح ✓</span>}
            {slugState === "taken" && <span className="text-red-600">هذا العنوان غير متاح</span>}
            {slugState === "invalid" && "3 أحرف على الأقل: حروف لاتينية وأرقام وشرطة"}
          </p>
        </div>

        <hr />

        <div className="space-y-1.5">
          <Label htmlFor="adminName">الاسم الكامل للمسؤول</Label>
          <Input id="adminName" required minLength={2} maxLength={80} value={adminName} onChange={(e) => setAdminName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="adminUsername">اسم المستخدم</Label>
          <Input id="adminUsername" required dir="ltr" minLength={3} maxLength={30} value={adminUsername}
            onChange={(e) => setAdminUsername(e.target.value.replace(/[^a-zA-Z0-9_.-]/g, ""))} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="adminPassword">كلمة المرور</Label>
          <Input id="adminPassword" required type="password" dir="ltr" minLength={8} maxLength={72} value={adminPassword}
            onChange={(e) => setAdminPassword(e.target.value)} />
          <p className="text-xs text-muted-foreground">8 أحرف على الأقل</p>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button type="submit" className="w-full" disabled={phase === "submitting"}>
          {phase === "submitting" ? "جارٍ الإنشاء..." : "أنشئوا الفضاء مجانا"}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          لديكم حساب بالفعل؟ <Link href="/login" className="underline">دخول</Link>
        </p>
      </form>
    </div>
  );
}

function Success({ title, body }: { title: string; body: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center">
      <h1 className="text-2xl font-extrabold">{title}</h1>
      <div className="mt-6 text-muted-foreground">{body}</div>
      <Link href="/" className={buttonVariants({ variant: "outline", className: "mt-10" })}>العودة إلى الصفحة الرئيسية</Link>
    </div>
  );
}
