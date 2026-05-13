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

export function backendApiPath(path) {
  const p = path.startsWith("/") ? path.slice(1) : path;
  if (BASE) return `${BASE}/api/${p}`;
  return `/api/${p}`;
}

export async function getServerCookieHeader() {
  const cookieStore = await cookies();
  return cookieStore
    .getAll()
    .map(({ name, value }) => `${name}=${value}`)
    .join("; ");
}

export async function fetchServerApi(path, options = {}) {
  const cookieHeader = await getServerCookieHeader();

  return fetch(backendApiPath(path), {
    ...options,
    headers: {
      cookie: cookieHeader,
      "cache-control": "no-store, no-cache, must-revalidate",
      pragma: "no-cache",
      ...(options.headers || {}),
    },
    cache: "no-store",
    next: { revalidate: 0 },
  });
}

export async function getServerApiJson(path, options = {}) {
  const res = await fetchServerApi(path, options);
  let data = null;

  try {
    data = await res.json();
  } catch {
    data = null;
  }

  return {
    ok: res.ok,
    status: res.status,
    data,
  };
}

export async function getServerUser() {
  try {
    const res = await fetchServerApi("auth/me", {
      method: "GET",
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
