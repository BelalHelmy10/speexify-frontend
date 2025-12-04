// lib/viewerHelpers.js

/**
 * Normalize various YouTube URL formats into an embeddable URL.
 */
export function normalizeYouTubeEmbed(url) {
  if (!url) return null;

  try {
    const u = new URL(url);
    let videoId = null;

    // Short links: https://youtu.be/VIDEO_ID
    if (u.hostname.includes("youtu.be")) {
      videoId = u.pathname.replace("/", "");
    }

    // Standard links: https://www.youtube.com/watch?v=VIDEO_ID
    if (
      u.hostname.includes("youtube.com") ||
      u.hostname.includes("m.youtube.com")
    ) {
      // Already an embed
      if (u.pathname.startsWith("/embed/")) {
        return url;
      }

      const vParam = u.searchParams.get("v");
      if (vParam) {
        videoId = vParam;
      }
    }

    if (videoId) {
      return `https://www.youtube.com/embed/${videoId}`;
    }

    // Fallback: return original URL if we can't normalize
    return url;
  } catch {
    return url;
  }
}

/**
 * Normalize Google Slides URLs to use /preview so they embed nicely.
 */
export function normalizeGoogleSlidesEmbed(url) {
  if (!url) return url;
  if (url.includes("/edit")) {
    return url.replace("/edit", "/preview");
  }
  return url;
}

/**
 * Given a resource document from Sanity, return viewer metadata
 * describing how/where to embed it.
 */
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

  // External PDF
  if (resource.externalUrl && isPdfUrl(resource.externalUrl)) {
    return {
      type: "pdf",
      label: "File",
      viewerUrl: resource.externalUrl,
      rawUrl: resource.externalUrl,
    };
  }

  // Uploaded PDF
  if (resource.fileUrl && isPdfUrl(resource.fileUrl)) {
    return {
      type: "pdf",
      label: "File",
      viewerUrl: resource.fileUrl,
      rawUrl: resource.fileUrl,
    };
  }

  // Other external page
  if (resource.externalUrl) {
    return {
      type: "external",
      label: "External page",
      viewerUrl: resource.externalUrl,
      rawUrl: resource.externalUrl,
    };
  }

  // Other uploaded file
  if (resource.fileUrl) {
    return {
      type: "file",
      label: "File",
      viewerUrl: resource.fileUrl,
      rawUrl: resource.fileUrl,
    };
  }

  // Fallback
  return {
    type: "unknown",
    label: "Resource",
    viewerUrl: null,
    rawUrl: null,
  };
}
