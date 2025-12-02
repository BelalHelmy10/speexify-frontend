// app/classroom/[sessionId]/classroomHelpers.js

// ─────────────────────────────────────────────────────────────
// Resource index
// ─────────────────────────────────────────────────────────────

// Build { resourcesById } so we can go from resourceId → full resource + context
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
              // Attach context so PrepShell can still show breadcrumbs, etc.
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

// ─────────────────────────────────────────────────────────────
// Viewer helpers (mirror app/resources/prep/page.jsx)
// ─────────────────────────────────────────────────────────────

function normalizeYouTubeEmbed(url) {
  if (!url) return null;

  try {
    const u = new URL(url);
    let videoId = null;

    // youtu.be/<id>
    if (u.hostname.includes("youtu.be")) {
      videoId = u.pathname.replace("/", "");
    }

    // youtube.com/watch?v=<id> or /embed/<id>
    if (
      u.hostname.includes("youtube.com") ||
      u.hostname.includes("m.youtube.com")
    ) {
      if (u.searchParams.get("v")) {
        videoId = u.searchParams.get("v");
      }

      if (u.pathname.startsWith("/embed/")) {
        return url; // already embed-friendly
      }
    }

    if (videoId) {
      return `https://www.youtube.com/embed/${videoId}`;
    }

    return url;
  } catch {
    return url;
  }
}

function normalizeGoogleSlidesEmbed(url) {
  if (!url) return url;
  if (url.includes("/edit")) {
    return url.replace("/edit", "/preview");
  }
  return url;
}

export function getViewerInfo(resource) {
  if (!resource) return null;

  const isPdfUrl = (url) =>
    typeof url === "string" && url.toLowerCase().endsWith(".pdf");

  // YouTube
  if (resource.youtubeUrl) {
    const viewerUrl = normalizeYouTubeEmbed(resource.youtubeUrl);
    return {
      type: "youtube",
      label: "YouTube",
      viewerUrl,
      rawUrl: resource.youtubeUrl,
    };
  }

  // Google Slides
  if (resource.googleSlidesUrl) {
    const viewerUrl = normalizeGoogleSlidesEmbed(resource.googleSlidesUrl);
    return {
      type: "slides",
      label: "Google Slides",
      viewerUrl,
      rawUrl: resource.googleSlidesUrl,
    };
  }

  // PDF via externalUrl
  if (resource.externalUrl && isPdfUrl(resource.externalUrl)) {
    return {
      type: "pdf",
      label: "File",
      viewerUrl: resource.externalUrl,
      rawUrl: resource.externalUrl,
    };
  }

  // PDF via fileUrl
  if (resource.fileUrl && isPdfUrl(resource.fileUrl)) {
    return {
      type: "pdf",
      label: "File",
      viewerUrl: resource.fileUrl,
      rawUrl: resource.fileUrl,
    };
  }

  // Generic external page
  if (resource.externalUrl) {
    return {
      type: "external",
      label: "External page",
      viewerUrl: resource.externalUrl,
      rawUrl: resource.externalUrl,
    };
  }

  // Generic file (non-PDF)
  if (resource.fileUrl) {
    return {
      type: "file",
      label: "File",
      viewerUrl: resource.fileUrl,
      rawUrl: resource.fileUrl,
    };
  }

  return {
    type: "unknown",
    label: "Resource",
    viewerUrl: null,
    rawUrl: null,
  };
}

// ─────────────────────────────────────────────────────────────
// Picker index for ClassroomResourcePicker
// ─────────────────────────────────────────────────────────────

export function buildPickerIndex(tracks = []) {
  const trackOptions = [];
  const booksByTrackId = {};
  const bookLevelsByBookId = {};
  const unitOptionsByBookLevelId = {};
  const resourcesByUnitId = {};

  (tracks || []).forEach((track) => {
    if (!track?._id) return;

    // Track options (simple label: just the name in classroom)
    trackOptions.push({
      value: track._id,
      label: track.name,
    });

    // Books directly on track
    booksByTrackId[track._id] = (track.books || []).map((book) => ({
      value: book._id,
      label: book.title,
    }));

    // Book levels + units – we derive these by walking through levels/subLevels/units
    (track.levels || []).forEach((level) => {
      (level.subLevels || []).forEach((subLevel) => {
        (subLevel.units || []).forEach((unit) => {
          const bookLevel = unit.bookLevel;
          const book = bookLevel?.book;
          if (!book || !book._id || !bookLevel || !bookLevel._id) return;

          // Book → Book levels
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
            });
          }

          // Book level → Units
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

          // Unit → Resources
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
