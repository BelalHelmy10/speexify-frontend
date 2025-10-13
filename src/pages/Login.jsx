// src/pages/Login.jsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import GoogleButton from "../components/GoogleButton";
import {
  login as apiLogin,
  googleLogin as apiGoogleLogin,
  logout as apiLogout,
} from "../lib/auth";
import useAuth from "../hooks/useAuth";

function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [msg, setMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const router = useRouter();
  const params = useSearchParams();

  // Read auth from the global provider
  const { user, checking, refresh } = useAuth();

  const redirectAfterLogin = () => {
    const next = params.get("next") || "/dashboard";
    router.replace(next);
  };

  // If already logged in, skip the page
  useEffect(() => {
    if (!checking && user) {
      redirectAfterLogin();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checking, user]);

  const login = async (e) => {
    e.preventDefault();
    setMsg("");
    setSubmitting(true);
    try {
      await apiLogin(form);
      await refresh(); // update provider.user immediately
      redirectAfterLogin();
    } catch (err) {
      setMsg(err?.response?.data?.error || "Login failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSuccess = async (data) => {
    try {
      setMsg("");
      await apiGoogleLogin(data.credential);
      await refresh();
      redirectAfterLogin();
    } catch (err) {
      console.error(err);
      setMsg(err?.response?.data?.error || "Google sign-in failed");
    }
  };

  const handleGoogleError = (err) => {
    console.error(err);
    setMsg("Google sign-in failed");
  };

  const logout = async () => {
    try {
      await apiLogout();
      await refresh();
      router.replace("/");
    } catch (e) {
      // non-blocking
      console.error(e);
    }
  };

  if (checking) {
    return <div className="route-loading">Loading…</div>;
  }

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
            <h1>Welcome back</h1>
            <p>Sign in to continue to your account</p>
          </header>

          {!user ? (
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

              <form className="auth-form" onSubmit={login}>
                {msg && (
                  <div className="auth-alert" role="alert">
                    <svg viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span>{msg}</span>
                  </div>
                )}

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
                      value={form.email}
                      onChange={(e) =>
                        setForm({ ...form, email: e.target.value })
                      }
                      required
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div className="form-field">
                  <div className="field-label-row">
                    <label htmlFor="password">Password</label>
                    <Link href="/forgot-password" className="forgot-link">
                      Forgot password?
                    </Link>
                  </div>
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
                      placeholder="Enter your password"
                      value={form.password}
                      onChange={(e) =>
                        setForm({ ...form, password: e.target.value })
                      }
                      required
                      autoComplete="current-password"
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
                      Signing in...
                    </>
                  ) : (
                    "Sign in"
                  )}
                </button>
              </form>

              <footer className="auth-footer">
                <p>
                  Don&apos;t have an account?{" "}
                  <Link href="/register" className="link-primary">
                    Create account
                  </Link>
                </p>
              </footer>
            </>
          ) : (
            <div className="auth-logged">
              <div className="user-badge">
                <div className="user-avatar">
                  {user.name
                    ? user.name.charAt(0).toUpperCase()
                    : user.email.charAt(0).toUpperCase()}
                </div>
                <div className="user-info">
                  <p className="user-name">{user.name || "User"}</p>
                  <p className="user-email">{user.email}</p>
                  <span className="user-role">{user.role}</span>
                </div>
              </div>
              <button className="btn-secondary" onClick={logout}>
                Sign out
              </button>
            </div>
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

export default Login;
