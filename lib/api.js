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

/**
 * Request interceptor
 * - Collapses duplicate slashes
 * - Normalizes leading slash
 * - If caller accidentally puts `/api/...`, strip ONE `/api` because baseURL already has it.
 * - Sets JSON Content-Type for plain objects.
 */
api.interceptors.request.use((config) => {
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
    config.headers["Content-Type"] = "application/json";
  }

  return config;
});

/**
 * Response interceptor (dev only): log concise errors
 */
if (process.env.NODE_ENV !== "production") {
  api.interceptors.response.use(
    (res) => res,
    (err) => {
      console.error(
        "[API error]",
        err?.response?.status ?? "(no status)",
        err?.response?.data || err?.message
      );
      return Promise.reject(err);
    }
  );
}

/* -------------------------------------------------------------------------- */
/*                               Helper Methods                               */
/* -------------------------------------------------------------------------- */

export async function postGoogleLogin(credential) {
  // final path becomes:
  // - proxy mode:     /api/auth/google
  // - direct mode:    <PUBLIC_URL>/api/auth/google
  return api.post("/auth/google", { credential });
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
