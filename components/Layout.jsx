// src/layout/Layout.jsx

// ─────────────────────────────────────────────────────────────────────────────
// Purpose: Shared page chrome (Header + main content + optional Footer)
// - Renders the site header once
// - Uses {children} to render the current page inside a consistent frame
// - Optional footer (on by default)
// ─────────────────────────────────────────────────────────────────────────────
import Header from "@/components/Header";
import Header from "@/components/Footer";

export default function Layout({ children, withFooter = true }) {
  return (
    <>
      {/* ──────────────────────────────────────────────────────────────────────
          Global Header (brand + navigation + auth-aware CTA)
      ─────────────────────────────────────────────────────────────────────── */}
      <Header />

      {/* ──────────────────────────────────────────────────────────────────────
          Main content area (your pages render here via {children})
          - Keep className to benefit from your existing spacing styles
      ─────────────────────────────────────────────────────────────────────── */}
      <main className="site-main">{children}</main>

      {/* ──────────────────────────────────────────────────────────────────────
          Optional Footer (legal/links/copyright, etc.)
      ─────────────────────────────────────────────────────────────────────── */}
      {withFooter && <Footer />}
    </>
  );
}
