// src/lib/api.js
import axios from "axios";

/**
 * Base URL strategy
 * - Default: go through Next.js rewrites at /api to avoid CORS
 * - Optional: talk directly to the backend when
 *   NEXT_PUBLIC_DIRECT_BACKEND=1 and NEXT_PUBLIC_API_URL is set.
 */
let baseURL = "/api";

if (
  process.env.NEXT_PUBLIC_DIRECT_BACKEND === "1" &&
  process.env.NEXT_PUBLIC_API_URL
) {
  // Normalize (remove trailing slash)
  baseURL = process.env.NEXT_PUBLIC_API_URL.replace(/\/+$/, "");
}

/**
 * Axios instance
 * - withCredentials: keep cookies for session-based auth
 * - timeout: prevent hanging requests
 * - common headers: JSON friendly defaults
 */
const api = axios.create({
  baseURL,
  withCredentials: true,
  timeout: 15000,
  headers: {
    Accept: "application/json",
  },
});

/**
 * Request interceptor
 * - Ensures no accidental double slashes after baseURL
 * - Keeps Content-Type consistent for JSON bodies
 */
api.interceptors.request.use((config) => {
  // Normalize URL path (avoid "//" when joining baseURL + url)
  if (typeof config.url === "string") {
    config.url = config.url.replace(/([^:]\/)\/+/g, "$1");
  }

  // Only set JSON content-type when sending a plain object
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
 * Response interceptor (dev only)
 * - Logs concise error details to console without altering the promise chain
 */
if (process.env.NODE_ENV !== "production") {
  api.interceptors.response.use(
    (res) => res,
    (err) => {
      // eslint-disable-next-line no-console
      console.error(
        "[API error]",
        err?.response?.status ?? "(no status)",
        err?.response?.data || err?.message
      );
      return Promise.reject(err);
    }
  );
}

export default api;
