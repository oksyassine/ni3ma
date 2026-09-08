"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useT } from "@/components/i18n/provider";

export default function ResetPasswordPage() {
  const { t } = useT();
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [valid, setValid] = useState(false);
  const [memberName, setMemberName] = useState("");

  // Probe the token once on mount so we can show a clean "expired or used"
  // page if it's no longer valid — without leaking which one.
  useEffect(() => {
    if (!token) {
      setValidating(false);
      setValid(false);
      return;
    }
    fetch(`/api/auth/reset-password?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((d: { valid?: boolean; memberName?: string }) => {
        setValidating(false);
        setValid(!!d.valid);
        if (d.memberName) setMemberName(d.memberName);
      })
      .catch(() => {
        setValidating(false);
        setValid(false);
      });
  }, [token]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError(t("auth.resetPassword.tooShort"));
      return;
    }
    if (password !== confirm) {
      setError(t("auth.resetPassword.mismatch"));
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? t("auth.resetPassword.failed"));
      } else {
        router.push("/login");
      }
    } finally {
      setLoading(false);
    }
  }

  if (validating) {
    return <div className="auth-card"><p className="text-center">...</p></div>;
  }

  if (!valid) {
    return (
      <div className="auth-card">
        <h1 className="auth-title">{t("auth.resetPassword.expiredTitle")}</h1>
        <p className="auth-subtitle">{t("auth.resetPassword.expiredSubtitle")}</p>
        <Link href="/forgot-password" className="auth-button mt-6 inline-block text-center">
          {t("auth.forgotPassword.title")}
        </Link>
      </div>
    );
  }

  return (
    <div className="auth-card">
      <h1 className="auth-title">{t("auth.resetPassword.title")}</h1>
      {memberName && (
        <p className="auth-subtitle">
          {t("auth.resetPassword.welcome")} <b>{memberName}</b>
        </p>
      )}

      <form onSubmit={submit} className="space-y-4 mt-6">
        <div className="space-y-1.5">
          <label className="auth-label" htmlFor="new">{t("auth.resetPassword.new")}</label>
          <input
            id="new"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="auth-input"
            dir="auto"
            autoComplete="new-password"
          />
        </div>
        <div className="space-y-1.5">
          <label className="auth-label" htmlFor="confirm">{t("auth.resetPassword.confirm")}</label>
          <input
            id="confirm"
            type="password"
            required
            minLength={8}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="auth-input"
            dir="auto"
            autoComplete="new-password"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={loading} className="auth-button">
          {loading ? "..." : t("auth.resetPassword.submit")}
        </button>
      </form>
    </div>
  );
}
