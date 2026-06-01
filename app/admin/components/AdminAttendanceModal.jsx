"use client";

// ── SVG icon set ─────────────────────────────────────────────────────────────
function Icon({ name, size = 16 }) {
  const paths = {
    attendance: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
    ),
    calendar: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    ),
    history: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
      </svg>
    ),
    check: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    ),
    x: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    ),
    alert: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    ),
    minus: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
        <line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
    ),
    close: (
      <svg width={14} height={14} viewBox="0 0 14 14" fill="none" aria-hidden="true">
        <path d="M13 1L1 13M1 1L13 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
    users: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  };
  return paths[name] ?? null;
}

// ── Attendance rate arc ───────────────────────────────────────────────────────
function RateArc({ rate }) {
  const r = 36;
  const circ = Math.PI * r; // half-circle = πr
  const pct = Math.min(100, Math.max(0, Number(rate) || 0));
  const dash = (pct / 100) * circ;
  const color = pct >= 80 ? "#15803d" : pct >= 50 ? "#f59e0b" : "#ef4444";

  return (
    <svg width="96" height="54" viewBox="0 0 96 54" className="att-arc" aria-hidden="true">
      {/* track */}
      <path
        d="M8,48 A40,40 0 0,1 88,48"
        fill="none"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth="7"
        strokeLinecap="round"
      />
      {/* fill */}
      <path
        d="M8,48 A40,40 0 0,1 88,48"
        fill="none"
        stroke={color}
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`}
        style={{ filter: `drop-shadow(0 0 6px ${color})`, transition: "stroke-dasharray .6s cubic-bezier(.4,0,.2,1)" }}
      />
      <text x="48" y="44" textAnchor="middle" fill="#f1f5f9" fontSize="15" fontWeight="800">
        {rate != null ? `${rate}%` : "—"}
      </text>
    </svg>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ value, label, tone, icon }) {
  return (
    <div className={`att-stat att-stat--${tone}`}>
      <div className="att-stat__icon"><Icon name={icon} size={15} /></div>
      <div className="att-stat__val">{value ?? 0}</div>
      <div className="att-stat__lbl">{label}</div>
    </div>
  );
}

// ── Monthly card ──────────────────────────────────────────────────────────────
function MonthCard({ m }) {
  const rate = m.attendanceRate ?? 0;
  const color = rate >= 80 ? "#15803d" : rate >= 50 ? "#f59e0b" : "#ef4444";

  return (
    <div className="att-month">
      <div className="att-month__head">
        <span className="att-month__name">
          {new Date(m.month + "-01").toLocaleDateString("en-US", { month: "short", year: "numeric" })}
        </span>
        <span className="att-month__rate" style={{ color }}>{rate}%</span>
      </div>

      <div className="att-month__bar">
        <div
          className="att-month__fill"
          style={{ width: `${rate}%`, background: `linear-gradient(90deg, ${color}, ${color}99)`, boxShadow: `0 0 8px ${color}66` }}
        />
      </div>

      <div className="att-month__chips">
        <span className="att-chip att-chip--success"><Icon name="check" size={10}/>{m.attended}</span>
        <span className="att-chip att-chip--danger"><Icon name="x" size={10}/>{m.noShow}</span>
        <span className="att-chip att-chip--warning"><Icon name="alert" size={10}/>{m.excused}</span>
      </div>
    </div>
  );
}

// ── Status badge ──────────────────────────────────────────────────────────────
const STATUS_CFG = {
  attended:  { label: "Attended",  tone: "success",  icon: "check" },
  no_show:   { label: "No Show",   tone: "danger",   icon: "x"     },
  excused:   { label: "Excused",   tone: "warning",  icon: "alert" },
  booked:    { label: "Booked",    tone: "info",     icon: "calendar" },
  canceled:  { label: "Canceled",  tone: "muted",    icon: "minus" },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG.booked;
  return (
    <span className={`att-status att-status--${cfg.tone}`}>
      <Icon name={cfg.icon} size={11}/>
      {cfg.label}
    </span>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function AttSkeleton() {
  return (
    <div className="att-skeleton">
      <div className="att-skeleton__stats">
        {Array.from({ length: 5 }).map((_, i) => <div key={i} className="att-skel att-skel--card"/>)}
      </div>
      <div className="att-skeleton__rows">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="att-skel att-skel--row"/>)}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function AdminAttendanceModal({
  open,
  attendanceModalRef,
  attendanceUser,
  attendanceLoading,
  attendanceData,
  onClose,
}) {
  if (!open) return null;

  const stats       = attendanceData?.stats || {};
  const monthly     = attendanceData?.monthlyBreakdown || [];
  const history     = attendanceData?.history || [];
  const displayName = attendanceUser?.name || attendanceUser?.email || "User";
  const initials    = displayName.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() || "").join("");

  return (
    <div className="att-overlay" role="dialog" aria-modal="true" aria-label={`Attendance for ${displayName}`}>
      <div className="att-modal" ref={attendanceModalRef}>

        {/* ── HEADER ── */}
        <div className="att-header">
          <div className="att-header__user">
            <div className="att-header__avatar" aria-hidden="true">{initials}</div>
            <div>
              <p className="att-header__label">Attendance for</p>
              <h2 className="att-header__name">{displayName}</h2>
            </div>
          </div>
          <button className="att-close" onClick={onClose} aria-label="Close">
            <Icon name="close"/>
          </button>
        </div>

        {/* ── BODY ── */}
        <div className="att-body">
          {attendanceLoading ? (
            <AttSkeleton />
          ) : !attendanceData ? (
            <div className="att-error">
              <Icon name="alert" size={32}/>
              <p>Failed to load attendance data.</p>
            </div>
          ) : (
            <>
              {/* ── KPI STRIP ── */}
              <div className="att-kpis">
                <div className="att-kpi-rate">
                  <RateArc rate={stats.attendanceRate}/>
                  <p className="att-kpi-rate__lbl">Attendance Rate</p>
                </div>

                <div className="att-kpi-grid">
                  <StatCard value={stats.attended}      label="Attended"       tone="success" icon="check"    />
                  <StatCard value={stats.noShow}        label="No Shows"       tone="danger"  icon="x"        />
                  <StatCard value={stats.excused}       label="Excused"        tone="warning" icon="alert"    />
                  <StatCard value={stats.totalSessions} label="Total Sessions" tone="neutral" icon="users"    />
                </div>
              </div>

              {/* ── MONTHLY BREAKDOWN ── */}
              {monthly.length > 0 && (
                <section className="att-section">
                  <header className="att-section__head">
                    <span className="att-section__icon"><Icon name="calendar" size={14}/></span>
                    Monthly Breakdown
                  </header>
                  <div className="att-months">
                    {monthly.map((m) => <MonthCard key={m.month} m={m}/>)}
                  </div>
                </section>
              )}

              {/* ── SESSION HISTORY ── */}
              <section className="att-section att-section--last">
                <header className="att-section__head">
                  <span className="att-section__icon"><Icon name="history" size={14}/></span>
                  Session History
                  {history.length > 0 && (
                    <span className="att-section__count">{history.length}</span>
                  )}
                </header>

                {history.length === 0 ? (
                  <div className="att-empty">
                    <Icon name="calendar" size={36}/>
                    <p>No sessions found for this learner.</p>
                  </div>
                ) : (
                  <div className="att-table-wrap">
                    <table className="att-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Session</th>
                          <th>Teacher</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {history.slice(0, 20).map((rec) => (
                          <tr key={rec.id}>
                            <td>
                              <span className="att-date">
                                {new Date(rec.sessionDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                              </span>
                              <span className="att-time">
                                {new Date(rec.sessionDate).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </td>
                            <td>
                              <span className="att-session-title">{rec.sessionTitle}</span>
                              <span className="att-session-type">
                                {rec.sessionType === "GROUP" ? "Group" : "1:1"}
                              </span>
                            </td>
                            <td className="att-teacher">{rec.teacherName}</td>
                            <td><StatusBadge status={rec.status}/></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {history.length > 20 && (
                      <p className="att-table-more">
                        Showing 20 of {history.length} sessions
                      </p>
                    )}
                  </div>
                )}
              </section>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
