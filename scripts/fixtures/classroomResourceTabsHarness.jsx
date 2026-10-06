import { createRoot } from "react-dom/client";
import ClassroomShell from "../../app/classroom/[sessionId]/ClassroomShell.jsx";
const resources = ["a", "b", "c"].map((_id) => ({ _id, title: `Resource ${_id.toUpperCase()}`, type: "pdf" }));
const tracks = [{ levels: [{ subLevels: [{ units: [{ resources }] }] }] }];
window.testState = { state: {}, messages: [], saved: [] };
window.channelSubscribers = new Set();
window.receive = (message) => window.channelSubscribers.forEach((fn) => fn(message));
window.testRole = new URLSearchParams(location.search).get('role') || 'teacher';
createRoot(document.getElementById("root")).render(<ClassroomShell
  locale={new URLSearchParams(location.search).get("locale") || "en"} tracks={tracks} sessionId="tabs-test" session={{ isTeacher: window.testRole === 'teacher', currentUser: {id: 'test-user'}, title: 'Resource tabs QA' }} />);
