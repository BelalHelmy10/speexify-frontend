// app/classroom/[sessionId]/page.js
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
    order,
    "levels": *[_type == "level" && references(^._id)] | order(order asc) {
      _id,
      title,
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
          code,
          "resources": *[_type == "resource" && references(^._id)] | order(order asc) {
            _id,
            title,
            type,
            order,
            description,
            googleSlidesUrl,
            youtubeUrl,
            externalUrl,
            "fileUrl": file.asset->url
          }
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

// ⚠️ params is now a Promise – we must await it
export default async function ClassroomPage(props) {
  const { sessionId } = await props.params; // <- this is the key change

  const tracks = await getResourcesTree();

  return <ClassroomPageClient sessionId={String(sessionId)} tracks={tracks} />;
}
