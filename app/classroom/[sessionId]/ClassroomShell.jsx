// app/classroom/[sessionId]/ClassroomShell.jsx
"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import PrepVideoCall from "@/app/resources/prep/PrepVideoCall";
import PrepShell from "@/app/resources/prep/PrepShell";
import ClassroomResourcePicker from "./ClassroomResourcePicker";
import ClassroomChat from "./ClassroomChat";
import { buildResourceIndex, getViewerInfo } from "./classroomHelpers";
import { useClassroomChannel } from "@/app/resources/prep/useClassroomChannel";
import api from "@/lib/api";

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
     Resources
  ----------------------------------------------------------- */
  const { resourcesById } = useMemo(
    () => buildResourceIndex(tracks || []),
    [tracks]
  );

  const [selectedResourceId, setSelectedResourceId] = useState(() => {
    if (typeof window === "undefined") return null;
    try {
      const key = `classroom_resource_${sessionId}`;
      const saved = sessionStorage.getItem(key);
      return saved || null;
    } catch {
      return null;
    }
  });
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

  // ✅ Content scroll sync (teacher -> learners)
  const contentScrollRef = useRef(null);
  const lastContentScrollSentAtRef = useRef(0);
  const contentScrollRafPendingRef = useRef(false);

  const [isChatOpen, setIsChatOpen] = useState(true);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);

  // ✅ Teacher: control whether learners follow (global for all learners)
  const [teacherAllowsFollowing, setTeacherAllowsFollowing] = useState(true);

  // ✅ Learner: follow teacher layout toggle (controlled by teacher override)
  const followLayoutStorageKey = `classroom_follow_layout_${sessionId}`;
  const [learnerWantsToFollow, setLearnerWantsToFollow] = useState(() => {
    if (typeof window === "undefined") return true;
    if (session?.isTeacher === true) return true;

    try {
      const raw = window.localStorage.getItem(followLayoutStorageKey);
      if (raw === "0") return false;
      if (raw === "1") return true;
    } catch (_) {}
    return true; // default: follow
  });

  // ✅ Actual follow state: teacher can override learner preference
  const followTeacherLayout = isTeacher
    ? true
    : teacherAllowsFollowing && learnerWantsToFollow;

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isTeacher) return; // Teachers don't persist this
    try {
      window.localStorage.setItem(
        followLayoutStorageKey,
        learnerWantsToFollow ? "1" : "0"
      );
    } catch (_) {}
  }, [followLayoutStorageKey, learnerWantsToFollow, isTeacher]);

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

  // ✅ Teacher: broadcast layout (focusMode + customSplit + follow control)
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
        customSplit,
        teacherAllowsFollowing, // ✅ NEW: broadcast teacher's follow control
      });
    });
  }, [ready, isTeacher, send, focusMode, customSplit, teacherAllowsFollowing]);

  // ✅ Teacher: broadcast content scroll (works for PDF + any resource)
  useEffect(() => {
    if (!ready) return;
    if (!isTeacher) return;

    const el = contentScrollRef.current;
    if (!el) return;

    const onScroll = () => {
      const now = Date.now();
      if (now - lastContentScrollSentAtRef.current < 50) return; // ~20/sec
      if (contentScrollRafPendingRef.current) return;

      contentScrollRafPendingRef.current = true;

      requestAnimationFrame(() => {
        contentScrollRafPendingRef.current = false;

        const target = contentScrollRef.current;
        if (!target) return;

        const maxScroll = Math.max(
          1,
          target.scrollHeight - target.clientHeight
        );
        const scrollNorm = target.scrollTop / maxScroll;

        lastContentScrollSentAtRef.current = Date.now();

        send({
          type: "CONTENT_SCROLL",
          scrollNorm,
        });
      });
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [ready, isTeacher, send]);

  useEffect(() => {
    if (!ready) return;

    const unsub = subscribe((msg) => {
      if (!msg) return;

      // ✅ Learner: follow teacher content scroll (PDF + any resource)
      if (msg.type === "CONTENT_SCROLL" && !isTeacher) {
        const norm = Math.min(1, Math.max(0, Number(msg.scrollNorm) || 0));

        // apply after layout/render tick
        setTimeout(() => {
          const el = contentScrollRef.current;
          if (!el) return;

          const maxScroll = Math.max(1, el.scrollHeight - el.clientHeight);
          el.scrollTop = norm * maxScroll;
        }, 0);

        return;
      }

      // ✅ Learner: receive teacher's follow control + layout updates
      if (msg.type === "LAYOUT_STATE" && !isTeacher) {
        // ✅ Teacher controls whether learners can follow
        if (msg.teacherAllowsFollowing !== undefined) {
          setTeacherAllowsFollowing(!!msg.teacherAllowsFollowing);
          // ✅ Sync learner preference to match teacher's control
          setLearnerWantsToFollow(!!msg.teacherAllowsFollowing);
        }

        // Only apply layout if following is enabled (teacher allows AND learner wants)
        const shouldFollow =
          (msg.teacherAllowsFollowing ?? teacherAllowsFollowing) &&
          learnerWantsToFollow;

        if (shouldFollow) {
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
        }
        return;
      }

      // ✅ Teacher: respond to learner asking for current layout
      if (msg.type === "REQUEST_LAYOUT" && isTeacher) {
        send({
          type: "LAYOUT_STATE",
          focusMode,
          customSplit,
          teacherAllowsFollowing,
        });
        return;
      }

      // ✅ Teacher: receive and sync learner follow preference
      if (msg.type === "LEARNER_FOLLOW_PREFERENCE" && isTeacher) {
        const newState = !!msg.wantsToFollow;
        setTeacherAllowsFollowing(newState);
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

  // ✅ Learner: broadcast preference changes to teacher
  useEffect(() => {
    if (!ready) return;
    if (isTeacher) return;

    send({
      type: "LEARNER_FOLLOW_PREFERENCE",
      wantsToFollow: learnerWantsToFollow,
    });

    // Request layout when turning follow ON
    if (learnerWantsToFollow && teacherAllowsFollowing) {
      send({ type: "REQUEST_LAYOUT" });
    }
  }, [ready, isTeacher, learnerWantsToFollow, teacherAllowsFollowing, send]);

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

  // ✅ Track resource usage when teacher changes resource
  const handleChangeResourceId = async (newId) => {
    setSelectedResourceId(newId);
    setIsPickerOpen(false);

    // Persist selection
    if (typeof window !== "undefined") {
      try {
        const key = `classroom_resource_${sessionId}`;
        if (newId) {
          sessionStorage.setItem(key, newId);
        } else {
          sessionSession.removeItem(key);
        }
      } catch {}
    }

    // Track resource usage (teacher only)
    if (isTeacher && newId && sessionId) {
      try {
        const resource = resourcesById[newId];
        await api.post(`/sessions/${sessionId}/resources-used`, {
          resourceId: newId,
          resourceTitle: resource?.title || resource?.name || null,
        });
      } catch (err) {
        console.warn("Failed to track resource:", err);
      }
    }

    if (ready && isTeacher) {
      send({ type: "SET_RESOURCE", resourceId: newId });
    }
  };

  const handleScreenShareStreamChange = useCallback((active) => {
    setIsScreenShareActive(!!active);
  }, []);

  /* -----------------------------------------------------------
   Page Recording (local download, teacher only)
----------------------------------------------------------- */
  const [isPageRecording, setIsPageRecording] = useState(false);
  const [pageRecError, setPageRecError] = useState(null);

  const pageRecorderRef = useRef(null);
  const pageStreamRef = useRef(null);
  const pageChunksRef = useRef([]);

  function pickSupportedMime() {
    const types = [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
    ];
    for (const t of types) {
      if (window.MediaRecorder?.isTypeSupported(t)) return t;
    }
    return "video/webm";
  }

  async function startPageRecording() {
    try {
      setPageRecError(null);

      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 30 },
        audio: true, // tab/system audio
        preferCurrentTab: true,
      });

      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // ✅ SOLUTION: Use Web Audio API to properly mix audio sources
      const audioContext = new AudioContext();
      const destination = audioContext.createMediaStreamDestination();

      // Add display audio if available
      if (displayStream.getAudioTracks().length > 0) {
        const displaySource =
          audioContext.createMediaStreamSource(displayStream);
        displaySource.connect(destination);
      }

      // Add microphone audio
      const micSource = audioContext.createMediaStreamSource(micStream);
      micSource.connect(destination);

      // Create final stream with video + mixed audio
      const mixedStream = new MediaStream([
        ...displayStream.getVideoTracks(),
        ...destination.stream.getAudioTracks(), // ✅ Single mixed track!
      ]);

      // ✅ Store all resources for cleanup
      pageStreamRef.current = { mixedStream, audioContext, micStream };
      pageChunksRef.current = [];

      const recorder = new MediaRecorder(mixedStream, {
        mimeType: pickSupportedMime(),
      });

      pageRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size) {
          pageChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(pageChunksRef.current, {
          type: recorder.mimeType,
        });

        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `classroom-${sessionId}-${new Date().toISOString()}.webm`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      };

      displayStream
        .getVideoTracks()[0]
        ?.addEventListener("ended", stopPageRecording);

      recorder.start(1000);
      setIsPageRecording(true);
    } catch (err) {
      console.error("Page recording failed:", err);
      setPageRecError("Failed to start recording");
    }
  }

  function stopPageRecording() {
    try {
      if (pageRecorderRef.current?.state !== "inactive") {
        pageRecorderRef.current.stop();
      }

      // ✅ Clean up all streams and audio context
      if (pageStreamRef.current) {
        const { mixedStream, audioContext, micStream } = pageStreamRef.current;

        mixedStream?.getTracks().forEach((t) => t.stop());
        micStream?.getTracks().forEach((t) => t.stop());
        audioContext?.close(); // ✅ Important: close AudioContext
      }
    } finally {
      setIsPageRecording(false);
      pageRecorderRef.current = null;
      pageStreamRef.current = null;
    }
  }

  /* -----------------------------------------------------------
     Header (FIXED: match SCSS classnames)
  ----------------------------------------------------------- */
  const headerTitle = session?.title || "Classroom";
  const typeLabel = isGroup ? "GROUP" : "1:1";
  const countLabel = isGroup
    ? `${participantCount}${capacity ? `/${capacity}` : ""}`
    : "";

  return (
    <div className="cr-shell">
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
          <div className="cr-content-viewer" ref={contentScrollRef}>
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

          {isTeacher && (
            <button
              className="cr-controls__btn cr-controls__btn--secondary"
              onClick={isPageRecording ? stopPageRecording : startPageRecording}
            >
              <span className="cr-controls__btn-icon">
                {isPageRecording ? "⏹️" : "⏺️"}
              </span>
              <span className="cr-controls__btn-label">
                {isPageRecording ? "Stop recording" : "Record class"}
              </span>
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
          {/* ✅ Teacher: Control whether learners follow */}
          {isTeacher && (
            <label className="cr-controls__toggle-wrapper">
              <input
                type="checkbox"
                className="cr-controls__toggle-input"
                checked={teacherAllowsFollowing}
                onChange={(e) => setTeacherAllowsFollowing(e.target.checked)}
              />
              <span className="cr-controls__toggle-slider"></span>
              <span className="cr-controls__toggle-label">
                Learners follow layout
              </span>
            </label>
          )}

          {/* ✅ Learner: Follow teacher layout toggle (overridden by teacher) */}
          {!isTeacher && (
            <label className="cr-controls__toggle-wrapper">
              <input
                type="checkbox"
                className="cr-controls__toggle-input"
                checked={learnerWantsToFollow}
                onChange={(e) => setLearnerWantsToFollow(e.target.checked)}
                disabled={!teacherAllowsFollowing}
              />
              <span className="cr-controls__toggle-slider"></span>
              <span className="cr-controls__toggle-label">
                {!teacherAllowsFollowing
                  ? "Following disabled by teacher"
                  : learnerWantsToFollow
                  ? "Following layout"
                  : "Free layout"}
              </span>
            </label>
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
                onChangeResourceId={handleChangeResourceId} // ✅ CORRECT NAME
                isTeacher={isTeacher}
                sessionId={sessionId}
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
