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

function createNonce() {
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function createSecurityContext() {
  const nonce = createNonce();
  const websocketBase = apiBase
    .replace(/^http:/, "ws:")
    .replace(/^https:/, "wss:");

  return {
    nonce,
    contentSecurityPolicy: [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'self'",
      "form-action 'self'",
      `script-src 'self' 'nonce-${nonce}' https://accounts.google.com https://apis.google.com https://www.googletagmanager.com https://meet.speexify.com`,
      "script-src-attr 'none'",
      `style-src 'self' 'nonce-${nonce}' https://fonts.googleapis.com https://accounts.google.com`,
      // React uses dynamic style attributes for calendar geometry and progress
      // indicators. Inline scripts remain nonce-only; this directive is CSS-only.
      "style-src-attr 'unsafe-inline'",
      "font-src 'self' data: https://fonts.gstatic.com",
      "img-src 'self' data: blob: https:",
      "media-src 'self' data: blob: https:",
      "frame-src 'self' https://accounts.google.com https://www.google.com https://maps.google.com https://meet.jit.si https://*.jit.si https://meet.speexify.com https://accept.paymob.com https://www.youtube.com https://www.youtube-nocookie.com https://youtube.com https://docs.google.com https://drive.google.com",
      `connect-src 'self' ${apiBase} ${websocketBase} ws://localhost:5050 wss://localhost:5050 https://ipapi.co https://accounts.google.com https://*.sentry.io https://cdn.sanity.io https://*.sanity.io https://meet.speexify.com https://*.jit.si`,
      "worker-src 'self' blob:",
    ].join("; "),
  };
}

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

function withCommonHeaders(response, securityContext) {
  response.headers.set(
    "Cross-Origin-Opener-Policy",
    "same-origin-allow-popups"
  );
  response.headers.set(
    "Content-Security-Policy",
    securityContext.contentSecurityPolicy
  );
  return response;
}

function allowThrough(req, isArabic, authState = null, securityContext) {
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-speexify-locale", isArabic ? "ar" : "en");
  requestHeaders.set("x-nonce", securityContext.nonce);
  requestHeaders.delete("x-speexify-auth-state");
  if (authState) requestHeaders.set("x-speexify-auth-state", authState);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  if (authState) response.headers.set("x-speexify-auth-state", authState);
  return withCommonHeaders(response, securityContext);
}

export async function proxy(req) {
  const url = req.nextUrl.clone();
  const pathname = url.pathname;
  const searchParams = url.searchParams;
  const securityContext = createSecurityContext();

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
      }),
      securityContext
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
    return allowThrough(req, isArabic, AUTH_STATE.UNAVAILABLE, securityContext);
  }

  // Not logged in + private route -> redirect to login with ?next=...
  if (!isAuthed && onPrivatePage) {
    const dest = buildLoginRedirect(req.url, {pathname, searchParams, isArabic});
    return withCommonHeaders(NextResponse.redirect(dest), securityContext);
  }

  if (isAuthed && onAdminPage && sessionUser?.role !== "admin") {
    const dashboardPath = isArabic ? "/ar/dashboard" : "/dashboard";
    return withCommonHeaders(
      NextResponse.redirect(new URL(dashboardPath, req.url)),
      securityContext
    );
  }

  // Otherwise allow through.
  return allowThrough(req, isArabic, null, securityContext);
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest).*)",
  ],
};
