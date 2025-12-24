// app/classroom/[sessionId]/ClassroomShell.jsx
"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import PrepVideoCall from "@/app/resources/prep/PrepVideoCall";
import PrepShell from "@/app/resources/prep/PrepShell";
import ClassroomResourcePicker from "./ClassroomResourcePicker";
import ClassroomChat from "./ClassroomChat";
import { buildResourceIndex, getViewerInfo } from "./classroomHelpers";
import { useClassroomChannel } from "@/app/resources/prep/useClassroomChannel";

/* -----------------------------------------------------------
   Utility: Safely generate a display name
----------------------------------------------------------- */
function buildDisplayName(source) {
  if (!source) return "";
  if (typeof source === "string") return source;
  if (source.fullName) return source.fullName;
  if (source.name) return source.name;
  if (source.displayName) return source.displayName;

  const first = source.firstName || source.givenName || source.first_name || "";
  const last = source.lastName || source.familyName || source.last_name || "";

  return [first, last].filter(Boolean).join(" ") || "";
}

/* -----------------------------------------------------------
   Utility: Extract teacher & learner details from session
   UPDATED: Handle GROUP sessions with multiple learners
----------------------------------------------------------- */
function getParticipantsFromSession(session) {
  const s = session || {};

  const teacherObj =
    s.teacherUser ||
    s.teacher ||
    s.tutor ||
    s.teacherProfile ||
    s.teacherAccount ||
    null;

  const teacherName =
    s.teacherName ||
    s.teacherDisplayName ||
    buildDisplayName(teacherObj) ||
    "Teacher";

  const isGroup = s.type === "GROUP";
  const learners = s.learners || [];

  const learnerObj =
    s.learnerUser ||
    s.learner ||
    s.student ||
    s.learnerProfile ||
    s.user ||
    (learners.length > 0 ? learners[0] : null);

  const learnerName =
    s.learnerName ||
    s.learnerDisplayName ||
    buildDisplayName(learnerObj) ||
    "Learner";

  const allLearnerNames = learners.map(
    (l) => buildDisplayName(l) || l.email?.split("@")[0] || "Learner"
  );

  return {
    teacherName,
    learnerName,
    isGroup,
    learners,
    allLearnerNames,
    participantCount:
      s.participantCount || learners.length || (learnerObj ? 1 : 0),
    capacity: s.capacity,
  };
}

/* -----------------------------------------------------------
   Focus Modes
----------------------------------------------------------- */
const FOCUS_MODES = {
  BALANCED: "balanced",
  VIDEO: "video",
  CONTENT: "content",
};

const focusModeLabel = {
  [FOCUS_MODES.BALANCED]: "Balanced",
  [FOCUS_MODES.VIDEO]: "Video Focus",
  [FOCUS_MODES.CONTENT]: "Content Focus",
};

const focusModeIcon = {
  [FOCUS_MODES.BALANCED]: "⚖️",
  [FOCUS_MODES.VIDEO]: "🎥",
  [FOCUS_MODES.CONTENT]: "📄",
};

const FOCUS_MODE_ORDER = [
  FOCUS_MODES.VIDEO,
  FOCUS_MODES.BALANCED,
  FOCUS_MODES.CONTENT,
];

/* -----------------------------------------------------------
   Mobile tabs
----------------------------------------------------------- */
const MOBILE_TABS = {
  VIDEO: "video",
  CONTENT: "content",
  CHAT: "chat",
  RESOURCES: "resources",
};

