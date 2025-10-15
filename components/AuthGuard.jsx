// src/components/AuthGuard.jsx
"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import useAuth from "../hooks/useAuth";

/**
 * AuthGuard
 * - Waits for auth to resolve (checking === true).
 * - If no user → redirects to /login?next=<current-url>.
 * - If role is provided, requires user.role === role.
 */
export default function AuthGuard({ children, role }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, checking } = useAuth();

  useEffect(() => {
    if (checking) return;

    // Build a 'next' param that includes any search/hash parts.
    const nextUrl =
      typeof window !== "undefined"
        ? window.location.pathname +
          window.location.search +
          window.location.hash
        : pathname || "/";

    // Prevent redirect loops if we're already on /login
    const isLoginRoute = pathname === "/login";

    if (!user && !isLoginRoute) {
      router.replace(`/login?next=${encodeURIComponent(nextUrl)}`);
      return;
    }

    if (user && role && user.role !== role) {
      // Avoid looping if already on dashboard
      if (pathname !== "/dashboard") {
        router.replace("/dashboard");
      }
    }
  }, [checking, user, role, pathname, router]);

  // Render states
  if (checking) return <div className="route-loading">Checking…</div>;
  if (!user) return null; // redirect in-flight
  if (role && user.role !== role) return null;

  return children;
}
