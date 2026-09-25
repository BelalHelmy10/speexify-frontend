"use client";

import { Suspense, useEffect } from "react";
import Script from "next/script";
import { usePathname } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SupportWidget from "@/components/SupportWidget";
import ScrollToTop from "@/components/ScrollToTop";
import SmoothScroll from "@/components/SmoothScroll";
import StickyTrialCTA from "@/components/StickyTrialCTA";
import AnalyticsScript from "@/components/AnalyticsScript";
import { trackPageView } from "@/lib/analytics";
import { normalizeLocalizedPath } from "@/lib/chromeRoutes";

const APP_PATH_PREFIXES = [
  "/admin",
  "/assessment",
  "/calendar",
  "/checkout",
  "/classroom",
  "/dashboard",
  "/manual-payment",
  "/needsanalysis",
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
  const normalizedPath = normalizeLocalizedPath(pathname);
  const hideMobileSupportFab =
    normalizedPath === "/" || normalizedPath === "/why-speexify";

  useEffect(() => {
    if (!pathname || focusedWorkspace) return;

    // Keep authenticated workspace pages out of page analytics, while still
    // measuring the checkout and payment-result steps of the public funnel.
    const isConversionPage =
      normalizedPath === "/checkout" || normalizedPath === "/payment/success";
    if (appPath && !isConversionPage) return;

    trackPageView({
      pathname,
      locale: pathname.startsWith("/ar") ? "ar" : "en",
    });
  }, [appPath, focusedWorkspace, normalizedPath, pathname]);

  return (
    <>
      <AnalyticsScript />
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
      {showSiteChrome && normalizedPath !== "/assessment" && <Footer />}
      {showSiteChrome && <SupportWidget hideMobileFab={hideMobileSupportFab} />}
      {showSiteChrome && <ScrollToTop />}
      {showSiteChrome && normalizedPath !== "/assessment" && <StickyTrialCTA />}
    </>
  );
}
