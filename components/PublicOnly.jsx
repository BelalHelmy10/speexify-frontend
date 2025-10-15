"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import useAuth from "@/hooks/useAuth";

export default function PublicOnly({ children }) {
  const { user, checking } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!checking && user) {
      router.replace("/dashboard");
    }
  }, [checking, user, router]);

  if (checking) return <div className="route-loading">Loading…</div>;
  if (user) return null;
  return children;
}
