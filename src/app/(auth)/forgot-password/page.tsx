"use client";

import { useState } from "react";
import Link from "next/link";
import { useT } from "@/components/i18n/provider";

// Magic-link password recovery. Always returns a generic success message
// whether the email/phone is registered or not — prevents user enumeration.
export default function ForgotPasswordPage() {
  const { t } = useT();
  const [identifier, setIdentifier] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier }),
      });
    } finally {
      setSubmitted(true);
      setLoading(false);
    }
  }

  return (
    <div className="auth-card">
      <h1 className="auth-title">{t("auth.forgotPassword.title")}</h1>
      <p className="auth-subtitle">{t("auth.forgotPassword.subtitle")}</p>

      {submitted ? (
        <div className="mt-6 rounded-lg border bg-green-50 dark:bg-green-950/30 p-4 text-sm">
          ✅ {t("auth.forgotPassword.sent")}
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4 mt-6">
          <div className="space-y-1.5">
            <label className="auth-label" htmlFor="identifier">
              {t("auth.forgotPassword.identifierLabel")}
            </label>
            <input
              id="identifier"
              type="text"
              required
              autoComplete="username"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="auth-input"
              placeholder={t("auth.forgotPassword.identifierPlaceholder")}
              dir="auto"
            />
            <p className="text-xs text-muted-foreground">
              {t("auth.forgotPassword.identifierHint")}
            </p>
          </div>
          <button type="submit" disabled={loading} className="auth-button">
            {loading ? "..." : t("auth.forgotPassword.submit")}
          </button>
        </form>
      )}

      <p className="text-center text-sm mt-6">
        <Link href="/login" className="text-xs underline text-muted-foreground hover:opacity-80">
          ← {t("auth.login.title")}
        </Link>
      </p>
    </div>
  );
}
