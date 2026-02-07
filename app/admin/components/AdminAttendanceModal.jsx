"use client";

export default function AdminAttendanceModal({
  open,
  attendanceModalRef,
  attendanceUser,
  attendanceLoading,
  attendanceData,
  onClose,
}) {
  if (!open) return null;

  return (
    <div className="adm-modal-overlay">
      <div className="adm-modal-content adm-modal-content--large" ref={attendanceModalRef}>
        <div className="adm-modal-header">
          <h2>📊 Attendance for {attendanceUser?.name || attendanceUser?.email || "User"}</h2>
          <button className="adm-btn-close" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M12 4L4 12M4 4L12 12"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className="adm-modal-body">
          {attendanceLoading ? (
            <div className="adm-table-skeleton">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="skeleton skeleton--row" />
              ))}
            </div>
          ) : !attendanceData ? (
            <div className="adm-empty">Failed to load attendance data.</div>
          ) : (
            <>
              <div className="adm-attendance-stats">
                <div className="adm-attendance-stat">
                  <div className="adm-attendance-stat__value">
                    {attendanceData.stats?.attendanceRate != null
                      ? `${attendanceData.stats.attendanceRate}%`
                      : "—"}
                  </div>
                  <div className="adm-attendance-stat__label">Attendance Rate</div>
                </div>
                <div className="adm-attendance-stat adm-attendance-stat--success">
                  <div className="adm-attendance-stat__value">{attendanceData.stats?.attended || 0}</div>
                  <div className="adm-attendance-stat__label">Attended</div>
                </div>
                <div className="adm-attendance-stat adm-attendance-stat--danger">
                  <div className="adm-attendance-stat__value">{attendanceData.stats?.noShow || 0}</div>
                  <div className="adm-attendance-stat__label">No Shows</div>
                </div>
                <div className="adm-attendance-stat adm-attendance-stat--warning">
                  <div className="adm-attendance-stat__value">{attendanceData.stats?.excused || 0}</div>
                  <div className="adm-attendance-stat__label">Excused</div>
                </div>
                <div className="adm-attendance-stat">
                  <div className="adm-attendance-stat__value">{attendanceData.stats?.totalSessions || 0}</div>
                  <div className="adm-attendance-stat__label">Total Sessions</div>
                </div>
              </div>

              {attendanceData.monthlyBreakdown?.length > 0 && (
                <div className="adm-attendance-monthly">
                  <h4>Monthly Breakdown</h4>
                  <div className="adm-attendance-monthly__grid">
                    {attendanceData.monthlyBreakdown.map((m) => (
                      <div key={m.month} className="adm-attendance-monthly__item">
                        <div className="adm-attendance-monthly__month">
                          {new Date(m.month + "-01").toLocaleDateString("en-US", {
                            month: "short",
                            year: "numeric",
                          })}
                        </div>
                        <div className="adm-attendance-monthly__bar">
                          <div
                            className="adm-attendance-monthly__fill"
                            style={{ width: `${m.attendanceRate || 0}%` }}
                          />
                          <span>{m.attendanceRate ?? 0}%</span>
                        </div>
                        <div className="adm-attendance-monthly__details">
                          <span className="success">✓ {m.attended}</span>
                          <span className="danger">✗ {m.noShow}</span>
                          <span className="warning">⚠ {m.excused}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="adm-attendance-history">
                <h4>Session History ({attendanceData.history?.length || 0})</h4>
                {attendanceData.history?.length === 0 ? (
                  <div className="adm-empty">No sessions found for this learner.</div>
                ) : (
                  <div className="adm-attendance-table-wrapper">
                    <table className="adm-attendance-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Session</th>
                          <th>Teacher</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {attendanceData.history?.slice(0, 20).map((record) => {
                          const statusConfig = {
                            attended: { label: "Attended", icon: "✓", color: "#10b981" },
                            no_show: { label: "No Show", icon: "✗", color: "#ef4444" },
                            excused: { label: "Excused", icon: "⚠", color: "#f59e0b" },
                            booked: { label: "Booked", icon: "📋", color: "#3b82f6" },
                            canceled: { label: "Canceled", icon: "—", color: "#9ca3af" },
                          };
                          const cfg = statusConfig[record.status] || statusConfig.booked;

                          return (
                            <tr key={record.id}>
                              <td>
                                <div className="adm-attendance-date">
                                  {new Date(record.sessionDate).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  })}
                                </div>
                                <div className="adm-attendance-time">
                                  {new Date(record.sessionDate).toLocaleTimeString("en-US", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </div>
                              </td>
                              <td>
                                <div className="adm-attendance-session">
                                  {record.sessionTitle}
                                  <span className="adm-attendance-type">
                                    {record.sessionType === "GROUP" ? "Group" : "1:1"}
                                  </span>
                                </div>
                              </td>
                              <td>{record.teacherName}</td>
                              <td>
                                <span
                                  className="adm-attendance-status"
                                  style={{
                                    color: cfg.color,
                                    background: `${cfg.color}15`,
                                  }}
                                >
                                  {cfg.icon} {cfg.label}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {attendanceData.history?.length > 20 && (
                      <p style={{ textAlign: "center", padding: "1rem", opacity: 0.7 }}>
                        Showing 20 of {attendanceData.history.length} sessions
                      </p>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
