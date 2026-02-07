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
 * Check if a URL is a Google Drive URL (file or document)
 */
function isGoogleDriveUrl(url) {
  if (!url || typeof url !== "string") return false;
  return url.includes("drive.google.com") || url.includes("docs.google.com");
}

/**
 * Extract Google Drive file ID from various URL formats
 */
function extractGoogleDriveFileId(url) {
  if (!url) return null;

  const patterns = [
    /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/,
    /drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/,
    /drive\.google\.com\/uc\?.*id=([a-zA-Z0-9_-]+)/,
    /docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Convert Google Drive URLs to direct download URLs for PDF.js
 */
function getDirectPdfUrl(url) {
  if (!url) return null;

  const fileId = extractGoogleDriveFileId(url);
  if (fileId) {
    // Use Google Drive's direct download endpoint
    return `https://drive.google.com/uc?export=download&id=${fileId}`;
  }

  // Return as-is for non-Google Drive URLs
  return url;
}

/**
 * Check if a URL points to a PDF file.
 * Handles various URL formats including those with query parameters.
 */
function isPdfUrl(url) {
  if (!url || typeof url !== "string") return false;

  // Google Drive URLs might be PDFs
  if (isGoogleDriveUrl(url)) return true;

  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname.toLowerCase();

    // Check pathname for .pdf extension
    if (pathname.endsWith(".pdf")) return true;

    // Check if path contains .pdf (for URLs like /file.pdf?query=something)
    if (pathname.includes(".pdf")) return true;

    // Check common PDF hosting patterns
    if (pathname.includes("/pdf/") || pathname.includes("/pdfs/")) return true;

    return false;
  } catch {
    // If URL parsing fails, fall back to simple string check
    const lowerUrl = url.toLowerCase();
    return (
      lowerUrl.endsWith(".pdf") ||
      lowerUrl.includes(".pdf?") ||
      lowerUrl.includes(".pdf#")
    );
  }
}

/**
 * Check if a filename indicates a PDF file.
 */
function isPdfFileName(fileName) {
  if (!fileName || typeof fileName !== "string") return false;
  return fileName.toLowerCase().endsWith(".pdf");
}

/**
 * Given a resource document from Sanity, return viewer metadata
 * describing how/where to embed it.
 *
 * PDF detection is comprehensive and checks:
 * - URL patterns (.pdf extension, /pdf/ paths, Google Drive)
 * - fileName field from Sanity asset
 * - sourceType field
 *
 * Returns direct download URLs for Google Drive files so PDF.js can load them
 */
export function getViewerInfo(resource) {
  if (!resource) return null;

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

  // Check for PDF - comprehensive detection
  // Force ALL PDFs (Drive, Dropbox, raw URLs, etc.) to be treated as PDF.js documents

  // Determine if this resource is definitely a PDF
  // Check for PDF - comprehensive detection
  // Force ALL PDFs (Drive, Dropbox, raw URLs, etc.) to be treated as PDF.js documents

  // Determine if this resource is definitely a PDF
  const isDefinitelyPdf =
    isPdfUrl(resource.externalUrl) ||
    isPdfUrl(resource.fileUrl) ||
    isPdfFileName(resource.fileName) ||
    (resource.sourceType && resource.sourceType.toLowerCase() === "pdf") ||
    (resource.kind && resource.kind.toLowerCase().includes("pdf"));

  // If PDF → ALWAYS return type "pdf" and force proxied PDF URL
  if (isDefinitelyPdf) {
    // Prefer externalUrl first, then fileUrl
    const directUrl =
      getDirectPdfUrl(resource.externalUrl) ||
      getDirectPdfUrl(resource.fileUrl);

    // IMPORTANT: pdf.js will fetch this URL, so we point it at our proxy
    const proxiedUrl = directUrl
      ? `/api/pdf-proxy?url=${encodeURIComponent(directUrl)}`
      : null;

    return {
      type: "pdf",
      label: "PDF",
      viewerUrl: proxiedUrl, // used by PdfViewerWithSidebar
      rawUrl:
        resource.externalUrl || // "Open original file" can still go to Google
        resource.fileUrl ||
        directUrl,
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
