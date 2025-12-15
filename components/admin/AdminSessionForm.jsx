// components/admin/AdminSessionForm.jsx
"use client";

import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import { useToast } from "@/components/ToastProvider";

/**
 * AdminSessionForm - Create or edit sessions (ONE_ON_ONE or GROUP)
 *
 * Props:
 * - session: Existing session to edit (null for create)
 * - onSuccess: Callback after successful save
 * - onCancel: Callback to close form
 */
export default function AdminSessionForm({
  session = null,
  onSuccess,
  onCancel,
}) {
  const toast = useToast();
  const isEdit = !!session?.id;

  // Form state
  const [type, setType] = useState(session?.type || "ONE_ON_ONE");
  const [title, setTitle] = useState(session?.title || "");
  const [teacherId, setTeacherId] = useState(session?.teacherId || "");
  const [learnerId, setLearnerId] = useState(session?.userId || "");
  const [learnerIds, setLearnerIds] = useState(
    session?.learners?.map((l) => l.id) || []
  );
  const [capacity, setCapacity] = useState(session?.capacity || 6);
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [durationMin, setDurationMin] = useState(60);
  const [meetingUrl, setMeetingUrl] = useState(session?.joinUrl || "");
  const [allowNoCredit, setAllowNoCredit] = useState(false);

  // Data lists
  const [teachers, setTeachers] = useState([]);
  const [learners, setLearners] = useState([]);
  const [loadingTeachers, setLoadingTeachers] = useState(true);
  const [loadingLearners, setLoadingLearners] = useState(true);

  // Search for learners
  const [learnerSearch, setLearnerSearch] = useState("");

  // Submission state
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Initialize date/time from existing session
  useEffect(() => {
    if (session?.startAt) {
      const start = new Date(session.startAt);
      setStartDate(start.toISOString().split("T")[0]);
      setStartTime(
        start.toTimeString().slice(0, 5) // HH:MM
      );
    } else {
      // Default to tomorrow at 10:00
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0);
      setStartDate(tomorrow.toISOString().split("T")[0]);
      setStartTime("10:00");
    }

    if (session?.startAt && session?.endAt) {
      const start = new Date(session.startAt);
      const end = new Date(session.endAt);
      const diffMins = Math.round((end - start) / 60000);
      setDurationMin(diffMins > 0 ? diffMins : 60);
    }
  }, [session]);

  // Load teachers
  useEffect(() => {
    async function loadTeachers() {
      try {
        setLoadingTeachers(true);
        const { data } = await api.get("/teachers", {
          params: { active: "1" },
        });
        setTeachers(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to load teachers:", err);
      } finally {
        setLoadingTeachers(false);
      }
    }
    loadTeachers();
  }, []);

  // Load learners
  const loadLearners = useCallback(async (search = "") => {
    try {
      setLoadingLearners(true);
      const { data } = await api.get("/learners", {
        params: { q: search, active: "1" },
      });
      setLearners(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load learners:", err);
    } finally {
      setLoadingLearners(false);
    }
  }, []);

  useEffect(() => {
    loadLearners(learnerSearch);
  }, [learnerSearch, loadLearners]);

  // Toggle learner selection (for GROUP)
  const toggleLearner = (id) => {
    setLearnerIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // Select all visible learners
  const selectAllLearners = () => {
    const visibleIds = learners.map((l) => l.id);
    setLearnerIds((prev) => [...new Set([...prev, ...visibleIds])]);
  };

  // Clear all selected learners
  const clearLearners = () => {
    setLearnerIds([]);
  };

  // Form validation
  const validate = () => {
    if (!title.trim()) {
      setError("Title is required");
      return false;
    }
    if (!startDate || !startTime) {
      setError("Start date and time are required");
      return false;
    }
    if (type === "ONE_ON_ONE" && !learnerId) {
      setError("Please select a learner for 1:1 session");
      return false;
    }
    if (type === "GROUP" && learnerIds.length === 0) {
      setError("Please select at least one learner for group session");
      return false;
    }
    if (type === "GROUP" && capacity && learnerIds.length > capacity) {
      setError(`Too many learners selected (max ${capacity})`);
      return false;
    }
    return true;
  };

  // Submit form
  // Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!validate()) return;

    // Build startAt datetime
    const startAt = new Date(`${startDate}T${startTime}`);
    if (isNaN(startAt.getTime())) {
      setError("Invalid date/time");
      return;
    }

    // Compute endAt from durationMin for edit/update compatibility
    const computedEndAt = new Date(
      startAt.getTime() + Number(durationMin || 60) * 60_000
    );

    try {
      setSaving(true);

      let response;

      if (isEdit) {
        const payload = {
          title: title.trim(),
          teacherId: teacherId ? Number(teacherId) : null,
          startAt: startAt.toISOString(),
          endAt: computedEndAt.toISOString(),
          joinUrl: meetingUrl.trim() || null,
        };

        response = await api.patch(`/admin/sessions/${session.id}`, payload);
      } else {
        const payload = {
          type,
          title: title.trim(),
          teacherId: teacherId ? Number(teacherId) : null,
          startAt: startAt.toISOString(),
          durationMin: Number(durationMin),
          joinUrl: meetingUrl.trim() || null,
          allowNoCredit,
        };

        if (type === "ONE_ON_ONE") {
          payload.learnerId = Number(learnerId);
        } else {
          payload.learnerIds = learnerIds.map(Number);
          payload.capacity = Number(capacity) || null;
        }

        response = await api.post("/admin/sessions", payload);
      }

      toast?.success?.(isEdit ? "Session updated!" : "Session created!");
      onSuccess?.(response.data);
    } catch (err) {
      console.error("Failed to save session:", err);
      const errMsg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        "Failed to save session";
      setError(errMsg);
      toast?.error?.(errMsg);
    } finally {
      setSaving(false);
    }
  };

  // Get selected learner names for display
  const selectedLearnerNames = learners
    .filter((l) => learnerIds.includes(l.id))
    .map((l) => l.name || l.email)
    .join(", ");

  return (
    <form className="admin-session-form" onSubmit={handleSubmit}>
      <h2 className="admin-session-form__title">
        {isEdit ? "Edit Session" : "Create New Session"}
      </h2>

      {error && (
        <div className="admin-session-form__error">
          <span>⚠️</span> {error}
        </div>
      )}

      {/* Session Type */}
      <div className="admin-session-form__field">
        <label className="admin-session-form__label">Session Type</label>
        <div className="admin-session-form__type-toggle">
          <button
            type="button"
            className={`admin-session-form__type-btn ${
              type === "ONE_ON_ONE"
                ? "admin-session-form__type-btn--active"
                : ""
            }`}
            onClick={() => setType("ONE_ON_ONE")}
            disabled={isEdit}
          >
            👤 One-on-One
          </button>
          <button
            type="button"
            className={`admin-session-form__type-btn ${
              type === "GROUP" ? "admin-session-form__type-btn--active" : ""
            }`}
            onClick={() => setType("GROUP")}
            disabled={isEdit}
          >
            👥 Group Session
          </button>
        </div>
        {isEdit && (
          <p className="admin-session-form__hint">
            Session type cannot be changed after creation
          </p>
        )}
      </div>

      {/* Title */}
      <div className="admin-session-form__field">
        <label className="admin-session-form__label" htmlFor="title">
          Session Title
        </label>
        <input
          type="text"
          id="title"
          className="admin-session-form__input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., English Conversation Practice"
          required
        />
      </div>

      {/* Date & Time */}
      <div className="admin-session-form__row">
        <div className="admin-session-form__field">
          <label className="admin-session-form__label" htmlFor="startDate">
            Date
          </label>
          <input
            type="date"
            id="startDate"
            className="admin-session-form__input"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
        </div>

        <div className="admin-session-form__field">
          <label className="admin-session-form__label" htmlFor="startTime">
            Time
          </label>
          <input
            type="time"
            id="startTime"
            className="admin-session-form__input"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            required
          />
        </div>

        <div className="admin-session-form__field">
          <label className="admin-session-form__label" htmlFor="duration">
            Duration
          </label>
          <select
            id="duration"
            className="admin-session-form__select"
            value={durationMin}
            onChange={(e) => setDurationMin(Number(e.target.value))}
          >
            <option value={30}>30 minutes</option>
            <option value={45}>45 minutes</option>
            <option value={60}>1 hour</option>
            <option value={90}>1.5 hours</option>
            <option value={120}>2 hours</option>
          </select>
        </div>
      </div>

      {/* Teacher */}
      <div className="admin-session-form__field">
        <label className="admin-session-form__label" htmlFor="teacher">
          Teacher (optional)
        </label>
        <select
          id="teacher"
          className="admin-session-form__select"
          value={teacherId}
          onChange={(e) => setTeacherId(e.target.value)}
          disabled={loadingTeachers}
        >
          <option value="">-- Select Teacher --</option>
          {teachers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name || t.email}
            </option>
          ))}
        </select>
      </div>

      {/* ONE_ON_ONE: Single learner */}
      {type === "ONE_ON_ONE" && (
        <div className="admin-session-form__field">
          <label className="admin-session-form__label" htmlFor="learner">
            Learner *
          </label>
          <select
            id="learner"
            className="admin-session-form__select"
            value={learnerId}
            onChange={(e) => setLearnerId(e.target.value)}
            disabled={loadingLearners}
            required
          >
            <option value="">-- Select Learner --</option>
            {learners.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name || l.email}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* GROUP: Multiple learners + capacity */}
      {type === "GROUP" && (
        <>
          <div className="admin-session-form__field">
            <label className="admin-session-form__label" htmlFor="capacity">
              Max Capacity
            </label>
            <input
              type="number"
              id="capacity"
              className="admin-session-form__input admin-session-form__input--small"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              min={1}
              max={50}
            />
          </div>

          <div className="admin-session-form__field">
            <label className="admin-session-form__label">
              Learners * ({learnerIds.length} selected)
            </label>

            {/* Search */}
            <input
              type="text"
              className="admin-session-form__input"
              placeholder="Search learners by name or email..."
              value={learnerSearch}
              onChange={(e) => setLearnerSearch(e.target.value)}
            />

            {/* Quick actions */}
            <div className="admin-session-form__learner-actions">
              <button type="button" onClick={selectAllLearners}>
                Select All Visible
              </button>
              <button type="button" onClick={clearLearners}>
                Clear Selection
              </button>
            </div>

            {/* Selected learners display */}
            {learnerIds.length > 0 && (
              <div className="admin-session-form__selected-learners">
                <strong>Selected:</strong> {selectedLearnerNames || "None"}
              </div>
            )}

            {/* Learner checkboxes */}
            <div className="admin-session-form__learner-list">
              {loadingLearners ? (
                <p>Loading learners...</p>
              ) : learners.length === 0 ? (
                <p>No learners found</p>
              ) : (
                learners.map((l) => (
                  <label
                    key={l.id}
                    className={`admin-session-form__learner-item ${
                      learnerIds.includes(l.id)
                        ? "admin-session-form__learner-item--selected"
                        : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={learnerIds.includes(l.id)}
                      onChange={() => toggleLearner(l.id)}
                    />
                    <span className="admin-session-form__learner-name">
                      {l.name || "No name"}
                    </span>
                    <span className="admin-session-form__learner-email">
                      {l.email}
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {/* Meeting URL */}
      <div className="admin-session-form__field">
        <label className="admin-session-form__label" htmlFor="meetingUrl">
          Meeting URL (optional)
        </label>
        <input
          type="url"
          id="meetingUrl"
          className="admin-session-form__input"
          value={meetingUrl}
          onChange={(e) => setMeetingUrl(e.target.value)}
          placeholder="https://..."
        />
        <p className="admin-session-form__hint">
          Leave empty to use the built-in classroom
        </p>
      </div>

      {/* Allow no credit */}
      <div className="admin-session-form__field admin-session-form__field--checkbox">
        <label className="admin-session-form__checkbox-label">
          <input
            type="checkbox"
            checked={allowNoCredit}
            onChange={(e) => setAllowNoCredit(e.target.checked)}
          />
          <span>Allow booking even if learner has no credits</span>
        </label>
      </div>

      {/* Actions */}
      <div className="admin-session-form__actions">
        <button
          type="button"
          className="admin-session-form__btn admin-session-form__btn--cancel"
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="admin-session-form__btn admin-session-form__btn--save"
          disabled={saving}
        >
          {saving ? "Saving..." : isEdit ? "Update Session" : "Create Session"}
        </button>
      </div>
    </form>
  );
}
