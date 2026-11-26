// app/classroom/[sessionId]/page.js
import ClassroomPageContent from "./ClassroomPageContent";

export const dynamic = "force-dynamic";

// Let the classroom use the full width of notched phones in landscape; the
// layout pads itself with env(safe-area-inset-*).
export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function ClassroomPage({ params }) {
  return <ClassroomPageContent params={params} locale="en" />;
}
