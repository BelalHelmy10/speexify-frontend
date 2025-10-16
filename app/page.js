// app/page.js
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import useAuth from "@/hooks/useAuth";
import Home from "@/legacy/pages/Home";

// Optional metadata if you want SEO titles even for the root page
export const metadata = {
  title: "Home — Speexify",
  description:
    "Welcome to Speexify — personalized language and communication coaching for teams and professionals.",
};

export default function HomePage() {
  const { user, checking } = useAuth();
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    if (!checking && user && !cancelled) {
      // Use replace() to avoid polluting browser history
      router.replace("/dashboard");
    }
    return () => {
      cancelled = true;
    };
  }, [checking, user, router]);

  if (checking) {
    return (
      <div className="route-loading flex items-center justify-center min-h-[60vh] text-gray-600">
        Loading…
      </div>
    );
  }

  // When user exists, we’ve already scheduled a redirect
  if (user) return null;

  // Not logged in → show marketing / landing page
  return <Home />;
}
