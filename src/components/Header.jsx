// src/components/Header.jsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import useAuth from "../hooks/useAuth";
import { logout as apiLogout } from "../lib/auth";

export default function Header() {
  const { user, checking, setUser } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const isActive = (href) => {
    if (!href) return false;
    if (href === "/") return pathname === "/";
    return pathname?.startsWith(href);
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
    { to: "/", label: "Home" },
    { to: "/individual-training", label: "Individual" },
    { to: "/corporate-training", label: "Corporate" },
    { to: "/packages", label: "Packages" },
    { to: "/about", label: "About" },
    { to: "/contact", label: "Contact" },
  ];

  const learner = [
    { to: "/dashboard", label: "Dashboard" },
    { to: "/calendar", label: "Calendar" },
    { to: "/settings", label: "Settings" },
  ];

  const adminExtra = [{ to: "/admin", label: "Admin" }];

  const links =
    checking || !user
      ? loggedOut
      : user.role === "admin"
      ? [...learner.slice(0, 2), ...adminExtra, ...learner.slice(2)]
      : learner;

  const RightCTA = () =>
    checking ? (
      <span className="nav-status">
        <span className="status-pulse"></span>
        <span className="status-text">Checking…</span>
      </span>
    ) : !user ? (
      <Link href="/login" className="nav-cta" onClick={() => setOpen(false)}>
        <span className="cta-bg"></span>
        <span className="cta-content">
          <span className="cta-text">Log in</span>
          <svg
            className="cta-arrow"
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
      <button type="button" className="nav-cta logout-btn" onClick={logout}>
        <span className="cta-bg"></span>
        <span className="cta-content">
          <span className="cta-text">Logout</span>
          <svg
            className="cta-icon"
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
    <header className={`site-header-wrapper${scrolled ? " is-scrolled" : ""}`}>
      <div className="header-glow"></div>
      <div className="site-header container">
        <Link
          href={logoTo}
          className="brand"
          aria-label="Speexify"
          onClick={() => setOpen(false)}
        >
          <span className="brand-text">Speexify</span>
        </Link>

        <nav className="nav">
          <ul className="nav-list">
            {links.map((item, idx) => (
              <li
                key={item.to}
                className="nav-item"
                style={{ "--item-index": idx }}
              >
                <Link
                  href={item.to}
                  className={
                    "nav-link" + (isActive(item.to) ? " is-active" : "")
                  }
                  onClick={() => setOpen(false)}
                >
                  <span className="link-bg"></span>
                  <span className="link-text">{item.label}</span>
                </Link>
              </li>
            ))}
            {!checking && !user && (
              <li
                className="nav-item nav-item-special"
                style={{ "--item-index": links.length }}
              >
                <Link
                  href="/register"
                  className={
                    "nav-link" + (isActive("/register") ? " is-active" : "")
                  }
                  onClick={() => setOpen(false)}
                >
                  <span className="link-bg"></span>
                  <span className="link-text">Register</span>
                </Link>
              </li>
            )}
          </ul>
        </nav>

        <RightCTA />

        <button
          className={"nav-toggle" + (open ? " is-open" : "")}
          aria-label="Toggle menu"
          aria-expanded={open ? "true" : "false"}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="toggle-box">
            <span className="toggle-inner">
              <span className="toggle-line"></span>
              <span className="toggle-line"></span>
              <span className="toggle-line"></span>
            </span>
          </span>
        </button>
      </div>

      <div className={"mobile-drawer" + (open ? " is-open" : "")}>
        <div className="mobile-drawer-inner">
          <ul className="mobile-list">
            {links.map((item, idx) => (
              <li
                key={item.to}
                className="mobile-item"
                style={{ "--item-index": idx }}
              >
                <Link
                  href={item.to}
                  className={
                    "mobile-link" + (isActive(item.to) ? " is-active" : "")
                  }
                  onClick={() => setOpen(false)}
                >
                  <span className="mobile-link-bg"></span>
                  <span className="mobile-link-content">
                    <span className="mobile-link-text">{item.label}</span>
                    <svg
                      className="mobile-link-arrow"
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
                  className="mobile-item"
                  style={{ "--item-index": links.length }}
                >
                  <Link
                    href="/register"
                    className={
                      "mobile-link" +
                      (isActive("/register") ? " is-active" : "")
                    }
                    onClick={() => setOpen(false)}
                  >
                    <span className="mobile-link-bg"></span>
                    <span className="mobile-link-content">
                      <span className="mobile-link-text">Register</span>
                      <svg
                        className="mobile-link-arrow"
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
                  className="mobile-item mobile-item-cta"
                  style={{ "--item-index": links.length + 1 }}
                >
                  <Link
                    href="/login"
                    className="mobile-cta"
                    onClick={() => setOpen(false)}
                  >
                    <span className="mobile-cta-bg"></span>
                    <span className="mobile-cta-content">
                      <span>Log in</span>
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
                className="mobile-item mobile-item-cta"
                style={{ "--item-index": links.length }}
              >
                <button
                  className="mobile-cta logout-btn"
                  onClick={logout}
                  type="button"
                >
                  <span className="mobile-cta-bg"></span>
                  <span className="mobile-cta-content">
                    <span>Logout</span>
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
          </ul>
        </div>
      </div>
    </header>
  );
}
