"use client";

import { useMemo, useState, useEffect } from "react";
import { buildPickerIndex } from "./classroomHelpers";

export default function ClassroomResourcePicker({
  tracks,
  selectedResourceId,
  onChangeResourceId,
  isTeacher,
}) {
  const {
    trackOptions,
    booksByTrackId,
    bookLevelsByBookId,
    unitOptionsByBookLevelId,
    resourcesByUnitId,
  } = useMemo(() => buildPickerIndex(tracks), [tracks]);

  const [trackId, setTrackId] = useState(trackOptions[0]?.value || "");
  const [bookId, setBookId] = useState("");
  const [bookLevelId, setBookLevelId] = useState("");
  const [unitId, setUnitId] = useState("");

  const bookOptions = trackId ? booksByTrackId[trackId] || [] : [];
  const bookLevelOptions = bookId ? bookLevelsByBookId[bookId] || [] : [];
  const unitOptions = bookLevelId
    ? unitOptionsByBookLevelId[bookLevelId] || []
    : [];
  const resourceOptions = unitId ? resourcesByUnitId[unitId] || [] : [];

  // Cascade effects (TEACHER-ONLY)
  useEffect(() => {
    if (!isTeacher) return;
    if (!trackOptions.length) return;

    setTrackId((prev) =>
      trackOptions.some((t) => t.value === prev) ? prev : trackOptions[0].value
    );
  }, [trackOptions, isTeacher]);

  useEffect(() => {
    if (!isTeacher) return;

    const list = booksByTrackId[trackId] || [];
    if (!list.length) {
      setBookId("");
      setBookLevelId("");
      setUnitId("");
      return;
    }

    setBookId((prev) =>
      list.some((b) => b.value === prev) ? prev : list[0].value
    );
  }, [trackId, booksByTrackId, isTeacher]);

  useEffect(() => {
    if (!isTeacher) return;

    const list = bookLevelsByBookId[bookId] || [];
    if (!list.length) {
      setBookLevelId("");
      setUnitId("");
      return;
    }

    setBookLevelId((prev) =>
      list.some((l) => l.value === prev) ? prev : list[0].value
    );
  }, [bookId, bookLevelsByBookId, isTeacher]);

  useEffect(() => {
    if (!isTeacher) return;

    const list = unitOptionsByBookLevelId[bookLevelId] || [];
    if (!list.length) {
      setUnitId("");
      return;
    }

    setUnitId((prev) =>
      list.some((u) => u.value === prev) ? prev : list[0].value
    );
  }, [bookLevelId, unitOptionsByBookLevelId, isTeacher]);

  // Find currently selected resource for highlighting
  const currentResource = resourceOptions.find(
    (r) => r._id === selectedResourceId
  );

  return (
    <div className="cr-picker">
      {/* Navigation breadcrumb */}
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

          {/* Book Level */}
          <div className="cr-picker__field">
            <label className="cr-picker__label">Level</label>
            <div className="cr-picker__select-wrapper">
              <select
                className="cr-picker__select"
                value={bookLevelId}
                onChange={(e) => setBookLevelId(e.target.value)}
                disabled={!bookLevelOptions.length || !isTeacher}
              >
                {!bookLevelOptions.length && <option>—</option>}
                {bookLevelOptions.map((l) => (
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
                    className={`cr-picker__item ${
                      isSelected ? "cr-picker__item--selected" : ""
                    }`}
                    onClick={() => onChangeResourceId(r._id)}
                    disabled={!isTeacher}
                  >
                    <span className="cr-picker__item-icon">
                      {getResourceIcon(r)}
                    </span>
                    <span className="cr-picker__item-info">
                      <span className="cr-picker__item-title">{r.title}</span>
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
