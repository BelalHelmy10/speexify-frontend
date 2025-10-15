// app/page.js
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import useAuth from "@/hooks/useAuth";
import Home from "@/legacy/pages/Home";

export default function Page() {
  const { user, checking } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!checking && user) {
      router.replace("/dashboard");
    }
  }, [checking, user, router]);

  if (checking) return <div className="route-loading">Loading…</div>;
  if (user) return null;

  return <Home />;
}
