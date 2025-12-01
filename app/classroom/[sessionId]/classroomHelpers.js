// app/classroom/[sessionId]/classroomHelpers.js

// Build { resourcesById } so we can go from resourceId → full resource + context
export function buildResourceIndex(tracks = []) {
  const resourcesById = {};

  (tracks || []).forEach((track) => {
    (track.levels || []).forEach((level) => {
      (level.subLevels || []).forEach((subLevel) => {
        (subLevel.units || []).forEach((unit) => {
          (unit.resources || []).forEach((resource) => {
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

// Exactly the same viewer logic as app/resources/prep/page.jsx
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

  // Detect Sanity CDN URLs - these are always files (usually PDFs)
  const isSanityCdnFile = (url) => {
    if (typeof url !== "string") return false;
    return (
      url.includes("cdn.sanity.io/files/") || url.includes("cdn.sanity.io")
    );
  };

  // Enhanced PDF detection - checks multiple patterns
  const isPdfUrl = (url) => {
    if (typeof url !== "string") return false;
    const lower = url.toLowerCase();

    // Direct .pdf extension
    if (lower.endsWith(".pdf")) return true;

    // URL contains .pdf before query params (e.g., file.pdf?token=xxx)
    if (lower.includes(".pdf?") || lower.includes(".pdf#")) return true;

    return false;
  };

  // Detect Google Drive file URLs
  const isGoogleDriveFile = (url) => {
    if (typeof url !== "string") return false;
    return (
      url.includes("drive.google.com/file/d/") ||
      url.includes("drive.google.com/uc?")
    );
  };

  // Convert Google Drive URLs to embeddable preview URLs
  const normalizeGoogleDriveEmbed = (url) => {
    if (!url) return url;
    if (url.includes("/preview")) return url;
    if (url.includes("/view")) return url.replace("/view", "/preview");
    if (url.includes("/edit")) return url.replace("/edit", "/preview");
    return url;
  };

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

  // Check externalUrl first
  if (resource.externalUrl) {
    // Sanity CDN files - ALWAYS use pdf type for consistent PDF.js rendering
    if (isSanityCdnFile(resource.externalUrl)) {
      return {
        type: "pdf",
        label: "File",
        viewerUrl: resource.externalUrl,
        rawUrl: resource.externalUrl,
      };
    }

    if (isPdfUrl(resource.externalUrl)) {
      return {
        type: "pdf",
        label: "File",
        viewerUrl: resource.externalUrl,
        rawUrl: resource.externalUrl,
      };
    }

    // Google Drive files - use iframe embed (consistent for both users)
    if (isGoogleDriveFile(resource.externalUrl)) {
      return {
        type: "gdrive",
        label: "File",
        viewerUrl: normalizeGoogleDriveEmbed(resource.externalUrl),
        rawUrl: resource.externalUrl,
      };
    }

    return {
      type: "external",
      label: "External page",
      viewerUrl: resource.externalUrl,
      rawUrl: resource.externalUrl,
    };
  }

  // Check fileUrl
  if (resource.fileUrl) {
    // Sanity CDN files - ALWAYS use pdf type for consistent PDF.js rendering
    if (isSanityCdnFile(resource.fileUrl)) {
      return {
        type: "pdf",
        label: "File",
        viewerUrl: resource.fileUrl,
        rawUrl: resource.fileUrl,
      };
    }

    if (isPdfUrl(resource.fileUrl)) {
      return {
        type: "pdf",
        label: "File",
        viewerUrl: resource.fileUrl,
        rawUrl: resource.fileUrl,
      };
    }

    // Google Drive files - use iframe embed
    if (isGoogleDriveFile(resource.fileUrl)) {
      return {
        type: "gdrive",
        label: "File",
        viewerUrl: normalizeGoogleDriveEmbed(resource.fileUrl),
        rawUrl: resource.fileUrl,
      };
    }

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

// Build the picker data structures for ClassroomResourcePicker
export function buildPickerIndex(tracks = []) {
  const trackOptions = [];
  const booksByTrackId = {};
  const bookLevelsByBookId = {};
  const unitOptionsByBookLevelId = {};
  const resourcesByUnitId = {};

  (tracks || []).forEach((track) => {
    // Track options
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
