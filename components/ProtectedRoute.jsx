// src/components/ProtectedRoute.jsx
"use client";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import useAuth from "../hooks/useAuth";

export default function ProtectedRoute({ role, children }) {
  const { user, checking } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (checking) return;
    if (!user) {
      const next = encodeURIComponent(pathname);
      router.replace(`/login?next=${next}`);
      return;
    }
    if (role && user.role !== role) {
      router.replace("/dashboard");
    }
  }, [checking, user, role, router, pathname]);

  if (checking) return <div className="route-loading">Loading…</div>;
  if (!user) return null;
  if (role && user.role !== role) return null;

  return children;
}
