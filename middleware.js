// middleware.js
import { NextResponse } from "next/server";

const TOKEN_COOKIE = "speexify.sid"; // ← align with express-session cookie name
const PRIVATE_ROUTES = ["/dashboard", "/calendar", "/settings", "/admin"];
const AUTH_PAGES = ["/login", "/register"];

function isPrivate(pathname) {
  return PRIVATE_ROUTES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}
function isAuthPage(pathname) {
  return AUTH_PAGES.includes(pathname);
}

export function middleware(req) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(TOKEN_COOKIE)?.value ?? null;
  const authed = Boolean(token);

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/assets") ||
    pathname.match(/\.(png|jpe?g|gif|svg|ico|webp|avif|css|js|map)$/)
  ) {
    return NextResponse.next();
  }

  if (isPrivate(pathname) && !authed) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (isAuthPage(pathname) && authed) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/register",
    "/dashboard/:path*",
    "/calendar/:path*",
    "/settings/:path*",
    "/admin/:path*",
  ],
};
