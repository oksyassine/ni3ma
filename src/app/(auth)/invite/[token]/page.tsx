"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { validateUsernameFormat, suggestUsernameFromName } from "@/lib/validations/username";
import { useT } from "@/components/i18n/provider";

type PageState = "loading" | "ready" | "success" | "error";

export default function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const { t } = useT();

  const [pageState, setPageState] = useState<PageState>("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    fetch(`/api/invite/${token}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          setErrorMsg(data.error ?? t("auth.invite.invalidLink"));
          setPageState("error");
        } else {
          setFullName(data.fullName);
          setPageState("ready");
        }
      })
      .catch(() => {
        setErrorMsg(t("auth.invite.connectionError"));
        setPageState("error");
      });
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    const usernameErr = validateUsernameFormat(username);
    if (usernameErr) { setFormError(usernameErr); return; }
    if (password.length < 6) { setFormError(t("auth.invite.error.passwordTooShort")); return; }
    if (password !== confirm) { setFormError(t("auth.invite.error.passwordMismatch")); return; }

    setSubmitting(true);
    const res = await fetch(`/api/invite/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: username.trim().toLowerCase(), password }),
    });

    if (res.ok) {
      setPageState("success");
    } else {
      const data = await res.json();
      setFormError(data.error ?? t("auth.invite.genericError"));
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-bg min-h-screen flex items-center justify-center p-4">
      <div className="auth-card w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-7">
          <div className="logo-badge mx-auto mb-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.jpg" alt={t("auth.org.name")} className="w-full h-full object-cover" />
          </div>
          <h1 className="text-xl font-bold text-white">{t("auth.org.name")}</h1>
        </div>

        {pageState === "loading" && (
          <div className="text-center py-6" style={{ color: "oklch(0.70 0.07 140)" }}>
            <span className="inline-block w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm">{t("auth.invite.verifying")}</p>
          </div>
        )}

        {pageState === "error" && (
          <div className="text-center py-4">
            <div className="error-icon mx-auto mb-4">✕</div>
            <p className="text-white font-semibold mb-2">{t("auth.invite.invalidLink")}</p>
            <p className="text-sm mb-5" style={{ color: "oklch(0.70 0.07 140)" }}>{errorMsg}</p>
            <Link href="/login" className="auth-btn block text-center" style={{ textDecoration: "none" }}>
              {t("auth.login.title")}
            </Link>
          </div>
        )}

        {pageState === "ready" && (
          <>
            <p className="text-center text-sm mb-5" style={{ color: "oklch(0.78 0.10 130)" }}>
              {t("auth.invite.welcome")} <span className="text-white font-semibold">{fullName}</span>
              <br />
              {t("auth.invite.setUsernameHint")}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="auth-label">{t("auth.login.username")}</label>
                <div className="flex gap-2">
                  <input
                    className="auth-input flex-1 min-w-0"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase())}
                    placeholder={t("auth.invite.username.placeholder")}
                    dir="ltr"
                    required
                  />
                  {fullName && (
                    <button
                      type="button"
                      onClick={() => setUsername(suggestUsernameFromName(fullName))}
                      className="text-xs px-2 py-1.5 rounded-md whitespace-nowrap shrink-0"
                      style={{ background: "oklch(0.42 0.14 155)", color: "white" }}
                    >
                      ✨ {t("auth.invite.suggest")}
                    </button>
                  )}
                </div>
                <p className="text-[11px]" style={{ color: "oklch(0.55 0.06 140)" }}>
                  {t("auth.invite.usernameRules")}
                </p>
              </div>
              <div className="space-y-1">
                <label className="auth-label">{t("auth.login.password")}</label>
                <input
                  type="password"
                  className="auth-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("auth.invite.password.placeholder")}
                  dir="ltr"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="auth-label">{t("auth.invite.confirmPassword")}</label>
                <input
                  type="password"
                  className="auth-input"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  dir="ltr"
                  required
                />
              </div>

              {formError && (
                <p className="text-xs py-2 px-3 rounded-lg bg-red-500/15 text-red-300 text-center">
                  {formError}
                </p>
              )}

              <button type="submit" className="auth-btn" disabled={submitting}>
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {t("auth.invite.saving")}
                  </span>
                ) : (
                  t("auth.invite.activateAccount")
                )}
              </button>
            </form>
          </>
        )}

        {pageState === "success" && (
          <div className="text-center py-2">
            <div className="success-check mx-auto mb-4">✓</div>
            <p className="text-white font-semibold mb-2">{t("auth.invite.success.title")}</p>
            <p className="text-sm mb-5" style={{ color: "oklch(0.72 0.07 130)" }}>
              {t("auth.invite.success.canLogin")}
            </p>
            <button
              className="auth-btn"
              onClick={() => router.push("/login")}
            >
              {t("auth.login.title")}
            </button>
          </div>
        )}
      </div>

      <style>{`
        .auth-bg {
          background-image:
            linear-gradient(oklch(0.18 0.08 155 / 0.88), oklch(0.18 0.08 155 / 0.92)),
            url('/cover.png');
          background-size: cover;
          background-position: center;
        }
        .auth-card {
          background: oklch(0.27 0.09 155 / 0.75);
          border: 1px solid oklch(0.40 0.08 155);
          border-radius: 1.25rem;
          padding: 2.25rem 2rem;
          backdrop-filter: blur(12px);
          box-shadow: 0 25px 60px oklch(0.10 0.05 155 / 0.5);
        }
        .logo-badge {
          width: 68px; height: 68px;
          border-radius: 50%; overflow: hidden;
          border: 3px solid white;
          box-shadow: 0 0 0 3px oklch(0.80 0.16 82 / 0.4), 0 8px 24px oklch(0.10 0.05 155 / 0.5);
        }
        .auth-label { display: block; font-size: 0.8rem; font-weight: 600; color: oklch(0.78 0.06 140); }
        .auth-input {
          width: 100%;
          background: oklch(0.20 0.07 155 / 0.6);
          border: 1px solid oklch(0.38 0.07 155);
          border-radius: 0.5rem;
          padding: 0.5625rem 0.75rem;
          font-size: 0.9rem; color: white; font-family: inherit;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
          text-align: right;
        }
        .auth-input::placeholder { color: oklch(0.48 0.04 155); }
        .auth-input:focus { border-color: oklch(0.55 0.12 155); box-shadow: 0 0 0 3px oklch(0.55 0.12 155 / 0.2); }
        .auth-btn {
          width: 100%;
          background: linear-gradient(135deg, oklch(0.42 0.14 155), oklch(0.35 0.12 155));
          border: 1px solid oklch(0.50 0.12 155);
          border-radius: 0.625rem;
          padding: 0.75rem 1rem;
          font-size: 0.9375rem; font-weight: 600;
          color: white; font-family: inherit;
          cursor: pointer; transition: all 0.15s; display: block;
        }
        .auth-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, oklch(0.46 0.14 155), oklch(0.39 0.12 155));
        }
        .auth-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .success-check {
          width: 56px; height: 56px;
          background: oklch(0.42 0.16 155);
          border: 2px solid oklch(0.60 0.16 155);
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 1.375rem; color: white;
        }
        .error-icon {
          width: 56px; height: 56px;
          background: oklch(0.45 0.18 27 / 0.3);
          border: 2px solid oklch(0.60 0.20 27);
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 1.375rem; color: oklch(0.75 0.20 27);
        }
      `}</style>
    </div>
  );
}
