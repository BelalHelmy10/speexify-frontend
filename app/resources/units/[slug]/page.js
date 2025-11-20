// app/resources/units/[slug]/page.jsx
import { sanityClient } from "@/lib/sanity";
import Link from "next/link";

export const dynamic = "force-dynamic";

const UNIT_WITH_RESOURCES_QUERY = `
*[_type == "unit" && slug.current == $slug][0]{
  _id,
  title,
  "slug": slug.current,
  summary,
  order,
  // Sublevel + level + track for breadcrumbs (if your schema matches)
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
  // All resources linked to this unit
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

async function getUnit(slug) {
  const unit = await sanityClient.fetch(UNIT_WITH_RESOURCES_QUERY, { slug });
  return unit || null;
}

// Helper to decide which URL to open for a resource
function getPrimaryUrl(resource) {
  if (resource.googleSlidesUrl) return resource.googleSlidesUrl;
  if (resource.youtubeUrl) return resource.youtubeUrl;
  if (resource.externalUrl) return resource.externalUrl;
  if (resource.fileUrl) return resource.fileUrl;
  return null;
}

export default async function UnitResourcesPage({ params }) {
  const slug = params.slug;
  const unit = await getUnit(slug);

  if (!unit) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-semibold mb-3">Unit not found</h1>
        <p className="text-sm text-gray-600 mb-4">
          We couldn&apos;t find this unit. It might have been removed or the
          link is incorrect.
        </p>
        <Link href="/resources" className="text-sm text-blue-600 underline">
          ← Back to Resources
        </Link>
      </div>
    );
  }

  const { subLevel } = unit;
  const level = subLevel?.level;
  const track = level?.track;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Breadcrumbs */}
      <nav className="text-xs text-gray-500 mb-4 flex flex-wrap gap-1 items-center">
        <Link href="/resources" className="hover:underline">
          Resources
        </Link>
        {track && (
          <>
            <span>/</span>
            <span>{track.name}</span>
          </>
        )}
        {level && (
          <>
            <span>/</span>
            <span>{level.name}</span>
          </>
        )}
        {subLevel && (
          <>
            <span>/</span>
            <span>
              {subLevel.code} – {subLevel.title}
            </span>
          </>
        )}
      </nav>

      {/* Unit Header */}
      <header className="mb-6">
        <h1 className="text-2xl font-semibold mb-1">{unit.title}</h1>
        {unit.summary && (
          <p className="text-sm text-gray-600 max-w-2xl">{unit.summary}</p>
        )}
      </header>

      {/* Resources List */}
      <section>
        <h2 className="text-lg font-medium mb-3">Resources</h2>

        {(!unit.resources || unit.resources.length === 0) && (
          <p className="text-sm text-gray-500">
            No resources have been added to this unit yet.
          </p>
        )}

        <div className="space-y-3">
          {unit.resources?.map((r) => {
            const url = getPrimaryUrl(r);
            const disabled = !url;

            return (
              <div
                key={r._id}
                className="border border-gray-200 rounded-lg p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold">{r.title}</h3>
                    {r.kind && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                        {r.kind}
                      </span>
                    )}
                    {r.cecrLevel && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">
                        CEFR {r.cecrLevel}
                      </span>
                    )}
                  </div>
                  {r.description && (
                    <p className="text-xs text-gray-600 mb-1">
                      {r.description}
                    </p>
                  )}
                  {Array.isArray(r.tags) && r.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {r.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-[10px] px-2 py-0.5 rounded-full bg-gray-50 text-gray-500"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  {r.fileName && (
                    <p className="text-[11px] text-gray-400 mt-1">
                      {r.fileName}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {url ? (
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition"
                    >
                      Open resource
                    </a>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium rounded-md bg-gray-200 text-gray-500 cursor-not-allowed"
                    >
                      No URL configured
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
