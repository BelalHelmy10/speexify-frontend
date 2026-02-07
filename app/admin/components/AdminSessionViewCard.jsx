"use client";

export default function AdminSessionViewCard({
  s,
  normType,
  startEdit,
  deleteSession,
  fmt,
  getSessionLearnerDisplay,
}) {
  return (
                <div className="adm-session-card-modern">
                  <div className="adm-session-card-modern__header">
                    <div className="adm-session-card-modern__badge">
                      {normType(s.type) === "GROUP" ? "👥 Group" : "👤 1:1"} · #
                      {s.id}
                    </div>
                    <div className="adm-action-buttons">
                      <button
                        className="adm-btn-action"
                        onClick={() => startEdit(s)}
                        title="Edit"
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="none"
                        >
                          <path
                            d="M11.5 1.5L14.5 4.5L5 14H2V11L11.5 1.5Z"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                      <button
                        className="adm-btn-action adm-btn-action--danger"
                        onClick={() => deleteSession(s.id)}
                        title="Delete"
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="none"
                        >
                          <path
                            d="M2 4H14M6 7V11M10 7V11M3 4L4 13C4 13.5304 4.21071 14.0391 4.58579 14.4142C4.96086 14.7893 5.46957 15 6 15H10C10.5304 15 11.0391 14.7893 11.4142 14.4142C11.7893 14.0391 12 13.5304 12 13L13 4M5 4V2C5 1.73478 5.10536 1.48043 5.29289 1.29289C5.48043 1.10536 5.73478 1 6 1H10C10.2652 1 10.5196 1.10536 10.7071 1.29289C10.8946 1.48043 11 1.73478 11 2V4"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <h3 className="adm-session-card-modern__title">
                    {s.title ||
                      (normType(s.type) === "GROUP"
                        ? "Group Session"
                        : "Lesson")}
                  </h3>
                  <div className="adm-session-card-modern__info">
                    {/* Date/Time */}
                    <div className="adm-info-row">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                      >
                        <path
                          d="M8 14C11.3137 14 14 11.3137 14 8C14 4.68629 11.3137 2 8 2C4.68629 2 2 4.68629 2 8C2 11.3137 4.68629 14 8 14Z"
                          stroke="currentColor"
                          strokeWidth="1.5"
                        />
                        <path
                          d="M8 4V8H11"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />
                      </svg>
                      <span>{fmt(s.startAt)}</span>
                    </div>
                    {/* Learners */}
                    <div className="adm-info-row">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                      >
                        {normType(s.type) === "GROUP" ? (
                          <>
                            <path
                              d="M2 13C2 11 5 9 8 9C11 9 14 11 14 13"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                            />
                            <circle
                              cx="6"
                              cy="5"
                              r="2.2"
                              stroke="currentColor"
                              strokeWidth="1.5"
                            />
                            <circle
                              cx="10"
                              cy="5"
                              r="2.2"
                              stroke="currentColor"
                              strokeWidth="1.5"
                            />
                          </>
                        ) : (
                          <>
                            <circle
                              cx="8"
                              cy="5"
                              r="2.5"
                              stroke="currentColor"
                              strokeWidth="1.5"
                            />
                            <path
                              d="M2 13C2 11 5 9 8 9C11 9 14 11 14 13"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                            />
                          </>
                        )}
                      </svg>
                      <span>{getSessionLearnerDisplay(s)}</span>
                    </div>
                    {/* Teacher */}
                    {s.teacher && (
                      <div className="adm-info-row">
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="none"
                        >
                          <path
                            d="M8 1L14 4L8 7L2 4L8 1Z"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M2 12L8 15L14 12M2 8L8 11L14 8"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        <span>{s.teacher?.name || s.teacher?.email}</span>
                      </div>
                    )}
                    {/* Status badge */}
                    {s.status && s.status !== "scheduled" && (
                      <div className="adm-info-row">
                        <span
                          style={{
                            padding: "2px 8px",
                            borderRadius: 4,
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            background:
                              s.status === "completed"
                                ? "rgba(16, 185, 129, 0.2)"
                                : s.status === "canceled"
                                  ? "rgba(239, 68, 68, 0.2)"
                                  : "rgba(156, 163, 175, 0.2)",
                            color:
                              s.status === "completed"
                                ? "#10b981"
                                : s.status === "canceled"
                                  ? "#ef4444"
                                  : "#9ca3af",
                          }}
                        >
                          {s.status.toUpperCase()}
                        </span>
                      </div>
                    )}
                    {/* Meeting link */}
                    {(s.meetingUrl || s.joinUrl) && (
                      <a
                        href={s.meetingUrl || s.joinUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="adm-meeting-link"
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="none"
                        >
                          <path
                            d="M10 6L14 3.5V12.5L10 10M2 4C2 3.44772 2.44772 3 3 3H10C10.5523 3 11 3.44772 11 4V12C11 12.5523 10.5523 13 10 13H3C2.44772 13 2 12.5523 2 12V4Z"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        Join Meeting
                      </a>
                    )}
                  </div>
                </div>
  );
}
