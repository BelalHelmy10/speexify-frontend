"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Bell,
  CalendarPlus,
  CheckCircle2,
  Clock,
  CreditCard,
  FileText,
  Link,
  Loader2,
  Search,
  ShieldAlert,
  User,
  Users,
  Video,
  X,
} from "lucide-react";
import TimePicker from "@/components/ui/TimePicker";

const DURATION_OPTIONS = ["30", "45", "60", "90"];

function PreviewBadge({ tone = "neutral", children }) {
  return (
    <span className={`adm-scheduler-badge adm-scheduler-badge--${tone}`}>
      {children}
    </span>
  );
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

function personLabel(person) {
  if (!person) return "";
  return person.name ? `${person.name} - ${person.email}` : person.email;
}

function filterPeople(people, query, excludeIds = []) {
  const normalized = query.trim().toLowerCase();
  const excluded = new Set(excludeIds.map(String));
  return people
    .filter((person) => !excluded.has(String(person.id)))
    .filter((person) => {
      if (!normalized) return true;
      return `${person.name || ""} ${person.email || ""} ${person.timezone || ""}`
        .toLowerCase()
        .includes(normalized);
    });
}

function emitChange(name, value, type = "text") {
  return {
    target: {
      name,
      value,
      type,
      checked: type === "checkbox" ? Boolean(value) : undefined,
    },
  };
}

function PersonOption({ person, onSelect }) {
  return (
    <button
      type="button"
      className="adm-person-option"
      onClick={() => onSelect(String(person.id))}
    >
      <span className="adm-person-option__avatar">
        {(person.name || person.email || "?").slice(0, 2).toUpperCase()}
      </span>
      <span className="adm-person-option__body">
        <strong>{person.name || "Unnamed user"}</strong>
        <small>{person.email}</small>
      </span>
      <span className="adm-person-option__meta">
        {person.timezone || "No timezone"}
      </span>
    </button>
  );
}

function PersonPicker({
  label,
  people,
  value,
  onChange,
  placeholder,
  required = false,
  emptyText = "No matching users",
}) {
  const [query, setQuery] = useState("");
  const selected = people.find((person) => String(person.id) === String(value));
  const results = useMemo(
    () => filterPeople(people, query, selected ? [selected.id] : []),
    [people, query, selected]
  );

  return (
    <div className="adm-form-field adm-person-picker">
      <label className="adm-form-label">
        {label}
        {required && <span className="adm-form-required">*</span>}
      </label>

      {selected ? (
        <div className="adm-person-selected">
          <PersonOption person={selected} onSelect={() => {}} />
          <button
            type="button"
            className="adm-person-selected__clear"
            onClick={() => onChange("")}
            aria-label={`Clear ${label}`}
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <>
          <div className="adm-search-control">
            <Search size={16} />
            <input
              type="search"
              className="adm-form-input"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={placeholder}
              aria-label={label}
            />
          </div>
          <div className="adm-person-results">
            <div className="adm-person-results__summary">
              Showing {results.length} matching {results.length === 1 ? "person" : "people"}
            </div>
            {results.length > 0 ? (
              results.map((person) => (
                <PersonOption
                  key={person.id}
                  person={person}
                  onSelect={(nextValue) => {
                    onChange(nextValue);
                    setQuery("");
                  }}
                />
              ))
            ) : (
              <div className="adm-person-results__empty">{emptyText}</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function LearnerMultiPicker({ learners, selectedIds, capacity, setForm }) {
  const [query, setQuery] = useState("");
  const selectedSet = useMemo(
    () => new Set((selectedIds || []).map(String)),
    [selectedIds]
  );
  const selectedLearners = useMemo(
    () => learners.filter((learner) => selectedSet.has(String(learner.id))),
    [learners, selectedSet]
  );
  const results = useMemo(
    () => filterPeople(learners, query, selectedIds),
    [learners, query, selectedIds]
  );
  const capacityNumber = capacity ? Number(capacity) : null;
  const isOverCapacity =
    Number.isFinite(capacityNumber) && selectedLearners.length > capacityNumber;

  const addLearner = (id) => {
    const next = Array.from(new Set([...(selectedIds || []), String(id)]));
    setForm((current) => ({ ...current, learnerIds: next }));
    setQuery("");
  };

  const removeLearner = (id) => {
    setForm((current) => ({
      ...current,
      learnerIds: current.learnerIds.filter(
        (learnerId) => String(learnerId) !== String(id)
      ),
    }));
  };

  return (
    <div className="adm-form-field adm-form-field--full adm-learner-picker">
      <div className="adm-field-heading">
        <label className="adm-form-label">
          Participants<span className="adm-form-required">*</span>
        </label>
        <span className={isOverCapacity ? "is-danger" : ""}>
          {selectedLearners.length}
          {capacityNumber ? ` / ${capacityNumber}` : ""} selected
        </span>
      </div>

      {selectedLearners.length > 0 && (
        <div className="adm-selected-chips">
          {selectedLearners.map((learner) => (
            <span key={learner.id} className="adm-selected-chip">
              <span>{personLabel(learner)}</span>
              <button
                type="button"
                onClick={() => removeLearner(learner.id)}
                aria-label={`Remove ${personLabel(learner)}`}
              >
                <X size={14} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="adm-search-control">
        <Search size={16} />
        <input
          type="search"
          className="adm-form-input"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search learners by name, email, or timezone"
        />
      </div>

      <div className="adm-person-results adm-person-results--grid">
        <div className="adm-person-results__summary">
          Showing {results.length} available learner{results.length === 1 ? "" : "s"}
        </div>
        {results.length > 0 ? (
          results.map((person) => (
            <PersonOption key={person.id} person={person} onSelect={addLearner} />
          ))
        ) : (
          <div className="adm-person-results__empty">No matching learners</div>
        )}
      </div>
    </div>
  );
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
        <Loader2 size={18} className="adm-spin" />
        Checking availability, conflicts, credits, and notifications...
      </div>
    );
  }

  if (error) {
    return (
      <div className="adm-scheduler-preview adm-scheduler-preview--error">
        <AlertTriangle size={18} />
        {error}
      </div>
    );
  }

  if (!preview) {
    return (
      <div className="adm-scheduler-preview adm-scheduler-preview--empty">
        <CalendarPlus size={18} />
        Complete learner, date, and time to preview the booking.
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
  const totalConflictCount = teacherConflictCount + learnerConflictCount;
  const availabilityTone =
    availability.status === "available"
      ? "success"
      : availability.status === "unassigned"
        ? "neutral"
        : availability.status === "partial"
          ? "warning"
          : "danger";

  return (
    <div className="adm-scheduler-preview adm-scheduler-preview--sticky">
      <div className="adm-scheduler-preview__header">
        <div>
          <h3>Readiness Check</h3>
          <p>
            {formatDateTime(preview.schedule?.startAt)} -{" "}
            {formatDateTime(preview.schedule?.endAt)}
          </p>
        </div>
        <PreviewBadge tone={preview.canCreate ? "success" : "danger"}>
          {preview.canCreate ? "Ready" : "Blocked"}
        </PreviewBadge>
      </div>

      {(preview.blockers?.length > 0 || preview.warnings?.length > 0) && (
        <div className="adm-scheduler-alerts">
          {preview.blockers?.map((item) => (
            <div
              key={item}
              className="adm-scheduler-alert adm-scheduler-alert--danger"
            >
              <ShieldAlert size={15} />
              {item}
            </div>
          ))}
          {preview.warnings?.map((item) => (
            <div
              key={item}
              className="adm-scheduler-alert adm-scheduler-alert--warning"
            >
              <AlertTriangle size={15} />
              {item}
            </div>
          ))}
        </div>
      )}

      <div className="adm-scheduler-grid">
        <div className="adm-scheduler-panel">
          <div className="adm-scheduler-panel__top">
            <span>
              <Clock size={16} />
              Teacher availability
            </span>
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
            <span>
              <ShieldAlert size={16} />
              Conflicts
            </span>
            <PreviewBadge tone={totalConflictCount > 0 ? "danger" : "success"}>
              {totalConflictCount > 0 ? "Conflict" : "Clear"}
            </PreviewBadge>
          </div>
          <p>
            {teacherConflictCount} teacher conflict
            {teacherConflictCount === 1 ? "" : "s"} · {learnerConflictCount}{" "}
            learner conflict{learnerConflictCount === 1 ? "" : "s"}
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
            <span>
              <CreditCard size={16} />
              Credits
            </span>
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
            <span>
              <Bell size={16} />
              Notifications
            </span>
            <PreviewBadge tone={notificationRecipients.length ? "success" : "neutral"}>
              {notificationRecipients.length} recipient
              {notificationRecipients.length === 1 ? "" : "s"}
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
                  preview.timezones.learners.map(
                    (learner) => learner.timezone || "Not set"
                  )
                )
              ).join(", ")
            : "Not selected"}
        </span>
      </div>

      {hasCreditIssue && (
        <div className="adm-credit-override">
          <div className="adm-credit-override__header">
            <ShieldAlert size={18} />
            <div>
              <strong>No-credit override</strong>
              <p>
                This bypasses learner credit checks and will be stored in the
                admin audit trail.
              </p>
            </div>
          </div>
          <label className="adm-credit-override__toggle">
            <input
              type="checkbox"
              name="allowNoCredit"
              checked={!!form.allowNoCredit}
              onChange={onCreateChange}
            />
            <span>Allow booking without available credits</span>
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
  createSession,
  creatingSession,
  sessionPreview,
  sessionPreviewLoading,
  sessionPreviewError,
  adminTimezone,
  setForm,
  setShowBulkScheduler,
}) {
  const sessionType = normType(form.type);
  const isGroup = sessionType === "GROUP";
  const hasPreviewBlocker = sessionPreview && !sessionPreview.canCreate;
  const createDisabled =
    creatingSession || sessionPreviewLoading || Boolean(hasPreviewBlocker);
  const meetingMode = form.meetingMode || "built_in";

  const updateDuration = (duration) => {
    setForm((current) => ({
      ...current,
      duration,
      endTime: "",
    }));
  };

  const updateMeetingMode = (mode) => {
    setForm((current) => ({
      ...current,
      meetingMode: mode,
      meetingUrl: mode === "built_in" ? "" : current.meetingUrl,
    }));
  };

  return (
    <section className="adm-admin-card adm-session-create">
      <div className="adm-admin-card__header">
        <div className="adm-admin-card__title-group">
          <div className="adm-admin-card__icon adm-admin-card__icon--success">
            <CalendarPlus size={24} />
          </div>
          <div>
            <h2 className="adm-admin-card__title">Create New Session</h2>
            <p className="adm-admin-card__subtitle">
              Build a session with live availability, conflict, credit, and
              notification checks.
            </p>
          </div>
        </div>
        <div className="adm-admin-card__actions">
          <button
            type="button"
            className="adm-btn-primary adm-btn-primary--compact"
            onClick={() => setShowBulkScheduler(true)}
          >
            <CalendarPlus size={16} />
            Bulk Schedule
          </button>
        </div>
      </div>

      <form onSubmit={createSession} className="adm-modern-form">
        <div className="adm-scheduler-workspace">
          <div className="adm-scheduler-form-column">
            <div className="adm-form-section">
              <div className="adm-form-section__heading">
                <User size={17} />
                <div>
                  <h3>People</h3>
                  <p>Choose who will teach and attend this session.</p>
                </div>
              </div>

              <div className="adm-form-field adm-form-field--full">
                <label className="adm-form-label">Session Type</label>
                <div className="adm-segmented-control">
                  <button
                    type="button"
                    className={sessionType === "ONE_ON_ONE" ? "is-active" : ""}
                    onClick={() =>
                      onCreateChange(emitChange("type", "ONE_ON_ONE"))
                    }
                    aria-pressed={sessionType === "ONE_ON_ONE"}
                  >
                    <User size={16} />
                    1:1
                  </button>
                  <button
                    type="button"
                    className={sessionType === "GROUP" ? "is-active" : ""}
                    onClick={() => onCreateChange(emitChange("type", "GROUP"))}
                    aria-pressed={sessionType === "GROUP"}
                  >
                    <Users size={16} />
                    Group
                  </button>
                </div>
              </div>

              <PersonPicker
                label="Teacher"
                people={teachers}
                value={form.teacherId}
                onChange={(value) =>
                  onCreateChange(emitChange("teacherId", value))
                }
                placeholder="Search teachers by name, email, or timezone"
                emptyText="No matching teachers"
              />

              {!isGroup && (
                <PersonPicker
                  label="Learner"
                  people={users}
                  value={form.userId}
                  onChange={(value) =>
                    onCreateChange(emitChange("userId", value))
                  }
                  placeholder="Search learners by name, email, or timezone"
                  required
                  emptyText="No matching learners"
                />
              )}

              {isGroup && (
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
                      placeholder="Optional seat limit"
                    />
                  </div>

                  <LearnerMultiPicker
                    learners={users}
                    selectedIds={form.learnerIds}
                    capacity={form.capacity}
                    setForm={setForm}
                  />
                </>
              )}
            </div>

            <div className="adm-form-section">
              <div className="adm-form-section__heading">
                <Clock size={17} />
                <div>
                  <h3>Timing</h3>
                  <p>Set the schedule and duration in {adminTimezone}.</p>
                </div>
              </div>

              <div className="adm-form-grid adm-form-grid--compact">
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
                  <label className="adm-form-label">Duration</label>
                  <div className="adm-duration-options">
                    {DURATION_OPTIONS.map((duration) => (
                      <button
                        type="button"
                        key={duration}
                        className={
                          !form.endTime && form.duration === duration
                            ? "is-active"
                            : ""
                        }
                        onClick={() => updateDuration(duration)}
                        disabled={!!form.endTime}
                      >
                        {duration}m
                      </button>
                    ))}
                  </div>
                  <input
                    type="number"
                    name="duration"
                    className="adm-form-input adm-form-input--compact"
                    value={form.duration}
                    onChange={onCreateChange}
                    min="15"
                    step="15"
                    disabled={!!form.endTime}
                    aria-label="Custom duration in minutes"
                  />
                </div>
              </div>
            </div>

            <div className="adm-form-section">
              <div className="adm-form-section__heading">
                <FileText size={17} />
                <div>
                  <h3>Session Details</h3>
                  <p>Add the title, access mode, and internal notes.</p>
                </div>
              </div>

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
                    isGroup ? "Speaking Practice Group" : "Grammar Review"
                  }
                  required
                />
              </div>

              <div className="adm-form-field adm-form-field--full">
                <label className="adm-form-label">Meeting Access</label>
                <div className="adm-segmented-control">
                  <button
                    type="button"
                    className={meetingMode === "built_in" ? "is-active" : ""}
                    onClick={() => updateMeetingMode("built_in")}
                    aria-pressed={meetingMode === "built_in"}
                  >
                    <Video size={16} />
                    Built-in Classroom
                  </button>
                  <button
                    type="button"
                    className={meetingMode === "external" ? "is-active" : ""}
                    onClick={() => updateMeetingMode("external")}
                    aria-pressed={meetingMode === "external"}
                  >
                    <Link size={16} />
                    External Link
                  </button>
                </div>
              </div>

              {meetingMode === "external" && (
                <div className="adm-form-field adm-form-field--full">
                  <label className="adm-form-label">
                    External Meeting URL
                    <span className="adm-form-required">*</span>
                  </label>
                  <input
                    name="meetingUrl"
                    className="adm-form-input"
                    value={form.meetingUrl}
                    onChange={onCreateChange}
                    placeholder="https://meet.google.com/..."
                    required
                  />
                </div>
              )}

              <div className="adm-form-field adm-form-field--full">
                <label className="adm-form-label">Admin Notes</label>
                <textarea
                  name="notes"
                  className="adm-form-textarea"
                  value={form.notes}
                  onChange={onCreateChange}
                  rows={3}
                  placeholder="Internal context for this session..."
                />
              </div>
            </div>
          </div>

          <aside className="adm-scheduler-preview-column">
            <SchedulerPreview
              preview={sessionPreview}
              loading={sessionPreviewLoading}
              error={sessionPreviewError}
              adminTimezone={adminTimezone}
              form={form}
              onCreateChange={onCreateChange}
            />
          </aside>
        </div>

        <div className="adm-form-actions adm-form-actions--scheduler">
          <button
            type="submit"
            className="adm-btn-primary"
            disabled={createDisabled}
          >
            {creatingSession ? (
              <Loader2 size={16} className="adm-spin" />
            ) : sessionPreview?.canCreate ? (
              <CheckCircle2 size={16} />
            ) : (
              <CalendarPlus size={16} />
            )}
            {creatingSession
              ? "Creating..."
              : `Create ${isGroup ? "Group " : ""}Session`}
          </button>

          <button
            type="button"
            className="adm-btn-secondary"
            onClick={() =>
              setForm((current) => ({
                ...current,
                type: "ONE_ON_ONE",
                userId: "",
                learnerIds: [],
                capacity: "",
                title: "",
                startTime: "",
                endTime: "",
                duration: "60",
                meetingMode: "built_in",
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
