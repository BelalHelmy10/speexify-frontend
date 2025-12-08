// app/ar/classroom/[sessionId]/page.js
import ClassroomPage from "../../../classroom/[sessionId]/page";

export default function ArabicClassroomPage(props) {
  return <ClassroomPage {...props} locale="ar" />;
}
