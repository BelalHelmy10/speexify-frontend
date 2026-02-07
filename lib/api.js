// src/lib/api.js
import axios from "axios";

/**
 * Base URL strategy
 * - Default (recommended): go through Next.js rewrites at /api (no CORS hassle)
 * - Optional: talk directly to the backend when
 *   NEXT_PUBLIC_DIRECT_BACKEND=1 and NEXT_PUBLIC_API_URL is set.
 */
const DIRECT = process.env.NEXT_PUBLIC_DIRECT_BACKEND === "1";
const PUBLIC_URL = process.env.NEXT_PUBLIC_API_URL;

let baseURL = "/api";
if (DIRECT && PUBLIC_URL) {
  // Normalize (remove trailing slash) and ensure /api is included once
  baseURL = PUBLIC_URL.replace(/\/+$/, "") + "/api";
}

/**
 * Axios instance
 */
const api = axios.create({
  baseURL,
  withCredentials: true, // send/receive session cookies
  timeout: 15000,
  headers: { Accept: "application/json" },
});

// ---------------------------------------------------------------------------
// CSRF token support
// - Backend stores CSRF secret in the session.
// - We fetch a token once from GET /api/csrf-token and send it on
//   POST/PUT/PATCH/DELETE as csrf-token header.
// ---------------------------------------------------------------------------
let csrfToken = null;

const csrfClient = axios.create({
  baseURL,
  withCredentials: true,
  timeout: 10000,
  headers: { Accept: "application/json" },
});

/**
 * Clear the cached CSRF token.
 * Call this after session-changing operations (login, logout, impersonate).
 */
export function clearCsrfToken() {
  csrfToken = null;
}

/**
 * Fetch CSRF token from backend (caches unless forceRefresh=true)
 */
async function ensureCsrfToken(forceRefresh = false) {
  if (csrfToken && !forceRefresh) return csrfToken;
  try {
    const res = await csrfClient.get("/csrf-token", {
      headers: { "Cache-Control": "no-store" },
    });
    csrfToken = res.data?.csrfToken || null;
    return csrfToken;
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Failed to fetch CSRF token", err);
    }
    return null;
  }
}

// ---------------------------------------------------------------------------
// Routes that should skip CSRF token attachment on the frontend
// (these are excluded on the backend anyway)
// ---------------------------------------------------------------------------
const CSRF_SKIP_PATTERNS = [
  /\/auth\/login/,
  /\/auth\/logout/,
  /\/auth\/register/,
  /\/auth\/google/,
  /\/auth\/password/,
  /\/payments\/webhook/,
];

function shouldSkipCsrf(url) {
  return CSRF_SKIP_PATTERNS.some((pattern) => pattern.test(url));
}

/**
 * Request interceptor
 * - Collapses duplicate slashes
 * - Normalizes leading slash
 * - If caller accidentally puts `/api/...`, strip ONE `/api` because baseURL already has it.
 * - Sets JSON Content-Type for plain objects.
 * - Attaches CSRF token to mutating requests (unless route is excluded).
 */
api.interceptors.request.use(async (config) => {
  if (typeof config.url === "string") {
    // collapse duplicate slashes (not after http:)
    config.url = config.url.replace(/([^:]\/)\/+/g, "$1");

    // normalize to a single leading slash for relative paths
    if (!/^https?:\/\//i.test(config.url)) {
      config.url = "/" + config.url.replace(/^\/+/, "");
    }

    // If baseURL ends with /api and url starts with /api, drop one /api
    if (/\/api$/.test(baseURL)) {
      config.url = config.url.replace(/^\/api(\/|$)/, "/");
    }
  }

  const isJSONPayload =
    config.data &&
    typeof config.data === "object" &&
    !(config.data instanceof FormData);

  if (isJSONPayload) {
    config.headers = config.headers || {};
    config.headers["Content-Type"] = "application/json";
  }

  // Attach CSRF token to mutating requests
  const method = (config.method || "get").toLowerCase();
  const needsCsrf = ["post", "put", "patch", "delete"].includes(method);
  const fullUrl = config.url || "";

  // Skip CSRF for excluded routes
  if (needsCsrf && !shouldSkipCsrf(fullUrl)) {
    config.headers = config.headers || {};

    // allow manual override if caller already set one
    if (!config.headers["csrf-token"]) {
      const token = await ensureCsrfToken();
      if (token) {
        config.headers["csrf-token"] = token;
      }
    }
  }

  return config;
});

/**
 * Response interceptor
 * - Handles CSRF token errors with automatic retry
 * - Logs errors in development
 */
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalRequest = err.config;

    // If CSRF token is invalid and we haven't retried yet, refresh token and retry
    if (
      err?.response?.status === 403 &&
      err?.response?.data?.error === "Invalid CSRF token" &&
      !originalRequest._csrfRetry
    ) {
      originalRequest._csrfRetry = true;

      // Clear cached token and fetch a fresh one
      csrfToken = null;
      const newToken = await ensureCsrfToken(true);

      if (newToken) {
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers["csrf-token"] = newToken;
        return api(originalRequest);
      }
    }

    if (process.env.NODE_ENV !== "production") {
      console.error(
        "[API error]",
        err?.response?.status ?? "(no status)",
        err?.response?.data || err?.message
      );
    }

    return Promise.reject(err);
  }
);

/* -------------------------------------------------------------------------- */
/*                               Helper Methods                               */
/* -------------------------------------------------------------------------- */

export async function postGoogleLogin(credential) {
  // final path becomes:
  // - proxy mode:     /api/auth/google
  // - direct mode:    <PUBLIC_URL>/api/auth/google
  const result = await api.post("/auth/google", { credential });
  // Clear CSRF token after login since session changed
  clearCsrfToken();
  return result;
}

export async function getMe() {
  // do NOT prefix with /api here; interceptor keeps it correct
  const res = await api.get("/auth/me", {
    params: { t: Date.now() },
    headers: { "Cache-Control": "no-store" },
  });
  return res.data;
}

export async function apiGet(path, params = {}) {
  const res = await api.get(path, {
    params: { ...params, t: Date.now() },
    headers: { "Cache-Control": "no-store" },
  });
  return res.data;
}

export default api;
