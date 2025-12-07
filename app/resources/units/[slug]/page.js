// app/resources/units/[slug]/page.js
import { sanityClient } from "@/lib/sanity";
import Link from "next/link";

export const dynamic = "force-dynamic";

const UNIT_QUERY = `
*[_type == "unit" && slug.current == $slug][0]{
  _id,
  title,
  "slug": slug.current,
  summary,
  order,
  // Book level with its book
  "bookLevel": bookLevel->{
    _id,
    title,
    code,
    order,
    "book": book->{
      _id,
      title,
      code,
      order,
      // Optional: track linked via book
      "track": track->{
        _id,
        name,
        code,
        order
      }
    }
  },
  // Sublevel + level + track chain
  "subLevel": subLevel->{
    _id,
    title,
    code,
    order,
    "level": level->{
      _id,
      name,
      code,
      order,
      "track": track->{
        _id,
        name,
        code,
        order
      }
    }
  },
  // Resources that reference this unit
  "resources": *[_type == "resource" && references(^._id)] | order(order asc) {
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
    youtubeUrl
  }
}
`;

async function getUnit(slug) {
  if (!slug) return null;
  const unit = await sanityClient.fetch(UNIT_QUERY, { slug });
  return unit || null;
}

// Helper: choose main URL for a resource
function getPrimaryUrl(resource) {
  if (!resource) return null;
  if (resource.googleSlidesUrl) return resource.googleSlidesUrl;
  if (resource.youtubeUrl) return resource.youtubeUrl;
  if (resource.externalUrl) return resource.externalUrl;
  if (resource.fileUrl) return resource.fileUrl;
  return null;
}

export default async function UnitPage({ params }) {
  const slug = params?.slug;

  const unit = await getUnit(slug);

  // If no unit found → nice error card
  if (!unit) {
    return (
      <div className="resources-page resources-page--unit">
        <div className="resources-page__inner unit-page">
          <div className="unit-not-found">
            <h1 className="unit-not-found__title">Unit not found</h1>
            <p className="unit-not-found__text">
              We couldn&apos;t find this unit. It may have been removed or the
              URL is incorrect.
            </p>
            <Link
              href="/resources"
              className="resources-button resources-button--primary"
            >
              ← Back to resources
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { title, summary, order, bookLevel, subLevel, resources } = unit;

  // Derive track / book / level info for breadcrumbs
  const book = bookLevel?.book || null;
  const level = subLevel?.level || null;
  const trackFromLevel = level?.track || null;
  const trackFromBook = book?.track || null;

  const track = trackFromLevel || trackFromBook || null;

  const hasResources = Array.isArray(resources) && resources.length > 0;

  return (
    <div className="resources-page resources-page--unit">
      <div className="resources-page__inner unit-page">
        {/* Breadcrumbs */}
        <nav className="unit-breadcrumbs" aria-label="Breadcrumb">
          <Link href="/resources" className="unit-breadcrumbs__link">
            Resources
          </Link>
          <span className="unit-breadcrumbs__separator">›</span>

          {track && (
            <>
              <span className="unit-breadcrumbs__crumb">{track.name}</span>
              <span className="unit-breadcrumbs__separator">›</span>
            </>
          )}

          {book && (
            <>
              <span className="unit-breadcrumbs__crumb">{book.title}</span>
              <span className="unit-breadcrumbs__separator">›</span>
            </>
          )}

          {bookLevel && (
            <>
              <span className="unit-breadcrumbs__crumb">{bookLevel.title}</span>
              <span className="unit-breadcrumbs__separator">›</span>
            </>
          )}

          <span className="unit-breadcrumbs__crumb">{title}</span>
        </nav>

        {/* Unit header card */}
        <header className="unit-header-card">
          <div className="unit-header-card__top-row">
            <span className="unit-header-card__eyebrow">
              {track ? track.name : "Unit"}
            </span>

            {typeof order === "number" && (
              <span className="unit-header-card__order">
                Unit {order.toString().padStart(2, "0")}
              </span>
            )}
          </div>

          <h1 className="unit-header-card__title">{title}</h1>

          {summary && <p className="unit-header-card__summary">{summary}</p>}

          <div className="unit-header-card__meta">
            {book && (
              <span className="unit-header-card__meta-item">
                📘 Book: {book.title}
              </span>
            )}
            {bookLevel && (
              <>
                <span className="unit-header-card__dot">•</span>
                <span className="unit-header-card__meta-item">
                  Level: {bookLevel.title}
                </span>
              </>
            )}
            {subLevel && (
              <>
                <span className="unit-header-card__dot">•</span>
                <span className="unit-header-card__meta-item">
                  Sub-level: {subLevel.title}
                </span>
              </>
            )}
          </div>
        </header>

        {/* Resources list */}
        <section className="unit-resources">
          <div className="unit-resources__header">
            <div>
              <h2 className="unit-resources__title">Unit resources</h2>
              <p className="unit-resources__subtitle">
                PDFs, slides, videos, and activities linked to this unit.
              </p>
            </div>
            <div className="unit-resources__back">
              <Link
                href="/resources"
                className="resources-button resources-button--ghost"
              >
                ← Back to resources
              </Link>
            </div>
          </div>

          {!hasResources ? (
            <div className="unit-resources__empty">
              No resources found for this unit yet. Add Resource documents in
              Sanity that reference this unit.
            </div>
          ) : (
            <ul className="unit-resources-list">
              {resources.map((res) => {
                const url = getPrimaryUrl(res);

                return (
                  <li key={res._id} className="unit-resource-card">
                    <div className="unit-resource-card__main">
                      <div className="unit-resource-card__title-row">
                        <h3 className="unit-resource-card__title">
                          {res.title || "Untitled resource"}
                        </h3>

                        <div className="unit-resource-card__chips">
                          {res.kind && (
                            <span className="resources-chip resources-chip--primary">
                              {res.kind}
                            </span>
                          )}
                          {res.cecrLevel && (
                            <span className="resources-chip resources-chip--success">
                              CEFR {res.cecrLevel}
                            </span>
                          )}
                          {res.sourceType && (
                            <span className="resources-chip">
                              Source: {res.sourceType}
                            </span>
                          )}
                        </div>
                      </div>

                      {res.description && (
                        <p className="unit-resource-card__description">
                          {res.description}
                        </p>
                      )}

                      {Array.isArray(res.tags) && res.tags.length > 0 && (
                        <div className="unit-resource-card__tags">
                          {res.tags.map((tag) => (
                            <span key={tag} className="resources-tag">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {res.fileName && (
                        <p className="unit-resource-card__filename">
                          {res.fileName}
                        </p>
                      )}
                    </div>

                    <div className="unit-resource-card__actions">
                      {/* Open in Prep Room */}
                      <Link
                        href={{
                          pathname: "/resources/prep",
                          query: {
                            resourceId: res._id,
                            unitId: unit._id,
                          },
                        }}
                        className="resources-button resources-button--primary"
                      >
                        🧑‍🏫 Prep Room
                      </Link>

                      {/* Open original file / URL */}
                      {url ? (
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="resources-button resources-button--ghost"
                        >
                          🔗 Open original
                        </a>
                      ) : (
                        <button
                          type="button"
                          className="resources-button resources-button--disabled"
                          disabled
                        >
                          🔗 No direct link
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
