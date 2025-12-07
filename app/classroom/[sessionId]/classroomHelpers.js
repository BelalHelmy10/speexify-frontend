// app/classroom/[sessionId]/classroomHelpers.js

// ─────────────────────────────────────────────────────────────
// Shared viewer helpers
// ─────────────────────────────────────────────────────────────
import {
  getViewerInfo as sharedGetViewerInfo,
  normalizeYouTubeEmbed,
  normalizeGoogleSlidesEmbed,
} from "@/lib/viewerHelpers";
import { buildResourcePickerIndex } from "@/lib/resourcePickerIndex";

// Re-export viewer info so the rest of the classroom code does NOT need to change
export { sharedGetViewerInfo as getViewerInfo };
// (OPTIONAL) re-export normalizers if needed elsewhere
export { normalizeYouTubeEmbed, normalizeGoogleSlidesEmbed };

// ─────────────────────────────────────────────────────────────
// Resource index builder – matches the RESOURCES query shape
// ─────────────────────────────────────────────────────────────

export function buildResourceIndex(tracks = []) {
  const resourcesById = {};

  (tracks || []).forEach((track) => {
    (track.levels || []).forEach((level) => {
      (level.subLevels || []).forEach((subLevel) => {
        (subLevel.units || []).forEach((unit) => {
          (unit.resources || []).forEach((resource) => {
            if (!resource?._id) return;

            const bookLevel = unit.bookLevel || null;
            const book = bookLevel?.book || null;

            resourcesById[resource._id] = {
              ...resource,
              // Attach full context in the shape viewerHelpers expects
              unit: {
                _id: unit._id,
                title: unit.title,
                slug: unit.slug,
                order: unit.order,
                summary: unit.summary,
                bookLevel: bookLevel
                  ? {
                      _id: bookLevel._id,
                      title: bookLevel.title,
                      code: bookLevel.code,
                      order: bookLevel.order,
                      book: book
                        ? {
                            _id: book._id,
                            title: book.title,
                            code: book.code,
                            order: book.order,
                          }
                        : undefined,
                    }
                  : undefined,
                subLevel: {
                  _id: subLevel._id,
                  title: subLevel.title,
                  code: subLevel.code,
                  order: subLevel.order,
                  level: {
                    _id: level._id,
                    name: level.name,
                    code: level.code,
                    order: level.order,
                    track: {
                      _id: track._id,
                      name: track.name,
                      code: track.code,
                      order: track.order,
                    },
                  },
                },
              },
              // Optional: convenience access to book
              book: book
                ? {
                    _id: book._id,
                    title: book.title,
                    code: book.code,
                    order: book.order,
                  }
                : undefined,
            };
          });
        });
      });
    });
  });

  return { resourcesById };
}

// ─────────────────────────────────────────────────────────────
// Picker index for ClassroomResourcePicker (shared helper)
// ─────────────────────────────────────────────────────────────

export function buildPickerIndex(tracks = []) {
  // This uses the same helper as the /resources page,
  // which expects the exact query shape we just matched.
  return buildResourcePickerIndex(tracks);
}
