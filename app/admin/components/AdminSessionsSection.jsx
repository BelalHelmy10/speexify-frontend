"use client";

import AdminSessionEditCard from "./AdminSessionEditCard";
import AdminSessionViewCard from "./AdminSessionViewCard";

export default function AdminSessionsSection({
  loading,
  sessions,
  total,
  q,
  setQ,
  teacherIdFilter,
  setTeacherIdFilter,
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
  setEditForm,
  toast,
  addParticipant,
  removeParticipant,
  deleteSession,
  updateSession,
  startEdit,
  fmt,
  getSessionLearnerDisplay,
}) {
  return (
    <section className="adm-admin-card">
      <div className="adm-admin-card__header">
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
            <h2 className="adm-admin-card__title">All Sessions</h2>
            <p className="adm-admin-card__subtitle">
              {loading ? "Loading..." : `${sessions.length} of ${total} sessions`}
            </p>
          </div>
        </div>
        <div className="adm-admin-card__actions">
          <div className="adm-search-box">
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
              placeholder="Search sessions..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <select
            className="adm-filter-select"
            value={teacherIdFilter}
            onChange={(e) => setTeacherIdFilter(e.target.value)}
          >
            <option value="">All Teachers</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name || t.email}
              </option>
            ))}
          </select>
          <input
            type="date"
            className="adm-filter-select"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            placeholder="From"
          />
          <input
            type="date"
            className="adm-filter-select"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="To"
          />
          <button
            className="adm-btn-primary"
            onClick={() =>
              document
                .querySelector(".adm-modern-form")
                ?.scrollIntoView({ behavior: "smooth" })
            }
          >
            + Create Session
          </button>
        </div>
      </div>

      <div className="adm-sessions-grid adm-sessions-grid--scrollable" data-lenis-prevent>
        {loading ? (
          <div className="adm-sessions-skeleton">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="adm-session-card-skeleton skeleton-card">
                <div className="skeleton skeleton--chip" />
                <div className="skeleton skeleton--title" />
                <div className="skeleton skeleton--text" />
                <div className="skeleton skeleton--text" />
              </div>
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <div className="adm-empty">
            No sessions found for this filter. Try changing the search, date range,
            or teacher.
          </div>
        ) : (
          sessions.map((s) =>
            editingId === s.id ? (
              <AdminSessionEditCard
                key={s.id}
                s={s}
                normType={normType}
                cancelEdit={cancelEdit}
                editForm={editForm}
                onEditChange={onEditChange}
                users={users}
                setEditForm={setEditForm}
                toast={toast}
                addParticipant={addParticipant}
                removeParticipant={removeParticipant}
                teachers={teachers}
                deleteSession={deleteSession}
                updateSession={updateSession}
              />
            ) : (
              <AdminSessionViewCard
                key={s.id}
                s={s}
                normType={normType}
                startEdit={startEdit}
                deleteSession={deleteSession}
                fmt={fmt}
                getSessionLearnerDisplay={getSessionLearnerDisplay}
              />
            )
          )
        )}
      </div>
    </section>
  );
}
