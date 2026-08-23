"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      username,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("اسم المستخدم أو كلمة المرور غير صحيحة، أو الحساب في انتظار الموافقة");
      setLoading(false);
    } else {
      router.push("/");
      router.refresh();
    }
  };

  return (
    <div className="auth-bg min-h-screen flex items-center justify-center p-4">
      <div className="auth-card w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="logo-badge mx-auto mb-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.jpg" alt="جمعية النعمة" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-wide">جمعية النعمة</h1>
          <p className="text-sm mt-1" style={{ color: "oklch(0.75 0.08 130)" }}>
            نظام التسيير · مكناس
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="auth-label" htmlFor="username">اسم المستخدم</label>
            <input
              id="username"
              className="auth-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="أدخل اسم المستخدم"
              required
              dir="ltr"
            />
          </div>
          <div className="space-y-1.5">
            <label className="auth-label" htmlFor="password">كلمة المرور</label>
            <input
              id="password"
              type="password"
              className="auth-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              dir="ltr"
            />
          </div>

          {error && (
            <p className="text-xs text-center py-2 px-3 rounded-lg bg-red-500/15 text-red-300">
              {error}
            </p>
          )}

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                جاري الدخول...
              </span>
            ) : (
              "تسجيل الدخول"
            )}
          </button>
        </form>

        <p className="text-center text-sm mt-6" style={{ color: "oklch(0.65 0.04 140)" }}>
          جديد في الجمعية؟{" "}
          <Link
            href="/signup"
            className="font-semibold transition-colors hover:opacity-80"
            style={{ color: "oklch(0.82 0.16 82)" }}
          >
            التسجيل
          </Link>
        </p>
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
          background: oklch(0.27 0.09 155 / 0.7);
          border: 1px solid oklch(0.40 0.08 155);
          border-radius: 1.25rem;
          padding: 2.5rem 2rem;
          backdrop-filter: blur(12px);
          box-shadow: 0 25px 60px oklch(0.10 0.05 155 / 0.5), 0 0 0 1px oklch(0.50 0.08 155 / 0.15);
        }
        .logo-badge {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          overflow: hidden;
          border: 3px solid white;
          box-shadow: 0 0 0 3px oklch(0.80 0.16 82 / 0.4), 0 8px 24px oklch(0.10 0.05 155 / 0.5);
        }
        .auth-label {
          display: block;
          font-size: 0.8125rem;
          font-weight: 600;
          color: oklch(0.80 0.06 140);
          margin-bottom: 0.375rem;
        }
        .auth-input {
          width: 100%;
          background: oklch(0.20 0.07 155 / 0.6);
          border: 1px solid oklch(0.38 0.07 155);
          border-radius: 0.625rem;
          padding: 0.625rem 0.875rem;
          font-size: 0.9375rem;
          color: white;
          font-family: inherit;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
          text-align: right;
        }
        .auth-input::placeholder {
          color: oklch(0.50 0.04 155);
        }
        .auth-input:focus {
          border-color: oklch(0.55 0.12 155);
          box-shadow: 0 0 0 3px oklch(0.55 0.12 155 / 0.2);
        }
        .auth-btn {
          width: 100%;
          background: linear-gradient(135deg, oklch(0.42 0.14 155), oklch(0.35 0.12 155));
          border: 1px solid oklch(0.50 0.12 155);
          border-radius: 0.625rem;
          padding: 0.75rem 1rem;
          font-size: 0.9375rem;
          font-weight: 600;
          color: white;
          font-family: inherit;
          cursor: pointer;
          transition: all 0.15s;
          margin-top: 0.25rem;
        }
        .auth-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, oklch(0.46 0.14 155), oklch(0.39 0.12 155));
          box-shadow: 0 4px 16px oklch(0.25 0.10 155 / 0.5);
        }
        .auth-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
