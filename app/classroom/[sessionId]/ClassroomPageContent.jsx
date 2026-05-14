// app/classroom/[sessionId]/page.js
import { sanityClient } from "@/lib/sanity";
import ClassroomPageClient from "./ClassroomPageClient";
import { requireClassroomPageAccess } from "@/app/protected-access";

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

  // 🔥 NEW — multiple audio tracks support
  audioTracks[] {
    _key,
    label,
    file {
      asset-> {
        url,
        originalFilename
      }
    }
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

async function getResourcesTree() {
  const data = await sanityClient.fetch(CLASSROOM_RESOURCES_QUERY);
  return data || [];
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
          <h1 className="cr-error-screen__title">Session not found</h1>
          <p className="cr-error-screen__text">
            Missing classroom session id in the URL. Please go back to the
            dashboard and open the classroom again.
          </p>
          <a href={dashboardHref} className="cr-error-screen__btn">
            ← Back to dashboard
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

  if (!session) {
    return (
      <div className="cr-error-screen">
        <div className="cr-error-screen__content">
          <span className="cr-error-screen__icon">⚠️</span>
          <h1 className="cr-error-screen__title">Session not found</h1>
          <p className="cr-error-screen__text">
            We could not find this classroom session. Please go back to the
            dashboard and open it again.
          </p>
          <a href={dashboardHref} className="cr-error-screen__btn">
            ← Back to dashboard
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
