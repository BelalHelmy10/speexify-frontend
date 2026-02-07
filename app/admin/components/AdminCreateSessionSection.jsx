"use client";

import TimePicker from "@/components/ui/TimePicker";

export default function AdminCreateSessionSection({
  form,
  teachers,
  users,
  normType,
  onCreateChange,
  onCreateLearnersChange,
  createSession,
  setForm,
  setShowBulkScheduler,
}) {
  return (
    <section className="adm-admin-card">
      <div className="adm-admin-card__header">
        <div className="adm-admin-card__title-group">
          <div className="adm-admin-card__icon adm-admin-card__icon--success">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 5V19M5 12H19"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <div>
            <h2 className="adm-admin-card__title">Create New Session</h2>
            <p className="adm-admin-card__subtitle">
              {normType(form.type) === "GROUP"
                ? "Schedule a group session with multiple learners"
                : "Schedule a 1:1 session for a learner"}
            </p>
          </div>
        </div>
        <div className="adm-admin-card__actions">
          <button
            type="button"
            className="adm-btn-primary"
            onClick={() => setShowBulkScheduler(true)}
          >
            📅 Bulk Schedule
          </button>
        </div>
      </div>

      <form onSubmit={createSession} className="adm-modern-form">
        <div className="adm-form-grid">
          <div className="adm-form-field">
            <label className="adm-form-label">Session Type</label>
            <select
              name="type"
              className="adm-form-input"
              value={form.type}
              onChange={onCreateChange}
            >
              <option value="ONE_ON_ONE">👤 One-on-One (1:1)</option>
              <option value="GROUP">👥 Group Session</option>
            </select>
          </div>

          <div className="adm-form-field">
            <label className="adm-form-label">Teacher</label>
            <select
              name="teacherId"
              className="adm-form-input"
              value={form.teacherId}
              onChange={onCreateChange}
            >
              <option value="">Select teacher (optional)</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name || t.email}
                </option>
              ))}
            </select>
          </div>

          {normType(form.type) === "ONE_ON_ONE" && (
            <div className="adm-form-field">
              <label className="adm-form-label">
                Learner<span className="adm-form-required">*</span>
              </label>
              <select
                name="userId"
                className="adm-form-input"
                value={form.userId}
                onChange={onCreateChange}
                required
              >
                <option value="">Select learner...</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name ? `${u.name} — ${u.email}` : u.email}
                  </option>
                ))}
              </select>
            </div>
          )}

          {normType(form.type) === "GROUP" && (
            <>
              <div className="adm-form-field">
                <label className="adm-form-label">Capacity</label>
                <input
                  type="number"
                  name="capacity"
                  className="adm-form-input"
                  value={form.capacity}
                  onChange={onCreateChange}
                  min="1"
                  max="100"
                  placeholder="Max participants (optional)"
                />
              </div>
              <div className="adm-form-field adm-form-field--full">
                <label className="adm-form-label">
                  Participants<span className="adm-form-required">*</span>
                  <span style={{ fontWeight: 400, marginLeft: 8, opacity: 0.7 }}>
                    ({form.learnerIds.length} selected)
                  </span>
                </label>
                <select
                  multiple
                  className="adm-form-input"
                  value={form.learnerIds}
                  onChange={onCreateLearnersChange}
                  required
                  style={{ minHeight: 160 }}
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name ? `${u.name} — ${u.email}` : u.email}
                    </option>
                  ))}
                </select>
                <small style={{ opacity: 0.6, marginTop: 4, display: "block" }}>
                  Hold Ctrl/Cmd to select multiple learners
                </small>
              </div>
            </>
          )}

          <div className="adm-form-field adm-form-field--full">
            <label className="adm-form-label">
              Session Title<span className="adm-form-required">*</span>
            </label>
            <input
              name="title"
              className="adm-form-input"
              value={form.title}
              onChange={onCreateChange}
              placeholder={
                normType(form.type) === "GROUP"
                  ? "e.g., Speaking Practice Group"
                  : "e.g., Grammar Review"
              }
              required
            />
          </div>

          <div className="adm-form-field">
            <label className="adm-form-label">
              Date<span className="adm-form-required">*</span>
            </label>
            <input
              type="date"
              name="date"
              className="adm-form-input"
              value={form.date}
              onChange={onCreateChange}
              required
            />
          </div>
          <div className="adm-form-field">
            <label className="adm-form-label">
              Start Time<span className="adm-form-required">*</span>
            </label>
            <TimePicker
              name="startTime"
              value={form.startTime}
              onChange={onCreateChange}
              required
            />
          </div>
          <div className="adm-form-field">
            <label className="adm-form-label">End Time</label>
            <TimePicker
              name="endTime"
              value={form.endTime}
              onChange={onCreateChange}
            />
          </div>
          <div className="adm-form-field">
            <label className="adm-form-label">Duration (minutes)</label>
            <input
              type="number"
              name="duration"
              className="adm-form-input"
              value={form.duration}
              onChange={onCreateChange}
              min="15"
              step="15"
              disabled={!!form.endTime}
            />
          </div>

          <div className="adm-form-field adm-form-field--full">
            <label className="adm-form-label">Meeting URL</label>
            <input
              name="meetingUrl"
              className="adm-form-input"
              value={form.meetingUrl}
              onChange={onCreateChange}
              placeholder="https://meet.google.com/... (leave empty for built-in classroom)"
            />
          </div>

          <div className="adm-form-field adm-form-field--full">
            <label className="adm-form-label">Notes</label>
            <textarea
              name="notes"
              className="adm-form-textarea"
              value={form.notes}
              onChange={onCreateChange}
              rows={3}
              placeholder="Additional notes for this session..."
            />
          </div>
        </div>

        <div className="adm-form-actions">
          <button type="submit" className="adm-btn-primary">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M8 3V13M3 8H13"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            Create {normType(form.type) === "GROUP" ? "Group " : ""}Session
          </button>

          <button
            type="button"
            className="adm-btn-secondary"
            onClick={() =>
              setForm((f) => ({
                ...f,
                type: "ONE_ON_ONE",
                userId: "",
                learnerIds: [],
                capacity: "",
                title: "",
                startTime: "",
                endTime: "",
                duration: "60",
                meetingUrl: "",
                notes: "",
              }))
            }
          >
            Clear Form
          </button>
        </div>
      </form>
    </section>
  );
}
