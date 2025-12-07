// app/resources/units/[slug]/page.js
import { sanityClient } from "@/lib/sanity";
import Link from "next/link";

export const dynamic = "force-dynamic";

// Build the GROQ query WITHOUT using $slug
function buildUnitQuery(slug) {
  // very small escape so quotes in slug can't break the query
  const safeSlug = String(slug).replace(/"/g, '\\"');

  return `
*[_type == "unit" && slug.current == "${safeSlug}"][0]{
  _id,
  title,
  "slug": slug.current,
  summary,
  order,
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
  },
  "resources": *[_type == "resource" && references(^._id)] | order(order asc){
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
}

// 🔐 Guard + use query builder so there is **no `$slug` param** at all
async function getUnit(slug) {
  if (!slug || typeof slug !== "string") {
    return null;
  }

  try {
    const query = buildUnitQuery(slug);
    const unit = await sanityClient.fetch(query);
    return unit || null;
  } catch (err) {
    console.error("Failed to fetch unit from Sanity", err);
    return null;
  }
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

// ─────────────────────────────────────────────────────────────
// NOTE: params is now a Promise in Next 16 server components.
// We must await it instead of destructuring directly.
// ─────────────────────────────────────────────────────────────

export default async function UnitResourcesPage(props) {
  const { slug } = await props.params;
  const unit = await getUnit(slug);

  if (!unit) {
    return (
      <div className="resources-page resources-page--unit">
        <div className="resources-page__inner">
          <div className="unit-not-found">
            <h1 className="unit-not-found__title">Unit not found</h1>
            <p className="unit-not-found__text">
              We couldn&apos;t find this unit. It might have been removed or the
              link is incorrect.
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

  const { subLevel } = unit;
  const level = subLevel?.level;
  const track = level?.track;

  return (
    <div className="resources-page resources-page--unit">
      <div className="resources-page__inner unit-page">
        {/* Breadcrumbs */}
        <nav className="unit-breadcrumbs">
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
        </nav>

        {/* Unit Header Card */}
        <header className="unit-header-card">
          <div className="unit-header-card__top-row">
            <span className="unit-header-card__eyebrow">
              {track?.code || "Track"} · {level?.code || "Level"} ·{" "}
              {subLevel?.code || "Sublevel"}
            </span>
            {typeof unit.order === "number" && (
              <span className="unit-header-card__order">Unit {unit.order}</span>
            )}
          </div>

          <h1 className="unit-header-card__title">{unit.title}</h1>

          {unit.summary && (
            <p className="unit-header-card__summary">{unit.summary}</p>
          )}

          <div className="unit-header-card__meta">
            {track && (
              <span className="unit-header-card__meta-item">{track.name}</span>
            )}
            {level && (
              <>
                <span className="unit-header-card__dot">•</span>
                <span className="unit-header-card__meta-item">
                  {level.name}
                </span>
              </>
            )}
            {subLevel && (
              <>
                <span className="unit-header-card__dot">•</span>
                <span className="unit-header-card__meta-item">
                  {subLevel.code} – {subLevel.title}
                </span>
              </>
            )}
          </div>
        </header>

        {/* Resources List */}
        <section className="unit-resources">
          <div className="unit-resources__header">
            <div>
              <h2 className="unit-resources__title">Resources</h2>
              <p className="unit-resources__subtitle">
                All PDFs, slides, and videos linked to this unit.
              </p>
            </div>
            <Link
              href="/resources"
              className="resources-button resources-button--ghost unit-resources__back"
            >
              Back to picker
            </Link>
          </div>

          {(!unit.resources || unit.resources.length === 0) && (
            <p className="unit-resources__empty">
              No resources have been added to this unit yet.
            </p>
          )}

          <div className="unit-resources-list">
            {unit.resources?.map((r) => {
              const url = getPrimaryUrl(r);

              return (
                <article key={r._id} className="unit-resource-card">
                  <div className="unit-resource-card__main">
                    <div className="unit-resource-card__title-row">
                      <h3 className="unit-resource-card__title">{r.title}</h3>
                      <div className="unit-resource-card__chips">
                        {r.kind && (
                          <span className="resources-chip">{r.kind}</span>
                        )}
                        {r.cecrLevel && (
                          <span className="resources-chip resources-chip--primary">
                            CEFR {r.cecrLevel}
                          </span>
                        )}
                        {r.sourceType && (
                          <span className="resources-chip">{r.sourceType}</span>
                        )}
                      </div>
                    </div>

                    {r.description && (
                      <p className="unit-resource-card__description">
                        {r.description}
                      </p>
                    )}

                    {Array.isArray(r.tags) && r.tags.length > 0 && (
                      <div className="unit-resource-card__tags">
                        {r.tags.map((tag) => (
                          <span key={tag} className="resources-tag">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {r.fileName && (
                      <p className="unit-resource-card__filename">
                        {r.fileName}
                      </p>
                    )}
                  </div>

                  <div className="unit-resource-card__actions">
                    {url ? (
                      <>
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="resources-button resources-button--primary"
                        >
                          Open resource
                        </a>
                        <Link
                          href={{
                            pathname: "/resources/prep",
                            query: { resourceId: r._id },
                          }}
                          className="resources-button resources-button--ghost"
                        >
                          Open in Prep Room
                        </Link>
                      </>
                    ) : (
                      <button
                        type="button"
                        disabled
                        className="resources-button resources-button--disabled"
                      >
                        No URL configured
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
