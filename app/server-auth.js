// app/server-auth.js
import { cookies } from "next/headers";

/**
 * BACKEND_API_BASE must be your backend origin, WITHOUT a trailing slash.
 *   Example: https://api.speexify.com
 * If you don’t have a separate API domain, point to the same origin serving your API.
 */
const BASE = process.env.BACKEND_API_BASE
  ? process.env.BACKEND_API_BASE.replace(/\/+$/, "")
  : null;

if (!BASE && process.env.NODE_ENV !== "development") {
  // In production we want an explicit backend base to avoid relying on rewrites in SSR.
  // eslint-disable-next-line no-console
  console.warn(
    "[server-auth] BACKEND_API_BASE is not set. Set it to your API origin (e.g. https://api.speexify.com)."
  );
}

/**
 * Build an absolute backend URL for server-to-server calls.
 * Pass paths WITHOUT the leading /api. Example: userPath("auth/me") -> https://api.../api/auth/me
 */
function userPath(path) {
  const p = path.startsWith("/") ? path.slice(1) : path;
  if (BASE) return `${BASE}/api/${p}`;
  // Fallback for local dev: call through rewrites
  return `/api/${p}`;
}

/**
 * SSR helper: returns the user or null.
 * IMPORTANT: We forward the incoming request cookies so the backend can authenticate the session.
 */
export async function getServerUser() {
  try {
    const cookieHeader = cookies().toString();

    const res = await fetch(userPath("auth/me"), {
      method: "GET",
      headers: {
        cookie: cookieHeader,
        // Prevent proxies/CDNs from caching this auth check
        "cache-control": "no-store, no-cache, must-revalidate",
        pragma: "no-cache",
      },
      // Next.js cache controls
      cache: "no-store",
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) return null;
      // eslint-disable-next-line no-console
      console.warn("[getServerUser] unexpected status:", res.status);
      return null;
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
