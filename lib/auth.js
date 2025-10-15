// src/lib/auth.js
import api from "./api";

// Always include cookies (needed for session on a different origin)
const opts = { withCredentials: true };

/**
 * Fetch current authenticated user
 * Uses cookies for auth via axios defaults (withCredentials: true)
 */
export async function me() {
  const { data } = await api.get("/api/auth/me", opts);
  return data;
}

/**
 * Email/password login
 * @param {Object} payload { email, password }
 */
export async function login(payload) {
  const { data } = await api.post("/api/auth/login", payload, opts);
  return data;
}

/**
 * Google login / OAuth
 * @param {string} credential - JWT credential from Google
 */
export async function googleLogin(credential) {
  const { data } = await api.post("/api/auth/google", { credential }, opts);
  return data;
}

/**
 * Logout user and clear cookies/session
 */
export async function logout() {
  const { data } = await api.post("/api/auth/logout", null, opts);
  return data;
}

/**
 * Begin registration (send verification code)
 * @param {string} email
 */
export async function registerStart(email) {
  const { data } = await api.post("/api/auth/register/start", { email }, opts);
  return data;
}

/**
 * Complete registration (verify code + create account)
 * @param {Object} payload { email, code, password, name }
 */
export async function registerComplete(payload) {
  const { data } = await api.post("/api/auth/register/complete", payload, opts);
  return data;
}
