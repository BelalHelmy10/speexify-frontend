"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { APP_ROUTES, routeHref } from "@/lib/routes";
import { normalizeLocalizedPath } from "@/lib/chromeRoutes";

/**
 * Site-wide floating "Book free trial" CTA — a centered glass "command pill".
 *
 * Visual: compact coral pill that expands on hover/focus/tap to reveal a live
 * dot + two-line "First session free / No commitment" detail.
 *
 * Placement: bottom-CENTER on every breakpoint. Centered neutral space never
 * collides with the bottom-left ScrollToTop button or the bottom-right
 * SupportWidget FAB.
 *
 * Behavior:
 *  - Visible from the very top of the page (no scroll required).
 *  - Steps aside only when the footer's own CTA section is in view, so two
 *    trial CTAs never stack.
 *  - Dismiss (×) persists for the tab session via sessionStorage.
 *  - Suppressed on app pages (dashboard, classroom, etc.) and auth pages.
 */

const SUPPRESS_PREFIXES = [
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
  "/login",
  "/register",
  "/forgot-password",
];

function shouldSuppress(pathname) {
  const p = normalizeLocalizedPath(pathname);
  return SUPPRESS_PREFIXES.some(
    (prefix) => p === prefix || p.startsWith(`${prefix}/`),
  );
}

export default function StickyTrialCTA() {
  const pathname = usePathname() || "/";
  const locale = pathname.startsWith("/ar") ? "ar" : "en";

  // Dismiss persists for the tab session (sessionStorage), so a user who
  // closes it isn't nagged again on every navigation. Resets in a new tab.
  const [dismissed, setDismissed] = useState(false);
  // "shown" = visible. Visible from the very top of the page; only hidden when
  // the footer's own CTA section is in view (so two trial CTAs don't stack).
  const [shown, setShown] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const lastPointerType = useRef(null);

  useEffect(() => {
    try {
      if (sessionStorage.getItem("spx-trial-cta-dismissed") === "1") {
        setDismissed(true);
      }
    } catch {
      /* sessionStorage unavailable — fall back to ephemeral dismiss */
    }
  }, []);

  useEffect(() => {
    const update = () => {
      // Visible from the top — step aside only when the footer's own CTA
      // section comes into view, to avoid stacking two trial CTAs.
      let nearFooter = false;
      const footer = document.querySelector(".site-footer-wrapper");
      if (footer) {
        const rect = footer.getBoundingClientRect();
        nearFooter = rect.top < window.innerHeight - 48 && rect.bottom > 120;
      }

      setShown(!nearFooter);
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);

    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [pathname]);

  const handleDismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem("spx-trial-cta-dismissed", "1");
    } catch {
      /* ignore */
    }
  };

  if (shouldSuppress(pathname)) return null;
  if (dismissed) return null;

  const copy =
    locale === "ar"
      ? {
          title: "أول جلسة مجانية",
          sub: "بدون أي التزام",
          cta: "احجز جلستك",
          aria: "احجز جلسة تجريبية مجانية",
          dismiss: "إخفاء",
        }
      : {
          title: "First session free",
          sub: "No commitment",
          cta: "Book free trial",
          aria: "Book a free trial session",
          dismiss: "Dismiss",
        };

  const handleClick = (event) => {
    const canHover =
      typeof window !== "undefined" &&
      window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const pointerCanHover = canHover && lastPointerType.current !== "touch";

    if (!pointerCanHover && !expanded) {
      event.preventDefault();
      setExpanded(true);
      window.setTimeout(() => setExpanded(false), 3200);
    }
  };

  return (
    <div
      className={`spx-trial-cta${shown ? " is-visible" : ""}${expanded ? " is-expanded" : ""}`}
      onPointerEnter={(event) => {
        lastPointerType.current = event.pointerType;
        if (event.pointerType !== "touch") setExpanded(true);
      }}
      onPointerLeave={(event) => {
        if (event.pointerType !== "touch") setExpanded(false);
      }}
    >
      <Link
        href={routeHref(APP_ROUTES.register, locale)}
        className="spx-trial-cta__pill"
        aria-label={copy.aria}
        onClick={handleClick}
        onPointerDown={(event) => {
          lastPointerType.current = event.pointerType;
        }}
        onFocus={() => setExpanded(true)}
        onBlur={() => setExpanded(false)}
      >
        <b className="spx-trial-cta__btn">
          <span className="spx-trial-cta__btn-label">{copy.cta}</span>
          <svg
            className="spx-trial-cta__arrow"
            viewBox="0 0 18 18"
            aria-hidden="true"
            focusable="false"
          >
            <path
              d="M3.5 9h10M9.5 5l4 4-4 4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="spx-trial-cta__btn-sheen" aria-hidden="true" />
        </b>
        <span className="spx-trial-cta__expandable" aria-hidden="true">
          <span className="spx-trial-cta__live" aria-hidden="true">
            <span className="spx-trial-cta__live-dot" />
          </span>
          <span className="spx-trial-cta__copy">
            <strong>{copy.title}</strong>
            <small>{copy.sub}</small>
          </span>
        </span>
      </Link>
      <button
        type="button"
        className="spx-trial-cta__close"
        aria-label={copy.dismiss}
        onClick={handleDismiss}
      >
        <X size={13} strokeWidth={2.4} aria-hidden="true" />
      </button>
    </div>
  );
}
