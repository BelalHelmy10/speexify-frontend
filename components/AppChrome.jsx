"use client";

import { Suspense } from "react";
import Script from "next/script";
import { usePathname } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SupportWidget from "@/components/SupportWidget";
import ScrollToTop from "@/components/ScrollToTop";
import SmoothScroll from "@/components/SmoothScroll";
import { normalizeLocalizedPath } from "@/lib/chromeRoutes";

const APP_PATH_PREFIXES = [
  "/admin",
  "/assessment",
  "/calendar",
  "/checkout",
  "/classroom",
  "/dashboard",
  "/manual-payment",
  "/onboarding",
  "/payment",
  "/profile",
  "/resources",
  "/settings",
];

function isAppPath(pathname) {
  const normalized = normalizeLocalizedPath(pathname);
  return APP_PATH_PREFIXES.some(
    (prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`)
  );
}

function isFocusedWorkspace(pathname) {
  const normalized = normalizeLocalizedPath(pathname);
  return (
    normalized === "/classroom" ||
    normalized.startsWith("/classroom/") ||
    normalized === "/resources/prep" ||
    normalized.startsWith("/resources/prep/")
  );
}

function shouldLoadJitsi(pathname) {
  const normalized = normalizeLocalizedPath(pathname);
  return normalized === "/classroom" || normalized.startsWith("/classroom/");
}

export default function AppChrome({ children }) {
  const pathname = usePathname();
  const focusedWorkspace = isFocusedWorkspace(pathname);
  const appPath = isAppPath(pathname);
  const showSiteChrome = !focusedWorkspace;

  return (
    <>
      {shouldLoadJitsi(pathname) && (
        <Script
          src="https://meet.speexify.com/external_api.js"
          strategy="afterInteractive"
        />
      )}

      {!appPath && <SmoothScroll />}

      {showSiteChrome && <Header />}
      <Suspense fallback={null}>
        <main>{children}</main>
      </Suspense>
      {showSiteChrome && <Footer />}
      {showSiteChrome && <SupportWidget />}
      {showSiteChrome && <ScrollToTop />}
    </>
  );
}
