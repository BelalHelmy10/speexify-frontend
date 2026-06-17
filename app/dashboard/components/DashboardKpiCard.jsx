"use client";

// Geometry for the progress ring (must match the r in the SVG below)
const RING_R = 26;
const RING_C = 2 * Math.PI * RING_R; // circumference

export default function DashboardKpiCard({
  title,
  value,
  icon,
  gradient,
  percent = 0,
}) {
  const pct = Math.max(0, Math.min(100, Number(percent) || 0));
  const offset = RING_C * (1 - pct / 100);

  return (
    <div
      className={`card card--kpi card--${gradient}`}
      style={{
        "--ring-circ": RING_C.toFixed(1),
        "--ring-offset": offset.toFixed(1),
      }}
    >
      <div className="card__icon">
        <svg className="card__ring" viewBox="0 0 60 60" aria-hidden="true">
          <circle className="card__ring-track" cx="30" cy="30" r={RING_R} />
          <circle className="card__ring-prog" cx="30" cy="30" r={RING_R} />
        </svg>
        <span className="card__glyph">{icon}</span>
      </div>
      <div className="card__content">
        <div className="card__title">{title}</div>
        <div className="card__value">{value}</div>
      </div>
    </div>
  );
}
