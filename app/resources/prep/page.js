// app/resources/prep/page.js
import { sanityClient } from "@/lib/sanity";
import Link from "next/link";
import PrepShell from "./PrepShell";
import { getViewerInfo } from "@/lib/viewerHelpers";

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

// ─────────────────────────────────────────────────────────────
// NOTE: searchParams is now a Promise in Next 16 server components.
// We must await it instead of destructuring directly.
// ─────────────────────────────────────────────────────────────

export default async function PrepRoomPage(props) {
  const searchParams = await props.searchParams;
  // From query string: /resources/prep?resourceId=...
  const resourceId = searchParams?.resourceId ?? null;

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

  return (
    <div className="resources-page">
      <div className="resources-page__inner prep-page">
        <PrepShell resource={resource} viewer={viewer} />
      </div>
    </div>
  );
}
