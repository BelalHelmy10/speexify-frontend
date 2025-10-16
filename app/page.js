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
    if (user) {
      const next = params.get("next") || "/dashboard";
      router.replace(next);
    }
  }, [checking, user, router, params]);

  if (checking) {
    return (
      <div className="route-loading flex items-center justify-center min-h-[60vh] text-gray-600">
        Loading…
      </div>
    );
  }

  // If logged in, redirect is in flight
  if (user) return null;

  // Not logged in → show marketing / landing page
  return <Home />;
}
