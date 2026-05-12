"use client";

import TimePicker from "@/components/ui/TimePicker";

function PreviewBadge({ tone = "neutral", children }) {
  return <span className={`adm-scheduler-badge adm-scheduler-badge--${tone}`}>{children}</span>;
}

function formatSlot(slot) {
  if (!slot) return "No matching slot";
  return `${slot.startTime}-${slot.endTime}${slot.timezone ? ` ${slot.timezone}` : ""}`;
}

function formatDateTime(value) {
  if (!value) return "Not selected";
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return String(value);
  }
}

function SchedulerPreview({
  preview,
  loading,
  error,
  adminTimezone,
  form,
  onCreateChange,
}) {
  if (loading) {
    return (
      <div className="adm-scheduler-preview adm-scheduler-preview--loading">
        Checking availability, conflicts, credits, and notifications...
      </div>
    );
  }

  if (error) {
    return (
      <div className="adm-scheduler-preview adm-scheduler-preview--error">
        {error}
      </div>
    );
  }

  if (!preview) {
    return (
      <div className="adm-scheduler-preview adm-scheduler-preview--empty">
        Complete the learner, date, and time to preview the booking.
      </div>
    );
  }

  const availability = preview.availability || {};
  const creditRows = preview.credit?.learners || [];
  const hasCreditIssue = preview.credit?.requiresOverride;
  const teacherConflictCount = preview.conflicts?.teacher?.length || 0;
  const learnerConflictCount = (preview.conflicts?.learners || []).reduce(
    (sum, entry) => sum + (entry.conflicts?.length || 0),
    0
  );
  const notificationRecipients = preview.notifications?.recipients || [];
  const availabilityTone =
    availability.status === "available"
      ? "success"
      : availability.status === "unassigned"
        ? "neutral"
        : availability.status === "partial"
          ? "warning"
          : "danger";

  return (
    <div className="adm-scheduler-preview">
      <div className="adm-scheduler-preview__header">
        <div>
          <h3>Scheduling Preview</h3>
          <p>
            {formatDateTime(preview.schedule?.startAt)} -{" "}
            {formatDateTime(preview.schedule?.endAt)}
          </p>
        </div>
        <PreviewBadge tone={preview.canCreate ? "success" : "danger"}>
          {preview.canCreate ? "Ready to create" : "Needs attention"}
        </PreviewBadge>
      </div>

      {(preview.blockers?.length > 0 || preview.warnings?.length > 0) && (
        <div className="adm-scheduler-alerts">
          {preview.blockers?.map((item) => (
            <div key={item} className="adm-scheduler-alert adm-scheduler-alert--danger">
              {item}
            </div>
          ))}
          {preview.warnings?.map((item) => (
            <div key={item} className="adm-scheduler-alert adm-scheduler-alert--warning">
              {item}
            </div>
          ))}
        </div>
      )}

      <div className="adm-scheduler-grid">
        <div className="adm-scheduler-panel">
          <div className="adm-scheduler-panel__top">
            <span>Teacher Availability</span>
            <PreviewBadge tone={availabilityTone}>{availability.label}</PreviewBadge>
          </div>
          <p>{availability.message}</p>
          <div className="adm-scheduler-meta">
            <span>Best match</span>
            <strong>{formatSlot(availability.matchingSlots?.[0])}</strong>
          </div>
          {availability.sameDaySlots?.length > 0 && (
            <div className="adm-scheduler-slot-list">
              {availability.sameDaySlots.slice(0, 4).map((slot) => (
                <span key={slot.id}>{formatSlot(slot)}</span>
              ))}
            </div>
          )}
        </div>

        <div className="adm-scheduler-panel">
          <div className="adm-scheduler-panel__top">
            <span>Conflicts</span>
            <PreviewBadge
              tone={teacherConflictCount + learnerConflictCount > 0 ? "danger" : "success"}
            >
              {teacherConflictCount + learnerConflictCount > 0 ? "Conflict" : "Clear"}
            </PreviewBadge>
          </div>
          <p>
            {teacherConflictCount} teacher conflict{teacherConflictCount === 1 ? "" : "s"} ·{" "}
            {learnerConflictCount} learner conflict{learnerConflictCount === 1 ? "" : "s"}
          </p>
          {preview.conflicts?.learners?.slice(0, 3).map((entry) => (
            <div key={entry.learner.id} className="adm-scheduler-conflict-row">
              <strong>{entry.learner.name || entry.learner.email}</strong>
              <span>{entry.conflicts.length} overlapping session(s)</span>
            </div>
          ))}
        </div>

        <div className="adm-scheduler-panel">
          <div className="adm-scheduler-panel__top">
            <span>Credits</span>
            <PreviewBadge tone={hasCreditIssue ? "danger" : "success"}>
              {hasCreditIssue ? "Override needed" : "Enough credits"}
            </PreviewBadge>
          </div>
          <div className="adm-credit-preview-list">
            {creditRows.map((row) => (
              <div key={row.userId} className="adm-credit-preview-row">
                <span>{row.name || row.email}</span>
                <strong className={row.hasCredit ? "" : "is-danger"}>
                  {row.remaining} now · {row.afterBooking} after
                </strong>
              </div>
            ))}
          </div>
        </div>

        <div className="adm-scheduler-panel">
          <div className="adm-scheduler-panel__top">
            <span>Notifications</span>
            <PreviewBadge tone={notificationRecipients.length ? "success" : "neutral"}>
              {notificationRecipients.length} recipient{notificationRecipients.length === 1 ? "" : "s"}
            </PreviewBadge>
          </div>
          <p>{preview.notifications?.meetingMode}</p>
          <div className="adm-scheduler-slot-list">
            {notificationRecipients.slice(0, 5).map((recipient) => (
              <span key={`${recipient.role}-${recipient.userId}`}>
                {recipient.role}: {recipient.name || recipient.email}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="adm-timezone-strip">
        <span>Admin: {adminTimezone}</span>
        <span>Teacher: {preview.timezones?.teacher || "Not set"}</span>
        <span>
          Learners:{" "}
          {preview.timezones?.learners?.length
            ? Array.from(
                new Set(
                  preview.timezones.learners.map((learner) => learner.timezone || "Not set")
                )
              ).join(", ")
            : "Not selected"}
        </span>
      </div>

      {hasCreditIssue && (
        <div className="adm-credit-override">
          <label className="adm-credit-override__toggle">
            <input
              type="checkbox"
              name="allowNoCredit"
              checked={!!form.allowNoCredit}
              onChange={onCreateChange}
            />
            <span>Allow no-credit booking</span>
          </label>
          {form.allowNoCredit && (
            <textarea
              name="allowNoCreditReason"
              className="adm-form-textarea"
              value={form.allowNoCreditReason}
              onChange={onCreateChange}
              rows={2}
              placeholder="Required reason for audit trail..."
              required
            />
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminCreateSessionSection({
  form,
  teachers,
  users,
  normType,
  onCreateChange,
  onCreateLearnersChange,
  createSession,
  creatingSession,
  sessionPreview,
  sessionPreviewLoading,
  sessionPreviewError,
  adminTimezone,
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
            <label className="adm-form-label">
              Duration (minutes)
              <span className="adm-form-label__hint">{adminTimezone}</span>
            </label>
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

        <SchedulerPreview
          preview={sessionPreview}
          loading={sessionPreviewLoading}
          error={sessionPreviewError}
          adminTimezone={adminTimezone}
          form={form}
          onCreateChange={onCreateChange}
        />

        <div className="adm-form-actions">
          <button
            type="submit"
            className="adm-btn-primary"
            disabled={creatingSession}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M8 3V13M3 8H13"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            {creatingSession
              ? "Creating..."
              : `Create ${normType(form.type) === "GROUP" ? "Group " : ""}Session`}
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
                allowNoCredit: false,
                allowNoCreditReason: "",
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
