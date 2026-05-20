// middleware.js
import { NextResponse } from "next/server";

const TOKEN_COOKIE = "speexify.sid"; // session cookie name

// Any route in here requires an authenticated session
const PRIVATE_ROUTES = [
  "/dashboard",
  "/calendar",
  "/settings",
  "/admin",
  "/classroom",
  "/resources",
  "/assessment",
  "/onboarding",
  "/manual-payment",

  // ✅ new protected routes
  "/checkout",
  "/payment", // protect ALL /payment/*, including /payment/success
  "/profile",
];

const AUTH_ENTRY_ROUTES = ["/", "/login", "/register"];

function isPrivate(pathname) {
  return PRIVATE_ROUTES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

function isAuthEntry(pathname) {
  return AUTH_ENTRY_ROUTES.includes(pathname);
}

function getSafeNextPath(rawNext, fallbackPath) {
  if (!rawNext) return fallbackPath;

  const candidates = [rawNext];
  try {
    candidates.unshift(decodeURIComponent(rawNext));
  } catch {
    // URLSearchParams usually decodes already. Keep the raw candidate.
  }

  for (const candidate of candidates) {
    if (!candidate || !candidate.startsWith("/") || candidate.startsWith("//")) {
      continue;
    }

    let candidateUrl;
    try {
      candidateUrl = new URL(candidate, "https://speexify.local");
    } catch {
      continue;
    }

    const basePath = candidateUrl.pathname.replace(/^\/ar(?:\/|$)/, "/");

    if (basePath === "/") continue;
    return `${candidateUrl.pathname}${candidateUrl.search}${candidateUrl.hash}`;
  }

  return fallbackPath;
}

function withCommonHeaders(response) {
  response.headers.set(
    "Cross-Origin-Opener-Policy",
    "same-origin-allow-popups"
  );
  return response;
}

export function middleware(req) {
  const url = req.nextUrl.clone();
  const pathname = url.pathname;
  const searchParams = url.searchParams;

  const isArabic = pathname === "/ar" || pathname.startsWith("/ar/");
  // Normalize to EN-style base path ("/dashboard", "/login", etc.)
  const basePath = isArabic ? pathname.replace(/^\/ar/, "") || "/" : pathname;

  const token = req.cookies.get(TOKEN_COOKIE)?.value;
  const isAuthed = !!token;

  const onPrivatePage = isPrivate(basePath);

  // Logged-in users should never see the public home/login shell first.
  // Redirect before React renders so the nav does not flash in logged-out mode.
  if (isAuthed && isAuthEntry(basePath)) {
    const dashboardPath = isArabic ? "/ar/dashboard" : "/dashboard";
    const targetPath = getSafeNextPath(searchParams.get("next"), dashboardPath);
    return withCommonHeaders(
      NextResponse.redirect(new URL(targetPath, req.url))
    );
  }

  // Not logged in + private route -> redirect to login with ?next=...
  if (!isAuthed && onPrivatePage) {
    const loginPath = isArabic ? "/ar/login" : "/login";
    const dest = url.clone();

    dest.pathname = loginPath;
    dest.search = "";

    const originalPathWithQuery =
      pathname + (searchParams.toString() ? `?${searchParams.toString()}` : "");

    dest.searchParams.set("next", originalPathWithQuery);

    return withCommonHeaders(NextResponse.redirect(dest));
  }

  // Otherwise allow through
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-speexify-locale", isArabic ? "ar" : "en");

  return withCommonHeaders(
    NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  );
}

export const config = {
  matcher: [
    "/", // home
    "/login",
    "/register",
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
