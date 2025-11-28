"use client";

import { useMemo, useState, useEffect } from "react";

// Choose the best URL for a resource
function getPrimaryUrl(resource) {
  if (!resource) return null;
  if (resource.googleSlidesUrl) return resource.googleSlidesUrl;
  if (resource.youtubeUrl) return resource.youtubeUrl;
  if (resource.externalUrl) return resource.externalUrl;
  if (resource.fileUrl) return resource.fileUrl;
  return null;
}

// Find a unit (and its context) by ID inside the tree
function findUnitWithContext(tracks, unitId) {
  for (const track of tracks || []) {
    for (const level of track.levels || []) {
      for (const subLevel of level.subLevels || []) {
        for (const unit of subLevel.units || []) {
          if (unit._id === unitId) {
            const bookLevel = unit.bookLevel || null;
            const book = bookLevel?.book || null;
            return { track, level, subLevel, unit, bookLevel, book };
          }
        }
      }
    }
  }
  return {
    track: null,
    level: null,
    subLevel: null,
    unit: null,
    bookLevel: null,
    book: null,
  };
}

export default function ResourcesPicker({ tracks }) {
  const {
    trackOptions,
    booksByTrackId,
    bookLevelsByBookId,
    unitOptionsByBookLevelId,
  } = useMemo(() => {
    const trackOptions = [];
    const booksByTrackId = {};
    const bookLevelsByBookId = {};
    const unitOptionsByBookLevelId = {};

    (tracks || []).forEach((track) => {
      // Track dropdown option
      trackOptions.push({
        value: track._id,
        label: `${track.order}) ${track.name}`,
      });

      // Books for this track
      const booksForTrack = [];
      (track.books || []).forEach((book) => {
        booksForTrack.push({
          value: book._id,
          label: book.title,
        });
      });
      booksByTrackId[track._id] = booksForTrack;

      // Book levels + units (we get them by walking levels/subLevels/units)
      (track.levels || []).forEach((level) => {
        (level.subLevels || []).forEach((subLevel) => {
          (subLevel.units || []).forEach((unit) => {
            const bookLevel = unit.bookLevel;
            const book = bookLevel?.book;
            if (!book || !book._id || !bookLevel || !bookLevel._id) return;

            // Ensure book → bookLevels mapping exists
            if (!bookLevelsByBookId[book._id]) {
              bookLevelsByBookId[book._id] = [];
            }
            if (
              !bookLevelsByBookId[book._id].some(
                (b) => b.value === bookLevel._id
              )
            ) {
              bookLevelsByBookId[book._id].push({
                value: bookLevel._id,
                label: bookLevel.title,
                code: bookLevel.code,
              });
            }

            // Units per bookLevel
            if (!unitOptionsByBookLevelId[bookLevel._id]) {
              unitOptionsByBookLevelId[bookLevel._id] = [];
            }
            unitOptionsByBookLevelId[bookLevel._id].push({
              value: unit._id,
              label: unit.title,
              subLevelTitle: subLevel.title,
              summary: unit.summary,
              resources: unit.resources || [],
            });
          });
        });
      });
    });

    return {
      trackOptions,
      booksByTrackId,
      bookLevelsByBookId,
      unitOptionsByBookLevelId,
    };
  }, [tracks]);

  // ── Selection state ────────────────────────────────────────
  const [selectedTrackId, setSelectedTrackId] = useState(
    trackOptions[0]?.value || ""
  );
  const [selectedBookId, setSelectedBookId] = useState("");
  const [selectedBookLevelId, setSelectedBookLevelId] = useState("");
  const [selectedUnitId, setSelectedUnitId] = useState("");
  const [selectedResourceId, setSelectedResourceId] = useState("");

  const bookOptions = selectedTrackId
    ? booksByTrackId[selectedTrackId] || []
    : [];

  const bookLevelOptions = selectedBookId
    ? bookLevelsByBookId[selectedBookId] || []
    : [];

  const unitOptions = selectedBookLevelId
    ? unitOptionsByBookLevelId[selectedBookLevelId] || []
    : [];

  // Keep track selection valid when options change
  useEffect(() => {
    if (!trackOptions.length) {
      setSelectedTrackId("");
      return;
    }
    setSelectedTrackId((prev) => {
      const stillExists = trackOptions.some((t) => t.value === prev);
      return stillExists ? prev : trackOptions[0].value;
    });
  }, [trackOptions]);

  // Track → Book
  useEffect(() => {
    const booksForTrack = selectedTrackId
      ? booksByTrackId[selectedTrackId] || []
      : [];

    if (!booksForTrack.length) {
      setSelectedBookId("");
      setSelectedBookLevelId("");
      setSelectedUnitId("");
      setSelectedResourceId("");
      return;
    }

    setSelectedBookId((prev) => {
      const stillExists = booksForTrack.some((b) => b.value === prev);
      return stillExists ? prev : booksForTrack[0].value;
    });
  }, [selectedTrackId, booksByTrackId]);

  // Book → Book level
  useEffect(() => {
    const levelsForBook = selectedBookId
      ? bookLevelsByBookId[selectedBookId] || []
      : [];

    if (!levelsForBook.length) {
      setSelectedBookLevelId("");
      setSelectedUnitId("");
      setSelectedResourceId("");
      return;
    }

    setSelectedBookLevelId((prev) => {
      const stillExists = levelsForBook.some((l) => l.value === prev);
      return stillExists ? prev : levelsForBook[0].value;
    });
  }, [selectedBookId, bookLevelsByBookId]);

  // Book level → Unit
  useEffect(() => {
    if (!unitOptions.length) {
      setSelectedUnitId("");
      setSelectedResourceId("");
      return;
    }
    setSelectedUnitId((prev) => {
      const stillExists = unitOptions.some((u) => u.value === prev);
      return stillExists ? prev : unitOptions[0].value;
    });
  }, [unitOptions]);

  // Get unit + context for preview
  const { track, level, subLevel, unit, bookLevel, book } = useMemo(
    () =>
      selectedUnitId
        ? findUnitWithContext(tracks, selectedUnitId)
        : {
            track: null,
            level: null,
            subLevel: null,
            unit: null,
            bookLevel: null,
            book: null,
          },
    [tracks, selectedUnitId]
  );

  const resources = unit?.resources || [];

  // Keep resource selection valid when resources change
  useEffect(() => {
    if (!resources.length) {
      setSelectedResourceId("");
      return;
    }
    setSelectedResourceId((prev) => {
      const stillExists = resources.some((r) => r._id === prev);
      return stillExists ? prev : resources[0]._id;
    });
  }, [resources]);

  const selectedResource =
    resources.find((r) => r._id === selectedResourceId) || resources[0] || null;

  const resourceUrl = getPrimaryUrl(selectedResource);

  // ── UI ─────────────────────────────────────────────────────
  return (
    <div className="resources-layout">
      {/* LEFT: picker card */}
      <section className="resources-picker">
        <div className="resources-picker__header">
          <h2 className="resources-picker__title">Quick resource finder</h2>
          <p className="resources-picker__subtitle">
            Pick a track, then a book/series, then the book level, unit, and
            resource you want to use.
          </p>
        </div>

        <div className="resources-picker__grid">
          {/* Track select */}
          <div className="resources-picker__field">
            <label className="resources-picker__label">Track</label>
            <div className="resources-picker__control">
              <select
                value={selectedTrackId}
                onChange={(e) => setSelectedTrackId(e.target.value)}
              >
                {trackOptions.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <p className="resources-picker__hint">
              Choose the main path (e.g. General English, Business English).
            </p>
          </div>

          {/* Book / series select */}
          <div className="resources-picker__field">
            <label className="resources-picker__label">Book / Series</label>
            <div className="resources-picker__control">
              <select
                value={selectedBookId}
                onChange={(e) => setSelectedBookId(e.target.value)}
                disabled={!bookOptions.length}
              >
                {!bookOptions.length && (
                  <option value="">No books for this track yet</option>
                )}
                {bookOptions.map((b) => (
                  <option key={b.value} value={b.value}>
                    {b.label}
                  </option>
                ))}
              </select>
            </div>
            <p className="resources-picker__hint">
              Then choose the coursebook / series you&apos;re using.
            </p>
          </div>

          {/* Book level select */}
          <div className="resources-picker__field">
            <label className="resources-picker__label">Book level</label>
            <div className="resources-picker__control">
              <select
                value={selectedBookLevelId}
                onChange={(e) => setSelectedBookLevelId(e.target.value)}
                disabled={!bookLevelOptions.length}
              >
                {!bookLevelOptions.length && (
                  <option value="">No levels for this book yet</option>
                )}
                {bookLevelOptions.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>
            <p className="resources-picker__hint">
              Then pick the specific level (e.g. Starter, A2, B2).
            </p>
          </div>

          {/* Unit select */}
          <div className="resources-picker__field">
            <label className="resources-picker__label">Unit</label>
            <div className="resources-picker__control">
              <select
                value={selectedUnitId}
                onChange={(e) => setSelectedUnitId(e.target.value)}
                disabled={!unitOptions.length}
              >
                {!unitOptions.length && (
                  <option value="">No units for this level yet</option>
                )}
                {unitOptions.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </select>
            </div>
            <p className="resources-picker__hint">
              Now pick the exact unit you&apos;re preparing.
            </p>
          </div>

          {/* Resource select */}
          <div className="resources-picker__field resources-picker__field--full">
            <label className="resources-picker__label">Resource</label>
            <div className="resources-picker__control">
              <select
                value={selectedResourceId}
                onChange={(e) => setSelectedResourceId(e.target.value)}
                disabled={!resources.length}
              >
                {!resources.length && (
                  <option value="">No resources in this unit yet</option>
                )}
                {resources.map((r) => (
                  <option key={r._id} value={r._id}>
                    {r.title}
                  </option>
                ))}
              </select>
            </div>
            <p className="resources-picker__hint">
              Finally, choose the PDF, slides, or video you&apos;ll use.
            </p>
          </div>
        </div>
      </section>

      {/* RIGHT: preview card */}
      <section className="resources-preview">
        {!selectedUnitId ? (
          <div className="resources-preview__card resources-preview__card--empty resources-preview__card--animated">
            <h3>Choose a track, book, level & unit</h3>
            <p>
              Once you pick a book level and unit, we&apos;ll show you the
              resources available here.
            </p>
          </div>
        ) : !resources.length ? (
          <div className="resources-preview__card resources-preview__card--empty resources-preview__card--animated">
            <h3>No resources yet</h3>
            <p>
              This unit doesn&apos;t have any resources configured in Sanity
              right now.
            </p>
          </div>
        ) : (
          <div
            key={selectedResource?._id || unit?._id}
            className="resources-preview__card resources-preview__card--animated"
          >
            <div className="resources-preview__breadcrumbs">
              {track && <span>{track.name}</span>}
              {book && (
                <>
                  <span>•</span>
                  <span>{book.title}</span>
                </>
              )}
              {bookLevel && (
                <>
                  <span>•</span>
                  <span>{bookLevel.title}</span>
                </>
              )}
              {subLevel && (
                <>
                  <span>•</span>
                  <span>
                    {subLevel.code} – {subLevel.title}
                  </span>
                </>
              )}
            </div>

            <h3 className="resources-preview__title">
              {selectedResource?.title}
            </h3>

            {selectedResource?.description && (
              <p className="resources-preview__description">
                {selectedResource.description}
              </p>
            )}

            <div className="resources-preview__meta">
              {selectedResource?.kind && (
                <span className="resources-chip">{selectedResource.kind}</span>
              )}
              {selectedResource?.cecrLevel && (
                <span className="resources-chip resources-chip--primary">
                  CEFR {selectedResource.cecrLevel}
                </span>
              )}
              {selectedResource?.sourceType && (
                <span className="resources-chip">
                  {selectedResource.sourceType}
                </span>
              )}
            </div>

            {Array.isArray(selectedResource?.tags) &&
              selectedResource.tags.length > 0 && (
                <div className="resources-preview__tags">
                  {selectedResource.tags.map((tag) => (
                    <span key={tag} className="resources-tag">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

            {selectedResource?.fileName && (
              <p className="resources-preview__filename">
                {selectedResource.fileName}
              </p>
            )}

            <div className="resources-preview__actions">
              {resourceUrl ? (
                <a
                  href={resourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="resources-button resources-button--primary"
                >
                  Open resource
                </a>
              ) : (
                <button
                  type="button"
                  disabled
                  className="resources-button resources-button--disabled"
                >
                  No URL configured
                </button>
              )}

              {selectedResource && (
                <a
                  href={`/resources/prep?resourceId=${selectedResource._id}`}
                  className="resources-button resources-button--ghost"
                >
                  Open in Prep Room
                </a>
              )}

              {unit?.slug && (
                <a
                  href={`/resources/units/${unit.slug}`}
                  className="resources-button resources-button--ghost"
                >
                  View unit page
                </a>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
