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
  const { timeoutMs, ...rest } = options;

  // Optional hard timeout so server rendering can't hang on a slow/cold backend.
  let signal = rest.signal;
  let timer = null;
  if (timeoutMs && !signal) {
    const controller = new AbortController();
    signal = controller.signal;
    timer = setTimeout(() => controller.abort(), timeoutMs);
  }

  try {
    return await fetch(backendApiPath(path), {
      ...rest,
      signal,
      headers: {
        cookie: cookieHeader,
        "cache-control": "no-store, no-cache, must-revalidate",
        pragma: "no-cache",
        ...(rest.headers || {}),
      },
      cache: "no-store",
      next: { revalidate: 0 },
    });
  } finally {
    if (timer) clearTimeout(timer);
  }
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

export async function getServerUser(options = {}) {
  try {
    const res = await fetchServerApi("auth/me", {
      method: "GET",
      ...options,
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
