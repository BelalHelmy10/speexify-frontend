// src/components/Header.jsx
"use client";

import { useState, useEffect, useRef, type CSSProperties } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BookOpen,
  ChevronDown,
  HelpCircle,
  LogOut,
  Settings,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import useAuth from "@/hooks/useAuth";
import {
  isFocusedWorkspacePath,
  normalizeLocalizedPath,
} from "@/lib/chromeRoutes";
import { APP_ROUTES } from "@/lib/routes";
import { getDictionary, t } from "@/app/i18n";
import NotificationsBell from "@/components/NotificationsBell";
import DigitalClock from "@/components/DigitalClock";
import BrandLogo from "@/components/brand/BrandLogo";

/* ------------------------------------------------------------------
   Locale helpers
------------------------------------------------------------------ */

// Switch current path between /... and /ar/...
function getLocalizedPath(currentPath, targetLocale) {
  const current = currentPath || "/";

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

// Build an href for a given base path ("/about") in the current locale
function localizeHref(baseHref, locale) {
  if (locale === "ar") {
    if (baseHref === "/") return "/ar";
    if (baseHref.startsWith("/ar")) return baseHref;
    return `/ar${baseHref}`;
  }
  // locale === "en"
  if (baseHref === "/ar") return "/";
  return baseHref;
}

function itemIndexStyle(index: number): CSSProperties {
  return { "--item-index": index } as CSSProperties;
}

function getDisplayName(user) {
  return user?.name || user?.email?.split("@")?.[0] || "Speexify user";
}

function getInitials(user) {
  const source = user?.name || user?.email || "S";
  const parts = source
    .replace(/@.*$/, "")
    .split(/\s+|[._-]+/)
    .filter(Boolean);

  return (parts.length > 1 ? parts[0][0] + parts[1][0] : source.slice(0, 2))
    .toUpperCase()
    .replace(/[^A-Z0-9\u0600-\u06FF]/g, "");
}

function AvatarContent({ user }) {
  if (user?.avatarUrl) {
    return <img src={user.avatarUrl} alt="" />;
  }
  return getInitials(user);
}

/* ------------------------------------------------------------------
   Language switcher
------------------------------------------------------------------ */

function LanguageSwitcher({ locale, pathname }) {
  const router = useRouter();
  const isArabic = locale === "ar";

  const handleSwitch = (targetLocale) => {
    const targetPath = getLocalizedPath(pathname || "/", targetLocale);
    router.push(targetPath);
  };

  return (
    <div className="spx-lang-toggle">
      <button
        type="button"
        className={`spx-lang-toggle__btn${!isArabic ? " spx-lang-toggle__btn--active" : ""
          }`}
        onClick={() => handleSwitch("en")}
        aria-label="Switch to English"
      >
        EN
      </button>
      <button
        type="button"
        className={`spx-lang-toggle__btn${isArabic ? " spx-lang-toggle__btn--active" : ""
          }`}
        onClick={() => handleSwitch("ar")}
        aria-label="Switch to Arabic"
      >
        عربي
      </button>
      <span
        className="spx-lang-toggle__slider"
        style={{ transform: isArabic ? "translateX(100%)" : "translateX(0)" }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------
   Header
------------------------------------------------------------------ */

export default function Header() {
  const {
    user,
    checking,
    hasSessionCookie,
    logout: authLogout,
  } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const accountMenuRef = useRef<HTMLDivElement | null>(null);

  // Locale detection from URL
  const isArabic = pathname?.startsWith("/ar");
  const locale = isArabic ? "ar" : "en";

  // Normalized path WITHOUT /ar for active-state checks
  const normalizedPath = normalizeLocalizedPath(pathname);
  const isFocusedWorkspace = isFocusedWorkspacePath(pathname);

  const navDict = getDictionary(locale, "nav");

  const [open, setOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const isActive = (hrefBase) => {
    const href = hrefBase || "/";
    if (!normalizedPath) return false;

    // Exact match logic for any nested dashboard route
    if (href.startsWith("/dashboard")) {
      return normalizedPath === href;
    }

    // Normal match for public pages
    return normalizedPath === href || normalizedPath.startsWith(`${href}/`);
  };

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const scrollY = window.scrollY || 0;
          setScrolled((prev) => {
            const next = prev ? scrollY > 8 : scrollY > 32;
            return prev !== next ? next : prev;
          });
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
    setAccountOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.classList.toggle("spx-mobile-menu-open", open);

    return () => {
      document.body.classList.remove("spx-mobile-menu-open");
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;

    function onKeyDown(event) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  useEffect(() => {
    if (!accountOpen) return undefined;

    function onPointerDown(event) {
      const target = event.target;
      if (
        target instanceof Node &&
        accountMenuRef.current?.contains(target)
      ) {
        return;
      }
      setAccountOpen(false);
    }

    function onKeyDown(event) {
      if (event.key === "Escape") setAccountOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [accountOpen]);

  const authPending = checking && hasSessionCookie && !user;
  const loggedOutReady = !user && !authPending;

  const baseLogoTo = user ? APP_ROUTES.dashboard : APP_ROUTES.home;
  const logoTo = localizeHref(baseLogoTo, locale);

  const handleLogout = async () => {
    try {
      await authLogout();
    } catch { }
    setOpen(false);
    setAccountOpen(false);
    router.push(localizeHref(APP_ROUTES.login, locale));
  };

  const navText = (key, fallback) => {
    const value = t(navDict, key);
    return value === `__${key}__` ? fallback : value;
  };

  const roleLabel = (role) => {
    if (role === "admin") return navText("role_admin", "Admin");
    if (role === "teacher") return navText("role_teacher", "Teacher");
    return navText("role_learner", "Learner");
  };

  const loggedOut = [
    { to: APP_ROUTES.home, label: t(navDict, "home") },
    { to: APP_ROUTES.individualTraining, label: t(navDict, "individual") },
    { to: APP_ROUTES.corporateTraining, label: t(navDict, "corporate") },
    { to: APP_ROUTES.kidsTraining, label: t(navDict, "kids") },
    { to: APP_ROUTES.packages, label: t(navDict, "packages") },
    { to: APP_ROUTES.about, label: t(navDict, "about") },
    { to: APP_ROUTES.contact, label: t(navDict, "contact") },
  ];

  const learner = [
    { to: APP_ROUTES.dashboard, label: t(navDict, "dashboard") },
    { to: "/calendar", label: t(navDict, "calendar") },
    { to: "/dashboard/progress", label: t(navDict, "progress") },
  ];

  const teacher = [
    { to: APP_ROUTES.dashboard, label: t(navDict, "dashboard") },
    { to: "/calendar", label: t(navDict, "calendar") },
    { to: "/dashboard/progress", label: t(navDict, "progress") },
    // ✅ teachers DO see Resources
    { to: "/resources", label: t(navDict, "resources") },
  ];

  const adminExtra = [{ to: "/admin", label: t(navDict, "admin") }];

  // Admin nav: Settings now lives in the account menu.
  const admin = [
    { to: APP_ROUTES.dashboard, label: t(navDict, "dashboard") },
    { to: "/calendar", label: t(navDict, "calendar") },
    ...adminExtra,
    { to: "/resources", label: t(navDict, "resources") },
  ];

  const links =
    !user
      ? loggedOut
      : user.role === "admin"
        ? admin
        : user.role === "teacher"
          ? teacher
          : learner;

  const accountLinks = user
    ? [
      {
        to: "/profile",
        label: navText("profile", "Profile"),
        hint: navText("profile_hint", "Identity and account snapshot"),
        icon: UserRound,
      },
      {
        to: "/settings",
        label: t(navDict, "settings"),
        hint: navText("settings_hint", "Security, calendar, and preferences"),
        icon: Settings,
      },
      ...(user.role === "admin"
        ? [
          {
            to: "/admin",
            label: t(navDict, "admin"),
            hint: navText("admin_hint", "Operations and user management"),
            icon: ShieldCheck,
          },
        ]
        : user.role === "teacher"
          ? [
            {
              to: "/resources",
              label: t(navDict, "resources"),
              hint: navText("resources_hint", "Teaching materials and prep"),
              icon: BookOpen,
            },
          ]
          : []),
      {
        to: APP_ROUTES.contact,
        label: navText("support", "Support"),
        hint: navText("support_hint", "Help, questions, and requests"),
        icon: HelpCircle,
      },
    ]
    : [];

  const RightCTA = () =>
    user ? (
      <div
        className={`spx-account-menu${accountOpen ? " spx-is-open" : ""}${isActive("/profile") || isActive("/settings") ? " spx-is-active" : ""
          }`}
        ref={accountMenuRef}
      >
        <button
          type="button"
          className="spx-account-trigger"
          aria-haspopup="menu"
          aria-expanded={accountOpen}
          aria-label={navText("account_open", "Open account menu")}
          onClick={() => setAccountOpen((value) => !value)}
        >
          <span className="spx-account-avatar" aria-hidden="true">
            <AvatarContent user={user} />
          </span>
          <span className="spx-account-copy">
            <strong>{getDisplayName(user)}</strong>
            <small>{roleLabel(user.role)}</small>
          </span>
          <ChevronDown className="spx-account-chevron" size={16} />
        </button>

        {accountOpen && (
          <div className="spx-account-dropdown" role="menu">
            <div className="spx-account-card">
              <span className="spx-account-card__avatar" aria-hidden="true">
                <AvatarContent user={user} />
              </span>
              <div>
                <strong>{getDisplayName(user)}</strong>
                <span>{user.email}</span>
              </div>
              <em>{roleLabel(user.role)}</em>
            </div>

            <div className="spx-account-links">
              {accountLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    href={localizeHref(item.to, locale)}
                    className={`spx-account-link${isActive(item.to) ? " spx-is-active" : ""
                      }`}
                    key={item.to}
                    role="menuitem"
                    onClick={() => setAccountOpen(false)}
                  >
                    <span className="spx-account-link__icon">
                      <Icon size={17} />
                    </span>
                    <span>
                      <strong>{item.label}</strong>
                      <small>{item.hint}</small>
                    </span>
                  </Link>
                );
              })}
            </div>

            <button
              type="button"
              className="spx-account-logout"
              onClick={handleLogout}
              role="menuitem"
            >
              <LogOut size={17} />
              <span>{t(navDict, "logout")}</span>
            </button>
          </div>
        )}
      </div>
    ) : authPending ? (
      <span className="spx-auth-placeholder" aria-hidden="true">
        <span className="spx-auth-placeholder__avatar" />
        <span className="spx-auth-placeholder__lines">
          <span />
          <span />
        </span>
      </span>
    ) : (
      <Link
        href={localizeHref(APP_ROUTES.login, locale)}
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
    );

  if (isFocusedWorkspace) return null;

  return (
    <header
      className={`spx-header-wrapper${scrolled ? " spx-is-scrolled" : ""}`}
    >
      <div className="spx-header-glow"></div>
      <div className="spx-header-container container">
        <BrandLogo
          context="header"
          href={logoTo}
          ariaLabel="Speexify"
          onClick={() => setOpen(false)}
        />

        <nav className="spx-nav">
          <ul className="spx-nav-list">
            {links.map((item, idx) => {
              const href = localizeHref(item.to, locale);
              const isKids = !user && item.to === APP_ROUTES.kidsTraining;
              return (
                <li
                  key={item.to}
                  className="spx-nav-item"
                  style={itemIndexStyle(idx)}
                >
                  <Link
                    href={href}
                    className={
                      "spx-nav-link" +
                      (isKids ? " spx-nav-link--kids" : "") +
                      (isActive(item.to) ? " spx-is-active" : "")
                    }
                    onClick={() => setOpen(false)}
                  >
                    <span className="spx-link-bg"></span>
                    {isKids && (
                      <span className="spx-kids-shapes" aria-hidden="true">
                        {/* Sparkle doodle — top left */}
                        <svg className="spx-kids-doodle spx-kids-doodle--sparkle" width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                          <path d="M10 1.5 C10.3 5.5, 8 8, 4.5 8.5 C8 9, 10.3 11.5, 10 15.5 C9.7 11.5, 12 9, 15.5 8.5 C12 8, 9.7 5.5, 10 1.5Z" fill="currentColor" />
                        </svg>
                        {/* Spiral doodle — top right, hides behind text */}
                        <svg className="spx-kids-doodle spx-kids-doodle--spiral" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                          <path d="M12 5 C16 5, 18 8, 18 11.5 C18 15, 15.5 17.5, 12 17.5 C9.5 17.5, 8 16, 8 14.5 C8 13, 9.5 11.5, 12 11.5 C13.5 11.5, 14.5 12.3, 14.5 13.3 C14.5 14.3, 13.5 15, 12 15" />
                        </svg>
                        {/* Zigzag doodle — bottom */}
                        <svg className="spx-kids-doodle spx-kids-doodle--zigzag" width="22" height="10" viewBox="0 0 24 10" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M2 5 L5 1.5 L8 8.5 L11 1.5 L14 8.5 L17 1.5 L20 5" />
                        </svg>
                      </span>
                    )}
                    <span className="spx-link-text">
                      {isKids ? (
                        <span className="spx-kids-word">{item.label}</span>
                      ) : (
                        item.label
                      )}
                    </span>
                  </Link>
                </li>
              );
            })}

            {loggedOutReady && (
              <li
                className="spx-nav-item spx-nav-item-special"
                style={itemIndexStyle(links.length)}
              >
                <Link
                  href={localizeHref(APP_ROUTES.register, locale)}
                  className={
                    "spx-nav-link" +
                    (isActive(APP_ROUTES.register) ? " spx-is-active" : "")
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
              style={itemIndexStyle(links.length + 1)}
            >
              <LanguageSwitcher locale={locale} pathname={pathname} />
            </li>

            {/* Digital Clock (only when logged in) */}
            {user && (
              <li
                className="spx-nav-item spx-nav-item-clock"
                style={itemIndexStyle(links.length + 0.75)}
              >
                <DigitalClock />
              </li>
            )}

            {/* Desktop notifications bell (only when logged in) */}
            {user && (
              <li
                className="spx-nav-item spx-nav-item-notif"
                style={itemIndexStyle(links.length + 0.5)}
              >
                <NotificationsBell locale={locale} />
              </li>
            )}
          </ul>
        </nav>

        <RightCTA />

        <button
          className={"spx-nav-toggle" + (open ? " spx-is-open" : "")}
          aria-label="Toggle menu"
          aria-expanded={open ? "true" : "false"}
          aria-controls="spx-mobile-menu"
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

      {/* Mobile drawer */}
      <div
        id="spx-mobile-menu"
        className={"spx-mobile-drawer" + (open ? " spx-is-open" : "")}
        aria-hidden={!open}
        onClick={(event) => {
          if (event.target === event.currentTarget) setOpen(false);
        }}
      >
        <nav className="spx-mobile-drawer-inner" aria-label="Mobile navigation">
          <ul className="spx-mobile-list">
            {links.map((item, idx) => {
              const href = localizeHref(item.to, locale);
              return (
                <li
                  key={item.to}
                  className="spx-mobile-item"
                  style={itemIndexStyle(idx)}
                >
                  <Link
                    href={href}
                    className={
                      "spx-mobile-link" +
                      (item.to === APP_ROUTES.kidsTraining ? " spx-mobile-link--kids" : "") +
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
              );
            })}

            {loggedOutReady && (
              <>
                <li
                  className="spx-mobile-item"
                  style={itemIndexStyle(links.length)}
                >
                  <Link
                    href={localizeHref(APP_ROUTES.register, locale)}
                    className={
                      "spx-mobile-link" +
                      (isActive(APP_ROUTES.register) ? " spx-is-active" : "")
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
                  style={itemIndexStyle(links.length + 1)}
                >
                  <Link
                    href={localizeHref(APP_ROUTES.login, locale)}
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

            {user && (
              <>
                <li
                  className="spx-mobile-item spx-mobile-account"
                  style={itemIndexStyle(links.length)}
                >
                  <div className="spx-mobile-account-card">
                    <span className="spx-mobile-account-card__avatar">
                      <AvatarContent user={user} />
                    </span>
                    <span>
                      <strong>{getDisplayName(user)}</strong>
                      <small>{user.email}</small>
                    </span>
                  </div>
                </li>

                {accountLinks.map((item, accountIndex) => {
                  const href = localizeHref(item.to, locale);
                  return (
                    <li
                      key={`mobile-account-${item.to}`}
                      className="spx-mobile-item"
                      style={itemIndexStyle(links.length + accountIndex + 1)}
                    >
                      <Link
                        href={href}
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
                  );
                })}

                {/* Mobile notifications bell */}
                <li
                  className="spx-mobile-item spx-mobile-item-notif"
                  style={itemIndexStyle(links.length + accountLinks.length + 1)}
                >
                  <NotificationsBell locale={locale} />
                </li>

                <li
                  className="spx-mobile-item spx-mobile-item-cta"
                  style={itemIndexStyle(links.length + accountLinks.length + 2)}
                >
                  <button
                    className="spx-mobile-cta spx-logout-btn"
                    onClick={handleLogout}
                    type="button"
                  >
                    <span className="spx-mobile-cta-bg"></span>
                    <span className="spx-mobile-cta-content">
                      <span>{t(navDict, "logout")}</span>
                      <svg
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
                </li>
              </>
            )}

            {/* Mobile language switcher */}
            <li
              className="spx-mobile-item spx-mobile-item-lang"
              style={itemIndexStyle(
                links.length + (user ? accountLinks.length + 3 : 2)
              )}
            >
              <LanguageSwitcher locale={locale} pathname={pathname} />
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
