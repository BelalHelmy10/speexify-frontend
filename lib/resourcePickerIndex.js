// lib/resourcePickerIndex.js

/**
 * Build a shared picker index from the Sanity tracks tree.
 *
 * Shape is compatible with both:
 * - ClassroomResourcePicker
 * - ResourcesPicker
 *
 * Returned structure:
 *  - trackOptions: [{ value, label, order }]
 *  - booksByTrackId: { [trackId]: [{ value, label, order }] }
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
 *  - resourcesByUnitId: { [unitId]: [resource, ...] }
 */
export function buildResourcePickerIndex(tracks = []) {
  const trackOptions = [];
  const booksByTrackId = {};
  const bookLevelsByBookId = {};
  const unitOptionsByBookLevelId = {};
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

    // Book levels + units (walk levels/subLevels/units)
    (track.levels || []).forEach((level) => {
      (level.subLevels || []).forEach((subLevel) => {
        (subLevel.units || []).forEach((unit) => {
          const bookLevel = unit.bookLevel;
          const book = bookLevel?.book;
          if (!book || !book._id || !bookLevel || !bookLevel._id) return;

          // Map: book → bookLevels
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

          // Map: bookLevel → units
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

          // Map: unitId → resources[]
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

  return {
    trackOptions,
    booksByTrackId,
    bookLevelsByBookId,
    unitOptionsByBookLevelId,
    resourcesByUnitId,
  };
}
