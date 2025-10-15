// web/src/pages/ForgotPassword.jsx
"use client";

import { useState } from "react";
import Link from "next/link";
import api from "../lib/api";
import { login as apiLogin } from "../lib/auth";

export default function ForgotPassword() {
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
      // Avoid user enumeration: show generic message if any error
      setMsg(
        err?.response?.data?.error ||
          "If the email exists, a verification code has been sent."
      );
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
        setMsg(
          "Password reset successful. Please sign in with your new password."
        );
      }
    } catch (err) {
      setMsg(err?.response?.data?.error || "Could not reset password");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card">
        <header className="auth-head">
          <h1>Reset your password</h1>
          <p>We’ll send a 6-digit code to your email.</p>
        </header>

        {msg && <div className="auth-alert">{msg}</div>}

        {/* STEP 1: request code */}
        {step === 1 && (
          <form className="auth-form" onSubmit={start}>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                autoComplete="email"
              />
            </div>

            <button className="btn-primary" disabled={busy}>
              {busy ? "Sending…" : "Send code"}
            </button>
          </form>
        )}

        {/* STEP 2: verify + new password */}
        {step === 2 && (
          <form className="auth-form" onSubmit={complete}>
            <div className="field">
              <label htmlFor="code">Verification code</label>
              <input
                id="code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                placeholder="6-digit code"
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
              <label htmlFor="newPassword">New password</label>
              <input
                id="newPassword"
                type="password"
                minLength={8}
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>

            <button className="btn-primary" disabled={busy}>
              {busy ? "Updating…" : "Reset password"}
            </button>

            <div className="row between" style={{ marginTop: 8 }}>
              <button
                type="button"
                className="btn-link"
                onClick={start}
                disabled={busy || cooldown > 0}
                title={cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
              >
                {cooldown > 0 ? `Resend code (${cooldown}s)` : "Resend code"}
              </button>
              <Link className="btn-link" href="/login">
                Back to login
              </Link>
            </div>
          </form>
        )}
      </section>
    </main>
  );
}
