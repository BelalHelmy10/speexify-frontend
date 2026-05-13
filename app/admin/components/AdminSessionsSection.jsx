"use client";

import { useEffect, useMemo, useState } from "react";
import TimePicker from "@/components/ui/TimePicker";

const SESSION_VIEWS = [
  { key: "all", label: "All" },
  { key: "today", label: "Today" },
  { key: "upcoming", label: "Upcoming" },
  { key: "needsTeacher", label: "Needs teacher" },
  { key: "needsFeedback", label: "Needs feedback" },
  { key: "completed", label: "Completed" },
  { key: "canceled", label: "Canceled" },
  { key: "groups", label: "Groups" },
];

function todayInputValue() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(session) {
  const start = session.startAt ? new Date(session.startAt) : null;
  const end = session.endAt ? new Date(session.endAt) : null;
  if (
    start &&
    end &&
    !Number.isNaN(start.getTime()) &&
    !Number.isNaN(end.getTime())
  ) {
    const minutes = Math.max(0, Math.round((end - start) / 60000));
    if (minutes >= 60 && minutes % 60 === 0) return `${minutes / 60}h`;
    if (minutes > 0) return `${minutes}m`;
  }
  return "60m";
}

function statusLabel(status) {
  return String(status || "scheduled").replace(/_/g, " ");
}

