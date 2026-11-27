// app/classroom/[sessionId]/page.js
import { sanityClient } from "@/lib/sanity";
import ClassroomPageClient from "./ClassroomPageClient";
import { requireClassroomPageAccess } from "@/app/protected-access";
import { classroomText } from "./classroomCopy";

export const dynamic = "force-dynamic";

// 🔹 EXACT same structure as app/resources/page.js
const CLASSROOM_RESOURCES_QUERY = `
*[_type == "track"] | order(order asc) {
  _id,
  name,
  code,
  order,
  "books": *[_type == "book" && references(^._id)] | order(order asc) {
    _id,
    title,
    code,
    order
  },
  "levels": *[_type == "level" && references(^._id)] | order(order asc) {
    _id,
    name,
    code,
    order,
    "subLevels": *[_type == "subLevel" && references(^._id)] | order(order asc) {
      _id,
      title,
      code,
      order,
      "units": *[_type == "unit" && references(^._id)] | order(order asc) {
        _id,
        title,
        "slug": slug.current,
        order,
        summary,
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
"resources": *[_type == "resource" && references(^._id)] | order(order asc) {
  _id,
  title,
  description,
  kind,
  cecrLevel,
  tags,
  sourceType,

  // PDF / File
  "fileUrl": file.asset->url,
  "fileName": file.asset->originalFilename,

  // 🔥 NEW — single audio support
  "audioUrl": audio.asset->url,

  // Multiple audio tracks, flattened (buildPrepAudioTracks reads track.url).
  // The nested file.asset shape made this the largest part of the payload.
  "audioTracks": audioTracks[] {
    _key,
    label,
    "url": file.asset->url
  },

  externalUrl,
  googleSlidesUrl,
  youtubeUrl
}


      }
    }
  }
}
`;

// The library tree was fetched live from Sanity (useCdn off) on every
// classroom open: ~1.8 s of query time plus the transfer, before the page could
// render. Keep a per-server copy for a few minutes and refresh it in the
// background, so imports still show up quickly but joins never wait on it.
const RESOURCE_TREE_FRESH_MS = 5 * 60 * 1000;
const RESOURCE_TREE_MAX_STALE_MS = 60 * 60 * 1000;
const resourceTreeCache = globalThis.__speexifyClassroomResourceTree || {
  data: null,
  fetchedAt: 0,
  inflight: null,
};
globalThis.__speexifyClassroomResourceTree = resourceTreeCache;

function refreshResourcesTree() {
  if (!resourceTreeCache.inflight) {
    resourceTreeCache.inflight = sanityClient
      .fetch(CLASSROOM_RESOURCES_QUERY)
      .then((data) => {
        resourceTreeCache.data = data || [];
        resourceTreeCache.fetchedAt = Date.now();
        return resourceTreeCache.data;
      })
      .finally(() => {
        resourceTreeCache.inflight = null;
      });
  }
  return resourceTreeCache.inflight;
}

async function getResourcesTree() {
  const age = Date.now() - resourceTreeCache.fetchedAt;
  if (resourceTreeCache.data && age < RESOURCE_TREE_FRESH_MS) {
    return resourceTreeCache.data;
  }
  if (resourceTreeCache.data && age < RESOURCE_TREE_MAX_STALE_MS) {
    // Serve the recent copy now; refresh for the next visitor.
    void refreshResourcesTree().catch(() => {});
    return resourceTreeCache.data;
  }
  try {
    return await refreshResourcesTree();
  } catch (error) {
    if (resourceTreeCache.data) return resourceTreeCache.data;
    throw error;
  }
}

export default async function ClassroomPageContent({ params, locale = "en" }) {
  // ⬇️ In your Next.js version, `params` is a Promise
  const resolvedParams = await params;
  const sessionId = resolvedParams?.sessionId ?? resolvedParams?.id ?? null;
  const prefix = locale === "ar" ? "/ar" : "";
  const dashboardHref = `${prefix}/dashboard`;

  // Extra defensive: if the URL somehow doesn't have an id, show a clear error
  if (!sessionId) {
    return (
      <div className="cr-error-screen">
        <div className="cr-error-screen__content">
          <span className="cr-error-screen__icon">⚠️</span>
          <h1 className="cr-error-screen__title">{classroomText(locale, "cr_error_not_found_title")}</h1>
          <p className="cr-error-screen__text">{classroomText(locale, "cr_error_missing_id_text")}</p>
          <a href={dashboardHref} className="cr-error-screen__btn">
            {classroomText(locale, "cr_back_to_dashboard")}
          </a>
        </div>
      </div>
    );
  }

  const session = await requireClassroomPageAccess({
    sessionId: String(sessionId),
    locale,
    nextPath: `${prefix}/classroom/${sessionId}`,
  });

  if (session?.classroomLocked) {
    return (
      <div className="cr-error-screen">
        <div className="cr-error-screen__content">
          <span className="cr-error-screen__icon" aria-hidden="true">🔒</span>
          <h1 className="cr-error-screen__title">{classroomText(locale, "cr_locked_title")}</h1>
          <p className="cr-error-screen__text">{classroomText(locale, "cr_locked_text")}</p>
          <a href={dashboardHref} className="cr-error-screen__btn">
            {classroomText(locale, "cr_back_to_dashboard")}
          </a>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="cr-error-screen">
        <div className="cr-error-screen__content">
          <span className="cr-error-screen__icon">⚠️</span>
          <h1 className="cr-error-screen__title">{classroomText(locale, "cr_error_not_found_title")}</h1>
          <p className="cr-error-screen__text">{classroomText(locale, "cr_error_not_found_text")}</p>
          <a href={dashboardHref} className="cr-error-screen__btn">
            {classroomText(locale, "cr_back_to_dashboard")}
          </a>
        </div>
      </div>
    );
  }

  const tracks = await getResourcesTree();

  return (
    <ClassroomPageClient
      sessionId={String(sessionId)}
      tracks={tracks}
      initialSession={session}
    />
  );
}
