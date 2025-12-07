// app/resources/ResourcesPicker.jsx
"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { buildResourcePickerIndex } from "@/lib/resourcePickerIndex";

/* -----------------------------------------------------------
   Helper: Choose the primary URL for a resource
----------------------------------------------------------- */
function getPrimaryUrl(resource) {
  if (!resource) return null;
  if (resource.googleSlidesUrl) return resource.googleSlidesUrl;
  if (resource.youtubeUrl) return resource.youtubeUrl;
  if (resource.externalUrl) return resource.externalUrl;
  if (resource.fileUrl) return resource.fileUrl;
  return null;
}

/* -----------------------------------------------------------
   Helper: Find a unit (and its context) inside the tracks tree
----------------------------------------------------------- */
function findUnitWithContext(tracks, unitId) {
  if (!unitId) return null;

  for (const track of tracks || []) {
    for (const level of track.levels || []) {
      for (const subLevel of level.subLevels || []) {
        for (const unit of subLevel.units || []) {
          if (unit._id === unitId) {
            return {
              unit,
              track,
              level,
              subLevel,
            };
          }
        }
      }
    }
  }

  return null;
}

/* -----------------------------------------------------------
   MAIN COMPONENT
----------------------------------------------------------- */
export default function ResourcesPicker({ tracks }) {
  // Build the picker index (shared with classroom)
  const {
    trackOptions,
    booksByTrackId,
    bookLevelsByBookId,
    unitOptionsByBookLevelId,
    resourcesByUnitId,
  } = useMemo(() => buildResourcePickerIndex(tracks || []), [tracks]);

  // Selection state
  const [trackId, setTrackId] = useState("");
  const [bookId, setBookId] = useState("");
  const [bookLevelId, setBookLevelId] = useState("");
  const [unitId, setUnitId] = useState("");
  const [selectedResourceId, setSelectedResourceId] = useState("");

  // Options derived from current selections
  const bookOptions = trackId ? booksByTrackId[trackId] || [] : [];
  const bookLevelOptions = bookId ? bookLevelsByBookId[bookId] || [] : [];
  const unitOptions = bookLevelId
    ? unitOptionsByBookLevelId[bookLevelId] || []
    : [];
  const resourceOptions = unitId ? resourcesByUnitId[unitId] || [] : [];

  /* ---------------------------------------------------------
     Cascading defaults: track → book → level → unit → resource
  --------------------------------------------------------- */

  // When tracks/index change, pick the first track
  useEffect(() => {
    if (!trackOptions.length) {
      setTrackId("");
      return;
    }

    setTrackId((prev) =>
      trackOptions.some((t) => t.value === prev) ? prev : trackOptions[0].value
    );
  }, [trackOptions]);

  // When track changes, choose first book for that track
  useEffect(() => {
    const list = booksByTrackId[trackId] || [];
    if (!list.length) {
      setBookId("");
      setBookLevelId("");
      setUnitId("");
      setSelectedResourceId("");
      return;
    }

    setBookId((prev) =>
      list.some((b) => b.value === prev) ? prev : list[0].value
    );
  }, [trackId, booksByTrackId]);

  // When book changes, choose first book level
  useEffect(() => {
    const list = bookLevelsByBookId[bookId] || [];
    if (!list.length) {
      setBookLevelId("");
      setUnitId("");
      setSelectedResourceId("");
      return;
    }

    setBookLevelId((prev) =>
      list.some((l) => l.value === prev) ? prev : list[0].value
    );
  }, [bookId, bookLevelsByBookId]);

  // When book level changes, choose first unit
  useEffect(() => {
    const list = unitOptionsByBookLevelId[bookLevelId] || [];
    if (!list.length) {
      setUnitId("");
      setSelectedResourceId("");
      return;
    }

    setUnitId((prev) =>
      list.some((u) => u.value === prev) ? prev : list[0].value
    );
  }, [bookLevelId, unitOptionsByBookLevelId]);

  // When unit changes, choose first resource
  useEffect(() => {
    const list = resourcesByUnitId[unitId] || [];
    if (!list.length) {
      setSelectedResourceId("");
      return;
    }

    setSelectedResourceId((prev) =>
      list.some((r) => r._id === prev) ? prev : list[0]._id
    );
  }, [unitId, resourcesByUnitId]);

  // Current selected resource
  const selectedResource =
    resourceOptions.find((r) => r._id === selectedResourceId) ||
    resourceOptions[0] ||
    null;

  // Context for breadcrumbs (track, level, subLevel, unit)
  const unitCtx = useMemo(
    () => findUnitWithContext(tracks, unitId),
    [tracks, unitId]
  );
  const currentUnit = unitCtx?.unit || null;
  const currentTrack = unitCtx?.track || null;
  const currentLevel = unitCtx?.level || null;
  const currentSubLevel = unitCtx?.subLevel || null;

  const primaryUrl = getPrimaryUrl(selectedResource);

  // Prep Room link – this MUST carry a real resourceId,
  // otherwise the Prep page will show "Please choose a resource first"
  const prepHref = selectedResource
    ? {
        pathname: "/resources/prep",
        query: {
          resourceId: selectedResource._id,
          unitId: currentUnit?._id,
        },
      }
    : null;

  // Unit page link (adjust path if your route is different)
  const unitHref =
    currentUnit && currentUnit.slug
      ? {
          pathname: `/resources/units/${currentUnit.slug}`,
        }
      : null;

  const hasResources = resourceOptions.length > 0;

  /* ---------------------------------------------------------
     RENDER
  --------------------------------------------------------- */

  return (
    <div className="resources-layout">
      {/* LEFT: Picker Card */}
      <section className="resources-picker">
        <div className="resources-picker__header">
          <h2 className="resources-picker__title">Browse materials</h2>
          <p className="resources-picker__subtitle">
            Choose a course, book, level, unit, then pick a resource to preview
            and open in the prep room.
          </p>
        </div>

        <div className="resources-picker__grid">
          {/* Track */}
          <div className="resources-picker__field">
            <label className="resources-picker__label">Course / Track</label>
            <div className="resources-picker__control">
              <select
                value={trackId}
                onChange={(e) => setTrackId(e.target.value)}
              >
                {trackOptions.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Book */}
          <div className="resources-picker__field">
            <label className="resources-picker__label">Book / Series</label>
            <div className="resources-picker__control">
              <select
                value={bookId}
                onChange={(e) => setBookId(e.target.value)}
                disabled={!bookOptions.length}
              >
                {!bookOptions.length && <option>—</option>}
                {bookOptions.map((b) => (
                  <option key={b.value} value={b.value}>
                    {b.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Book Level */}
          <div className="resources-picker__field">
            <label className="resources-picker__label">Level</label>
            <div className="resources-picker__control">
              <select
                value={bookLevelId}
                onChange={(e) => setBookLevelId(e.target.value)}
                disabled={!bookLevelOptions.length}
              >
                {!bookLevelOptions.length && <option>—</option>}
                {bookLevelOptions.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Unit */}
          <div className="resources-picker__field">
            <label className="resources-picker__label">Unit</label>
            <div className="resources-picker__control">
              <select
                value={unitId}
                onChange={(e) => setUnitId(e.target.value)}
                disabled={!unitOptions.length}
              >
                {!unitOptions.length && <option>—</option>}
                {unitOptions.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Resources in this unit */}
          <div className="resources-picker__field resources-picker__field--full">
            <label className="resources-picker__label">Resources</label>
            <div className="resources-picker__control">
              <select
                value={selectedResourceId}
                onChange={(e) => setSelectedResourceId(e.target.value)}
                disabled={!resourceOptions.length}
              >
                {!resourceOptions.length && <option>—</option>}
                {resourceOptions.map((r) => (
                  <option key={r._id} value={r._id}>
                    {r.title || "Untitled resource"}
                  </option>
                ))}
              </select>
            </div>
            <p className="resources-picker__hint">
              Once you pick a resource, you can open it in the prep room or jump
              to the unit page.
            </p>
          </div>
        </div>
      </section>

      {/* RIGHT: Preview Card */}
      <section className="resources-preview">
        {!selectedResource || !hasResources ? (
          <div className="resources-preview__card resources-preview__card--empty">
            <h3>No resource selected</h3>
            <p>
              Choose a track, book, level, and unit on the left, then select a
              resource to see its details and open it in the prep room.
            </p>
          </div>
        ) : (
          <div className="resources-preview__card resources-preview__card--animated">
            {/* Breadcrumbs */}
            <div className="resources-preview__breadcrumbs">
              {currentTrack && <span>{currentTrack.name}</span>}
              {currentUnit?.bookLevel?.book && <span>·</span>}
              {currentUnit?.bookLevel?.book && (
                <span>{currentUnit.bookLevel.book.title}</span>
              )}
              {currentLevel && <span>·</span>}
              {currentLevel && <span>{currentLevel.name}</span>}
              {currentSubLevel && <span>·</span>}
              {currentSubLevel && <span>{currentSubLevel.title}</span>}
              {currentUnit && <span>·</span>}
              {currentUnit && <span>{currentUnit.title}</span>}
            </div>

            {/* Title + description */}
            <h3 className="resources-preview__title">
              {selectedResource.title || "Untitled resource"}
            </h3>

            {selectedResource.description && (
              <p className="resources-preview__description">
                {selectedResource.description}
              </p>
            )}

            {/* Meta chips */}
            <div className="resources-preview__meta">
              {selectedResource.kind && (
                <span className="resources-chip resources-chip--primary">
                  {selectedResource.kind}
                </span>
              )}
              {selectedResource.cecrLevel && (
                <span className="resources-chip resources-chip--success">
                  CEFR {selectedResource.cecrLevel}
                </span>
              )}
              {selectedResource.sourceType && (
                <span className="resources-chip">
                  Source: {selectedResource.sourceType}
                </span>
              )}
            </div>

            {/* Tags */}
            {Array.isArray(selectedResource.tags) &&
              selectedResource.tags.length > 0 && (
                <div className="resources-preview__tags">
                  {selectedResource.tags.map((tag) => (
                    <span key={tag} className="resources-tag">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

            {/* File name */}
            {selectedResource.fileName && (
              <p className="resources-preview__filename">
                {selectedResource.fileName}
              </p>
            )}

            {/* Actions */}
            <div className="resources-preview__actions">
              {/* Open in Prep Room */}
              {prepHref ? (
                <Link
                  href={prepHref}
                  className="resources-button resources-button--primary"
                >
                  <span>🧑‍🏫 Open in Prep Room</span>
                </Link>
              ) : (
                <button
                  type="button"
                  className="resources-button resources-button--disabled"
                  disabled
                >
                  🧑‍🏫 Choose a resource first
                </button>
              )}

              {/* Open unit page */}
              {unitHref ? (
                <Link
                  href={unitHref}
                  className="resources-button resources-button--ghost"
                >
                  <span>📘 Open unit page</span>
                </Link>
              ) : (
                <button
                  type="button"
                  className="resources-button resources-button--disabled"
                  disabled
                >
                  📘 Unit page unavailable
                </button>
              )}

              {/* Open original file/link */}
              {primaryUrl ? (
                <a
                  href={primaryUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="resources-button resources-button--ghost"
                >
                  <span>🔗 Open original</span>
                </a>
              ) : (
                <button
                  type="button"
                  className="resources-button resources-button--disabled"
                  disabled
                >
                  🔗 No direct link
                </button>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
