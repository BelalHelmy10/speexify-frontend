// app/resources/page.js
import { sanityClient } from "@/lib/sanity";
import ResourcesPicker from "./ResourcesPicker";
import { getDictionary, t } from "@/app/i18n";

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

// locale comes from the wrapper (normal = "en", /ar = "ar")
export default async function ResourcesPage({ locale = "en" }) {
  const tracks = await getResourcesTree();
  const dict = getDictionary(locale, "resources");

  return (
    <div className="spx-resources-page">
      <div className="spx-resources-page__inner">
        <header className="spx-resources-hero">
          <span className="spx-resources-hero__eyebrow">
            {t(dict, "resources_eyebrow")}
          </span>
          <h1 className="spx-resources-hero__title">
            {t(dict, "resources_page_title")}
          </h1>
          <p className="spx-resources-hero__subtitle">
            {t(dict, "resources_page_subtitle")}
          </p>
        </header>

        {tracks.length === 0 ? (
          <p className="spx-resources-empty">
            {t(dict, "resources_empty_tracks")}
          </p>
        ) : (
          <ResourcesPicker tracks={tracks} locale={locale} />
        )}
      </div>
    </div>
  );
}
