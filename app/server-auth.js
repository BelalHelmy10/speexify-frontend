// src/lib/server.auth.js
// Server-only helper to read the current user
import { cookies } from "next/headers";

/**
 * Decide how to reach the backend:
 * - Default: use the Next.js rewrite (/api/...) to keep same-origin + cookies.
 * - Fallback: if BACKEND_API_BASE is set (and you prefer direct), use it.
 */
const DIRECT_BASE =
  (process.env.BACKEND_API_BASE &&
    process.env.BACKEND_API_BASE.replace(/\/+$/, "")) ||
  ""; // empty means "use rewrite"

/** Build the URL to call */
function apiUrl(path) {
  if (!path.startsWith("/")) path = `/${path}`;
  return DIRECT_BASE ? `${DIRECT_BASE}${path}` : `/api${path}`;
}

export async function getServerUser() {
  try {
    // Forward the user's cookies from the incoming request
    const cookieHeader = cookies().toString();

    const res = await fetch(apiUrl("/api/auth/me"), {
      // When using a relative URL, Next will call the same host; cookie header is enough.
      // When using DIRECT_BASE, this is server→server; CORS doesn't apply.
      headers: { cookie: cookieHeader },
      // Avoid caching; we want the live session state
      cache: "no-store",
    });

    if (!res.ok) return null;

    const data = await res.json();
    return data?.user || null;
  } catch (e) {
    // Optional: log in dev
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.warn("[getServerUser] failed:", e?.message || e);
    }
    return null;
  }
}
