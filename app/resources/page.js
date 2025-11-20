// app/resources/page.jsx
import { sanityClient } from "@/lib/sanity";
import Link from "next/link";

const RESOURCES_TREE_QUERY = `
*[_type == "track"] | order(order asc) {
  _id,
  name,
  code,
  description,
  order,
  "levels": *[_type == "level" && references(^._id)] | order(order asc) {
    _id,
    code,
    name,
    description,
    order,
    "subLevels": *[_type == "subLevel" && references(^._id)] | order(order asc) {
      _id,
      code,
      title,
      description,
      estimatedHours,
      order,
      "units": *[_type == "unit" && references(^._id)] | order(order.asc) {
        _id,
        title,
        "slug": slug.current,
        summary,
        order,
        "resourcesCount": count(*[_type == "resource" && references(^._id)])
      }
    }
  }
}
`;

export const dynamic = "force-dynamic"; // always fresh (optional)

async function getResourcesTree() {
  const data = await sanityClient.fetch(RESOURCES_TREE_QUERY);
  return data || [];
}

export default async function ResourcesPage() {
  const tracks = await getResourcesTree();

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-semibold mb-6">Resources</h1>
      <p className="text-sm text-gray-600 mb-8">
        Explore Speexify resources by track, level, and unit.
      </p>

      {tracks.length === 0 && (
        <p className="text-gray-500 text-sm">
          No tracks found yet. Add Track / Level / Sublevel / Unit documents in
          Sanity.
        </p>
      )}

      <div className="space-y-8">
        {tracks.map((track) => (
          <section
            key={track._id}
            className="border border-gray-200 rounded-xl p-4"
          >
            <header className="mb-4">
              <h2 className="text-xl font-semibold">
                {track.name}{" "}
                <span className="text-xs text-gray-500 uppercase">
                  ({track.code})
                </span>
              </h2>
              {track.description && (
                <p className="text-sm text-gray-600 mt-1">
                  {track.description}
                </p>
              )}
            </header>

            {(!track.levels || track.levels.length === 0) && (
              <p className="text-xs text-gray-500">
                No levels yet – create “Level” docs linked to this track.
              </p>
            )}

            <div className="space-y-4">
              {track.levels?.map((lvl) => (
                <div key={lvl._id} className="border-t border-gray-100 pt-3">
                  <h3 className="text-lg font-medium">
                    {lvl.name}{" "}
                    <span className="text-xs text-gray-500">{lvl.code}</span>
                  </h3>
                  {lvl.description && (
                    <p className="text-sm text-gray-600 mt-1">
                      {lvl.description}
                    </p>
                  )}

                  {(!lvl.subLevels || lvl.subLevels.length === 0) && (
                    <p className="text-xs text-gray-500 mt-1">
                      No sublevels yet – create “Sublevel” docs linked to this
                      level.
                    </p>
                  )}

                  <div className="mt-2 space-y-3">
                    {lvl.subLevels?.map((sl) => (
                      <div
                        key={sl._id}
                        className="bg-gray-50 rounded-lg p-3 space-y-2"
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="text-sm font-semibold">
                              {sl.code} – {sl.title}
                            </div>
                            {sl.description && (
                              <p className="text-xs text-gray-600 mt-0.5">
                                {sl.description}
                              </p>
                            )}
                          </div>
                          {sl.estimatedHours && (
                            <div className="text-xs text-gray-500">
                              ~ {sl.estimatedHours}h
                            </div>
                          )}
                        </div>

                        {/* Units */}
                        {(!sl.units || sl.units.length === 0) && (
                          <p className="text-xs text-gray-500">
                            No units yet – create “Unit” docs linked to this
                            sublevel.
                          </p>
                        )}

                        <div className="grid md:grid-cols-2 gap-2">
                          {sl.units?.map((u) => (
                            <Link
                              key={u._id}
                              href={`/resources/units/${u.slug}`}
                              className="bg-white border border-gray-200 rounded-md px-3 py-2 text-xs hover:border-gray-300 hover:shadow-sm transition"
                            >
                              <div className="flex justify-between items-center mb-1">
                                <div className="font-semibold">{u.title}</div>
                                {typeof u.resourcesCount === "number" && (
                                  <span className="text-[11px] text-gray-500">
                                    {u.resourcesCount} resource
                                    {u.resourcesCount === 1 ? "" : "s"}
                                  </span>
                                )}
                              </div>
                              {u.summary && (
                                <p className="text-[11px] text-gray-600 line-clamp-2">
                                  {u.summary}
                                </p>
                              )}
                            </Link>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
