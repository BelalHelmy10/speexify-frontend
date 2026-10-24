import { useLayoutEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { createPortal } from "react-dom";
import PrepVideoCall from "../../app/resources/prep/PrepVideoCall.jsx";
import ClassroomHeaderBar from "../../app/classroom/[sessionId]/ClassroomHeaderBar.jsx";

window.fetch = async () => ({ ok: true });
Object.defineProperty(navigator, "mediaDevices", {
  configurable: true,
  value: {
    enumerateDevices: async () => [],
    getUserMedia: async () => new MediaStream(),
  },
});

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
function Harness() {
  const [portrait, setPortrait] = useState(false);
  const [state, setState] = useState("connecting");
  const [host] = useState(() => document.createElement("div"));
  window.rotate = () => setPortrait(p => !p);
  useLayoutEffect(() => {
    document.getElementById("split").appendChild(host);
  }, [host]);
  return <>
    <ClassroomHeaderBar wsStatus="ready" videoConnectionState={state} />
    <span data-layout={portrait ? "portrait" : "split"} />
    {createPortal(<PrepVideoCall key="classroom-call"
      roomId="test" userName="Test" onConnectionStateChange={setState} />, host)}
  </>;
}
createRoot(document.getElementById("root")).render(<Harness />);
