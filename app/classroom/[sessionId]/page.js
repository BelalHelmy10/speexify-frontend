// app/classroom/[sessionId]/page.jsx
import { sanityClient } from "@/lib/sanity";
import ClassroomPageClient from "./ClassroomPageClient";

export const dynamic = "force-dynamic";

// Same query shape as app/resources/page.jsx
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
  const data = await sanityClient.fetch(CLASSROOM_RESOURCES_QUERY);
  return data || [];
}

export default async function ClassroomPage({ params }) {
  const sessionId = params.sessionId;
  const tracks = await getResourcesTree();

  return <ClassroomPageClient sessionId={String(sessionId)} tracks={tracks} />;
}
