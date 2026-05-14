// app/classroom/[sessionId]/page.js
import ClassroomPageContent from "./ClassroomPageContent";

export const dynamic = "force-dynamic";

export default async function ClassroomPage({ params }) {
  return <ClassroomPageContent params={params} locale="en" />;
}
