// web/middleware.ts
import { NextRequest, NextResponse } from "next/server";

// const API =
//   process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "") ||
//   "http://localhost:5050";

// Use the same host as the incoming request (so cookies are included)
const ORIGIN = req.nextUrl.origin;

// routes we protect (must be logged in)
const PRIVATE_ROUTES = ["/dashboard", "/calendar", "/settings", "/admin"];

// routes where logged-in users shouldn’t be (send to dashboard)
const AUTH_PAGES = ["/login", "/register"];

export async function middleware(req) {
  const { pathname } = req.nextUrl;

  // call your backend to check the session using incoming cookies
  let authed = false;
  let isAdmin = false;

  try {
    const res = await fetch(`${ORIGIN}/api/auth/me`, {
      headers: {
        cookie: req.headers.get("cookie") || "",
      },
      // next: { revalidate: 0 } // (optional) don’t cache
    });

    if (res.ok) {
      const { user } = await res.json();
      authed = !!user;
      isAdmin = user?.role === "admin";
    }
  } catch {
    // network/500s → treat as unauthenticated
  }

  // 1) redirect logged-in users away from auth pages
  if (authed && AUTH_PAGES.includes(pathname)) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // 2) protect private routes
  if (!authed && PRIVATE_ROUTES.some((p) => pathname.startsWith(p))) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    // optional: send them back after login
    url.searchParams.set("next", pathname + req.nextUrl.search);
    return NextResponse.redirect(url);
  }

  // 3) extra check for admin
  if (pathname.startsWith("/admin") && authed && !isAdmin) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // 4) (optional) home → dashboard if logged in
  if (authed && pathname === "/") {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // run only where we need it
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
