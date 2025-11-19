// app/calendar/loading.js
"use client";

export default function CalendarLoading() {
  const rows = Array.from({ length: 5 });

  return (
    <div className="calendar-premium-container">
      <div className="calendar-bg-gradient"></div>

      <div className="calendar-header">
        <div className="calendar-header-content">
          <div className="skeleton skeleton--title" />
          <div className="skeleton skeleton--text" />
        </div>
      </div>

      <div className="calendar-layout">
        {/* Left mini calendar panel */}
        <aside className="calendar-left-panel skeleton-card">
          <div className="skeleton skeleton--title" />
          {rows.slice(0, 3).map((_, i) => (
            <div key={i} className="skeleton skeleton--row" />
          ))}
        </aside>

        {/* Right big calendar panel */}
        <main className="calendar-main skeleton-card">
          {rows.map((_, i) => (
            <div key={i} className="skeleton skeleton--row" />
          ))}
        </main>
      </div>
    </div>
  );
}
