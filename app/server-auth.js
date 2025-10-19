// app/server-auth.js
import { cookies } from "next/headers";

/**
 * Optional direct backend base (bypasses Next.js rewrites)
 * - Leave unset to use relative /api/* calls that go through Next rewrites.
 * - Set BACKEND_API_BASE to talk directly to the backend (server-to-server).
 */
const DIRECT_BASE = process.env.BACKEND_API_BASE
  ? process.env.BACKEND_API_BASE.replace(/\/+$/, "")
  : "";

/**
 * Helper to build the absolute or relative API URL
 * @param {string} path like "/api/auth/me"
 */
function apiUrl(path) {
  if (!path.startsWith("/")) path = `/${path}`;
  return DIRECT_BASE ? `${DIRECT_BASE}${path}` : `/api${path}`;
}

/**
 * Fetch the current authenticated user from the backend.
 * Runs only on the server during SSR (never in the browser).
 *
 * @returns {Promise<Object|null>} The user object or null if not authenticated.
 */
export async function getServerUser() {
  try {
    const cookieHeader = cookies().toString();

    const res = await fetch(apiUrl("/api/auth/me"), {
      headers: {
        cookie: cookieHeader,
      },
      cache: "no-store", // Always fetch fresh session state
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      // 401/403 means not logged in — treat as null, don’t throw
      if (res.status === 401 || res.status === 403) return null;
      throw new Error(`Unexpected response ${res.status}`);
    }

    const data = await res.json();
    return data?.user ?? null;
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.warn("[getServerUser] failed:", err?.message || err);
    }
    return null;
  }
}
