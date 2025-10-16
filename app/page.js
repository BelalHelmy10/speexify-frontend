// app/page.js
"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import useAuth from "@/hooks/useAuth";
import Home from "@/legacy/pages/Home";

export default function Page() {
  const { user, checking } = useAuth();
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    if (checking) return;
    if (user) router.replace(params.get("next") || "/dashboard");
  }, [checking, user, router, params]);

  if (checking) return <div className="route-loading">Loading…</div>;
  if (user) return null;
  return <Home />;
}
