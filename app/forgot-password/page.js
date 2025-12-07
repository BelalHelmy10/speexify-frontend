// app/forgot-password/page.js
"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import api from "@/lib/api";
import { login as apiLogin } from "@/lib/auth";
import { getDictionary, t } from "@/app/i18n";

function ForgotPasswordInner({ dict }) {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // 1) Ask backend to send a verification code
  const start = async (e) => {
    e.preventDefault();
    setMsg("");
    setBusy(true);
    try {
      await api.post("/api/auth/password/reset/start", { email });
      setStep(2);

      // 60s re-send cooldown
      setCooldown(60);
      const iv = setInterval(() => {
        setCooldown((s) => {
          if (s <= 1) {
            clearInterval(iv);
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    } catch (err) {
      // Avoid user enumeration: generic message (or backend message if present)
      setMsg(err?.response?.data?.error || t(dict, "msg_start_generic"));
    } finally {
      setBusy(false);
    }
  };

  // 2) Complete reset, then try to auto-login with new password
  const complete = async (e) => {
    e.preventDefault();
    setMsg("");
    setBusy(true);
    try {
      await api.post("/api/auth/password/reset/complete", {
        email,
        code,
        newPassword,
      });

      // Try to sign the user in immediately
      try {
        await apiLogin({ email, password: newPassword });
        window.location.replace("/dashboard");
        return;
      } catch {
        // If auto-login fails, still inform the user that reset worked
        setMsg(t(dict, "msg_reset_success"));
      }
    } catch (err) {
      setMsg(err?.response?.data?.error || t(dict, "msg_reset_error"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card">
        <header className="auth-head">
          <h1>{t(dict, "title")}</h1>
          <p>{t(dict, "subtitle")}</p>
        </header>

        {msg && <div className="auth-alert">{msg}</div>}

        {/* STEP 1: request code */}
        {step === 1 && (
          <form className="auth-form" onSubmit={start}>
            <div className="field">
              <label htmlFor="email">{t(dict, "label_email")}</label>
              <input
                id="email"
                type="email"
                placeholder={t(dict, "placeholder_email")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                autoComplete="email"
              />
            </div>

            <button className="btn-primary" disabled={busy}>
              {busy ? t(dict, "btn_sending") : t(dict, "btn_send_code")}
            </button>
          </form>
        )}

        {/* STEP 2: verify + new password */}
        {step === 2 && (
          <form className="auth-form" onSubmit={complete}>
            <div className="field">
              <label htmlFor="code">{t(dict, "label_code")}</label>
              <input
                id="code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                placeholder={t(dict, "placeholder_code")}
                value={code}
                onChange={(e) =>
                  setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                required
                autoFocus
                autoComplete="one-time-code"
              />
            </div>

            <div className="field">
              <label htmlFor="newPassword">
                {t(dict, "label_new_password")}
              </label>
              <input
                id="newPassword"
                type="password"
                minLength={8}
                placeholder={t(dict, "placeholder_new_password")}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>

            <button className="btn-primary" disabled={busy}>
              {busy ? t(dict, "btn_updating") : t(dict, "btn_reset")}
            </button>

            <div className="row between" style={{ marginTop: 8 }}>
              <button
                type="button"
                className="btn-link"
                onClick={start}
                disabled={busy || cooldown > 0}
                title={
                  cooldown > 0
                    ? t(dict, "btn_resend_with_cooldown", {
                        cooldown,
                      })
                    : t(dict, "btn_resend")
                }
              >
                {cooldown > 0
                  ? t(dict, "btn_resend_with_cooldown", { cooldown })
                  : t(dict, "btn_resend")}
              </button>
              <Link className="btn-link" href="/login">
                {t(dict, "back_to_login")}
              </Link>
            </div>
          </form>
        )}
      </section>
    </main>
  );
}

export default function ForgotPasswordPage() {
  const pathname = usePathname();
  const locale = pathname?.startsWith("/ar") ? "ar" : "en";
  const dict = getDictionary(locale, "forgotPassword");

  return <ForgotPasswordInner dict={dict} />;
}
