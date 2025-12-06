// src/components/Header.jsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import useAuth from "@/hooks/useAuth";
import { logout as apiLogout } from "@/lib/auth";
import { getDictionary, t } from "@/app/i18n";

/* ------------------------------------------------------------------
   Locale helpers
------------------------------------------------------------------ */

function getLocalizedPath(pathname, targetLocale) {
  const current = pathname || "/";

  const currentlyArabic = current.startsWith("/ar");

  if (targetLocale === "ar") {
    if (currentlyArabic) return current;
    if (current === "/") return "/ar";
    return `/ar${current}`;
  }

  // targetLocale === "en"
  if (!currentlyArabic) return current;
  const withoutAr = current.replace(/^\/ar/, "") || "/";
  return withoutAr;
}

function LanguageSwitcher() {
  const pathname = usePathname();
  const router = useRouter();
  const isArabic = pathname?.startsWith("/ar");

  const handleSwitch = (targetLocale) => {
    const targetPath = getLocalizedPath(pathname, targetLocale);
    router.push(targetPath);
  };

  return (
    <div className="spx-lang-switcher">
      <button
        type="button"
        className={"spx-lang-btn" + (!isArabic ? " spx-lang-btn--active" : "")}
        onClick={() => handleSwitch("en")}
      >
        EN
      </button>
      <span className="spx-lang-separator">|</span>
      <button
        type="button"
        className={"spx-lang-btn" + (isArabic ? " spx-lang-btn--active" : "")}
        onClick={() => handleSwitch("ar")}
      >
        AR
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------
   Header
------------------------------------------------------------------ */

export default function Header() {
  const { user, checking, setUser } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const locale = pathname?.startsWith("/ar") ? "ar" : "en"; // ✅ locale here
  const navDict = getDictionary(locale, "nav"); // ✅ nav translations here

  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const isActive = (href) => {
    if (!href || !pathname) return false;

    // Exact match logic for any nested dashboard route
    if (href.startsWith("/dashboard")) {
      return pathname === href;
    }

    // Normal match for public pages
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const next = window.scrollY > 20;
          setScrolled((prev) => (prev !== next ? next : prev));
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const logoTo = checking ? "/" : user ? "/dashboard" : "/";

  const logout = async () => {
    try {
      await apiLogout();
    } catch {}
    setUser(null);
    setOpen(false);
    router.push("/login");
  };

  const loggedOut = [
    { to: "/", label: t(navDict, "home") },
    { to: "/individual-training", label: t(navDict, "individual") },
    { to: "/corporate-training", label: t(navDict, "corporate") },
    { to: "/packages", label: t(navDict, "packages") },
    { to: "/about", label: t(navDict, "about") },
    { to: "/contact", label: t(navDict, "contact") },
  ];

  const learner = [
    { to: "/dashboard", label: t(navDict, "dashboard") },
    { to: "/calendar", label: t(navDict, "calendar") },
    { to: "/dashboard/progress", label: t(navDict, "progress") },
    { to: "/resources", label: t(navDict, "resources") },
    { to: "/settings", label: t(navDict, "settings") },
  ];

  const adminExtra = [{ to: "/admin", label: t(navDict, "admin") }];

  const links =
    checking || !user
      ? loggedOut
      : user.role === "admin"
      ? [...learner.slice(0, 2), ...adminExtra, ...learner.slice(2)]
      : learner;

  const RightCTA = () =>
    checking ? (
      <span className="spx-nav-status">
        <span className="spx-status-pulse"></span>
        <span className="spx-status-text">Checking…</span>
      </span>
    ) : !user ? (
      <Link
        href="/login"
        className="spx-nav-cta"
        onClick={() => setOpen(false)}
      >
        <span className="spx-cta-bg"></span>
        <span className="spx-cta-content">
          <span className="spx-cta-text">{t(navDict, "login")}</span>
          <svg
            className="spx-cta-arrow"
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
          >
            <path
              d="M6 12L10 8L6 4"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </Link>
    ) : (
      <button
        type="button"
        className="spx-nav-cta spx-logout-btn"
        onClick={logout}
      >
        <span className="spx-cta-bg"></span>
        <span className="spx-cta-content">
          <span className="spx-cta-text">{t(navDict, "logout")}</span>
          <svg
            className="spx-cta-icon"
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
          >
            <path
              d="M6 14H3.33333C2.59695 14 2 13.403 2 12.6667V3.33333C2 2.59695 2.59695 2 3.33333 2H6"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <path
              d="M10.6667 11.3333L14 8M14 8L10.6667 4.66667M14 8H6"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>
    );

  return (
    <header
      className={`spx-header-wrapper${scrolled ? " spx-is-scrolled" : ""}`}
    >
      <div className="spx-header-glow"></div>
      <div className="spx-header-container container">
        <Link
          href={logoTo}
          className="spx-brand"
          aria-label="Speexify"
          onClick={() => setOpen(false)}
        >
          <span className="spx-brand-text">Speexify</span>
        </Link>

        <nav className="spx-nav">
          <ul className="spx-nav-list">
            {links.map((item, idx) => (
              <li
                key={item.to}
                className="spx-nav-item"
                style={{ "--item-index": idx }}
              >
                <Link
                  href={item.to}
                  className={
                    "spx-nav-link" + (isActive(item.to) ? " spx-is-active" : "")
                  }
                  onClick={() => setOpen(false)}
                >
                  <span className="spx-link-bg"></span>
                  <span className="spx-link-text">{item.label}</span>
                </Link>
              </li>
            ))}

            {!checking && !user && (
              <li
                className="spx-nav-item spx-nav-item-special"
                style={{ "--item-index": links.length }}
              >
                <Link
                  href="/register"
                  className={
                    "spx-nav-link" +
                    (isActive("/register") ? " spx-is-active" : "")
                  }
                  onClick={() => setOpen(false)}
                >
                  <span className="spx-link-bg"></span>
                  <span className="spx-link-text">
                    {t(navDict, "register")}
                  </span>
                </Link>
              </li>
            )}

            {/* Desktop language switcher */}
            <li
              className="spx-nav-item spx-nav-item-lang"
              style={{ "--item-index": links.length + 1 }}
            >
              <LanguageSwitcher />
            </li>
          </ul>
        </nav>

        <RightCTA />

        <button
          className={"spx-nav-toggle" + (open ? " spx-is-open" : "")}
          aria-label="Toggle menu"
          aria-expanded={open ? "true" : "false"}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="spx-toggle-box">
            <span className="spx-toggle-inner">
              <span className="spx-toggle-line"></span>
              <span className="spx-toggle-line"></span>
              <span className="spx-toggle-line"></span>
            </span>
          </span>
        </button>
      </div>

      <div className={"spx-mobile-drawer" + (open ? " spx-is-open" : "")}>
        <div className="spx-mobile-drawer-inner">
          <ul className="spx-mobile-list">
            {links.map((item, idx) => (
              <li
                key={item.to}
                className="spx-mobile-item"
                style={{ "--item-index": idx }}
              >
                <Link
                  href={item.to}
                  className={
                    "spx-mobile-link" +
                    (isActive(item.to) ? " spx-is-active" : "")
                  }
                  onClick={() => setOpen(false)}
                >
                  <span className="spx-mobile-link-bg"></span>
                  <span className="spx-mobile-link-content">
                    <span className="spx-mobile-link-text">{item.label}</span>
                    <svg
                      className="spx-mobile-link-arrow"
                      width="18"
                      height="18"
                      viewBox="0 0 18 18"
                      fill="none"
                    >
                      <path
                        d="M6.75 13.5L11.25 9L6.75 4.5"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                </Link>
              </li>
            ))}

            {!checking && !user && (
              <>
                <li
                  className="spx-mobile-item"
                  style={{ "--item-index": links.length }}
                >
                  <Link
                    href="/register"
                    className={
                      "spx-mobile-link" +
                      (isActive("/register") ? " spx-is-active" : "")
                    }
                    onClick={() => setOpen(false)}
                  >
                    <span className="spx-mobile-link-bg"></span>
                    <span className="spx-mobile-link-content">
                      <span className="spx-mobile-link-text">
                        {t(navDict, "register")}
                      </span>
                      <svg
                        className="spx-mobile-link-arrow"
                        width="18"
                        height="18"
                        viewBox="0 0 18 18"
                        fill="none"
                      >
                        <path
                          d="M6.75 13.5L11.25 9L6.75 4.5"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                  </Link>
                </li>
                <li
                  className="spx-mobile-item spx-mobile-item-cta"
                  style={{ "--item-index": links.length + 1 }}
                >
                  <Link
                    href="/login"
                    className="spx-mobile-cta"
                    onClick={() => setOpen(false)}
                  >
                    <span className="spx-mobile-cta-bg"></span>
                    <span className="spx-mobile-cta-content">
                      <span>{t(navDict, "login")}</span>
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 18 18"
                        fill="none"
                      >
                        <path
                          d="M6.75 13.5L11.25 9L6.75 4.5"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                  </Link>
                </li>
              </>
            )}

            {!checking && user && (
              <li
                className="spx-mobile-item spx-mobile-item-cta"
                style={{ "--item-index": links.length }}
              >
                <button
                  className="spx-mobile-cta spx-logout-btn"
                  onClick={logout}
                  type="button"
                >
                  <span className="spx-mobile-cta-bg"></span>
                  <span className="spx-mobile-cta-content">
                    <span>{t(navDict, "logout")}</span>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path
                        d="M6 14H3.33333C2.59695 14 2 13.403 2 12.6667V3.33333C2 2.59695 2.59695 2 3.33333 2H6"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                      <path
                        d="M10.6667 11.3333L14 8M14 8L10.6667 4.66667M14 8H6"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                </button>
              </li>
            )}

            {/* Mobile language switcher */}
            <li
              className="spx-mobile-item spx-mobile-item-lang"
              style={{ "--item-index": links.length + 2 }}
            >
              <LanguageSwitcher />
            </li>
          </ul>
        </div>
      </div>
    </header>
  );
}
