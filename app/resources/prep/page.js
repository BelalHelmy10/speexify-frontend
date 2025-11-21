// app/resources/prep/page.jsx
import { sanityClient } from "@/lib/sanity";
import Link from "next/link";
import PrepNotes from "./PrepNotes";

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
  try {
    const u = new URL(url);
    const host = u.hostname.replace("www.", "");

    // https://youtu.be/VIDEO_ID
    if (host === "youtu.be") {
      const videoId = u.pathname.replace("/", "");
      if (!videoId) return url;
      return `https://www.youtube.com/embed/${videoId}`;
    }

    // https://youtube.com/watch?v=VIDEO_ID
    if (host === "youtube.com" || host === "m.youtube.com") {
      if (u.pathname === "/watch" && u.searchParams.get("v")) {
        const videoId = u.searchParams.get("v");
        return `https://www.youtube.com/embed/${videoId}`;
      }
      // already /embed or other format
      if (u.pathname.startsWith("/embed/")) {
        return url;
      }
    }

    return url;
  } catch {
    return url;
  }
}

function normalizeGoogleSlidesEmbed(url) {
  // Convert /edit to /preview if present
  if (!url) return url;
  if (url.includes("/edit")) {
    return url.replace("/edit", "/preview");
  }
  return url;
}

function getViewerInfo(resource) {
  if (!resource) return null;

  // Prioritize type-specific URLs first
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

export default async function PrepRoomPage({ searchParams }) {
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
  const viewerUrl = viewer?.viewerUrl;
  const unit = resource.unit;
  const subLevel = unit?.subLevel;
  const level = subLevel?.level;
  const track = level?.track;

  return (
    <div className="resources-page">
      <div className="resources-page__inner prep-page">
        {/* Breadcrumbs */}
        <nav className="unit-breadcrumbs prep-breadcrumbs">
          <Link href="/resources" className="unit-breadcrumbs__link">
            Resources
          </Link>
          {track && (
            <>
              <span className="unit-breadcrumbs__separator">/</span>
              <span className="unit-breadcrumbs__crumb">{track.name}</span>
            </>
          )}
          {level && (
            <>
              <span className="unit-breadcrumbs__separator">/</span>
              <span className="unit-breadcrumbs__crumb">{level.name}</span>
            </>
          )}
          {subLevel && (
            <>
              <span className="unit-breadcrumbs__separator">/</span>
              <span className="unit-breadcrumbs__crumb">
                {subLevel.code} – {subLevel.title}
              </span>
            </>
          )}
          {unit && (
            <>
              <span className="unit-breadcrumbs__separator">/</span>
              <span className="unit-breadcrumbs__crumb">{unit.title}</span>
            </>
          )}
          <span className="unit-breadcrumbs__separator">/</span>
          <span className="unit-breadcrumbs__crumb prep-breadcrumbs__current">
            Prep Room
          </span>
        </nav>

        <div className="prep-layout">
          {/* LEFT: info + notes */}
          <aside className="prep-info-card">
            <div className="prep-info-card__header">
              <h1 className="prep-info-card__title">{resource.title}</h1>
              {resource.fileName && (
                <p className="prep-info-card__filename">{resource.fileName}</p>
              )}
            </div>

            {resource.description && (
              <p className="prep-info-card__description">
                {resource.description}
              </p>
            )}

            <div className="prep-info-card__meta">
              {resource.kind && (
                <span className="resources-chip">{resource.kind}</span>
              )}
              {resource.cecrLevel && (
                <span className="resources-chip resources-chip--primary">
                  CEFR {resource.cecrLevel}
                </span>
              )}
              {resource.sourceType && (
                <span className="resources-chip">{resource.sourceType}</span>
              )}
            </div>

            {Array.isArray(resource.tags) && resource.tags.length > 0 && (
              <div className="prep-info-card__tags">
                {resource.tags.map((tag) => (
                  <span key={tag} className="resources-tag">
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <div className="prep-info-card__actions">
              <Link
                href="/resources"
                className="resources-button resources-button--ghost"
              >
                Back to picker
              </Link>
              {unit?.slug && (
                <Link
                  href={`/resources/units/${unit.slug}`}
                  className="resources-button resources-button--ghost"
                >
                  View unit page
                </Link>
              )}
              {viewer?.rawUrl && (
                <a
                  href={viewer.rawUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="resources-button resources-button--primary"
                >
                  Open raw link
                </a>
              )}
            </div>

            <PrepNotes resourceId={resource._id} />
          </aside>

          {/* RIGHT: viewer */}
          <section className="prep-viewer">
            {viewerUrl ? (
              <>
                <div className="prep-viewer__badge">
                  <span className="prep-viewer__badge-dot" />
                  <span className="prep-viewer__badge-text">
                    Live preview · {viewer.label}
                  </span>
                </div>
                <div className="prep-viewer__frame-wrapper">
                  <iframe
                    src={viewerUrl}
                    className="prep-viewer__frame"
                    title={`${resource.title} – ${viewer.label}`}
                    allow={
                      viewer.type === "youtube"
                        ? "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        : undefined
                    }
                    allowFullScreen
                  />
                </div>
              </>
            ) : (
              <div className="prep-viewer__placeholder">
                <h2>No preview available</h2>
                <p>
                  This resource doesn&apos;t have an embeddable URL. Use the
                  session notes on the left or open the raw link instead.
                </p>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
