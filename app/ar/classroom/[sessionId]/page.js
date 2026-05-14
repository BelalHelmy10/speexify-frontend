import ClassroomPageContent from "../../../classroom/[sessionId]/ClassroomPageContent";

export const dynamic = "force-dynamic";

export default async function ArabicClassroomPage({ params }) {
  return <ClassroomPageContent params={params} locale="ar" />;
}
