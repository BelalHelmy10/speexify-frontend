// proxy.js
import { NextResponse } from "next/server";
import { AUTH_STATE, buildLoginRedirect, fetchSessionUser } from "@/lib/proxy-auth.mjs";

const TOKEN_COOKIE = "speexify.sid"; // session cookie name
const AUTH_CHECK_TIMEOUT_MS = 2500;
const VALID_MEMBER_STORY_SLUGS = new Set(["sara", "ahmed", "yara"]);
const rawApiBase =
  process.env.BACKEND_API_BASE ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5050";
const apiBase = rawApiBase.replace(/\/+$/, "").replace(/\/api$/, "");

// Any route in here requires an authenticated session
const PRIVATE_ROUTES = [
  "/dashboard",
  "/calendar",
  "/settings",
  "/admin",
  "/classroom",
  "/resources",
  "/onboarding",
  "/manual-payment",

  // ✅ new protected routes
  "/checkout",
  "/payment", // protect ALL /payment/*, including /payment/success
  "/profile",
];

function isPrivate(pathname) {
  return PRIVATE_ROUTES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

function isAdminRoute(pathname) {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

function getInvalidMemberStorySlug(pathname) {
  const match = pathname.match(/^\/member-stories\/([^/]+)$/);
  if (!match) return null;

  let slug = match[1];
  try {
    slug = decodeURIComponent(slug);
  } catch {
    return match[1];
  }

  return VALID_MEMBER_STORY_SLUGS.has(slug) ? null : slug;
}

function withCommonHeaders(response) {
  response.headers.set(
    "Cross-Origin-Opener-Policy",
    "same-origin-allow-popups"
  );
  return response;
}

function allowThrough(req, isArabic, authState = null) {
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-speexify-locale", isArabic ? "ar" : "en");
  requestHeaders.delete("x-speexify-auth-state");
  if (authState) requestHeaders.set("x-speexify-auth-state", authState);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  if (authState) response.headers.set("x-speexify-auth-state", authState);
  return withCommonHeaders(response);
}

export async function proxy(req) {
  const url = req.nextUrl.clone();
  const pathname = url.pathname;
  const searchParams = url.searchParams;

  const isArabic = pathname === "/ar" || pathname.startsWith("/ar/");
  // Normalize to EN-style base path ("/dashboard", "/login", etc.)
  const basePath = isArabic ? pathname.replace(/^\/ar/, "") || "/" : pathname;
  const invalidMemberStorySlug = getInvalidMemberStorySlug(basePath);

  if (invalidMemberStorySlug) {
    return withCommonHeaders(
      new NextResponse("Page not found", {
        status: 404,
        headers: {
          "content-type": "text/plain; charset=utf-8",
        },
      })
    );
  }

  const token = req.cookies.get(TOKEN_COOKIE)?.value;
  const onPrivatePage = isPrivate(basePath);
  const onAdminPage = isAdminRoute(basePath);
  const needsAuthState = Boolean(token) && onPrivatePage;
  const authResult = onPrivatePage
    ? needsAuthState
      ? await fetchSessionUser({
        cookieHeader: req.headers.get("cookie"),
        apiBase,
        timeoutMs: AUTH_CHECK_TIMEOUT_MS,
      })
      : {state: AUTH_STATE.UNAUTHENTICATED, user: null}
    : {state: null, user: null};
  const sessionUser = authResult.user;
  const isAuthed = authResult.state === AUTH_STATE.AUTHENTICATED;

  // A timeout, network error, malformed response, or 5xx does not prove that
  // the session is invalid. Let the page render so AuthProvider can retry and
  // show its recoverable service-unavailable state instead of redirecting.
  if (onPrivatePage && authResult.state === AUTH_STATE.UNAVAILABLE) {
    return allowThrough(req, isArabic, AUTH_STATE.UNAVAILABLE);
  }

  // Not logged in + private route -> redirect to login with ?next=...
  if (!isAuthed && onPrivatePage) {
    const dest = buildLoginRedirect(req.url, {pathname, searchParams, isArabic});
    return withCommonHeaders(NextResponse.redirect(dest));
  }

  if (isAuthed && onAdminPage && sessionUser?.role !== "admin") {
    const dashboardPath = isArabic ? "/ar/dashboard" : "/dashboard";
    return withCommonHeaders(
      NextResponse.redirect(new URL(dashboardPath, req.url))
    );
  }

  // Otherwise allow through.
  return allowThrough(req, isArabic);
}

export const config = {
  matcher: [
    "/", // home
    "/login",
    "/register",
    "/member-stories/:path*",
    "/dashboard/:path*",
    "/calendar/:path*",
    "/settings/:path*",
    "/admin/:path*",
    "/classroom/:path*",
    "/resources/:path*",
    "/assessment/:path*",
    "/onboarding/:path*",
    "/manual-payment/:path*",
    "/checkout/:path*", // ✅ protect checkout
    "/payment/:path*", // ✅ protect /payment/success and friends
    "/profile",
    "/profile/:path*",

    // Arabic equivalents
    "/ar",
    "/ar/:path*",
    "/ar/login",
    "/ar/register",
    "/ar/member-stories/:path*",
    "/ar/dashboard/:path*",
    "/ar/calendar/:path*",
    "/ar/settings/:path*",
    "/ar/admin/:path*",
    "/ar/classroom/:path*",
    "/ar/resources/:path*",
    "/ar/assessment/:path*",
    "/ar/onboarding/:path*",
    "/ar/manual-payment/:path*",
    "/ar/checkout/:path*", // ✅ ar checkout
    "/ar/payment/:path*", // ✅ ar payment/success
    "/ar/profile",
    "/ar/profile/:path*",
  ],
};
