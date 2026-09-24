export const AUTH_STATE = {
  AUTHENTICATED: "authenticated",
  UNAUTHENTICATED: "unauthenticated",
  UNAVAILABLE: "unavailable",
};

function unavailable() {
  return {state: AUTH_STATE.UNAVAILABLE, user: null};
}

export async function fetchSessionUser({
  cookieHeader,
  apiBase,
  timeoutMs = 2500,
  fetchImpl = globalThis.fetch,
}) {
  if (!cookieHeader) {
    return {state: AUTH_STATE.UNAUTHENTICATED, user: null};
  }

  const controller = new AbortController();
  let timer;

  try {
    const base = String(apiBase || "").replace(/\/+$/, "").replace(/\/api$/, "");
    const response = await Promise.race([
      Promise.resolve().then(() => fetchImpl(`${base}/api/auth/me`, {
        method: "GET",
        headers: {
          cookie: cookieHeader,
          "cache-control": "no-store",
        },
        cache: "no-store",
        signal: controller.signal,
      })),
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(new Error("Auth check timed out."));
        }, timeoutMs);
      }),
    ]);

    if (response.status === 401 || response.status === 403) {
      return {state: AUTH_STATE.UNAUTHENTICATED, user: null};
    }

    if (!response.ok) return unavailable();

    let data;
    try {
      data = await response.json();
    } catch {
      return unavailable();
    }

    return data?.user
      ? {state: AUTH_STATE.AUTHENTICATED, user: data.user}
      : {state: AUTH_STATE.UNAUTHENTICATED, user: null};
  } catch {
    return unavailable();
  } finally {
    clearTimeout(timer);
  }
}

export function buildLoginRedirect(requestUrl, {pathname, searchParams, isArabic}) {
  const destination = new URL(requestUrl);
  destination.pathname = isArabic ? "/ar/login" : "/login";
  destination.search = "";

  const query = searchParams?.toString?.() || "";
  const originalPathWithQuery = pathname + (query ? `?${query}` : "");
  destination.searchParams.set("next", originalPathWithQuery);
  return destination;
}
