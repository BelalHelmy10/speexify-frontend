import { createRoot } from "react-dom/client";
import ClassroomShell from "../../app/classroom/[sessionId]/ClassroomShell.jsx";
const resources = ["a", "b", "c"].map((_id) => ({ _id, title: `Resource ${_id.toUpperCase()}`, type: "pdf", fileUrl: "https://example.com/lesson.pdf", audioUrl: "https://example.com/audio.mp3" }));
const tracks = [{ levels: [{ subLevels: [{ units: [{ resources }] }] }] }];
const harnessParams = new URLSearchParams(location.search);
const mediaDeviceEvents = new EventTarget();
let mediaPermission = harnessParams.get("media") === "denied" ? "denied" : "granted";
let networkReachable = harnessParams.get("network") !== "offline";
let mediaDevices = [
  { deviceId: "mic-built-in", kind: "audioinput", label: "Built-in Microphone", groupId: "built-in" },
  { deviceId: "cam-front", kind: "videoinput", label: "Front Camera", groupId: "built-in" },
  { deviceId: "speaker-built-in", kind: "audiooutput", label: "Built-in Speakers", groupId: "built-in" },
];

window.fetch = async () => ({ ok: networkReachable });
window.classroomTestMedia = {
  requests: [],
  setPermission(value) { mediaPermission = value; },
  connectBluetooth() {
    mediaDevices = [
      ...mediaDevices,
      { deviceId: "mic-bluetooth", kind: "audioinput", label: "Bluetooth Headset", groupId: "bluetooth" },
      { deviceId: "speaker-bluetooth", kind: "audiooutput", label: "Bluetooth Headset", groupId: "bluetooth" },
    ];
    mediaDeviceEvents.dispatchEvent(new Event("devicechange"));
  },
  disconnectBluetooth() {
    mediaDevices = mediaDevices.filter((device) => device.groupId !== "bluetooth");
    mediaDeviceEvents.dispatchEvent(new Event("devicechange"));
  },
  disconnectBuiltInCamera() {
    mediaDevices = mediaDevices.filter((device) => device.deviceId !== "cam-front");
    mediaDeviceEvents.dispatchEvent(new Event("devicechange"));
  },
};
window.classroomTestNetwork = {
  setReachable(value) { networkReachable = Boolean(value); },
};
window.classroomTestLifecycle = {
  setVisibility(value) {
    Object.defineProperty(document, "visibilityState", { configurable: true, value });
    Object.defineProperty(document, "hidden", { configurable: true, value: value === "hidden" });
    document.dispatchEvent(new Event("visibilitychange"));
  },
};
Object.defineProperty(navigator, "mediaDevices", {
  configurable: true,
  value: {
    enumerateDevices: async () => mediaDevices.map((device) => ({ ...device })),
    getUserMedia: async (constraints) => {
      window.classroomTestMedia.requests.push(constraints);
      if (mediaPermission === "denied") {
        throw new DOMException("Permission denied by classroom harness", "NotAllowedError");
      }
      return new MediaStream();
    },
    addEventListener: (...args) => mediaDeviceEvents.addEventListener(...args),
    removeEventListener: (...args) => mediaDeviceEvents.removeEventListener(...args),
  },
});
window.calls = [];
window.MockCall = class {
  constructor(domain, options) {
    this.listeners = {};
    this.domain = domain;
    this.options = options;
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
