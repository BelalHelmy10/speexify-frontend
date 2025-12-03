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
  console.warn(
    "[server-auth] BACKEND_API_BASE is not set. Set it to your API origin (e.g. https://api.speexify.com)."
  );
}

function userPath(path) {
  const p = path.startsWith("/") ? path.slice(1) : path;
  if (BASE) return `${BASE}/api/${p}`;
  return `/api/${p}`;
}

export async function getServerUser() {
  try {
    // ✅ await cookies()
    const cookieStore = await cookies();

    // ✅ build a cookie header string explicitly
    const cookieHeader = cookieStore
      .getAll()
      .map(({ name, value }) => `${name}=${value}`)
      .join("; ");

    const res = await fetch(userPath("auth/me"), {
      method: "GET",
      headers: {
        cookie: cookieHeader,
        "cache-control": "no-store, no-cache, must-revalidate",
        pragma: "no-cache",
      },
      cache: "no-store",
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) return null;
      console.warn("[getServerUser] unexpected status:", res.status);
      return null;
    }

    const data = await res.json();
    return data?.user ?? null;
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[getServerUser] failed:", err?.message || err);
    }
    return null;
  }
}
