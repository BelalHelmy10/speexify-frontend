"use client";

import { useEffect, useRef, useState } from "react";

// Squircle (rounded-square) progress ring framing each stat glyph.
// Drawn in a 0 0 100 100 box; the icon is centered on top.
const RING_PATH =
  "M50 8 H66 A26 26 0 0 1 92 34 V66 A26 26 0 0 1 66 92 H34 A26 26 0 0 1 8 66 V34 A26 26 0 0 1 34 8 H50";

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * A single dashboard stat card (Upcoming / Completed / Total).
 *
 * @param {string}     eyebrow  Uppercase label, e.g. "Upcoming".
 * @param {number}     value    The figure to display (count-up animated).
 * @param {"upcoming"|"completed"|"total"} tone  Accent colour family.
 * @param {ReactNode}  icon     Glyph rendered inside the ring.
 * @param {ReactNode}  footer   Status row beneath the divider.
 * @param {number}     index    Position (0-based) for entrance stagger.
 */
export default function DashboardKpiCard({
  eyebrow,
  value = 0,
  tone = "upcoming",
  icon,
  footer,
  index = 0,
}) {
  const target = Number(value) || 0;
  const [display, setDisplay] = useState(target);
  const shownRef = useRef(target);
  const ringRef = useRef(null);

  // Count-up: animate from the previously shown figure to the new target.
  useEffect(() => {
    const from = shownRef.current;
    shownRef.current = target;

    if (prefersReducedMotion() || from === target) {
      setDisplay(target);
      return;
    }

    const dur = 1200;
    const start = performance.now();
    let raf = 0;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(from + (target - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);

  // Draw the squircle ring in on mount (full frame around the glyph).
  useEffect(() => {
    const path = ringRef.current;
    if (!path) return;
    const len = path.getTotalLength();
    path.style.strokeDasharray = `${len}`;

    if (prefersReducedMotion()) {
      path.style.strokeDashoffset = "0";
      return;
    }

    path.style.strokeDashoffset = `${len}`;
    path.style.transition = "stroke-dashoffset 1.5s cubic-bezier(.16,1,.3,1)";
    const id = window.setTimeout(() => {
      path.style.strokeDashoffset = "0";
    }, 150 + index * 140);
    return () => window.clearTimeout(id);
  }, [index]);

  return (
    <div
      className={`dashboard__stat-card dashboard__stat-card--${tone}`}
      style={{ "--stat-delay": `${0.05 + index * 0.08}s` }}
    >
      <span className="dashboard__stat-glow" aria-hidden="true" />

      <div className="dashboard__stat-top">
        <div className="dashboard__stat-headings">
          <div className="dashboard__stat-eyebrow">{eyebrow}</div>
          <span className="dashboard__stat-value">{display}</span>
        </div>

        <div className="dashboard__stat-ring" aria-hidden="true">
          <svg viewBox="0 0 100 100" width="90" height="90">
            <path
              className="dashboard__stat-ring-track"
              d={RING_PATH}
              fill="none"
              strokeWidth="8"
              strokeLinecap="round"
            />
            <path
              ref={ringRef}
              className="dashboard__stat-ring-prog"
              d={RING_PATH}
              fill="none"
              strokeWidth="8"
              strokeLinecap="round"
            />
          </svg>
          <span className="dashboard__stat-glyph">{icon}</span>
        </div>
      </div>

      <div className="dashboard__stat-foot">{footer}</div>
    </div>
  );
}
