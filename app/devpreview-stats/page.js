"use client";
// TEMPORARY visual-QA route for the stat-cards redesign. Safe to delete.
import DashboardKpiCard from "../dashboard/components/DashboardKpiCard";

export default function DevPreviewStats() {
  const upcomingCount = 0;
  const completedCount = 22;
  const kpiTotal = upcomingCount + completedCount;
  const completionPct = kpiTotal > 0 ? Math.round((completedCount / kpiTotal) * 100) : 0;

  return (
    <div className="dashboard" style={{ maxWidth: 1160, margin: "0 auto", padding: "48px 40px" }}>
      <section className="dashboard__stats" aria-label="Your learning sessions">
        <div className="dashboard__stats-head">
          <div>
            <div className="dashboard__stats-eyebrow">Overview</div>
            <h3 className="dashboard__stats-title">Your learning sessions</h3>
          </div>
          <span className="dashboard__stats-scope">
            <span className="dashboard__stat-dot dashboard__stat-dot--green" />
            All time
          </span>
        </div>

        <div className="dashboard__kpis">
          <DashboardKpiCard
            eyebrow="Upcoming"
            value={upcomingCount}
            tone="upcoming"
            index={0}
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4.5" width="18" height="16" rx="2.6" />
                <line x1="3" y1="9.3" x2="21" y2="9.3" />
                <line x1="8" y1="2.5" x2="8" y2="6.4" />
                <line x1="16" y1="2.5" x2="16" y2="6.4" />
              </svg>
            }
            footer={
              <span className="dashboard__stat-status">
                <span className="dashboard__stat-dot dashboard__stat-dot--orange dashboard__stat-dot--pulse" />
                <span className="dashboard__stat-status-text">No sessions scheduled</span>
              </span>
            }
          />
          <DashboardKpiCard
            eyebrow="Completed"
            value={completedCount}
            tone="completed"
            index={1}
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="5 12.5 10 17.5 19 7" />
              </svg>
            }
            footer={
              <span className="dashboard__stat-status">
                <span className="dashboard__stat-dot dashboard__stat-dot--green" />
                <span className="dashboard__stat-status-text">{completionPct}% completion rate</span>
              </span>
            }
          />
          <DashboardKpiCard
            eyebrow="Total"
            value={kpiTotal}
            tone="total"
            index={2}
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3.5" y="3.5" width="7" height="7" rx="1.8" />
                <rect x="13.5" y="3.5" width="7" height="7" rx="1.8" />
                <rect x="3.5" y="13.5" width="7" height="7" rx="1.8" />
                <rect x="13.5" y="13.5" width="7" height="7" rx="1.8" />
              </svg>
            }
            footer={
              <>
                <span className="dashboard__stat-status">
                  <span className="dashboard__stat-dot dashboard__stat-dot--green" />
                  <span className="dashboard__stat-status-text">{completedCount} completed</span>
                </span>
                <span className="dashboard__stat-status">
                  <span className="dashboard__stat-dot dashboard__stat-dot--orange" />
                  <span className="dashboard__stat-status-text">{upcomingCount} upcoming</span>
                </span>
              </>
            }
          />
        </div>
      </section>
    </div>
  );
}
