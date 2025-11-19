// app/dashboard/loading.js
"use client";

export default function DashboardLoading() {
  const rows = Array.from({ length: 4 });

  return (
    <div className="dashboard dashboard--loading">
      {/* Top header skeleton */}
      <section className="dashboard__top">
        <div className="dashboard__headline">
          <div className="skeleton skeleton--title" />
          <div className="skeleton skeleton--text" />
        </div>
        <div className="dashboard__cta">
          <div className="skeleton skeleton--chip" />
        </div>
      </section>

      {/* KPI cards skeleton */}
      <section className="dashboard__kpis">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="card card--kpi skeleton-card">
            <div className="skeleton skeleton--chip" />
            <div className="skeleton skeleton--value" />
            <div className="skeleton skeleton--text" />
            <div className="skeleton skeleton--text" />
          </div>
        ))}
      </section>

      {/* Main grid skeleton: next session + past sessions */}
      <section className="dashboard__grid">
        <div className="card skeleton-card">
          <div className="skeleton skeleton--title" />
          <div className="skeleton skeleton--text" />
          <div className="skeleton skeleton--text" />
          <div className="skeleton skeleton--chip" />
        </div>

        <div className="card skeleton-card">
          <div className="skeleton skeleton--title" />
          {rows.map((_, i) => (
            <div key={i} className="skeleton skeleton--row" />
          ))}
        </div>
      </section>
    </div>
  );
}
