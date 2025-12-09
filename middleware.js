// middleware.js
import { NextResponse } from "next/server";

const TOKEN_COOKIE = "speexify.sid"; // session cookie name
const PRIVATE_ROUTES = ["/dashboard", "/calendar", "/settings", "/admin"];
const AUTH_PAGES = ["/login", "/register"];

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
  // Normalize to EN-style path ("/dashboard", "/login", etc.)
  const basePath = isArabic ? pathname.replace(/^\/ar/, "") || "/" : pathname;

  const token = req.cookies.get(TOKEN_COOKIE)?.value;
  const isAuthed = !!token;

  const onPrivatePage = isPrivate(basePath);
  // const onAuth = AUTH_PAGES.includes(basePath); // we don't use this anymore here

  // 1) Not logged in → trying to access private page → go to login (locale-aware)
  if (!isAuthed && onPrivatePage) {
    const loginPath = isArabic ? "/ar/login" : "/login";
    const dest = url.clone();

    dest.pathname = loginPath;

    // Build original full path (with query) for "next"
    const originalPathWithQuery =
      pathname + (searchParams.toString() ? `?${searchParams.toString()}` : "");

    dest.searchParams.set("next", encodeURIComponent(originalPathWithQuery));

    return NextResponse.redirect(dest);
  }

  // 2) Otherwise, allow the request through.
  //    Even if there's a cookie but the backend session is dead,
  //    the page itself will see "not authenticated" and handle it.
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

    // Arabic equivalents
    "/ar",
    "/ar/login",
    "/ar/register",
    "/ar/dashboard/:path*",
    "/ar/calendar/:path*",
    "/ar/settings/:path*",
    "/ar/admin/:path*",
  ],
};
