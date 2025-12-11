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

  const learnerObj =
    s.learnerUser ||
    s.learner ||
    s.student ||
    s.learnerProfile ||
    s.user ||
    null;

  const teacherName =
    s.teacherName ||
    s.teacherDisplayName ||
    buildDisplayName(teacherObj) ||
    "Teacher";

  const learnerName =
    s.learnerName ||
    s.learnerDisplayName ||
    buildDisplayName(learnerObj) ||
    "Learner";

  return { teacherName, learnerName };
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

// BALANCED (⚖️) in the middle
const FOCUS_MODE_ORDER = [
  FOCUS_MODES.VIDEO,
  FOCUS_MODES.BALANCED,
  FOCUS_MODES.CONTENT,
];

/* -----------------------------------------------------------
   MAIN COMPONENT
----------------------------------------------------------- */
export default function ClassroomShell({ session, sessionId, tracks }) {
  const { teacherName, learnerName } = getParticipantsFromSession(session);

  // Determine teacher vs learner
  const isTeacher =
    session?.role === "teacher" ||
    session?.isTeacher === true ||
    session?.userType === "teacher" ||
    (session?.currentUser && session.currentUser.role === "teacher");

  const userName = isTeacher ? teacherName : learnerName;

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
  const [customSplit, setCustomSplit] = useState(null); // null = use focusMode default
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef(null);

  // Chat visibility + unread
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);

  // Resource picker modal
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  // Leave confirmation modal
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  /* -----------------------------------------------------------
     Drag-to-resize logic
  ----------------------------------------------------------- */
  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback(
    (e) => {
      if (!isDragging || !containerRef.current) return;

      const container = containerRef.current;
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = Math.min(Math.max((x / rect.width) * 100, 15), 85);

      setCustomSplit(percentage);
    },
    [isDragging]
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

  // When chat opens, clear unread counter
  useEffect(() => {
    if (isChatOpen) {
      setChatUnreadCount(0);
    }
  }, [isChatOpen]);

  // Calculate split percentages
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

  /* -----------------------------------------------------------
     Realtime sync (classroom channel)
  ----------------------------------------------------------- */
  const classroomChannel = useClassroomChannel(String(sessionId));
  const ready = classroomChannel?.ready ?? false;
  const send = classroomChannel?.send ?? (() => {});
  const subscribe = classroomChannel?.subscribe ?? (() => () => {});

  // Learner listens for teacher's resource updates
  useEffect(() => {
    if (!ready) return;

    const unsub = subscribe((msg) => {
      if (msg?.type === "SET_RESOURCE") {
        const { resourceId } = msg;
        if (resourceId && resourcesById[resourceId]) {
          setSelectedResourceId(resourceId);
        }
      }
    });

    return unsub;
  }, [ready, resourcesById, subscribe]);

  // Teacher auto-selects the first resource when entering
  useEffect(() => {
    if (!isTeacher || selectedResourceId) return;

    const all = Object.values(resourcesById || {});
    if (all.length && all[0]?._id) {
      setSelectedResourceId(all[0]._id);
    }
  }, [isTeacher, resourcesById, selectedResourceId]);

  // Teacher broadcasts resource changes
  useEffect(() => {
    if (!isTeacher || !ready || !selectedResourceId) return;
    send({ type: "SET_RESOURCE", resourceId: selectedResourceId });
  }, [isTeacher, ready, selectedResourceId, send]);

  const resource = selectedResourceId
    ? resourcesById[selectedResourceId]
    : null;

  const viewer = resource ? getViewerInfo(resource) : null;

  /* -----------------------------------------------------------
     Handlers
  ----------------------------------------------------------- */
  function handleChangeResourceId(id) {
    setSelectedResourceId(id || null);
    setIsPickerOpen(false);
  }

  // stable callback so PrepVideoCall's effect doesn't re-run on every render
  const handleScreenShareStreamChange = useCallback((isActive) => {
    setIsScreenShareActive(Boolean(isActive));
  }, []);

  function resetToMode(mode) {
    setCustomSplit(null);
    setFocusMode(mode);
  }

  /* -----------------------------------------------------------
     RENDER
  ----------------------------------------------------------- */
  return (
    <div className="cr-shell">
      {/* Header */}
      <header className="cr-header">
        <div className="cr-header__left">
          <a href="/dashboard" className="cr-header__logo">
            Speexify
          </a>
          <span className="cr-header__separator">›</span>
          <span className="cr-header__session">Classroom #{sessionId}</span>
        </div>

        <div className="cr-header__center">
          {resource && (
            <span className="cr-header__resource-name">
              {resource.title || "Untitled Resource"}
            </span>
          )}
        </div>

        <div className="cr-header__right">
          <div
            className="cr-header__role-badge"
            data-role={isTeacher ? "teacher" : "learner"}
          >
            {isTeacher ? "👨‍🏫 Teacher" : "👨‍🎓 Learner"}
          </div>
          <button
            type="button"
            className="cr-header__leave"
            onClick={() => setShowLeaveConfirm(true)}
          >
            <span>Leave</span>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16,17 21,12 16,7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </header>

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
              <span className="cr-chat-toggle__label">💬 Chat</span>
              <span
                className={`cr-chat-toggle__icon ${
                  isChatOpen ? "cr-chat-toggle__icon--open" : ""
                }`}
              >
                ▼
              </span>
            </button>

            {/* Chat stays mounted so it can track unread messages */}
            <ClassroomChat
              classroomChannel={classroomChannel}
              sessionId={sessionId}
              isTeacher={isTeacher}
              teacherName={teacherName}
              learnerName={learnerName}
              isOpen={isChatOpen}
              onUnreadCountChange={setChatUnreadCount}
            />
          </div>
        </aside>

        {/* Drag Handle */}
        <div
          className={`cr-divider ${isDragging ? "cr-divider--active" : ""}`}
          onMouseDown={handleMouseDown}
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize panels"
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
                hideSidebar={true} // hide left info panel in classroom
                hideBreadcrumbs={true} // hide top breadcrumbs + "Prep room"
                classroomChannel={classroomChannel}
                isTeacher={isTeacher}
                isScreenShareActive={isScreenShareActive}
                locale="en"
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

      {/* Resource Picker Modal */}
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
              <a href="/dashboard" className="cr-button cr-button--danger">
                Yes, leave
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
