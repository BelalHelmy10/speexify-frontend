// app/resources/prep/page.js
import Link from "next/link";
import { sanityClient } from "@/lib/sanity";
import PrepShell from "./PrepShell";
import { getViewerInfo } from "@/lib/viewerHelpers";
import { getDictionary, t } from "@/app/i18n";

export const dynamic = "force-dynamic";

// Load a single resource + its unit / track context
const RESOURCE_WITH_CONTEXT_QUERY = `
*[_type == "resource" && _id == $id][0]{
  _id,
  title,
  description,
  kind,
  cecrLevel,
  tags,
  sourceType,
  code,
  order,
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
    code,
    order,
    summary,
    subLevel->{
      _id,
      title,
      code,
      order,
      level->{
        _id,
        name,
        code,
        order,
        track->{
          _id,
          name,
          code,
          order
        }
      }
    }
  }
}
`;

async function getResourceWithContext(id) {
  if (!id) return null;
  const data = await sanityClient.fetch(RESOURCE_WITH_CONTEXT_QUERY, { id });
  return data || null;
}

export default async function PrepPage({
  searchParams: searchParamsPromise,
  locale = "en",
}) {
  // ⬅️ unwrap the Promise (Next 13 app router quirk)
  const searchParams = await searchParamsPromise;
  const dict = getDictionary(locale, "resources");

  // Accept a few possible names, but Resources uses ?resourceId=
  const resourceId =
    searchParams?.resourceId ??
    searchParams?.resource ??
    searchParams?.id ??
    null;

  const unitIdFromQuery = searchParams?.unitId || null; // optional, just in case

  // Visiting /resources/prep without selecting a resource
  if (!resourceId) {
    return (
      <div className="spx-resources-page">
        <div className="spx-resources-page__inner">
          <div className="spx-resources-empty-card">
            <h1>{t(dict, "resources_prep_no_resource_title")}</h1>
            <p>{t(dict, "resources_prep_no_resource_text")}</p>
            <Link href="/resources" className="resources-button">
              {t(dict, "resources_prep_back_to_resources")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const resource = await getResourceWithContext(resourceId);

  if (!resource) {
    return (
      <div className="spx-resources-page">
        <div className="spx-resources-page__inner">
          <div className="spx-resources-empty-card">
            <h1>{t(dict, "resources_prep_not_found_title")}</h1>
            <p>{t(dict, "resources_prep_not_found_text")}</p>
            <Link href="/resources" className="resources-button">
              {t(dict, "resources_prep_back_to_resources_again")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const viewer = getViewerInfo(resource);

  return (
    <div className="spx-resources-page spx-resources-page--prep">
      <div className="spx-resources-page__inner">
        <PrepShell
          resource={resource}
          viewer={viewer}
          hideSidebar={false}
          hideBreadcrumbs={false}
          classroomChannel={null}
          isScreenShareActive={false}
          isTeacher={true}
          locale={locale}
          unitIdFromQuery={unitIdFromQuery}
        />
      </div>
    </div>
  );
}
