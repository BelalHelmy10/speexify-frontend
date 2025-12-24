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
   Focus Modes (Desktop)
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
   Hook: Detect mobile viewport
----------------------------------------------------------- */
function useIsMobile(breakpoint = 900) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const checkMobile = () => {
      setIsMobile(window.innerWidth <= breakpoint);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, [breakpoint]);

  return isMobile;
}

/* -----------------------------------------------------------
   Hook: Detect orientation
----------------------------------------------------------- */
function useOrientation() {
  const [isLandscape, setIsLandscape] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const checkOrientation = () => {
      setIsLandscape(window.innerWidth > window.innerHeight);
    };

    checkOrientation();
    window.addEventListener("resize", checkOrientation);
    window.addEventListener("orientationchange", checkOrientation);

    return () => {
      window.removeEventListener("resize", checkOrientation);
      window.removeEventListener("orientationchange", checkOrientation);
    };
  }, []);

  return isLandscape;
}

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

  // Mobile and orientation detection
  const isMobile = useIsMobile(900);
  const isLandscape = useOrientation();

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
     Focus Mode & Layout State (Desktop)
  ----------------------------------------------------------- */
  const [focusMode, setFocusMode] = useState(FOCUS_MODES.BALANCED);
  const [customSplit, setCustomSplit] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef(null);

  // Layout sync throttling (teacher -> learners)
  const lastLayoutSentAtRef = useRef(0);
  const layoutRafPendingRef = useRef(false);

  const [isChatOpen, setIsChatOpen] = useState(true);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);

  // Learner-only: follow teacher layout toggle
  const followLayoutStorageKey = `classroom_follow_layout_${sessionId}`;
  const [followTeacherLayout, setFollowTeacherLayout] = useState(() => {
    if (typeof window === "undefined") return true;
    if (session?.isTeacher === true) return true;

    try {
      const raw = window.localStorage.getItem(followLayoutStorageKey);
      if (raw === "0") return false;
      if (raw === "1") return true;
    } catch (_) {}
    return true;
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
     Drag-to-resize logic (Desktop only)
  ----------------------------------------------------------- */
  const handleMouseDown = useCallback(
    (e) => {
      if (isMobile) return; // No drag on mobile
      if (!isTeacher && followTeacherLayout) return;

      e.preventDefault();
      setIsDragging(true);
    },
    [isTeacher, followTeacherLayout, isMobile]
  );

  const handleMouseMove = useCallback(
    (e) => {
      if (!isDragging || !containerRef.current) return;
      if (isMobile) return;
      if (!isTeacher && followTeacherLayout) return;

      const container = containerRef.current;
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = Math.min(Math.max((x / rect.width) * 100, 15), 85);

      setCustomSplit(percentage);
    },
    [isDragging, isTeacher, followTeacherLayout, isMobile]
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

    // Mobile landscape: fixed 35% for video
    if (isMobile && isLandscape) return 35;

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

  // Teacher: broadcast layout
  useEffect(() => {
    if (!ready) return;
    if (!isTeacher) return;

    const now = Date.now();
    if (now - lastLayoutSentAtRef.current < 50) return;
    if (layoutRafPendingRef.current) return;

    layoutRafPendingRef.current = true;

    requestAnimationFrame(() => {
      layoutRafPendingRef.current = false;
      lastLayoutSentAtRef.current = Date.now();

      send({
        type: "LAYOUT_STATE",
        focusMode,
        customSplit,
      });
    });
  }, [ready, isTeacher, send, focusMode, customSplit]);

  useEffect(() => {
    if (!ready) return;

    const unsub = subscribe((msg) => {
      if (!msg) return;

      if (msg.type === "LAYOUT_STATE" && !isTeacher && followTeacherLayout) {
        if (
          msg.focusMode &&
          Object.values(FOCUS_MODES).includes(msg.focusMode)
        ) {
          setFocusMode(msg.focusMode);
        }

        const nextSplit =
          msg.customSplit === null || msg.customSplit === undefined
            ? null
            : Number(msg.customSplit);

        if (nextSplit === null) {
          setCustomSplit(null);
        } else if (Number.isFinite(nextSplit)) {
          setCustomSplit(Math.min(Math.max(nextSplit, 15), 85));
        }
        return;
      }

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

    if (followTeacherLayout) {
      send({ type: "REQUEST_LAYOUT" });
    }
  }, [ready, isTeacher, send, followTeacherLayout]);

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
     Header info
  ----------------------------------------------------------- */
  const headerTitle = session?.title || "Classroom";
  const typeLabel = isGroup ? "GROUP" : "1:1";
  const countLabel = isGroup
    ? `${participantCount}${capacity ? `/${capacity}` : ""}`
    : "";

  // Determine if we're in mobile landscape mode (side-by-side layout)
  const isMobileLandscape = isMobile && isLandscape;
  // Show side-by-side layout for desktop OR mobile landscape
  const showSideBySide = !isMobile || isMobileLandscape;

  return (
    <div
      className={`cr-shell ${isMobile ? "cr-shell--mobile" : ""} ${
        isMobileLandscape ? "cr-shell--mobile-landscape" : ""
      }`}
    >
      {/* Header - Hidden on mobile landscape for maximum screen space */}
      {!isMobileLandscape && (
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
              <span className="cr-header__leave-text">Leave</span>
            </a>
          </div>

          <div className="cr-header__center">
            <div className="cr-header__resource-name">
              {headerTitle} • {typeLabel}
              {isGroup ? ` • ${countLabel}` : ""}
            </div>
          </div>

          <div className="cr-header__right">
            {/* Role badge hidden on mobile */}
            {!isMobile && (
              <span
                className="cr-header__role-badge"
                data-role={isTeacher ? "teacher" : "learner"}
              >
                {isTeacher ? "👨‍🏫" : "👨‍🎓"}{" "}
                <span className="cr-header__role-name">
                  {isTeacher ? teacherName : learnerName}
                </span>
              </span>
            )}

            {isGroup && !isMobile && (
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
      )}

      {/* Main Content - Side by side on desktop and mobile landscape */}
      <div
        className={`cr-main ${isDragging ? "cr-main--dragging" : ""} ${
          isMobileLandscape ? "cr-main--landscape" : ""
        }`}
        ref={containerRef}
      >
        {/* Left Panel: Video */}
        <aside
          className={`cr-panel cr-panel--left ${
            isMobileLandscape ? "cr-panel--landscape" : ""
          }`}
          style={showSideBySide ? { width: `${leftPanelWidth}%` } : undefined}
        >
          <div className="cr-video-container">
            <PrepVideoCall
              roomId={sessionId}
              userName={userName}
              isTeacher={isTeacher}
              onScreenShareStreamChange={handleScreenShareStreamChange}
            />
          </div>

          {/* Chat - Desktop only */}
          {!isMobile && (
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
          )}
        </aside>

        {/* Drag Handle - Desktop only */}
        {!isMobile && (
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
        )}

        {/* Right Panel: Content Viewer */}
        <section
          className={`cr-panel cr-panel--right ${
            isMobileLandscape ? "cr-panel--landscape" : ""
          }`}
          style={
            showSideBySide ? { width: `${100 - leftPanelWidth}%` } : undefined
          }
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
                    ? "Screen sharing"
                    : "No resource selected"}
                </h2>
                <p className="cr-placeholder__text">
                  {isScreenShareActive
                    ? "Teacher is sharing their screen."
                    : isTeacher
                    ? "Tap Resources to choose content."
                    : "Waiting for teacher to select content."}
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

      {/* Bottom Control Bar - Compact on mobile landscape */}
      <footer
        className={`cr-controls ${isMobile ? "cr-controls--mobile" : ""} ${
          isMobileLandscape ? "cr-controls--landscape" : ""
        }`}
      >
        <div className="cr-controls__left">
          {isTeacher && (
            <button
              className="cr-controls__btn cr-controls__btn--primary"
              onClick={() => setIsPickerOpen(true)}
            >
              <span className="cr-controls__btn-icon">📚</span>
              {!isMobileLandscape && (
                <span className="cr-controls__btn-label">Resources</span>
              )}
            </button>
          )}

          {isGroup && (
            <button
              className="cr-controls__btn cr-controls__btn--ghost"
              onClick={() => setShowParticipantList(true)}
            >
              <span className="cr-controls__btn-icon">👥</span>
              {!isMobileLandscape && (
                <span className="cr-controls__btn-label">
                  {participantCount}
                </span>
              )}
            </button>
          )}
        </div>

        {/* Desktop Focus Mode Switcher - Hidden on mobile */}
        {!isMobile && (
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
        )}

        <div className="cr-controls__right">
          {/* Learner-only: Follow teacher layout toggle (Desktop only) */}
          {!isTeacher && !isMobile && (
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

          {/* Desktop Chat Toggle */}
          {!isMobile && (
            <button
              className="cr-controls__btn cr-controls__btn--ghost"
              onClick={() => setIsChatOpen(!isChatOpen)}
            >
              <span className="cr-controls__btn-icon">💬</span>
              <span className="cr-controls__btn-label">
                {isChatOpen
                  ? "Hide Chat"
                  : chatUnreadCount > 0
                  ? `Chat (${chatUnreadCount})`
                  : "Show Chat"}
              </span>
            </button>
          )}

          {/* Leave button */}
          <button
            className="cr-controls__btn cr-controls__btn--danger"
            onClick={() => setShowLeaveConfirm(true)}
          >
            <span className="cr-controls__btn-icon">🚪</span>
            {!isMobileLandscape && (
              <span className="cr-controls__btn-label">Leave</span>
            )}
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
