// middleware.js
import { NextResponse } from "next/server";

// Change this if your cookie name is different
const TOKEN_COOKIE = "token";

// Routes that require auth
const PRIVATE_ROUTES = ["/dashboard", "/calendar", "/settings", "/admin"];

// Routes a logged-in user shouldn't visit
const AUTH_PAGES = ["/login", "/register"];

export async function middleware(req) {
  const { pathname, search } = req.nextUrl;

  // Quick pre-check: skip network call if there's definitely no token
  const token = req.cookies.get(TOKEN_COOKIE)?.value;

  let authed = Boolean(token);
  let isAdmin = false;

  if (token) {
    try {
      // Must read origin inside the function (req exists here)
      const origin = req.nextUrl.origin;

      const res = await fetch(`${origin}/api/auth/me`, {
        headers: {
          cookie: req.headers.get("cookie") || "",
        },
        cache: "no-store",
      });

      if (res.ok) {
        const data = await res.json();
        const user = data?.user;
        authed = !!user;
        isAdmin = user?.role === "admin";
      } else {
        authed = false;
      }
    } catch {
      authed = false;
    }
  }

  // 1) Redirect logged-in users away from auth pages
  if (authed && AUTH_PAGES.includes(pathname)) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // 2) Protect private routes
  if (!authed && PRIVATE_ROUTES.some((p) => pathname.startsWith(p))) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    const redirectTo = pathname + (search || "");
    url.searchParams.set("redirect", redirectTo);
    return NextResponse.redirect(url);
  }

  // 3) Non-admin hitting /admin → bounce to dashboard
  if (pathname.startsWith("/admin") && authed && !isAdmin) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // 4) Optional: authed user landing on "/" → dashboard
  if (authed && pathname === "/") {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// Only run where needed (avoids /_next, /api, static assets)
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
