"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import useAuth from "@/hooks/useAuth";

function getSafeNextPath(rawNext, fallbackPath) {
  if (!rawNext) return fallbackPath;

  try {
    const decoded = decodeURIComponent(rawNext);
    if (decoded.startsWith("/") && !decoded.startsWith("//")) {
      return decoded;
    }
  } catch {
    // URLSearchParams already decodes most values; fall through to raw checks.
  }

  if (rawNext.startsWith("/") && !rawNext.startsWith("//")) {
    return rawNext;
  }

  return fallbackPath;
}

export default function HomeAuthRedirect({ locale = "en" }) {
  const { user, checking } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (checking || !user) return;

    const dashboardPath = locale === "ar" ? "/ar/dashboard" : "/dashboard";
    const params = new URLSearchParams(window.location.search);
    router.replace(getSafeNextPath(params.get("next"), dashboardPath));
  }, [checking, user, router, locale]);

  return null;
}