function csvEscape(value) {
  const text = value == null ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function downloadSessionsCsv(sessions, getSessionLearnerDisplay) {
  const headers = [
    "ID",
    "Title",
    "Status",
    "Type",
    "Date",
    "Start",
    "End",
    "Duration",
    "Learners",
    "Teacher",
    "Meeting URL",
  ];
  const rows = sessions.map((s) => [
    s.id,
    s.title || "",
    statusLabel(s.status),
    s.type === "GROUP" ? "Group" : "1:1",
    formatDate(s.startAt),
    formatTime(s.startAt),
    s.endAt ? formatTime(s.endAt) : "",
    formatDuration(s),
    getSessionLearnerDisplay(s),
    s.teacher?.name || s.teacher?.email || "",
    s.meetingUrl || s.joinUrl || "",
  ]);
  const csv = [headers, ...rows]
    .map((row) => row.map(csvEscape).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `speexify-sessions-${todayInputValue()}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function AdminSessionsSection({
  loading,
  sessions,
  total,
  q,
  setQ,
  teacherIdFilter,
  setTeacherIdFilter,
  sessionRangeFilter,
  setSessionRangeFilter,
  sessionTypeFilter,
  setSessionTypeFilter,
  sessionStatusFilter,
  setSessionStatusFilter,
  sessionNeedsTeacher,
  setSessionNeedsTeacher,
  sessionNeedsFeedback,
  setSessionNeedsFeedback,
  sessionLimit,
  setSessionLimit,
  sessionOffset,
  setSessionOffset,
  selectedSessionIds,
  toggleAllSessions,
  toggleSessionSelection,
  teachers,
  from,
  setFrom,
  to,
  setTo,
  editingId,
  normType,
  cancelEdit,
  editForm,
  onEditChange,
  users,
  addParticipant,
  removeParticipant,
  deleteSession,
  updateSession,
  startEdit,
  fmt,
  getSessionLearnerDisplay,
}) {
  const [drawerSessionId, setDrawerSessionId] = useState(null);
  const [drawerMode, setDrawerMode] = useState("overview");
  const [participantDraftId, setParticipantDraftId] = useState("");

  const totalPages = Math.max(1, Math.ceil((total || 0) / sessionLimit));
  const currentPage = Math.floor(sessionOffset / sessionLimit) + 1;
  const visibleStart = total === 0 ? 0 : sessionOffset + 1;
  const visibleEnd = Math.min(total, sessionOffset + sessions.length);
  const allVisibleSelected =
    sessions.length > 0 && sessions.every((s) => selectedSessionIds.has(s.id));
  const activeSession = useMemo(
    () => sessions.find((s) => s.id === drawerSessionId) || null,
    [sessions, drawerSessionId]
  );

  useEffect(() => {
    if (!drawerSessionId) return;
    if (!sessions.some((s) => s.id === drawerSessionId)) {
      setDrawerSessionId(null);
      setDrawerMode("overview");
      setParticipantDraftId("");
      if (editingId) cancelEdit();
    }
  }, [sessions, drawerSessionId, editingId, cancelEdit]);

  const resetOperationalFilters = () => {
    setSessionRangeFilter("");
    setSessionTypeFilter("");
    setSessionStatusFilter("");
    setSessionNeedsTeacher(false);
    setSessionNeedsFeedback(false);
    setTeacherIdFilter("");
    setFrom("");
    setTo("");
  };

  const applyView = (view) => {
    resetOperationalFilters();
    if (view === "today") {
      const today = todayInputValue();
      setFrom(today);
      setTo(today);
    } else if (view === "upcoming") {
      setSessionRangeFilter("upcoming");
    } else if (view === "needsTeacher") {
      setSessionRangeFilter("upcoming");
      setSessionStatusFilter("scheduled");
      setSessionNeedsTeacher(true);
    } else if (view === "needsFeedback") {
      setSessionNeedsFeedback(true);
    } else if (view === "completed") {
      setSessionStatusFilter("completed");
    } else if (view === "canceled") {
      setSessionStatusFilter("canceled");
    } else if (view === "groups") {
      setSessionTypeFilter("GROUP");
    }
  };

  const activeView = useMemo(() => {
    const today = todayInputValue();
    if (from === today && to === today) return "today";
    if (sessionNeedsTeacher) return "needsTeacher";
    if (sessionNeedsFeedback) return "needsFeedback";
    if (sessionRangeFilter === "upcoming") return "upcoming";
    if (sessionStatusFilter === "completed") return "completed";
    if (sessionStatusFilter === "canceled") return "canceled";
    if (sessionTypeFilter === "GROUP") return "groups";
    return "all";
  }, [
    from,
    to,
    sessionNeedsTeacher,
    sessionNeedsFeedback,
    sessionRangeFilter,
    sessionStatusFilter,
    sessionTypeFilter,
  ]);

  const openOverview = (session) => {
    setDrawerSessionId(session.id);
    setDrawerMode("overview");
    setParticipantDraftId("");
    if (editingId && editingId !== session.id) cancelEdit();
  };

  const openEdit = (session) => {
    setDrawerSessionId(session.id);
    setDrawerMode("edit");
    setParticipantDraftId("");
    startEdit(session);
  };

  const closeDrawer = () => {
    setDrawerSessionId(null);
    setDrawerMode("overview");
    setParticipantDraftId("");
    if (editingId) cancelEdit();
  };

  const clearFilters = () => {
    resetOperationalFilters();
    setQ("");
  };

  const handlePageSizeChange = (e) => {
    setSessionLimit(Number(e.target.value));
  };

  const handleAddParticipant = async () => {
    if (!activeSession || !participantDraftId) return;
    await addParticipant(activeSession.id, participantDraftId);
    setParticipantDraftId("");
  };

  return (
    <section className="adm-admin-card adm-sessions-workspace" id="admin-sessions">
      <div className="adm-admin-card__header adm-sessions-workspace__header">
        <div className="adm-admin-card__title-group">
          <div className="adm-admin-card__icon adm-admin-card__icon--accent">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <rect
                x="3"
                y="4"
                width="18"
                height="18"
                rx="2"
                stroke="currentColor"
                strokeWidth="2"
              />
              <path
                d="M3 10H21M8 2V6M16 2V6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <div>
            <h2 className="adm-admin-card__title">Session Operations</h2>
            <p className="adm-admin-card__subtitle">
              {loading
                ? "Loading sessions..."
                : `Showing ${visibleStart}-${visibleEnd} of ${total} sessions`}
            </p>
          </div>
        </div>
        <div className="adm-admin-card__actions">
          <button
            className="adm-btn-secondary adm-btn-secondary--compact"
            onClick={() => downloadSessionsCsv(sessions, getSessionLearnerDisplay)}
            disabled={sessions.length === 0}
          >
            Export CSV
          </button>
          <button
            className="adm-btn-primary adm-btn-primary--compact"
            onClick={() =>
              document
                .querySelector(".adm-modern-form")
                ?.scrollIntoView({ behavior: "smooth" })
            }
          >
            Create Session
          </button>
        </div>
      </div>

      <div className="adm-session-views" aria-label="Session views">
        {SESSION_VIEWS.map((view) => (
          <button
            key={view.key}
            type="button"
            className={`adm-session-view ${
              activeView === view.key ? "is-active" : ""
            }`}
            onClick={() => applyView(view.key)}
            aria-pressed={activeView === view.key}
          >
            {view.label}
          </button>
        ))}
      </div>

      <div className="adm-sessions-filters">
        <div className="adm-search-box adm-sessions-filters__search">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M7 13C10.3137 13 13 10.3137 13 7C13 3.68629 10.3137 1 7 1C3.68629 1 1 3.68629 1 7C1 10.3137 3.68629 13 7 13Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <path
              d="M11.5 11.5L15 15"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          <input
            type="text"
            placeholder="Search title or meeting link..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <select
          className="adm-filter-select"
          value={teacherIdFilter}
          onChange={(e) => setTeacherIdFilter(e.target.value)}
        >
          <option value="">All teachers</option>
          {teachers.map((teacher) => (
            <option key={teacher.id} value={teacher.id}>
              {teacher.name || teacher.email}
            </option>
          ))}
        </select>

        <select
          className="adm-filter-select"
          value={sessionTypeFilter}
          onChange={(e) => setSessionTypeFilter(e.target.value)}
        >
          <option value="">All types</option>
          <option value="ONE_ON_ONE">1:1</option>
          <option value="GROUP">Group</option>
        </select>

        <select
          className="adm-filter-select"
          value={sessionStatusFilter}
          onChange={(e) => setSessionStatusFilter(e.target.value)}
        >
          <option value="">All statuses</option>
          <option value="scheduled">Scheduled</option>
          <option value="completed">Completed</option>
          <option value="canceled">Canceled</option>
        </select>

        <input
          type="date"
          className="adm-filter-select"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          aria-label="From date"
        />
        <input
          type="date"
          className="adm-filter-select"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          aria-label="To date"
        />

        <button
          type="button"
          className="adm-btn-secondary adm-btn-secondary--compact"
          onClick={clearFilters}
        >
          Clear
        </button>
      </div>

      <div className="adm-session-table-shell">
        <div
          className="adm-session-table-wrap"
          data-lenis-prevent
          data-scroll-chain="page"
        >
          <table className="adm-session-table">
            <thead>
              <tr>
                <th className="adm-session-table__select">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleAllSessions}
                    aria-label="Select all visible sessions"
                  />
                </th>
                <th>Session</th>
                <th>Status</th>
                <th>When</th>
                <th>Learners</th>
                <th>Teacher</th>
                <th>Duration</th>
                <th>Meeting</th>
                <th className="adm-session-table__actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, index) => (
                  <tr key={index} className="adm-session-row is-loading">
                    <td colSpan={9}>
                      <div className="adm-session-row-skeleton" />
                    </td>
                  </tr>
                ))
              ) : sessions.length === 0 ? (
                <tr>
                  <td colSpan={9}>
                    <div className="adm-empty adm-session-empty">
                      No sessions found for this view. Try clearing filters or
                      changing the date range.
                    </div>
                  </td>
                </tr>
              ) : (
                sessions.map((session) => {
                  const type = normType(session.type);
                  const status = String(session.status || "scheduled");
                  const isSelected = selectedSessionIds.has(session.id);

                  return (
                    <tr
                      key={session.id}
                      className={`adm-session-row adm-session-row--${status} ${
                        isSelected ? "is-selected" : ""
                      }`}
                    >
                      <td className="adm-session-table__select">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSessionSelection(session.id)}
                          aria-label={`Select session ${session.id}`}
                        />
                      </td>
                      <td>
                        <button
                          type="button"
                          className="adm-session-title-button"
                          onClick={() => openOverview(session)}
                        >
                          <span className="adm-session-title-button__title">
                            {session.title ||
                              (type === "GROUP" ? "Group Session" : "Lesson")}
                          </span>
                          <span className="adm-session-title-button__meta">
                            #{session.id} - {type === "GROUP" ? "Group" : "1:1"}
                          </span>
                        </button>
                      </td>
                      <td>
                        <span
                          className={`adm-session-status adm-session-status--${status}`}
                        >
                          <span className="adm-session-status__dot" />
                          {statusLabel(status)}
                        </span>
                      </td>
                      <td>
                        <div className="adm-session-date-cell">
                          <strong>{formatDate(session.startAt)}</strong>
                          <span>
                            {formatTime(session.startAt)}
                            {session.endAt ? ` - ${formatTime(session.endAt)}` : ""}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className="adm-session-muted">
                          {getSessionLearnerDisplay(session)}
                        </span>
                      </td>
                      <td>
                        {session.teacher ? (
                          <span>{session.teacher.name || session.teacher.email}</span>
                        ) : (
                          <span className="adm-session-warning">Unassigned</span>
                        )}
                      </td>
                      <td>{formatDuration(session)}</td>
                      <td>
                        {session.meetingUrl || session.joinUrl ? (
                          <a
                            className="adm-session-link"
                            href={session.meetingUrl || session.joinUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Open
                          </a>
                        ) : (
                          <span className="adm-session-muted">None</span>
                        )}
                      </td>
                      <td>
                        <div className="adm-session-row-actions">
                          <button
                            type="button"
                            className="adm-btn-action"
                            onClick={() => openOverview(session)}
                            title="View session"
                          >
                            <span className="sr-only">View</span>
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                              <path
                                d="M1.5 8C3.1 5.2 5.25 3.8 8 3.8C10.75 3.8 12.9 5.2 14.5 8C12.9 10.8 10.75 12.2 8 12.2C5.25 12.2 3.1 10.8 1.5 8Z"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinejoin="round"
                              />
                              <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.5" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            className="adm-btn-action"
                            onClick={() => openEdit(session)}
                            title="Edit session"
                          >
                            <span className="sr-only">Edit</span>
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
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
                            type="button"
                            className="adm-btn-action adm-btn-action--danger"
                            onClick={() => deleteSession(session.id)}
                            title="Delete session"
                          >
                            <span className="sr-only">Delete</span>
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
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
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="adm-session-pagination">
          <div>
            <strong>{total}</strong> total sessions
            {selectedSessionIds.size > 0 ? (
              <span> - {selectedSessionIds.size} selected</span>
            ) : null}
          </div>
          <div className="adm-session-pagination__controls">
            <select
              className="adm-filter-select adm-filter-select--compact"
              value={sessionLimit}
              onChange={handlePageSizeChange}
              aria-label="Rows per page"
            >
              <option value={25}>25 rows</option>
              <option value={50}>50 rows</option>
              <option value={100}>100 rows</option>
            </select>
            <button
              className="adm-btn-secondary adm-btn-secondary--compact"
              disabled={currentPage <= 1}
              onClick={() =>
                setSessionOffset(Math.max(0, sessionOffset - sessionLimit))
              }
            >
              Prev
            </button>
            <span>
              Page {currentPage} of {totalPages}
            </span>
            <button
              className="adm-btn-secondary adm-btn-secondary--compact"
              disabled={currentPage >= totalPages}
              onClick={() => setSessionOffset(sessionOffset + sessionLimit)}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {activeSession && (
        <div className="adm-session-drawer-layer" role="presentation">
          <button
            className="adm-session-drawer-backdrop"
            type="button"
            aria-label="Close session details"
            onClick={closeDrawer}
          />
          <aside
            className="adm-session-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-session-drawer-title"
          >
            <div className="adm-session-drawer__header">
              <div>
                <span
                  className={`adm-session-status adm-session-status--${
                    activeSession.status || "scheduled"
                  }`}
                >
                  <span className="adm-session-status__dot" />
                  {statusLabel(activeSession.status)}
                </span>
                <h3 id="admin-session-drawer-title">
                  {activeSession.title ||
                    (normType(activeSession.type) === "GROUP"
                      ? "Group Session"
                      : "Lesson")}
                </h3>
                <p>Session #{activeSession.id}</p>
              </div>
              <button
                type="button"
                className="adm-btn-action"
                onClick={closeDrawer}
                title="Close"
              >
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

            <div className="adm-session-drawer__tabs">
              <button
                type="button"
                className={drawerMode === "overview" ? "is-active" : ""}
                onClick={() => {
                  setDrawerMode("overview");
                  if (editingId) cancelEdit();
                }}
              >
                Overview
              </button>
              <button
                type="button"
                className={drawerMode === "edit" ? "is-active" : ""}
                onClick={() => openEdit(activeSession)}
              >
                Edit
              </button>
            </div>

            {drawerMode === "overview" ? (
              <div className="adm-session-drawer__body">
                <dl className="adm-session-detail-grid">
                  <div>
                    <dt>When</dt>
                    <dd>
                      {fmt(activeSession.startAt)}
                      {activeSession.endAt
                        ? ` - ${formatTime(activeSession.endAt)}`
                        : ""}
                    </dd>
                  </div>
                  <div>
                    <dt>Duration</dt>
                    <dd>{formatDuration(activeSession)}</dd>
                  </div>
                  <div>
                    <dt>Type</dt>
                    <dd>
                      {normType(activeSession.type) === "GROUP"
                        ? "Group"
                        : "1:1"}
                    </dd>
                  </div>
                  <div>
                    <dt>Teacher</dt>
                    <dd>
                      {activeSession.teacher?.name ||
                        activeSession.teacher?.email ||
                        "Unassigned"}
                    </dd>
                  </div>
                  <div>
                    <dt>Learners</dt>
                    <dd>{getSessionLearnerDisplay(activeSession)}</dd>
                  </div>
                  <div>
                    <dt>Meeting</dt>
                    <dd>
                      {activeSession.meetingUrl || activeSession.joinUrl ? (
                        <a
                          className="adm-session-link"
                          href={activeSession.meetingUrl || activeSession.joinUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open meeting link
                        </a>
                      ) : (
                        "No meeting link"
                      )}
                    </dd>
                  </div>
                </dl>

                <div className="adm-session-participants">
                  <h4>Participants</h4>
                  {activeSession.learners?.length ? (
                    activeSession.learners.map((learner) => (
                      <div key={learner.id} className="adm-session-participant">
                        <span>
                          {learner.name || learner.email || `Learner ${learner.id}`}
                        </span>
                        <small>{learner.email}</small>
                      </div>
                    ))
                  ) : (
                    <p>No participants attached.</p>
                  )}
                </div>

                {activeSession.notes ? (
                  <div className="adm-session-notes">
                    <h4>Notes</h4>
                    <p>{activeSession.notes}</p>
                  </div>
                ) : null}

                <div className="adm-session-drawer__actions">
                  <button
                    type="button"
                    className="adm-btn-secondary"
                    onClick={() => openEdit(activeSession)}
                  >
                    Edit session
                  </button>
                  <button
                    type="button"
                    className="adm-btn-danger"
                    onClick={() => deleteSession(activeSession.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ) : (
              <div className="adm-session-drawer__body">
                <div className="adm-form-grid adm-form-grid--drawer">
                  {normType(editForm.type) === "ONE_ON_ONE" && (
                    <div className="adm-form-field adm-form-field--full">
                      <label className="adm-form-label">Learner</label>
                      <select
                        name="userId"
                        className="adm-form-input"
                        value={editForm.userId}
                        onChange={onEditChange}
                      >
                        <option value="">Select learner...</option>
                        {users.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.name ? `${user.name} - ${user.email}` : user.email}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {normType(editForm.type) === "GROUP" && (
                    <>
                      <div className="adm-form-field">
                        <label className="adm-form-label">Capacity</label>
                        <input
                          type="number"
                          name="capacity"
                          className="adm-form-input"
                          value={editForm.capacity}
                          onChange={onEditChange}
                          min="1"
                        />
                      </div>
                      <div className="adm-form-field adm-form-field--full">
                        <label className="adm-form-label">Participants</label>
                        <div className="adm-session-edit-participants">
                          {editForm.learnerIds.length ? (
                            editForm.learnerIds.map((learnerId) => {
                              const learner = users.find(
                                (user) => String(user.id) === String(learnerId)
                              );
                              return (
                                <span
                                  key={learnerId}
                                  className="adm-session-edit-participant"
                                >
                                  {learner?.name || learner?.email || learnerId}
                                  <button
                                    type="button"
                                    onClick={() =>
                                      removeParticipant(activeSession.id, learnerId)
                                    }
                                    aria-label="Remove participant"
                                  >
                                    x
                                  </button>
                                </span>
                              );
                            })
                          ) : (
                            <span className="adm-session-muted">
                              No participants selected
                            </span>
                          )}
                        </div>
                        <div className="adm-session-add-participant">
                          <select
                            className="adm-form-input"
                            value={participantDraftId}
                            onChange={(e) => setParticipantDraftId(e.target.value)}
                          >
                            <option value="">Add learner...</option>
                            {users
                              .filter(
                                (user) =>
                                  !editForm.learnerIds.includes(String(user.id))
                              )
                              .map((user) => (
                                <option key={user.id} value={user.id}>
                                  {user.name
                                    ? `${user.name} - ${user.email}`
                                    : user.email}
                                </option>
                              ))}
                          </select>
                          <button
                            type="button"
                            className="adm-btn-secondary adm-btn-secondary--compact"
                            onClick={handleAddParticipant}
                            disabled={!participantDraftId}
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    </>
                  )}

                  <div className="adm-form-field">
                    <label className="adm-form-label">Teacher</label>
                    <select
                      name="teacherId"
                      className="adm-form-input"
                      value={editForm.teacherId}
                      onChange={onEditChange}
                    >
                      <option value="">Unassigned</option>
                      {teachers.map((teacher) => (
                        <option key={teacher.id} value={teacher.id}>
                          {teacher.name || teacher.email}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="adm-form-field adm-form-field--full">
                    <label className="adm-form-label">Title</label>
                    <input
                      name="title"
                      className="adm-form-input"
                      value={editForm.title}
                      onChange={onEditChange}
                    />
                  </div>

                  <div className="adm-form-field">
                    <label className="adm-form-label">Date</label>
                    <input
                      type="date"
                      name="date"
                      className="adm-form-input"
                      value={editForm.date}
                      onChange={onEditChange}
                    />
                  </div>

                  <div className="adm-form-field">
                    <label className="adm-form-label">Start time</label>
                    <TimePicker
                      name="startTime"
                      value={editForm.startTime}
                      onChange={onEditChange}
                    />
                  </div>

                  <div className="adm-form-field">
                    <label className="adm-form-label">End time</label>
                    <TimePicker
                      name="endTime"
                      value={editForm.endTime}
                      onChange={onEditChange}
                    />
                  </div>

                  <div className="adm-form-field">
                    <label className="adm-form-label">Duration (min)</label>
                    <input
                      type="number"
                      name="duration"
                      className="adm-form-input"
                      value={editForm.duration}
                      onChange={onEditChange}
                      min="15"
                      step="15"
                      disabled={!!editForm.endTime}
                    />
                  </div>

                  <div className="adm-form-field adm-form-field--full">
                    <label className="adm-form-label">Meeting URL</label>
                    <input
                      name="meetingUrl"
                      className="adm-form-input"
                      value={editForm.meetingUrl}
                      onChange={onEditChange}
                    />
                  </div>
                </div>

                <div className="adm-session-drawer__actions">
                  <button
                    type="button"
                    className="adm-btn-secondary"
                    onClick={closeDrawer}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="adm-btn-primary"
                    onClick={() => updateSession(activeSession.id)}
                  >
                    Save changes
                  </button>
                </div>
              </div>
            )}
          </aside>
        </div>
      )}
    </section>
  );
}
