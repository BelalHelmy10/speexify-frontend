// lib/resourcePickerIndex.js

/**
 * Build a shared picker index from the Sanity tracks tree.
 *
 * Shape is compatible with both:
 * - ClassroomResourcePicker (Course -> Book -> CEFR -> Unit -> Resources)
 * - ResourcesPicker (can still use legacy BookLevel-based navigation if you want)
 *
 * Returned structure:
 *  - trackOptions: [{ value, label, order }]
 *  - booksByTrackId: { [trackId]: [{ value, label, order }] }
 *
 *  LEGACY (kept for compatibility with any existing picker still using "Book Level"):
 *  - bookLevelsByBookId: { [bookId]: [{ value, label, code, order }] }
 *  - unitOptionsByBookLevelId: {
 *        [bookLevelId]: [{
 *          value,
 *          label,
 *          subLevelTitle,
 *          summary,
 *          order,
 *          resources
 *        }]
 *    }
 *
 *  NEW (CEFR-driven dropdown in ClassroomResourcePicker):
 *  - subLevelOptionsByTrackBookKey: {
 *        ["<trackId>:<bookId>"]: [{ value, label, code, order, levelCode }]
 *    }
 *  - unitOptionsByBookSubLevelKey: {
 *        ["<bookId>:<subLevelId>"]: [{
 *          value,
 *          label,
 *          summary,
 *          order,
 *          resources
 *        }]
 *    }
 *
 *  - resourcesByUnitId: { [unitId]: [resource, ...] }
 */
export function buildResourcePickerIndex(tracks = []) {
  const trackOptions = [];
  const booksByTrackId = {};

  // Legacy (BookLevel-based)
  const bookLevelsByBookId = {};
  const unitOptionsByBookLevelId = {};

  // New (CEFR-based: subLevel)
  const subLevelOptionsByTrackBookKey = {};
  const unitOptionsByBookSubLevelKey = {};

  const resourcesByUnitId = {};

  (tracks || []).forEach((track) => {
    if (!track?._id) return;

    // Track dropdown option
    trackOptions.push({
      value: track._id,
      label: track.name,
      order: track.order,
    });

    // Books for this track
    booksByTrackId[track._id] = (track.books || []).map((book) => ({
      value: book._id,
      label: book.title,
      order: book.order,
    }));

    // Walk levels/subLevels/units (your Sanity tree)
    (track.levels || []).forEach((level) => {
      (level.subLevels || []).forEach((subLevel) => {
        (subLevel.units || []).forEach((unit) => {
          const bookLevel = unit.bookLevel;
          const book = bookLevel?.book;

          if (!book || !book._id || !bookLevel || !bookLevel._id) return;
          if (!subLevel || !subLevel._id) return;

          // ─────────────────────────────────────────────
          // LEGACY: book → bookLevels
          // ─────────────────────────────────────────────
          if (!bookLevelsByBookId[book._id]) {
            bookLevelsByBookId[book._id] = [];
          }
          if (
            !bookLevelsByBookId[book._id].some((b) => b.value === bookLevel._id)
          ) {
            bookLevelsByBookId[book._id].push({
              value: bookLevel._id,
              label: bookLevel.title,
              code: bookLevel.code,
              order: bookLevel.order,
            });
          }

          // ─────────────────────────────────────────────
          // LEGACY: bookLevel → units
          // ─────────────────────────────────────────────
          if (!unitOptionsByBookLevelId[bookLevel._id]) {
            unitOptionsByBookLevelId[bookLevel._id] = [];
          }
          unitOptionsByBookLevelId[bookLevel._id].push({
            value: unit._id,
            label: unit.title,
            subLevelTitle: subLevel.title,
            summary: unit.summary,
            order: unit.order,
            resources: unit.resources || [],
          });

          // ─────────────────────────────────────────────
          // NEW: track+book → CEFR subLevels (A1.1 / A1.2 ...)
          // label should be the code if present (A1.1), otherwise title fallback
          // ─────────────────────────────────────────────
          const trackBookKey = `${track._id}:${book._id}`;
          if (!subLevelOptionsByTrackBookKey[trackBookKey]) {
            subLevelOptionsByTrackBookKey[trackBookKey] = [];
          }

          const subLevelLabel = subLevel.code || subLevel.title;

          if (
            !subLevelOptionsByTrackBookKey[trackBookKey].some(
              (s) => s.value === subLevel._id
            )
          ) {
            subLevelOptionsByTrackBookKey[trackBookKey].push({
              value: subLevel._id,
              label: subLevelLabel,
              code: subLevel.code,
              order: subLevel.order,
              levelCode: level.code,
            });
          }

          // ─────────────────────────────────────────────
          // NEW: book+subLevel → units
          // ─────────────────────────────────────────────
          const bookSubLevelKey = `${book._id}:${subLevel._id}`;
          if (!unitOptionsByBookSubLevelKey[bookSubLevelKey]) {
            unitOptionsByBookSubLevelKey[bookSubLevelKey] = [];
          }
          unitOptionsByBookSubLevelKey[bookSubLevelKey].push({
            value: unit._id,
            label: unit.title,
            summary: unit.summary,
            order: unit.order,
            resources: unit.resources || [],
          });

          // ─────────────────────────────────────────────
          // unitId → resources[]
          // ─────────────────────────────────────────────
          if (!resourcesByUnitId[unit._id]) {
            resourcesByUnitId[unit._id] = [];
          }
          (unit.resources || []).forEach((r) => {
            if (!r?._id) return;
            resourcesByUnitId[unit._id].push(r);
          });
        });
      });
    });
  });

  // Sort options for nicer UX (stable ordering)
  trackOptions.sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0) || a.label.localeCompare(b.label)
  );

  Object.values(booksByTrackId).forEach((arr) => {
    arr.sort(
      (a, b) =>
        (a.order ?? 0) - (b.order ?? 0) || a.label.localeCompare(b.label)
    );
  });

  Object.values(bookLevelsByBookId).forEach((arr) => {
    arr.sort(
      (a, b) =>
        (a.order ?? 0) - (b.order ?? 0) || a.label.localeCompare(b.label)
    );
  });

  Object.values(unitOptionsByBookLevelId).forEach((arr) => {
    arr.sort(
      (a, b) =>
        (a.order ?? 0) - (b.order ?? 0) || a.label.localeCompare(b.label)
    );
  });

  Object.values(subLevelOptionsByTrackBookKey).forEach((arr) => {
    // Prefer `order`, then code/label
    arr.sort(
      (a, b) =>
        (a.order ?? 0) - (b.order ?? 0) ||
        String(a.label).localeCompare(String(b.label))
    );
  });

  Object.values(unitOptionsByBookSubLevelKey).forEach((arr) => {
    arr.sort(
      (a, b) =>
        (a.order ?? 0) - (b.order ?? 0) || a.label.localeCompare(b.label)
    );
  });

  return {
    trackOptions,
    booksByTrackId,

    // legacy (kept)
    bookLevelsByBookId,
    unitOptionsByBookLevelId,

    // new (CEFR-based)
    subLevelOptionsByTrackBookKey,
    unitOptionsByBookSubLevelKey,

    resourcesByUnitId,
  };
}
