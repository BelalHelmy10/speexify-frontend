// app/resources/page.js
import { sanityClient } from "@/lib/sanity";
import ResourcesPicker from "./ResourcesPicker";

export const dynamic = "force-dynamic";

/**
 * Sanity query for the Resources picker.
 *
 * Shape:
 * Track
 *   ├─ books[]
 *   └─ levels[]
 *        └─ subLevels[]
 *             └─ units[]
 *                  ├─ bookLevel -> book
 *                  └─ resources[]
 *
 * This is the shape that buildResourcePickerIndex() and ResourcesPicker expect.
 */
const RESOURCES_PICKER_QUERY = `
*[_type == "track"] | order(order asc) {
  _id,
  name,
  code,
  order,

  // Books directly under this track
  "books": *[_type == "book" && references(^._id)] | order(order asc) {
    _id,
    title,
    code,
    order
  },

  // CEFR levels / main levels for this track
  "levels": *[_type == "level" && references(^._id)] | order(order asc) {
    _id,
    name,
    code,
    order,

    // Sub-levels (e.g. A1.1, B1.2, etc.)
    "subLevels": *[_type == "subLevel" && references(^._id)] | order(order asc) {
      _id,
      title,
      code,
      order,

      // Units under each sub-level
      "units": *[_type == "unit" && references(^._id)] | order(order asc) {
        _id,
        title,
        "slug": slug.current,
        order,
        summary,

        // Link back to the book + book level for this unit
        "bookLevel": bookLevel->{
          _id,
          title,
          code,
          order,
          "book": book->{
            _id,
            title,
            code,
            order
          }
        },

        // All resources attached to this unit
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
    }
  }
}
`;

async function getResourcesTree() {
  const data = await sanityClient.fetch(RESOURCES_PICKER_QUERY);
  return Array.isArray(data) ? data : [];
}

export default async function ResourcesPage() {
  const tracks = await getResourcesTree();

  return (
    <div className="spx-resources-page">
      <div className="spx-resources-page__inner">
        <header className="spx-resources-hero">
          <span className="spx-resources-hero__eyebrow">Resources</span>
          <h1 className="spx-resources-hero__title">
            Prepare your lessons in seconds
          </h1>
          <p className="spx-resources-hero__subtitle">
            Pick a track, then a book/series, then the book level, unit, and
            resource. We’ll surface the right PDFs, slides, and videos for your
            next session.
          </p>
        </header>

        {tracks.length === 0 ? (
          <p className="spx-resources-empty">
            No tracks found yet. Add Track / Book / Book level / Unit / Resource
            documents in Sanity.
          </p>
        ) : (
          <ResourcesPicker tracks={tracks} />
        )}
      </div>
    </div>
  );
}
