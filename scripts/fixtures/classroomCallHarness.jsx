import { useLayoutEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { createPortal } from "react-dom";
import PrepVideoCall from "../../app/resources/prep/PrepVideoCall.jsx";
import ClassroomHeaderBar from "../../app/classroom/[sessionId]/ClassroomHeaderBar.jsx";

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
    document.getElementById(portrait ? "portrait" : "split").appendChild(host);
  }, [portrait, host]);
  return <>
    <ClassroomHeaderBar wsStatus="ready" videoConnectionState={state} />
    {createPortal(<PrepVideoCall key={portrait ? "portrait-call" : "split-call"}
      roomId="test" userName="Test" onConnectionStateChange={setState} />, host)}
  </>;
}
createRoot(document.getElementById("root")).render(<Harness />);
