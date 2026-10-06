import { createRoot } from "react-dom/client";
import ClassroomShell from "../../app/classroom/[sessionId]/ClassroomShell.jsx";
const resources = ["a", "b", "c"].map((_id) => ({ _id, title: `Resource ${_id.toUpperCase()}`, type: "pdf", fileUrl: "https://example.com/lesson.pdf" }));
const tracks = [{ levels: [{ subLevels: [{ units: [{ resources }] }] }] }];
window.calls = [];
window.MockCall = class {
  constructor(domain, options) {
    this.listeners = {};
    this.iframe = document.createElement("iframe");
    options.parentNode.appendChild(this.iframe);
    window.calls.push(this);
  }
  addListener(name, callback) { (this.listeners[name] ||= []).push(callback); }
  on(name, callback) { this.addListener(name, callback); }
  emit(name, data) { for (const cb of this.listeners[name] || []) cb(data); }
  getIFrame() { return this.iframe; }
  getParticipantsInfo() { return []; }
  getCurrentUserID() { return "local"; }
  isAudioMuted() { return Promise.resolve(true); }
  isTileViewEnabled() { return Promise.resolve(true); }
  executeCommand() {}
  dispose() { this.disposed = true; this.iframe.remove(); }
};
window.JitsiMeetExternalAPI = window.MockCall;

window.testState = { state: {resourceId:"a",openResourceIds:["a"]}, messages: [], saved: [] };
window.channelSubscribers = new Set();
window.receive = (message) => window.channelSubscribers.forEach((fn) => fn(message));
window.testRole = new URLSearchParams(location.search).get('role') || 'teacher';
createRoot(document.getElementById("root")).render(<ClassroomShell
  locale={new URLSearchParams(location.search).get("locale") || "en"} tracks={tracks} sessionId="tabs-test" session={{ isTeacher: window.testRole === 'teacher', currentUser: {id: 'test-user'}, title: 'Resource tabs QA' }} />);
