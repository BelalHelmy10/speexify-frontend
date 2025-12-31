// app/classroom/[sessionId]/ClassroomResourcePicker.jsx
"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { buildPickerIndex } from "./classroomHelpers";

/**
 * FINAL BEHAVIOR (Sanity-driven only):
 * Dropdowns become:
 *   Course (track) -> Book -> CEFR (A1.1 / A1.2 / ...) -> Unit -> Resources
 *
 * NEW: Picker state is persisted to sessionStorage so reopening the picker
 * within the same classroom session restores the last navigation position.
 */

// ─────────────────────────────────────────────────────────────
// Helper: Session storage for picker state
// ─────────────────────────────────────────────────────────────
function getPickerStorageKey(sessionId) {
  return `speexify_classroom_picker_${sessionId}`;
}

function loadPickerState(sessionId) {
  if (typeof window === "undefined" || !sessionId) return null;
  try {
    const raw = sessionStorage.getItem(getPickerStorageKey(sessionId));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function savePickerState(sessionId, state) {
  if (typeof window === "undefined" || !sessionId) return;
  try {
    sessionStorage.setItem(
      getPickerStorageKey(sessionId),
      JSON.stringify(state)
    );
  } catch {
    // ignore storage errors
  }
}

export default function ClassroomResourcePicker({
  tracks,
  selectedResourceId,
  onChangeResourceId,
  isTeacher,
  sessionId, // ← NEW PROP: pass the classroom session ID
}) {
  const index = useMemo(() => buildPickerIndex(tracks || []), [tracks]);

  const {
    trackOptions = [],
    booksByTrackId = {},
    resourcesByUnitId = {},
    subLevelOptionsByTrackBookKey = {},
    unitOptionsByBookSubLevelKey = {},
  } = index || {};

  // ─────────────────────────────────────────────────────────────
  // Load saved state from sessionStorage (once on mount)
  // ─────────────────────────────────────────────────────────────
  const savedState = useMemo(() => {
    return loadPickerState(sessionId);
  }, [sessionId]);

  // ─────────────────────────────────────────────────────────────
  // Local selection state (teacher's controls)
  // Initialize from saved state if available
  // ─────────────────────────────────────────────────────────────
  const [trackId, setTrackId] = useState(() => {
    if (
      savedState?.trackId &&
      trackOptions.some((t) => t.value === savedState.trackId)
    ) {
      return savedState.trackId;
    }
    return trackOptions[0]?.value || "";
  });

  const [bookId, setBookId] = useState(() => savedState?.bookId || "");
  const [subLevelId, setSubLevelId] = useState(
    () => savedState?.subLevelId || ""
  );
  const [unitId, setUnitId] = useState(() => savedState?.unitId || "");

  // ─────────────────────────────────────────────────────────────
  // Save state to sessionStorage whenever it changes
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!sessionId) return;
    savePickerState(sessionId, {
      trackId,
      bookId,
      subLevelId,
      unitId,
    });
  }, [sessionId, trackId, bookId, subLevelId, unitId]);

  const bookOptions = trackId ? booksByTrackId[trackId] || [] : [];

  const subLevelOptions =
    trackId && bookId
      ? subLevelOptionsByTrackBookKey[`${trackId}:${bookId}`] || []
      : [];

  const unitOptions =
    bookId && subLevelId
      ? unitOptionsByBookSubLevelKey[`${bookId}:${subLevelId}`] || []
      : [];

  const resourceOptions = unitId ? resourcesByUnitId[unitId] || [] : [];

  // ─────────────────────────────────────────────
  // Cascading auto-selection (teacher only)
  // ─────────────────────────────────────────────

  // Track
  useEffect(() => {
    if (!isTeacher) return;
    if (!trackOptions.length) return;

    setTrackId((prev) =>
      trackOptions.some((t) => t.value === prev) ? prev : trackOptions[0].value
    );
  }, [trackOptions, isTeacher]);

  // Book when track changes
  useEffect(() => {
    if (!isTeacher) return;

    const list = booksByTrackId[trackId] || [];
    if (!list.length) {
      setBookId("");
      setSubLevelId("");
      setUnitId("");
      return;
    }

    setBookId((prev) =>
      list.some((b) => b.value === prev) ? prev : list[0].value
    );
  }, [trackId, booksByTrackId, isTeacher]);

  // CEFR sub-level when book changes
  useEffect(() => {
    if (!isTeacher) return;

    const list =
      trackId && bookId
        ? subLevelOptionsByTrackBookKey[`${trackId}:${bookId}`] || []
        : [];

    if (!list.length) {
      setSubLevelId("");
      setUnitId("");
      return;
    }

    setSubLevelId((prev) =>
      list.some((l) => l.value === prev) ? prev : list[0].value
    );
  }, [trackId, bookId, subLevelOptionsByTrackBookKey, isTeacher]);

  // Unit when CEFR sub-level changes
  useEffect(() => {
    if (!isTeacher) return;

    const list =
      bookId && subLevelId
        ? unitOptionsByBookSubLevelKey[`${bookId}:${subLevelId}`] || []
        : [];

    if (!list.length) {
      setUnitId("");
      return;
    }

    setUnitId((prev) =>
      list.some((u) => u.value === prev) ? prev : list[0].value
    );
  }, [bookId, subLevelId, unitOptionsByBookSubLevelKey, isTeacher]);

  // ─────────────────────────────────────────────
  // Currently selected resource (for footer)
  // ─────────────────────────────────────────────
  const currentResource = resourceOptions.find(
    (r) => r._id === selectedResourceId
  );

  // If there are literally no tracks, show a clear message
  if (!trackOptions.length) {
    return (
      <div className="cr-picker">
        <div className="cr-picker__empty">
          <span className="cr-picker__empty-icon">📂</span>
          <p>No classroom resources are configured yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="cr-picker">
      {/* Navigation selectors */}
      <div className="cr-picker__nav">
        <div className="cr-picker__nav-row">
          {/* Track */}
          <div className="cr-picker__field">
            <label className="cr-picker__label">Course</label>
            <div className="cr-picker__select-wrapper">
              <select
                className="cr-picker__select"
                value={trackId}
                onChange={(e) => setTrackId(e.target.value)}
                disabled={!isTeacher}
              >
                {trackOptions.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              <span className="cr-picker__select-arrow">▾</span>
            </div>
          </div>

          {/* Book */}
          <div className="cr-picker__field">
            <label className="cr-picker__label">Book</label>
            <div className="cr-picker__select-wrapper">
              <select
                className="cr-picker__select"
                value={bookId}
                onChange={(e) => setBookId(e.target.value)}
                disabled={!bookOptions.length || !isTeacher}
              >
                {!bookOptions.length && <option>—</option>}
                {bookOptions.map((b) => (
                  <option key={b.value} value={b.value}>
                    {b.label}
                  </option>
                ))}
              </select>
              <span className="cr-picker__select-arrow">▾</span>
            </div>
          </div>

          {/* CEFR (SubLevel) */}
          <div className="cr-picker__field">
            <label className="cr-picker__label">CEFR</label>
            <div className="cr-picker__select-wrapper">
              <select
                className="cr-picker__select"
                value={subLevelId}
                onChange={(e) => setSubLevelId(e.target.value)}
                disabled={!subLevelOptions.length || !isTeacher}
              >
                {!subLevelOptions.length && <option>—</option>}
                {subLevelOptions.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>
              <span className="cr-picker__select-arrow">▾</span>
            </div>
          </div>

          {/* Unit */}
          <div className="cr-picker__field">
            <label className="cr-picker__label">Unit</label>
            <div className="cr-picker__select-wrapper">
              <select
                className="cr-picker__select"
                value={unitId}
                onChange={(e) => setUnitId(e.target.value)}
                disabled={!unitOptions.length || !isTeacher}
              >
                {!unitOptions.length && <option>—</option>}
                {unitOptions.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </select>
              <span className="cr-picker__select-arrow">▾</span>
            </div>
          </div>
        </div>
      </div>

      {/* Resource List */}
      <div className="cr-picker__resources">
        <div className="cr-picker__resources-header">
          <span className="cr-picker__resources-title">
            Resources{" "}
            {resourceOptions.length > 0 && `(${resourceOptions.length})`}
          </span>
        </div>

        {resourceOptions.length === 0 ? (
          <div className="cr-picker__empty">
            <span className="cr-picker__empty-icon">📂</span>
            <p>No resources in this unit</p>
          </div>
        ) : (
          <ul className="cr-picker__list">
            {resourceOptions.map((r) => {
              const isSelected = r._id === selectedResourceId;
              return (
                <li key={r._id}>
                  <button
                    type="button"
                    className={
                      "cr-picker__item" +
                      (isSelected ? " cr-picker__item--selected" : "")
                    }
                    onClick={() => onChangeResourceId(r._id)}
                    disabled={!isTeacher}
                  >
                    <span className="cr-picker__item-icon">
                      {getResourceIcon(r)}
                    </span>
                    <span className="cr-picker__item-info">
                      <span className="cr-picker__item-title">
                        {r.title || "Untitled resource"}
                      </span>
                      {r.description && (
                        <span className="cr-picker__item-desc">
                          {r.description.slice(0, 60)}
                          {r.description.length > 60 ? "…" : ""}
                        </span>
                      )}
                    </span>
                    {isSelected && (
                      <span className="cr-picker__item-check">✓</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Current Selection Info */}
      {currentResource && (
        <div className="cr-picker__current">
          <span className="cr-picker__current-label">Selected:</span>
          <span className="cr-picker__current-name">
            {currentResource.title}
          </span>
        </div>
      )}
    </div>
  );
}

/* -----------------------------------------------------------
   Helper: Get icon for resource based on real fields
----------------------------------------------------------- */
function getResourceIcon(resource) {
  if (!resource) return "📁";

  const isPdfUrl = (url) =>
    typeof url === "string" && url.toLowerCase().endsWith(".pdf");

  // URL-based detection first (most reliable)
  if (resource.youtubeUrl) return "🎬";
  if (resource.googleSlidesUrl) return "📊";
  if (resource.externalUrl && isPdfUrl(resource.externalUrl)) return "📄";
  if (resource.fileUrl && isPdfUrl(resource.fileUrl)) return "📄";
  if (resource.externalUrl) return "🌐";
  if (resource.fileUrl) return "📁";

  // Fall back to "kind" semantics
  const kind = (resource.kind || "").toLowerCase();

  if (kind.includes("worksheet") || kind.includes("exercise")) return "✏️";
  if (kind.includes("quiz") || kind.includes("test") || kind.includes("exam"))
    return "❓";
  if (kind.includes("audio")) return "🎧";
  if (kind.includes("video")) return "🎬";

  return "📁";
}
