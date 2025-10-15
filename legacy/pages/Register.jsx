// src/pages/Register.jsx
"use client";

import { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";

const GoogleButton = dynamic(() => import("@/components/GoogleButton"), {
  ssr: false,
});

import {
  me as apiMe,
  googleLogin as apiGoogleLogin,
  registerStart as apiRegisterStart,
  registerComplete as apiRegisterComplete,
} from "@/lib/auth";

export default function Register() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState("error");
  const [sending, setSending] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const sendCode = async (e) => {
    e?.preventDefault?.();
    setMsg("");
    setSending(true);
    try {
      await apiRegisterStart(email);
      setStep(2);
      setMsgType("success");
      setMsg(`Verification code sent to ${email}`);

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
      setMsgType("error");
      setMsg(err?.response?.data?.error || "Could not send verification code");
    } finally {
      setSending(false);
    }
  };

  const complete = async (e) => {
    e.preventDefault();
    setMsg("");
    setSubmitting(true);
    try {
      await apiRegisterComplete({ email, code, password, name });
      setMsgType("success");
      setMsg(`Account created successfully! Redirecting...`);
      setTimeout(() => {
        window.location.href = "/login";
      }, 1500);
    } catch (err) {
      setMsgType("error");
      setMsg(err?.response?.data?.error || "Registration failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSuccess = async (data) => {
    try {
      setMsg("");
      await apiGoogleLogin(data.credential);
      const res = await apiMe();
      if (res?.user) window.location.href = "/dashboard";
      else setMsg("Signed in with Google, but no user returned.");
    } catch (err) {
      console.error(err);
      setMsgType("error");
      setMsg(err?.response?.data?.error || "Google sign-in failed");
    }
  };

  const handleGoogleError = (err) => {
    console.error(err);
    setMsgType("error");
    setMsg("Google sign-in failed");
  };

  return (
    <main className="auth-page">
      <div className="auth-container">
        <section className="auth-card">
          <div className="auth-brand">
            <div className="brand-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 2L2 7L12 12L22 7L12 2Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M2 17L12 22L22 17"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M2 12L12 17L22 12"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>

          <header className="auth-header">
            <h1>{step === 1 ? "Create account" : "Verify your email"}</h1>
            <p>
              {step === 1
                ? "Get started with your free account"
                : `We sent a code to ${email}`}
            </p>
          </header>

          <div className="progress-steps">
            <div className={`step ${step >= 1 ? "active" : ""}`}>
              <div className="step-circle">
                {step > 1 ? (
                  <svg viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  "1"
                )}
              </div>
              <span>Email</span>
            </div>
            <div className="step-line"></div>
            <div className={`step ${step >= 2 ? "active" : ""}`}>
              <div className="step-circle">2</div>
              <span>Verify</span>
            </div>
          </div>

          {msg && (
            <div className={`auth-alert ${msgType}`} role="alert">
              <svg viewBox="0 0 20 20" fill="currentColor">
                {msgType === "success" ? (
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                ) : (
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                )}
              </svg>
              <span>{msg}</span>
            </div>
          )}

          {step === 1 && (
            <>
              <div className="auth-social">
                <GoogleButton
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                />
              </div>

              <div className="auth-divider">
                <span>or continue with email</span>
              </div>

              <form className="auth-form" onSubmit={sendCode}>
                <div className="form-field">
                  <label htmlFor="email">Email address</label>
                  <div className="input-wrapper">
                    <svg
                      className="input-icon"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                      <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                    </svg>
                    <input
                      id="email"
                      type="email"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoFocus
                      autoComplete="email"
                    />
                  </div>
                </div>

                <button
                  className="btn-primary"
                  type="submit"
                  disabled={sending}
                >
                  {sending ? (
                    <>
                      <svg className="spinner" viewBox="0 0 24 24">
                        <circle
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                          opacity="0.25"
                        />
                        <path
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          opacity="0.75"
                        />
                      </svg>
                      Sending code...
                    </>
                  ) : (
                    "Continue"
                  )}
                </button>
              </form>

              <footer className="auth-footer">
                <p>
                  Already have an account?{" "}
                  <Link href="/login" className="link-primary">
                    Sign in
                  </Link>
                </p>
              </footer>
            </>
          )}

          {step === 2 && (
            <form className="auth-form" onSubmit={complete}>
              <div className="form-field">
                <label htmlFor="code">Verification code</label>
                <div className="input-wrapper">
                  <svg
                    className="input-icon"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16h2a1 1 0 110 2H7a1 1 0 110-2h2V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L9 4.323V3a1 1 0 011-1zm-5 8.274l-.818 2.552c.25.112.526.174.818.174.292 0 .569-.062.818-.174L5 10.274zm10 0l-.818 2.552c.25.112.526.174.818.174.292 0 .569-.062.818-.174L15 10.274z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <input
                    id="code"
                    type="text"
                    inputMode="numeric"
                    pattern="\d{6}"
                    placeholder="000000"
                    value={code}
                    onChange={(e) =>
                      setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    required
                    autoFocus
                    autoComplete="one-time-code"
                  />
                </div>
                <p className="field-hint">
                  Enter the 6-digit code sent to your email
                </p>
              </div>

              <div className="form-field">
                <label htmlFor="name">
                  Full name <span className="optional">(optional)</span>
                </label>
                <div className="input-wrapper">
                  <svg
                    className="input-icon"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <input
                    id="name"
                    type="text"
                    placeholder="Jane Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                  />
                </div>
              </div>

              <div className="form-field">
                <label htmlFor="password">Password</label>
                <div className="input-wrapper">
                  <svg
                    className="input-icon"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a strong password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? (
                      <svg viewBox="0 0 20 20" fill="currentColor">
                        <path
                          fillRule="evenodd"
                          d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z"
                          clipRule="evenodd"
                        />
                        <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                        <path
                          fillRule="evenodd"
                          d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </button>
                </div>
                <p className="field-hint">Must be at least 6 characters</p>
              </div>

              <button
                className="btn-primary"
                type="submit"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <svg className="spinner" viewBox="0 0 24 24">
                      <circle
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                        opacity="0.25"
                      />
                      <path
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        opacity="0.75"
                      />
                    </svg>
                    Creating account...
                  </>
                ) : (
                  "Create account"
                )}
              </button>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn-link"
                  disabled={cooldown > 0 || sending}
                  onClick={sendCode}
                >
                  {cooldown > 0 ? (
                    <>Resend code ({cooldown}s)</>
                  ) : (
                    <>
                      <svg viewBox="0 0 20 20" fill="currentColor">
                        <path
                          fillRule="evenodd"
                          d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Resend code
                    </>
                  )}
                </button>
                <button
                  type="button"
                  className="btn-link"
                  onClick={() => {
                    setStep(1);
                    setMsg("");
                    setCode("");
                  }}
                >
                  <svg viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Change email
                </button>
              </div>

              <footer className="auth-footer">
                <p>
                  Already have an account?{" "}
                  <Link href="/login" className="link-primary">
                    Sign in
                  </Link>
                </p>
              </footer>
            </form>
          )}
        </section>

        <div className="auth-decoration">
          <div className="decoration-circle circle-1"></div>
          <div className="decoration-circle circle-2"></div>
          <div className="decoration-circle circle-3"></div>
        </div>
      </div>
    </main>
  );
}
