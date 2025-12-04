// app/classroom/[sessionId]/classroomHelpers.js

// ─────────────────────────────────────────────────────────────
// Resource index
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

// ─────────────────────────────────────────────────────────────
// Viewer helpers
// ─────────────────────────────────────────────────────────────

function normalizeYouTubeEmbed(url) {
  if (!url) return null;

  try {
    const u = new URL(url);
    let videoId = null;

    if (u.hostname.includes("youtu.be")) {
      videoId = u.pathname.replace("/", "");
    }

    if (
      u.hostname.includes("youtube.com") ||
      u.hostname.includes("m.youtube.com")
    ) {
      if (u.searchParams.get("v")) {
        videoId = u.searchParams.get("v");
      }

      if (u.pathname.startsWith("/embed/")) {
        return url;
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

  if (resource.youtubeUrl) {
    const viewerUrl = normalizeYouTubeEmbed(resource.youtubeUrl);
    return {
      type: "youtube",
      label: "YouTube",
      viewerUrl,
      rawUrl: resource.youtubeUrl,
    };
  }

  if (resource.googleSlidesUrl) {
    const viewerUrl = normalizeGoogleSlidesEmbed(resource.googleSlidesUrl);
    return {
      type: "slides",
      label: "Google Slides",
      viewerUrl,
      rawUrl: resource.googleSlidesUrl,
    };
  }

  if (resource.externalUrl && isPdfUrl(resource.externalUrl)) {
    return {
      type: "pdf",
      label: "File",
      viewerUrl: resource.externalUrl,
      rawUrl: resource.externalUrl,
    };
  }

  if (resource.fileUrl && isPdfUrl(resource.fileUrl)) {
    return {
      type: "pdf",
      label: "File",
      viewerUrl: resource.fileUrl,
      rawUrl: resource.fileUrl,
    };
  }

  if (resource.externalUrl) {
    return {
      type: "external",
      label: "External page",
      viewerUrl: resource.externalUrl,
      rawUrl: resource.externalUrl,
    };
  }

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

    trackOptions.push({
      value: track._id,
      label: track.name,
    });

    booksByTrackId[track._id] = (track.books || []).map((book) => ({
      value: book._id,
      label: book.title,
    }));

    (track.levels || []).forEach((level) => {
      (level.subLevels || []).forEach((subLevel) => {
        (subLevel.units || []).forEach((unit) => {
          const bookLevel = unit.bookLevel;
          const book = bookLevel?.book;
          if (!book || !book._id || !bookLevel || !bookLevel._id) return;

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
