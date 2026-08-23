"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { validateUsernameFormat, suggestUsernameFromName } from "@/lib/validations/username";

type PageState = "loading" | "ready" | "success" | "error";

export default function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();

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
          setErrorMsg(data.error ?? "رابط غير صالح");
          setPageState("error");
        } else {
          setFullName(data.fullName);
          setPageState("ready");
        }
      })
      .catch(() => {
        setErrorMsg("حدث خطأ في الاتصال");
        setPageState("error");
      });
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    const usernameErr = validateUsernameFormat(username);
    if (usernameErr) { setFormError(usernameErr); return; }
    if (password.length < 6) { setFormError("كلمة المرور يجب أن تكون 6 أحرف على الأقل"); return; }
    if (password !== confirm) { setFormError("كلمة المرور وتأكيدها غير متطابقتين"); return; }

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
      setFormError(data.error ?? "حدث خطأ");
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
            <img src="/logo.jpg" alt="جمعية النعمة" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-xl font-bold text-white">جمعية النعمة</h1>
        </div>

        {pageState === "loading" && (
          <div className="text-center py-6" style={{ color: "oklch(0.70 0.07 140)" }}>
            <span className="inline-block w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm">جاري التحقق من الرابط...</p>
          </div>
        )}

        {pageState === "error" && (
          <div className="text-center py-4">
            <div className="error-icon mx-auto mb-4">✕</div>
            <p className="text-white font-semibold mb-2">رابط غير صالح</p>
            <p className="text-sm mb-5" style={{ color: "oklch(0.70 0.07 140)" }}>{errorMsg}</p>
            <Link href="/login" className="auth-btn block text-center" style={{ textDecoration: "none" }}>
              تسجيل الدخول
            </Link>
          </div>
        )}

        {pageState === "ready" && (
          <>
            <p className="text-center text-sm mb-5" style={{ color: "oklch(0.78 0.10 130)" }}>
              مرحباً <span className="text-white font-semibold">{fullName}</span>
              <br />
              حدد اسم المستخدم وكلمة المرور لحسابك
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="auth-label">اسم المستخدم</label>
                <div className="flex gap-2">
                  <input
                    className="auth-input flex-1 min-w-0"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase())}
                    placeholder="مثال: ahmed.alaoui"
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
                      ✨ اقتراح
                    </button>
                  )}
                </div>
                <p className="text-[11px]" style={{ color: "oklch(0.55 0.06 140)" }}>
                  حروف لاتينية صغيرة (a-z) وأرقام والرموز . _ - فقط، 3-30 حرفا.
                </p>
              </div>
              <div className="space-y-1">
                <label className="auth-label">كلمة المرور</label>
                <input
                  type="password"
                  className="auth-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="6 أحرف على الأقل"
                  dir="ltr"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="auth-label">تأكيد كلمة المرور</label>
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
                    جاري الحفظ...
                  </span>
                ) : (
                  "تفعيل الحساب"
                )}
              </button>
            </form>
          </>
        )}

        {pageState === "success" && (
          <div className="text-center py-2">
            <div className="success-check mx-auto mb-4">✓</div>
            <p className="text-white font-semibold mb-2">تم تفعيل حسابك</p>
            <p className="text-sm mb-5" style={{ color: "oklch(0.72 0.07 130)" }}>
              يمكنك الآن تسجيل الدخول باسم المستخدم وكلمة المرور التي اخترتها
            </p>
            <button
              className="auth-btn"
              onClick={() => router.push("/login")}
            >
              تسجيل الدخول
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
