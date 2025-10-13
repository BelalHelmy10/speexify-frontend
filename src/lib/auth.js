// src/lib/auth.js
import api from "./api";

/**
 * Fetch current authenticated user
 * Uses cookies for auth via axios defaults (withCredentials: true)
 */
export async function me() {
  const { data } = await api.get("/api/auth/me");
  return data;
}

/**
 * Email/password login
 * @param {Object} payload { email, password }
 */
export async function login(payload) {
  const { data } = await api.post("/api/auth/login", payload);
  return data;
}

/**
 * Google login / OAuth
 * @param {string} credential - JWT credential from Google
 */
export async function googleLogin(credential) {
  const { data } = await api.post("/api/auth/google", { credential });
  return data;
}

/**
 * Logout user and clear cookies/session
 */
export async function logout() {
  const { data } = await api.post("/api/auth/logout");
  return data;
}

/**
 * Begin registration (send verification code)
 * @param {string} email
 */
export async function registerStart(email) {
  const { data } = await api.post("/api/auth/register/start", { email });
  return data;
}

/**
 * Complete registration (verify code + create account)
 * @param {Object} payload { email, code, password, name }
 */
export async function registerComplete(payload) {
  const { data } = await api.post("/api/auth/register/complete", payload);
  return data;
}
