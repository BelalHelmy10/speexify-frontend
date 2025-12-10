// middleware.js
import { NextResponse } from "next/server";

const TOKEN_COOKIE = "speexify.sid"; // session cookie name

// Any route in here requires an authenticated session
const PRIVATE_ROUTES = [
  "/dashboard",
  "/calendar",
  "/settings",
  "/admin",

  // ✅ new protected routes
  "/checkout",
  "/payment", // protect ALL /payment/*, including /payment/success
];

function isPrivate(pathname) {
  return PRIVATE_ROUTES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

export function middleware(req) {
  const url = req.nextUrl.clone();
  const pathname = url.pathname;
  const searchParams = url.searchParams;

  const isArabic = pathname.startsWith("/ar/");
  // Normalize to EN-style base path ("/dashboard", "/login", etc.)
  const basePath = isArabic ? pathname.replace(/^\/ar/, "") || "/" : pathname;

  const token = req.cookies.get(TOKEN_COOKIE)?.value;
  const isAuthed = !!token;

  const onPrivatePage = isPrivate(basePath);

  // Not logged in + private route -> redirect to login with ?next=...
  if (!isAuthed && onPrivatePage) {
    const loginPath = isArabic ? "/ar/login" : "/login";
    const dest = url.clone();

    dest.pathname = loginPath;

    const originalPathWithQuery =
      pathname + (searchParams.toString() ? `?${searchParams.toString()}` : "");

    dest.searchParams.set("next", encodeURIComponent(originalPathWithQuery));

    return NextResponse.redirect(dest);
  }

  // Otherwise allow through
  return NextResponse.next();
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
    "/checkout/:path*", // ✅ protect checkout
    "/payment/:path*", // ✅ protect /payment/success and friends

    // Arabic equivalents
    "/ar",
    "/ar/login",
    "/ar/register",
    "/ar/dashboard/:path*",
    "/ar/calendar/:path*",
    "/ar/settings/:path*",
    "/ar/admin/:path*",
    "/ar/checkout/:path*", // ✅ ar checkout
    "/ar/payment/:path*", // ✅ ar payment/success
  ],
};
