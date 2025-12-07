// app/resources/prep/page.js
import Link from "next/link";
import { sanityClient } from "@/lib/sanity";
import PrepShell from "./PrepShell";
import { getViewerInfo } from "@/lib/viewerHelpers";

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

export default async function PrepPage({ searchParams: searchParamsPromise }) {
  // ⬅️ THIS is the important line: unwrap the Promise
  const searchParams = await searchParamsPromise;

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
            <h1>No resource selected</h1>
            <p>
              Please choose a resource from the Resources page or a Unit page
              before opening the Prep Room.
            </p>
            <Link href="/resources" className="resources-button">
              ← Back to resources
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
            <h1>Resource not found</h1>
            <p>
              We couldn&apos;t find this resource. It may have been removed in
              Sanity or the URL is incorrect.
            </p>
            <Link href="/resources" className="resources-button">
              ← Back to resources
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
        />
      </div>
    </div>
  );
}
