// src/lib/auth.js
import api from "./api";

// Always include cookies for cross-origin sessions
const AUTH_REQUEST_TIMEOUT_MS = 45000;
const opts = { withCredentials: true, timeout: AUTH_REQUEST_TIMEOUT_MS };

/**
 * Unified request helper to normalize errors.
 */
async function request(fn) {
  try {
    const { data } = await fn();
    return data;
  } catch (err) {
    const timedOut =
      err?.code === "ECONNABORTED" ||
      /timeout/i.test(String(err?.message || ""));
    if (timedOut) {
      throw new Error(
        "The server took too long to respond. Please try again in a moment."
      );
    }

    const data = err?.response?.data;
    const msg =
      err?.response?.data?.message ||
      err?.response?.data?.error ||
      err.message ||
      "Unknown error";
    const details =
      process.env.NODE_ENV !== "production" && data?.details
        ? ` (${data.details})`
        : "";
    throw new Error(`${msg}${details}`);
  }
}

/**
 * Fetch the currently authenticated user.
 * @returns {Promise<Object>} user data
 */
export async function me() {
  // baseURL is /api → final URL: /api/auth/me
  return request(() => api.get("/auth/me", opts));
}

/**
 * Login using email and password.
 * @param {{ email: string, password: string }} payload
 * @returns {Promise<Object>} user data + tokens
 */
export async function login(payload) {
  return request(() => api.post("/auth/login", payload, opts));
}

/**
 * Login using Google OAuth credential (JWT).
 * @param {string} credential - Google ID token
 * @returns {Promise<Object>} user data + tokens
 */
export async function googleLogin(credential) {
  // IMPORTANT: send { credential } and NOT wrap with another object in caller
  return request(() => api.post("/auth/google", { credential }, opts));
}

/**
 * Logout the current user (clear cookies / session).
 * @returns {Promise<Object>} logout response
 */
export async function logout() {
  return request(() => api.post("/auth/logout", null, opts));
}

/**
 * Begin registration (send verification code to email).
 * @param {string} email - user's email
 * @returns {Promise<Object>} API response
 */
export async function registerStart(email) {
  return request(() => api.post("/auth/register/start", { email }, opts));
}

/**
 * Complete registration (verify code + create account).
 * @param {{ email: string, code: string, password: string, name: string }} payload
 * @returns {Promise<Object>} user data + tokens
 */
export async function registerComplete(payload) {
  return request(() => api.post("/auth/register/complete", payload, opts));
}
