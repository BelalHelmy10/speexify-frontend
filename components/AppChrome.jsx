"use client";

import { Suspense, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Script from "next/script";
import { usePathname } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { normalizeLocalizedPath } from "@/lib/chromeRoutes";

// These controls are useful after the page is usable, but they are not part
// of the critical render path. Keep their sizeable client dependencies out of
// the initial route bundle and mount them once the user has had a chance to
// see and interact with the page.
const SupportWidget = dynamic(() => import("@/components/SupportWidget"), {
  ssr: false,
});
const ScrollToTop = dynamic(() => import("@/components/ScrollToTop"), {
  ssr: false,
});
const SmoothScroll = dynamic(() => import("@/components/SmoothScroll"), {
  ssr: false,
});
const StickyTrialCTA = dynamic(() => import("@/components/StickyTrialCTA"), {
  ssr: false,
});

function useDeferredChrome() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), 2000);
    return () => window.clearTimeout(timer);
  }, []);

  return ready;
}

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
  const deferredChromeReady = useDeferredChrome();
  const focusedWorkspace = isFocusedWorkspace(pathname);
  const appPath = isAppPath(pathname);
  const showSiteChrome = !focusedWorkspace;
  const normalizedPath = normalizeLocalizedPath(pathname);
  const hideMobileSupportFab =
    normalizedPath === "/" || normalizedPath === "/why-speexify";

  return (
    <>
      {shouldLoadJitsi(pathname) && (
        <Script
          src="https://meet.speexify.com/external_api.js"
          strategy="afterInteractive"
        />
      )}

      {deferredChromeReady && !appPath && <SmoothScroll />}

      {showSiteChrome && <Header />}
      <Suspense fallback={null}>
        <main>{children}</main>
      </Suspense>
      {showSiteChrome && normalizedPath !== "/assessment" && <Footer />}
      {deferredChromeReady && showSiteChrome && (
        <SupportWidget hideMobileFab={hideMobileSupportFab} />
      )}
      {deferredChromeReady && showSiteChrome && <ScrollToTop />}
      {showSiteChrome && normalizedPath !== "/assessment" && <StickyTrialCTA />}
    </>
  );
}
