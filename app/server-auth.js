// app/server-auth.js
import { cookies } from "next/headers";

/**
 * Optional: talk directly to the backend (server-to-server).
 * Leave unset to use Next.js rewrites at /api/*.
 *
 * Example BACKEND_API_BASE: "https://api.speexify.com"
 */
const DIRECT_BASE = process.env.BACKEND_API_BASE
  ? process.env.BACKEND_API_BASE.replace(/\/+$/, "")
  : "";

/**
 * Build a correct backend URL.
 * Pass paths WITHOUT the leading "/api" (e.g. "/auth/me").
 * - When DIRECT_BASE is set: https://api.../api/<path>
 * - Otherwise (rewrites):   /api/<path>
 */
function apiUrl(path) {
  if (!path.startsWith("/")) path = `/${path}`;
  return DIRECT_BASE ? `${DIRECT_BASE}/api${path}` : `/api${path}`;
}

/**
 * SSR: fetch the current user using the incoming request cookies.
 * Returns null if unauthenticated.
 */
export async function getServerUser() {
  try {
    const cookieHeader = cookies().toString();

    const res = await fetch(apiUrl("/auth/me"), {
      headers: { cookie: cookieHeader },
      cache: "no-store",
      next: { revalidate: 0 },
    });

    if (!res.ok) {
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
