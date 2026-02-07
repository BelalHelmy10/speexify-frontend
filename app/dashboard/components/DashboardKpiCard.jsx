"use client";

export default function DashboardKpiCard({ title, value, icon, gradient }) {
  return (
    <div className={`card card--kpi card--${gradient}`}>
      <div className="card__icon">{icon}</div>
      <div className="card__content">
        <div className="card__title">{title}</div>
        <div className="card__value">{value}</div>
      </div>
    </div>
  );
}
