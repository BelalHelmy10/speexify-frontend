// app/resources/prep/page.jsx
import { sanityClient } from "@/lib/sanity";
import Link from "next/link";
import PrepShell from "./PrepShell";

export const dynamic = "force-dynamic";

const RESOURCE_WITH_CONTEXT_QUERY = `
*[_type == "resource" && _id == $id][0]{
  _id,
  title,
  description,
  kind,
  cecrLevel,
  tags,
  sourceType,
  "fileUrl": file.asset->url,
  "fileName": file.asset->originalFilename,
  externalUrl,
  googleSlidesUrl,
  youtubeUrl,
  // find the first unit that references this resource
  "unit": *[_type == "unit" && references(^._id)][0]{
    _id,
    title,
    "slug": slug.current,
    subLevel->{
      _id,
      title,
      code,
      level->{
        _id,
        name,
        code,
        track->{
          _id,
          name,
          code
        }
      }
    }
  }
}
`;

async function getResource(resourceId) {
  if (!resourceId) return null;
  const resource = await sanityClient.fetch(RESOURCE_WITH_CONTEXT_QUERY, {
    id: resourceId,
  });
  return resource || null;
}

// Helpers to decide how to embed the resource
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

function getViewerInfo(resource) {
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

export default async function PrepRoomPage({ searchParams }) {
  // From query string: /resources/prep?resourceId=...
  const resourceId = searchParams?.resourceId;

  if (!resourceId) {
    return (
      <div className="resources-page">
        <div className="resources-page__inner prep-page">
          <div className="prep-empty-card">
            <h1 className="prep-empty-card__title">No resource selected</h1>
            <p className="prep-empty-card__text">
              Open the Prep Room from the resources picker or a unit page to
              load a specific resource here.
            </p>
            <Link
              href="/resources"
              className="resources-button resources-button--primary"
            >
              ← Back to Resources
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const resource = await getResource(resourceId);

  if (!resource) {
    return (
      <div className="resources-page">
        <div className="resources-page__inner prep-page">
          <div className="prep-empty-card">
            <h1 className="prep-empty-card__title">Resource not found</h1>
            <p className="prep-empty-card__text">
              We couldn&apos;t find this resource. It might have been removed or
              the link is incorrect.
            </p>
            <Link
              href="/resources"
              className="resources-button resources-button--primary"
            >
              ← Back to Resources
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const viewer = getViewerInfo(resource);

  return (
    <div className="resources-page">
      <div className="resources-page__inner prep-page">
        <PrepShell resource={resource} viewer={viewer} />
      </div>
    </div>
  );
}
