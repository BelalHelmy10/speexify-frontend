"use client";

import useAuth from "../hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function RequireRole({
  role,
  children,
  redirect = "/dashboard",
}) {
  const { user, checking } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (checking) return;
    if (!user) {
      // not signed in? treat like RequireAuth
      const next =
        typeof window !== "undefined" ? window.location.pathname : "/";
      router.replace(`/login?next=${encodeURIComponent(next)}`);
      return;
    }
    // no role or role mismatch -> bounce
    if (
      !user.role ||
      (Array.isArray(role) ? !role.includes(user.role) : user.role !== role)
    ) {
      router.replace(redirect);
    }
  }, [checking, user, role, redirect, router]);

  // Gate rendering until we know
  if (checking || !user) {
    return (
      <div style={{ padding: 48, textAlign: "center" }}>
        Checking your access…
      </div>
    );
  }
  if (Array.isArray(role) ? !role.includes(user.role) : user.role !== role) {
    return null; // we already redirected
  }

  return children;
}
