import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { createPortal } from "react-dom";
import PrepVideoCall from "../../app/resources/prep/PrepVideoCall.jsx";
import MobileClassroomLayout from "../../app/classroom/[sessionId]/MobileClassroomLayout.jsx";
import ClassroomHeaderBar from "../../app/classroom/[sessionId]/ClassroomHeaderBar.jsx";
import ClassroomControlBar from "../../app/classroom/[sessionId]/ClassroomControlBar.jsx";

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
  const [mobile, setMobile] = useState(false);
  const [tab, setTab] = useState("video");
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const [host] = useState(() => {
    const el = document.createElement("div"); el.className = "cr-video-host"; return el;
  });
  const desktop = useRef(null), portrait = useRef(null);
  useEffect(() => {
    const query = window.matchMedia('(max-width: 900px) and (orientation: portrait)');
    const update = () => { setMobile(query.matches); setTab("video"); };
    update(); query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  useLayoutEffect(() => { (mobile ? portrait : desktop).current.appendChild(host); }, [mobile, host]);
  window.setTab = setTab;
  window.setChatUnreadCount = setChatUnreadCount;
  window.showUnreadChat = (count) => {
    setIsChatOpen(false);
    setTab("video");
    setChatUnreadCount(count);
  };
  const handleDesktopChat = (open) => {
    setIsChatOpen(open);
    if (open) setChatUnreadCount(0);
  };
  const handleMobileTab = (nextTab) => {
    setTab(nextTab);
    if (nextTab === "chat") setChatUnreadCount(0);
  };
  return <div className="cr-shell">
    <ClassroomHeaderBar wsStatus="ready" videoConnectionState="connected" />
    {!mobile && <div className="cr-main">
      <aside className="cr-panel cr-panel--left" style={{width:"30%"}}>
        <div className="cr-video-container"><div className="cr-video-target" ref={desktop} /></div>
      </aside>
      <div className="cr-divider" />
      <section className="cr-panel cr-panel--right"><div>Lesson content</div></section>
    </div>}
    <ClassroomControlBar
      isMobile={mobile}
      isTeacher={false}
      isGroup={false}
      setShowParticipantList={() => {}}
      participantCount={2}
      FOCUS_MODE_ORDER={[]}
      focusModeLabel={{}}
      focusModeIcon={{}}
      resetToMode={() => {}}
      customSplit={null}
      setCustomSplit={() => {}}
      teacherAllowsFollowing
      onTeacherAllowsFollowingChange={() => {}}
      learnerWantsToFollow
      onLearnerWantsToFollowChange={() => {}}
      isChatOpen={isChatOpen}
      setIsChatOpen={handleDesktopChat}
      chatUnreadCount={chatUnreadCount}
      isHandRaised={false}
      toggleHand={() => {}}
      captionsEnabled={false}
      captionsSupported={false}
      onToggleCaptions={() => {}}
      hasResource={false}
      screenShareIsLocalSharer={false}
      screenShareIsRemoteSharing={false}
      screenShareBlockedByTeacher={false}
      onRequestStartScreenShare={() => {}}
      onStopScreenShare={() => {}}
      teacherAllowsScreenShare
      onTeacherAllowsScreenShareChange={() => {}}
    />
    {mobile && <MobileClassroomLayout activeTab={tab} onTabChange={handleMobileTab}
      chatUnreadCount={chatUnreadCount}
      videoComponent={<div className="cr-video-target" ref={portrait} />}
      contentComponent={<div>Lesson content</div>} chatComponent={<div>Chat</div>}
      isTeacher={false} isHandRaised={false} toggleHand={() => {}} />}
    {createPortal(<PrepVideoCall key={mobile ? "portrait-call" : "split-call"}
      roomId="test" userName="Test" />, host)}
  </div>;
}
createRoot(document.getElementById("root")).render(<Harness />);
