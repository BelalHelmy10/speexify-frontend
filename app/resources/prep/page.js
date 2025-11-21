// app/resources/prep/page.jsx
import { sanityClient } from "@/lib/sanity";
import Link from "next/link";

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

// Helper to decide which URL to open for a resource
function getPrimaryUrl(resource) {
  if (!resource) return null;
  if (resource.googleSlidesUrl) return resource.googleSlidesUrl;
  if (resource.youtubeUrl) return resource.youtubeUrl;
  if (resource.externalUrl) return resource.externalUrl;
  if (resource.fileUrl) return resource.fileUrl;
  return null;
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

  const url = getPrimaryUrl(resource);
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
              {url && (
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="resources-button resources-button--primary"
                >
                  Open raw link
                </a>
              )}
            </div>

            <div className="prep-notes">
              <div className="prep-notes__header">
                <span className="prep-notes__label">Session notes</span>
                <span className="prep-notes__hint">
                  Jot down key points while you&apos;re teaching.
                </span>
              </div>
              <textarea
                className="prep-notes__textarea"
                placeholder="Warm-up, key questions, pronunciation points, follow-up homework..."
              />
            </div>
          </aside>

          {/* RIGHT: viewer */}
          <section className="prep-viewer">
            {!url ? (
              <div className="prep-viewer__placeholder">
                <h2>No preview available</h2>
                <p>
                  This resource doesn&apos;t have a URL configured. Use the
                  session notes on the left or go back to the picker.
                </p>
              </div>
            ) : (
              <div className="prep-viewer__frame-wrapper">
                <iframe
                  src={url}
                  className="prep-viewer__frame"
                  title={resource.title}
                  allowFullScreen
                />
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
