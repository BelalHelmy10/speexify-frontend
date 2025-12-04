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

// (OPTIONAL) If other parts of classroomHelpers need the normalizers, export them:
// export { normalizeYouTubeEmbed, normalizeGoogleSlidesEmbed };

// ─────────────────────────────────────────────────────────────
// Resource index builder (KEEP YOUR ORIGINAL CODE)
// ─────────────────────────────────────────────────────────────

export function buildResourceIndex(tracks = []) {
  const resourcesById = {};

  (tracks || []).forEach((track) => {
    (track.levels || []).forEach((level) => {
      (level.subLevels || []).forEach((subLevel) => {
        (subLevel.units || []).forEach((unit) => {
          (unit.resources || []).forEach((resource) => {
            if (!resource?._id) return;

            resourcesById[resource._id] = {
              ...resource,
              unit: {
                _id: unit._id,
                title: unit.title,
                slug: unit.slug,
                subLevel: {
                  _id: subLevel._id,
                  title: subLevel.title,
                  code: subLevel.code,
                  level: {
                    _id: level._id,
                    name: level.name,
                    code: level.code,
                    track: {
                      _id: track._id,
                      name: track.name,
                      code: track.code,
                    },
                  },
                },
              },
            };
          });
        });
      });
    });
  });

  return { resourcesById };
}

// KEEP THE REST OF YOUR FILE BELOW THIS

// ─────────────────────────────────────────────────────────────
// Viewer helpers
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
// Picker index for ClassroomResourcePicker
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
// Picker index for ClassroomResourcePicker (shared helper)
// ─────────────────────────────────────────────────────────────

export function buildPickerIndex(tracks = []) {
  return buildResourcePickerIndex(tracks);
}
