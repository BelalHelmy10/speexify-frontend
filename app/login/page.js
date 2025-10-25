// src/pages/login.jsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";

const GoogleButton = dynamic(() => import("@/components/GoogleButton"), {
  ssr: false,
});

import {
  login as apiLogin,
  googleLogin as apiGoogleLogin,
  logout as apiLogout,
} from "@/lib/auth";
import useAuth from "@/hooks/useAuth";

function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [msg, setMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [redirecting, setRedirecting] = useState(false); // 👈 to hide UI while redirecting

  const router = useRouter();
  const params = useSearchParams();

  const { user, checking, refresh } = useAuth();

  // Helper to navigate after login
  const redirectAfterLogin = () => {
    const next = params.get("next") || "/dashboard";
    router.replace(next);
    router.refresh();
  };

  // If already logged in, skip login page
  useEffect(() => {
    if (!checking && user) {
      setRedirecting(true);
      redirectAfterLogin();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checking, user]);

  const login = async (e) => {
    e.preventDefault();
    setMsg("");
    setSubmitting(true);
    setRedirecting(true);
    try {
      await apiLogin(form);
      await refresh();
      redirectAfterLogin();
    } catch (err) {
      setRedirecting(false);
      setMsg(err?.message || "Login failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSuccess = async (resp) => {
    try {
      const credential = resp?.credential;
      if (!credential) {
        setMsg("Google didn’t return a credential");
        return;
      }
      setMsg("");
      setRedirecting(true);
      await apiGoogleLogin(credential); // posts to /api/auth/google
      await refresh(); // confirm session
      redirectAfterLogin();
    } catch (err) {
      console.error(err);
      setRedirecting(false);
      setMsg(err?.message || "Google sign-in failed");
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
      router.refresh();
    } catch (e) {
      console.error(e);
    }
  };

  // hide UI while checking or redirecting to avoid flash
  if (checking || redirecting) return null;

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
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                <button
                  className="btn-primary"
                  type="submit"
                  disabled={submitting}
                >
                  {submitting ? "Signing in..." : "Sign in"}
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
      </div>
    </main>
  );
}

export default Login;

// 👇 Server-side guard to skip login if already authenticated
export async function getServerSideProps({ req }) {
  const base = process.env.NEXT_PUBLIC_APP_URL || `http://${req.headers.host}`;
  const r = await fetch(`${base}/api/auth/me`, {
    headers: { cookie: req.headers.cookie ?? "" },
  });
  const { user } = await r.json();
  if (user) {
    return { redirect: { destination: "/dashboard", permanent: false } };
  }
  return { props: {} };
}