/* -----------------------------------------------------------
   MAIN COMPONENT
----------------------------------------------------------- */
export default function ClassroomShell({
  session,
  sessionId,
  tracks,
  locale = "en",
  prefix = "",
}) {
  const {
    teacherName,
    learnerName,
    isGroup,
    learners,
    allLearnerNames,
    participantCount,
    capacity,
  } = getParticipantsFromSession(session);

  const isTeacher =
    session?.isTeacher === true ||
    session?.role === "teacher" ||
    session?.userType === "teacher" ||
    (session?.currentUser && session.currentUser.role === "teacher");

  const userName = isTeacher ? teacherName : learnerName;

  /* -----------------------------------------------------------
     Mobile detection + tab state
  ----------------------------------------------------------- */
  const [isMobile, setIsMobile] = useState(false);
  const [mobileTab, setMobileTab] = useState(MOBILE_TABS.CONTENT);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mq = window.matchMedia("(max-width: 900px)");
    const apply = () => setIsMobile(mq.matches);
    apply();

    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  /* -----------------------------------------------------------
     Resources
  ----------------------------------------------------------- */
  const { resourcesById } = useMemo(
    () => buildResourceIndex(tracks || []),
    [tracks]
  );

  const [selectedResourceId, setSelectedResourceId] = useState(null);
  const [isScreenShareActive, setIsScreenShareActive] = useState(false);

  /* -----------------------------------------------------------
     Focus Mode & Layout State
  ----------------------------------------------------------- */
  const [focusMode, setFocusMode] = useState(FOCUS_MODES.BALANCED);
  const [customSplit, setCustomSplit] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef(null);

  // ✅ Layout sync throttling (teacher -> learners)
  const lastLayoutSentAtRef = useRef(0);
  const layoutRafPendingRef = useRef(false);

  const [isChatOpen, setIsChatOpen] = useState(true);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);

  // ✅ Learner-only: follow teacher layout toggle (persisted per session)
  const followLayoutStorageKey = `classroom_follow_layout_${sessionId}`;
  const [followTeacherLayout, setFollowTeacherLayout] = useState(() => {
    // Teachers always lead
    if (typeof window === "undefined") return true;
    if (session?.isTeacher === true) return true;

    try {
      const raw = window.localStorage.getItem(followLayoutStorageKey);
      if (raw === "0") return false;
      if (raw === "1") return true;
    } catch (_) {}
    return true; // default: follow
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        followLayoutStorageKey,
        followTeacherLayout ? "1" : "0"
      );
    } catch (_) {}
  }, [followLayoutStorageKey, followTeacherLayout]);

  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showParticipantList, setShowParticipantList] = useState(false);

  /* -----------------------------------------------------------
     Drag-to-resize logic
  ----------------------------------------------------------- */
  const handleMouseDown = useCallback(
    (e) => {
      // ✅ Learners can drag only if they turned follow OFF
      if (!isTeacher && followTeacherLayout) return;

      e.preventDefault();
      setIsDragging(true);
    },
    [isTeacher, followTeacherLayout]
  );

  const handleMouseMove = useCallback(
    (e) => {
      if (!isDragging || !containerRef.current) return;

      // ✅ If learner is following, ignore local resizing
      if (!isTeacher && followTeacherLayout) return;

      const container = containerRef.current;
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = Math.min(Math.max((x / rect.width) * 100, 15), 85);

      setCustomSplit(percentage);
    },
    [isDragging, isTeacher, followTeacherLayout]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  useEffect(() => {
    if (isChatOpen) setChatUnreadCount(0);
  }, [isChatOpen]);

  const getSplitPercentage = () => {
    if (customSplit !== null) return customSplit;

    switch (focusMode) {
      case FOCUS_MODES.VIDEO:
        return 55;
      case FOCUS_MODES.CONTENT:
        return 28;
      case FOCUS_MODES.BALANCED:
      default:
        return 38;
    }
  };

  const leftPanelWidth = getSplitPercentage();

  const resetToMode = (mode) => {
    setFocusMode(mode);
    setCustomSplit(null);
  };

  /* -----------------------------------------------------------
     Realtime sync (classroom channel)
  ----------------------------------------------------------- */
  const classroomChannel = useClassroomChannel(String(sessionId));
  const ready = classroomChannel?.ready ?? false;
  const send = classroomChannel?.send ?? (() => {});
  const subscribe = classroomChannel?.subscribe ?? (() => () => {});

  // ✅ Teacher: broadcast layout (focusMode + customSplit)
  useEffect(() => {
    if (!ready) return;
    if (!isTeacher) return;

    const now = Date.now();
    if (now - lastLayoutSentAtRef.current < 50) return; // ~20/sec
    if (layoutRafPendingRef.current) return;

    layoutRafPendingRef.current = true;

    requestAnimationFrame(() => {
      layoutRafPendingRef.current = false;
      lastLayoutSentAtRef.current = Date.now();

      send({
        type: "LAYOUT_STATE",
        focusMode,
        customSplit, // number | null
      });
    });
  }, [ready, isTeacher, send, focusMode, customSplit]);

  useEffect(() => {
    if (!ready) return;

    const unsub = subscribe((msg) => {
      if (!msg) return;

      // ✅ Learner: follow teacher layout ONLY if toggle is ON
      if (msg.type === "LAYOUT_STATE" && !isTeacher && followTeacherLayout) {
        if (
          msg.focusMode &&
          Object.values(FOCUS_MODES).includes(msg.focusMode)
        ) {
          setFocusMode(msg.focusMode);
        }

        // customSplit can be null (meaning “use preset focusMode”)
        const nextSplit =
          msg.customSplit === null || msg.customSplit === undefined
            ? null
            : Number(msg.customSplit);

        if (nextSplit === null) {
          setCustomSplit(null);
        } else if (Number.isFinite(nextSplit)) {
          // clamp to safe range
          setCustomSplit(Math.min(Math.max(nextSplit, 15), 85));
        }
        return;
      }

      // ✅ Teacher: respond to learner asking for current layout
      if (msg.type === "REQUEST_LAYOUT" && isTeacher) {
        send({
          type: "LAYOUT_STATE",
          focusMode,
          customSplit,
        });
        return;
      }

      if (msg.type === "SET_RESOURCE") {
        const { resourceId } = msg;
        if (resourceId && resourcesById[resourceId]) {
          setSelectedResourceId(resourceId);
        }
      }

      if (
        msg.type === "REQUEST_RESOURCE" &&
        isTeacher &&
        selectedResourceId &&
        resourcesById[selectedResourceId]
      ) {
        send({ type: "SET_RESOURCE", resourceId: selectedResourceId });
      }
    });

    return unsub;
  }, [
    ready,
    resourcesById,
    isTeacher,
    selectedResourceId,
    send,
    subscribe,
    focusMode,
    customSplit,
    followTeacherLayout,
  ]);

  useEffect(() => {
    if (!ready) return;
    if (isTeacher) return;

    send({ type: "REQUEST_RESOURCE" });

    // ✅ only request layout if learner is following
    if (followTeacherLayout) {
      send({ type: "REQUEST_LAYOUT" });
    }
  }, [ready, isTeacher, send, followTeacherLayout]);

  // ✅ Learner: when turning follow back ON, immediately sync to teacher layout
  useEffect(() => {
    if (!ready) return;
    if (isTeacher) return;
    if (!followTeacherLayout) return;

    send({ type: "REQUEST_LAYOUT" });
  }, [ready, isTeacher, followTeacherLayout, send]);

  useEffect(() => {
    if (!isTeacher || selectedResourceId) return;

    const all = Object.values(resourcesById || {});
    if (all.length && all[0]?._id) {
      setSelectedResourceId(all[0]._id);
    }
  }, [isTeacher, selectedResourceId, resourcesById]);

  /* -----------------------------------------------------------
     Resource & viewer
  ----------------------------------------------------------- */
  const resource = selectedResourceId
    ? resourcesById[selectedResourceId]
    : null;
  const viewer = resource ? getViewerInfo(resource) : null;

  const handleChangeResourceId = (newId) => {
    setSelectedResourceId(newId);
    setIsPickerOpen(false);

    if (ready && isTeacher) {
      send({ type: "SET_RESOURCE", resourceId: newId });
    }
  };

  const handleScreenShareStreamChange = useCallback((active) => {
    setIsScreenShareActive(!!active);
  }, []);

  /* -----------------------------------------------------------
     Header
  ----------------------------------------------------------- */
  const headerTitle = session?.title || "Classroom";
  const typeLabel = isGroup ? "GROUP" : "1:1";
  const countLabel = isGroup
    ? `${participantCount}${capacity ? `/${capacity}` : ""}`
    : "";

  // Mobile UX helpers
  const openResourcesOnMobile = useCallback(() => {
    if (isMobile) {
      setMobileTab(isTeacher ? MOBILE_TABS.RESOURCES : MOBILE_TABS.CONTENT);
      return;
    }
    setIsPickerOpen(true);
  }, [isMobile, isTeacher]);

  const openChatOnMobile = useCallback(() => {
    if (isMobile) {
      setMobileTab(MOBILE_TABS.CHAT);
      setChatUnreadCount(0);
      setIsChatOpen(true);
      return;
    }
    setIsChatOpen(true);
  }, [isMobile]);

  return (
    <div className={`cr-shell${isMobile ? " cr-shell--mobile" : ""}`}>
      {/* Header */}
      <header className="cr-header">
        <div className="cr-header__left">
          <a
            href={`${prefix}/dashboard`}
            className="cr-header__leave"
            onClick={(e) => {
              e.preventDefault();
              setShowLeaveConfirm(true);
            }}
            title="Leave classroom"
          >
            <span aria-hidden="true">←</span>
            <span>Leave</span>
          </a>
        </div>

        <div className="cr-header__center">
          <div className="cr-header__resource-name">
            {headerTitle} • {typeLabel}
            {isGroup ? ` • ${countLabel} participants` : ""}
          </div>
        </div>

        <div className="cr-header__right">
          <span
            className="cr-header__role-badge"
            data-role={isTeacher ? "teacher" : "learner"}
          >
            {isTeacher ? "👨‍🏫" : "👨‍🎓"} {isTeacher ? teacherName : learnerName}
          </span>

          {isGroup && (
            <button
              type="button"
              className="cr-header__leave"
              onClick={() => setShowParticipantList(true)}
              title="View participants"
            >
              👥 <span>{countLabel}</span>
            </button>
          )}
        </div>
      </header>

      {/* -----------------------------------------------------------
         MOBILE LAYOUT (single panel + tabs)
      ----------------------------------------------------------- */}
      {isMobile ? (
        <>
          <div className="cr-mobile-main">
            {mobileTab === MOBILE_TABS.VIDEO && (
              <div className="cr-mobile-panel">
                <div className="cr-video-container cr-video-container--mobile">
                  <PrepVideoCall
                    roomId={sessionId}
                    userName={userName}
                    isTeacher={isTeacher}
                    onScreenShareStreamChange={handleScreenShareStreamChange}
                  />
                </div>
              </div>
            )}

            {mobileTab === MOBILE_TABS.CONTENT && (
              <div className="cr-mobile-panel">
                <div className="cr-content-viewer cr-content-viewer--mobile">
                  {resource ? (
                    <PrepShell
                      resource={resource}
                      viewer={viewer}
                      hideSidebar={true}
                      hideBreadcrumbs={true}
                      classroomChannel={classroomChannel}
                      isTeacher={isTeacher}
                      isScreenShareActive={isScreenShareActive}
                      locale={locale}
                      className="cr-prep-shell-fullsize"
                    />
                  ) : (
                    <div className="cr-placeholder">
                      <div className="cr-placeholder__icon">
                        {isScreenShareActive ? "🖥️" : "📚"}
                      </div>
                      <h2 className="cr-placeholder__title">
                        {isScreenShareActive
                          ? "Screen sharing is active"
                          : "No resource selected"}
                      </h2>
                      <p className="cr-placeholder__text">
                        {isScreenShareActive
                          ? "The teacher is sharing their screen in the video call."
                          : isTeacher
                          ? "Choose a resource to show learners."
                          : "Waiting for the teacher to select a resource."}
                      </p>

                      {isTeacher && !isScreenShareActive && (
                        <button
                          className="cr-placeholder__action"
                          onClick={openResourcesOnMobile}
                        >
                          📚 Choose Resource
                        </button>
                      )}

                      {!isTeacher && (
                        <button
                          className="cr-placeholder__action"
                          onClick={() => setMobileTab(MOBILE_TABS.VIDEO)}
                        >
                          🎥 Go to Video
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {mobileTab === MOBILE_TABS.CHAT && (
              <div className="cr-mobile-panel">
                <ClassroomChat
                  classroomChannel={classroomChannel}
                  sessionId={sessionId}
                  isTeacher={isTeacher}
                  teacherName={teacherName}
                  learnerName={learnerName}
                  isOpen={true}
                  onUnreadCountChange={setChatUnreadCount}
                  allLearnerNames={allLearnerNames}
                  isGroup={isGroup}
                />
              </div>
            )}

            {mobileTab === MOBILE_TABS.RESOURCES && (
              <div className="cr-mobile-panel">
                {isTeacher ? (
                  <ClassroomResourcePicker
                    tracks={tracks}
                    selectedResourceId={selectedResourceId}
                    onChangeResourceId={handleChangeResourceId}
                    isTeacher={isTeacher}
                  />
                ) : (
                  <div className="cr-placeholder">
                    <div className="cr-placeholder__icon">📚</div>
                    <h2 className="cr-placeholder__title">Resources</h2>
                    <p className="cr-placeholder__text">
                      The teacher controls which resource is displayed.
                    </p>
                    <button
                      className="cr-placeholder__action"
                      onClick={() => setMobileTab(MOBILE_TABS.CONTENT)}
                    >
                      📄 Back to Content
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mobile tab bar */}
          <footer className="cr-mobile-tabs">
            <button
              className={`cr-mobile-tab${
                mobileTab === MOBILE_TABS.VIDEO ? " is-active" : ""
              }`}
              onClick={() => setMobileTab(MOBILE_TABS.VIDEO)}
              type="button"
            >
              🎥 <span>Video</span>
            </button>

            <button
              className={`cr-mobile-tab${
                mobileTab === MOBILE_TABS.CONTENT ? " is-active" : ""
              }`}
              onClick={() => setMobileTab(MOBILE_TABS.CONTENT)}
              type="button"
            >
              📄 <span>Content</span>
            </button>

            <button
              className={`cr-mobile-tab${
                mobileTab === MOBILE_TABS.CHAT ? " is-active" : ""
              }`}
              onClick={() => {
                setMobileTab(MOBILE_TABS.CHAT);
                setChatUnreadCount(0);
                setIsChatOpen(true);
              }}
              type="button"
            >
              💬 <span>Chat</span>
              {chatUnreadCount > 0 && mobileTab !== MOBILE_TABS.CHAT && (
                <span className="cr-mobile-badge">{chatUnreadCount}</span>
              )}
            </button>

            {isTeacher && (
              <button
                className={`cr-mobile-tab${
                  mobileTab === MOBILE_TABS.RESOURCES ? " is-active" : ""
                }`}
                onClick={() => setMobileTab(MOBILE_TABS.RESOURCES)}
                type="button"
              >
                📚 <span>Resources</span>
              </button>
            )}
          </footer>
        </>
      ) : (
        /* -----------------------------------------------------------
           DESKTOP LAYOUT (original)
        ----------------------------------------------------------- */
        <>
          {/* Main Content */}
          <div
            className={`cr-main ${isDragging ? "cr-main--dragging" : ""}`}
            ref={containerRef}
          >
            {/* Left Panel: Video + Chat */}
            <aside
              className="cr-panel cr-panel--left"
              style={{ width: `${leftPanelWidth}%` }}
            >
              <div className="cr-video-container">
                <PrepVideoCall
                  roomId={sessionId}
                  userName={userName}
                  isTeacher={isTeacher}
                  onScreenShareStreamChange={handleScreenShareStreamChange}
                />
              </div>

              <div
                className={`cr-chat-container ${
                  !isChatOpen ? "cr-chat-container--collapsed" : ""
                }`}
              >
                <button
                  className="cr-chat-toggle"
                  onClick={() => setIsChatOpen(!isChatOpen)}
                  aria-label={isChatOpen ? "Collapse chat" : "Expand chat"}
                >
                  <span className="cr-chat-toggle__label">
                    💬 Chat
                    {chatUnreadCount > 0 && !isChatOpen && (
                      <span className="cr-chat-toggle__unread">
                        {chatUnreadCount}
                      </span>
                    )}
                  </span>
                  <span
                    className={`cr-chat-toggle__icon ${
                      isChatOpen ? "cr-chat-toggle__icon--open" : ""
                    }`}
                  >
                    ▼
                  </span>
                </button>

                <ClassroomChat
                  classroomChannel={classroomChannel}
                  sessionId={sessionId}
                  isTeacher={isTeacher}
                  teacherName={teacherName}
                  learnerName={learnerName}
                  isOpen={isChatOpen}
                  onUnreadCountChange={setChatUnreadCount}
                  allLearnerNames={allLearnerNames}
                  isGroup={isGroup}
                />
              </div>
            </aside>

            {/* Drag Handle */}
            <div
              className={`cr-divider ${isDragging ? "cr-divider--active" : ""}`}
              onMouseDown={
                isTeacher || (!isTeacher && !followTeacherLayout)
                  ? handleMouseDown
                  : undefined
              }
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize panels"
              aria-disabled={isTeacher ? false : followTeacherLayout}
            >
              <div className="cr-divider__handle">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>

            {/* Right Panel: Content Viewer */}
            <section
              className="cr-panel cr-panel--right"
              style={{ width: `${100 - leftPanelWidth}%` }}
            >
              <div className="cr-content-viewer">
                {resource ? (
                  <PrepShell
                    resource={resource}
                    viewer={viewer}
                    hideSidebar={true}
                    hideBreadcrumbs={true}
                    classroomChannel={classroomChannel}
                    isTeacher={isTeacher}
                    isScreenShareActive={isScreenShareActive}
                    locale={locale}
                    className="cr-prep-shell-fullsize"
                  />
                ) : (
                  <div className="cr-placeholder">
                    <div className="cr-placeholder__icon">
                      {isScreenShareActive ? "🖥️" : "📚"}
                    </div>
                    <h2 className="cr-placeholder__title">
                      {isScreenShareActive
                        ? "Screen sharing is active"
                        : "No resource selected"}
                    </h2>
                    <p className="cr-placeholder__text">
                      {isScreenShareActive
                        ? "The teacher is sharing their screen in the video call."
                        : isTeacher
                        ? "Click the resource picker below to choose content."
                        : "Waiting for the teacher to select a resource."}
                    </p>
                    {isTeacher && !isScreenShareActive && (
                      <button
                        className="cr-placeholder__action"
                        onClick={() => setIsPickerOpen(true)}
                      >
                        📚 Choose Resource
                      </button>
                    )}
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Bottom Control Bar */}
          <footer className="cr-controls">
            <div className="cr-controls__left">
              {isTeacher && (
                <button
                  className="cr-controls__btn cr-controls__btn--primary"
                  onClick={() => setIsPickerOpen(true)}
                >
                  <span className="cr-controls__btn-icon">📚</span>
                  <span className="cr-controls__btn-label">Resources</span>
                </button>
              )}

              {isGroup && (
                <button
                  className="cr-controls__btn cr-controls__btn--secondary"
                  onClick={() => setShowParticipantList(true)}
                >
                  <span className="cr-controls__btn-icon">👥</span>
                  <span className="cr-controls__btn-label">
                    Participants ({participantCount})
                  </span>
                </button>
              )}
            </div>

            <div className="cr-controls__center">
              <div className="cr-focus-switcher">
                {FOCUS_MODE_ORDER.map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    className={
                      "cr-focus-btn" +
                      (focusMode === mode ? " cr-focus-btn--active" : "")
                    }
                    onClick={() => resetToMode(mode)}
                    aria-pressed={focusMode === mode}
                    aria-label={focusModeLabel[mode]}
                    title={focusModeLabel[mode]}
                  >
                    <span className="cr-controls__btn-icon">
                      {focusModeIcon[mode]}
                    </span>
                  </button>
                ))}
              </div>

              {customSplit !== null && (
                <button
                  className="cr-controls__reset"
                  onClick={() => setCustomSplit(null)}
                  title="Reset to preset layout"
                >
                  Reset
                </button>
              )}
            </div>

            <div className="cr-controls__right">
              {/* ✅ Learner-only: Follow teacher layout toggle */}
              {!isTeacher && (
                <button
                  className="cr-controls__btn cr-controls__btn--ghost"
                  onClick={() => setFollowTeacherLayout((v) => !v)}
                  title={
                    followTeacherLayout
                      ? "Following teacher layout (click to unlock)"
                      : "Layout unlocked (click to follow teacher)"
                  }
                >
                  <span className="cr-controls__btn-icon">
                    {followTeacherLayout ? "🔒" : "🔓"}
                  </span>
                  <span className="cr-controls__btn-label">
                    {followTeacherLayout ? "Follow layout" : "Free layout"}
                  </span>
                </button>
              )}

              <button
                className="cr-controls__btn cr-controls__btn--ghost"
                onClick={() => setIsChatOpen(!isChatOpen)}
              >
                <span className="cr-controls__btn-icon">💬</span>
                <span className="cr-controls__btn-label">
                  {isChatOpen
                    ? "Hide Chat"
                    : chatUnreadCount > 0
                    ? `Show Chat (${chatUnreadCount})`
                    : "Show Chat"}
                </span>
              </button>
            </div>
          </footer>
        </>
      )}

      {/* Resource Picker Modal (desktop + still available if you want) */}
      {isPickerOpen && isTeacher && (
        <div
          className="cr-modal-overlay"
          onClick={() => setIsPickerOpen(false)}
        >
          <div className="cr-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cr-modal__header">
              <h2 className="cr-modal__title">Choose a Resource</h2>
              <button
                className="cr-modal__close"
                onClick={() => setIsPickerOpen(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="cr-modal__body">
              <ClassroomResourcePicker
                tracks={tracks}
                selectedResourceId={selectedResourceId}
                onChangeResourceId={handleChangeResourceId}
                isTeacher={isTeacher}
              />
            </div>
          </div>
        </div>
      )}

      {/* Participant List Modal (GROUP) */}
      {showParticipantList && (
        <div
          className="cr-modal-overlay"
          onClick={() => setShowParticipantList(false)}
        >
          <div
            className="cr-modal cr-modal--small"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="cr-modal__header">
              <h2 className="cr-modal__title">
                👥 Participants ({participantCount}
                {capacity && `/${capacity}`})
              </h2>
              <button
                className="cr-modal__close"
                onClick={() => setShowParticipantList(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="cr-modal__body">
              <div className="cr-participant-list">
                <div className="cr-participant cr-participant--teacher">
                  <span className="cr-participant__avatar">👨‍🏫</span>
                  <span className="cr-participant__name">{teacherName}</span>
                  <span className="cr-participant__role">Teacher</span>
                </div>

                <div className="cr-participant-list__divider">
                  Learners ({learners.length})
                </div>

                {learners.length === 0 ? (
                  <p className="cr-participant-list__empty">
                    No learners in this session
                  </p>
                ) : (
                  learners.map((learner, idx) => (
                    <div
                      key={learner.id || idx}
                      className={`cr-participant ${
                        learner.status === "canceled"
                          ? "cr-participant--canceled"
                          : ""
                      }`}
                    >
                      <span className="cr-participant__avatar">👨‍🎓</span>
                      <span className="cr-participant__name">
                        {buildDisplayName(learner) ||
                          learner.email?.split("@")[0] ||
                          "Learner"}
                      </span>
                      {learner.status && learner.status !== "booked" && (
                        <span
                          className={`cr-participant__status cr-participant__status--${learner.status}`}
                        >
                          {learner.status}
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Leave Confirmation Modal */}
      {showLeaveConfirm && (
        <div
          className="cr-modal-overlay"
          onClick={() => setShowLeaveConfirm(false)}
        >
          <div
            className="cr-modal cr-modal--small"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="cr-modal__header">
              <h2 className="cr-modal__title">Leave classroom?</h2>
            </div>
            <div className="cr-modal__body">
              <p>
                Are you sure you want to leave this live session? Any ongoing
                conversation and screen sharing will stop.
              </p>
            </div>
            <div className="cr-modal__footer">
              <button
                type="button"
                className="cr-button cr-button--ghost"
                onClick={() => setShowLeaveConfirm(false)}
              >
                Cancel
              </button>
              <a
                href={`${prefix}/dashboard`}
                className="cr-button cr-button--danger"
              >
                Yes, leave
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
