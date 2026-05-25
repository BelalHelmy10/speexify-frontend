"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { APP_ROUTES, routeHref } from "@/lib/routes";
import { normalizeLocalizedPath } from "@/lib/chromeRoutes";

/**
 * Site-wide floating "Book free trial" CTA.
 *
 * Visual: pill bar with three colored brand dots, two-line copy, primary button.
 * Mobile: full-width across the bottom (matches the kids page treatment).
 * Desktop: floating pill in the bottom-LEFT corner so it doesn't fight the
 * SupportWidget FAB which lives bottom-right.
 *
 * Behavior:
 *  - Hidden on page load. Slides up after the user scrolls ~360px.
 *  - Hides again when the user is within ~220px of the bottom (so it doesn't
 *    obscure the page's own CTA section).
 *  - Dismiss button persists hidden for the rest of the tab session.
 *  - Suppressed entirely on app pages (dashboard, classroom, etc.) and on
 *    auth pages (login/register/forgot-password) where it has nothing to add.
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

  // Ephemeral dismiss — local state only, no storage.
  // Reappears on any reload or navigation.
  const [dismissed, setDismissed] = useState(false);

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

  return (
    <div className="spx-trial-cta is-visible">
      <Link
        href={routeHref(APP_ROUTES.register, locale)}
        className="spx-trial-cta__pill"
        aria-label={copy.aria}
      >
        <span className="spx-trial-cta__expandable" aria-hidden="true">
          <span className="spx-trial-cta__dots" />
          <span className="spx-trial-cta__copy">
            <strong>{copy.title}</strong>
            <small>{copy.sub}</small>
          </span>
        </span>
        <b className="spx-trial-cta__btn">{copy.cta}</b>
      </Link>
      <button
        type="button"
        className="spx-trial-cta__close"
        aria-label={copy.dismiss}
        onClick={() => setDismissed(true)}
      >
        <X size={13} strokeWidth={2.4} aria-hidden="true" />
      </button>
    </div>
  );
}
