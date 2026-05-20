// app/classroom/[sessionId]/ClassroomShell.jsx
"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import PrepVideoCall from "@/app/resources/prep/PrepVideoCall";
import PrepShell from "@/app/resources/prep/PrepShell";
import ClassroomChat from "./ClassroomChat";
import MobileClassroomLayout from "./MobileClassroomLayout";
import ClassroomHeaderBar from "./ClassroomHeaderBar";
import ClassroomControlBar from "./ClassroomControlBar";
import ClassroomResourcePickerModal from "./ClassroomResourcePickerModal";
import ClassroomParticipantsModal from "./ClassroomParticipantsModal";
import ClassroomLeaveConfirmModal from "./ClassroomLeaveConfirmModal";
import ClassroomConnectionBanner from "./ClassroomConnectionBanner";
import ClassroomTimeWarning from "./ClassroomTimeWarning";
import ClassroomWaitingRoom from "./ClassroomWaitingRoom";
import ClassroomLobbyPanel from "./ClassroomLobbyPanel";
import ClassroomLateJoinBanner from "./ClassroomLateJoinBanner";
import { useClassroomLobby } from "./useClassroomLobby";
import { ClassroomRaiseHandOverlay, useClassroomRaiseHand } from "./ClassroomRaiseHand";
import {
  ClassroomCaptionsOverlay,
  useClassroomCaptions,
} from "./ClassroomCaptions";
import { buildResourceIndex, getViewerInfo } from "./classroomHelpers";
import { formatCompactDuration, getSessionTiming } from "./classroomTime";
import { useClassroomChannel } from "@/app/resources/prep/useClassroomChannel";
import api from "@/lib/api";
import { MessageCircle, BookOpenText, Target, MessageSquare, BookOpen, Monitor } from "lucide-react";

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
  [FOCUS_MODES.VIDEO]: "Conversation",
  [FOCUS_MODES.BALANCED]: "Reading",
  [FOCUS_MODES.CONTENT]: "Drilling",
};

const focusModeIcon = {
  [FOCUS_MODES.VIDEO]: <MessageCircle size={20} />,
  [FOCUS_MODES.BALANCED]: <BookOpenText size={20} />,
  [FOCUS_MODES.CONTENT]: <Target size={20} />,
};

const FOCUS_MODE_ORDER = [
  FOCUS_MODES.VIDEO,
  FOCUS_MODES.BALANCED,
  FOCUS_MODES.CONTENT,
];
const CLASSROOM_FOCUS_MODES = new Set(Object.values(FOCUS_MODES));

const MIN_SPLIT_PERCENT = 12;
const MAX_SPLIT_PERCENT = 88;
const PAGE_RECORDING_UNSUPPORTED_MESSAGE =
  "Recording is currently supported in Chrome and Edge";
const PAGE_RECORDING_MIME_TYPES = [
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm;codecs=h264,opus",
  "video/webm",
];

function getBrowserBrands() {
  if (typeof navigator === "undefined") return [];
  return Array.isArray(navigator.userAgentData?.brands)
    ? navigator.userAgentData.brands.map((brand) => brand.brand || "")
    : [];
}

function getPageRecordingSupport() {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return { supported: false, reason: "unknown" };
  }

  const ua = navigator.userAgent || "";
  const brands = getBrowserBrands();
  const hasBrand = (pattern) => brands.some((brand) => pattern.test(brand));
  const isEdge = /\bEdg\//.test(ua) || hasBrand(/Microsoft Edge/i);
  const isFirefox = /Firefox|FxiOS/i.test(ua) || hasBrand(/Firefox/i);
  const isSafari =
    /Safari/i.test(ua) &&
    !/Chrome|CriOS|Chromium|Edg|OPR|Opera|Firefox|FxiOS|Android/i.test(ua);
  const isChrome =
    !isEdge &&
    !isFirefox &&
    !isSafari &&
    (/Chrome|CriOS|Chromium/i.test(ua) || hasBrand(/Google Chrome|Chromium/i));
  const hasRecordingApis =
    typeof navigator.mediaDevices?.getDisplayMedia === "function" &&
    typeof navigator.mediaDevices?.getUserMedia === "function" &&
    typeof window.MediaRecorder === "function";

  if (!hasRecordingApis) {
    return { supported: false, reason: "missing-api" };
  }

  if (isSafari) return { supported: false, reason: "safari" };
  if (isFirefox) return { supported: false, reason: "firefox" };
  if (!isChrome && !isEdge) return { supported: false, reason: "browser" };

  return { supported: true, reason: isEdge ? "edge" : "chrome" };
}

function pickSupportedPageRecordingMime() {
  if (typeof window === "undefined" || typeof window.MediaRecorder !== "function") {
    return null;
  }

  return (
    PAGE_RECORDING_MIME_TYPES.find((type) =>
      window.MediaRecorder.isTypeSupported(type)
    ) || null
  );
}

function clampSplitPercent(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  return Math.min(MAX_SPLIT_PERCENT, Math.max(MIN_SPLIT_PERCENT, num));
}

function clampScrollNorm(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  return Math.min(1, Math.max(0, num));
}

function getContentScrollForResource(contentScroll, resourceId) {
  if (!resourceId || !contentScroll || typeof contentScroll !== "object") {
    return null;
  }

  if (contentScroll.resourceId !== resourceId) return null;

  const scrollNorm = clampScrollNorm(contentScroll.scrollNorm);
  return scrollNorm === null ? null : { scrollNorm };
}

function getFocusModeSplitPercentage(mode) {
  switch (mode) {
    case FOCUS_MODES.VIDEO:
      return 55;
    case FOCUS_MODES.CONTENT:
      return 28;
    case FOCUS_MODES.BALANCED:
    default:
      return 38;
  }
}

function mergeClassroomStatePatch(current, patch) {
  return {
    ...(current || {}),
    ...(patch || {}),
    layout: patch?.layout
      ? { ...(current?.layout || {}), ...patch.layout }
      : current?.layout,
    contentScroll: patch?.contentScroll || current?.contentScroll,
    pdfScroll: patch?.pdfScroll || current?.pdfScroll,
    audio: patch?.audio || current?.audio,
    moderation: patch?.moderation
      ? { ...(current?.moderation || {}), ...patch.moderation }
      : current?.moderation,
  };
}

function formatSessionEndLabel(endMs) {
  if (!endMs) return "";

  const time = new Date(endMs).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return `Scheduled end ${time}`;
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
  const sessionStartedAt = session?.startedAt || session?.startAt;

  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const intervalId = setInterval(() => setNowMs(Date.now()), 1000);
    setNowMs(Date.now());
    return () => clearInterval(intervalId);
  }, []);

  const sessionTiming = useMemo(
    () =>
      getSessionTiming({
        startedAt: sessionStartedAt,
        endAt: session?.endAt,
        nowMs,
      }),
    [sessionStartedAt, session?.endAt, nowMs]
  );

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
  const [screenShareStream, setScreenShareStream] = useState(null);

  /* -----------------------------------------------------------
     Focus Mode & Layout State
  ----------------------------------------------------------- */
  const [focusMode, setFocusMode] = useState(FOCUS_MODES.BALANCED);
  const [customSplit, setCustomSplit] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef(null);
  const customSplitRef = useRef(customSplit);
  const pendingSplitRef = useRef(customSplit);
  const splitDragRafRef = useRef(null);
  const activePointerIdRef = useRef(null);
  const dragStartSplitRef = useRef(null);   // panel width when drag began
  const dividerRef = useRef(null);           // divider element for transform preview
  const selectedResourceIdRef = useRef(selectedResourceId);

  // ✅ Layout sync throttling (teacher -> learners)
  const lastLayoutSentAtRef = useRef(0);
  const layoutRafPendingRef = useRef(false);

  // ✅ Content scroll sync (teacher -> learners)
  const contentScrollRef = useRef(null);
  const lastContentScrollSentAtRef = useRef(0);
  const contentScrollRafPendingRef = useRef(false);

  // Chat defaults to closed; a red unread dot announces new messages.
  // The classroom should feel calm by default — chat is opt-in.
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);

  // ✅ Mobile responsive: detect screen width and manage tab state
  const [isMobile, setIsMobile] = useState(false);
  const [mobileActiveTab, setMobileActiveTab] = useState('video'); // 'video' | 'content' | 'chat'

  // Detect mobile breakpoint (< 900px)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkMobile = () => {
      const mobile = window.innerWidth < 900;
      setIsMobile(mobile);
      // Reset to video tab when switching to mobile
      if (mobile && !isMobile) {
        setMobileActiveTab('video');
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [isMobile]);

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
    } catch (_) { }
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
    } catch (_) { }
  }, [followLayoutStorageKey, learnerWantsToFollow, isTeacher]);

  const handleTeacherAllowsFollowingChange = useCallback(
    (nextValue) => {
      if (!isTeacher) return;
      setTeacherAllowsFollowing(Boolean(nextValue));
    },
    [isTeacher]
  );

  const handleLearnerWantsToFollowChange = useCallback(
    (nextValue) => {
      if (isTeacher) return;
      setLearnerWantsToFollow(Boolean(nextValue));
    },
    [isTeacher]
  );

  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showParticipantList, setShowParticipantList] = useState(false);
  const exportFnRef = useRef(null);
  const [isClassroomLocked, setIsClassroomLocked] = useState(() =>
    Boolean(session?.classroomState?.moderation?.locked)
  );
  const [moderationNotice, setModerationNotice] = useState("");
  const [videoModeration, setVideoModeration] = useState({
    ready: false,
    participants: [],
    actions: null,
  });
  const [networkQuality, setNetworkQuality] = useState(null);

  /* -----------------------------------------------------------
     Realtime sync (classroom channel) - MUST be before resize handlers
     which use ready and send
  ----------------------------------------------------------- */
  const classroomChannel = useClassroomChannel(String(sessionId));
  const ready = classroomChannel?.ready ?? false;
  const send = classroomChannel?.send ?? (() => { });
  const subscribe = classroomChannel?.subscribe ?? (() => () => { });

  const handleHardRejoin = useCallback(() => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  }, []);

  /* -----------------------------------------------------------
     Raise Hand
  ----------------------------------------------------------- */
  const { raisedHands, isHandRaised, toggleHand, lowerHand } = useClassroomRaiseHand(
    classroomChannel,
    userName,
    { isTeacher }
  );

  /* -----------------------------------------------------------
     Lobby / Waiting Room (group sessions)
  ----------------------------------------------------------- */
  const lobby = useClassroomLobby({
    sessionId,
    isTeacher,
    classroomChannel,
    userName,
  });

  /* -----------------------------------------------------------
     Late-Join Experience — show catch-up banner for learners
     who join after the session has started
  ----------------------------------------------------------- */
  const [showLateJoinBanner, setShowLateJoinBanner] = useState(false);
  const [lateJoinMessages, setLateJoinMessages] = useState([]);
  const lateJoinCheckedRef = useRef(false);

  useEffect(() => {
    if (isTeacher || lateJoinCheckedRef.current) return;
    lateJoinCheckedRef.current = true;

    // Only show if session has started and learner is joining > 1 min late
    const elapsedMin = Math.floor((sessionTiming.elapsedSeconds || 0) / 60);
    if (!sessionTiming.hasStarted || elapsedMin < 1) return;

    setShowLateJoinBanner(true);

    // Fetch last 5 chat messages for context
    api
      .get(`/sessions/${sessionId}/chat/messages`, { params: { limit: 5 } })
      .then((res) => {
        const msgs = (res.data?.messages || [])
          .filter((m) => !m.isDeleted && m.type !== "system")
          .slice(-5)
          .map((m) => ({
            id: m.id,
            senderName: m.senderName || m.sender || "Someone",
            text:
              (m.text || m.content || "").length > 80
                ? (m.text || m.content || "").slice(0, 80) + "…"
                : m.text || m.content || "",
          }));
        setLateJoinMessages(msgs);
      })
      .catch(() => {});
  }, [isTeacher, sessionId, sessionTiming.hasStarted, sessionTiming.elapsedSeconds]);

  /* -----------------------------------------------------------
     Live Captions (browser SpeechRecognition + WS broadcast)
     - Each participant transcribes their own mic locally.
     - Final and interim results are streamed over the classroom WS.
     - Auto-pauses when the user is muted so we never broadcast
       silently.
  ----------------------------------------------------------- */
  const [localAudioMuted, setLocalAudioMuted] = useState(true);
  const handleAudioMuteChange = useCallback((muted) => {
    setLocalAudioMuted(Boolean(muted));
  }, []);

  const {
    captions,
    enabled: captionsEnabled,
    supported: captionsSupported,
    toggle: toggleCaptions,
    pausedForMute: captionsPausedForMute,
  } = useClassroomCaptions(classroomChannel, userName, {
    locale,
    storageKey: `classroom_captions_${sessionId}`,
    micMuted: localAudioMuted,
  });

  const [classroomStateLoaded, setClassroomStateLoaded] = useState(false);
  const [classroomStateSnapshot, setClassroomStateSnapshot] = useState(null);
  const classroomStateLoadedRef = useRef(false);
  const pendingClassroomStatePatchRef = useRef({});
  const classroomStateSaveTimeoutRef = useRef(null);
  const pendingContentScrollNormRef = useRef(null);

  useEffect(() => {
    classroomStateLoadedRef.current = classroomStateLoaded;
  }, [classroomStateLoaded]);

  const flushClassroomStatePatch = useCallback(async () => {
    if (!isTeacher || !sessionId) return;

    const patch = pendingClassroomStatePatchRef.current;
    pendingClassroomStatePatchRef.current = {};
    if (!patch || !Object.keys(patch).length) return;

    try {
      const { data } = await api.patch(`/sessions/${sessionId}/classroom-state`, {
        state: patch,
      });
      if (data?.state) {
        setClassroomStateSnapshot(data.state);
      }
    } catch (err) {
      console.warn("Failed to persist classroom state:", err);
    }
  }, [isTeacher, sessionId]);

  const persistClassroomState = useCallback(
    (patch, options = {}) => {
      if (!isTeacher || !sessionId) return;
      if (!patch || typeof patch !== "object") return;
      if (!classroomStateLoadedRef.current && !patch.moderation) return;

      pendingClassroomStatePatchRef.current = mergeClassroomStatePatch(
        pendingClassroomStatePatchRef.current,
        patch
      );

      if (classroomStateSaveTimeoutRef.current) {
        clearTimeout(classroomStateSaveTimeoutRef.current);
        classroomStateSaveTimeoutRef.current = null;
      }

      const delay =
        typeof options.delay === "number" ? Math.max(0, options.delay) : 700;

      if (options.immediate || delay === 0) {
        void flushClassroomStatePatch();
        return;
      }

      classroomStateSaveTimeoutRef.current = setTimeout(() => {
        classroomStateSaveTimeoutRef.current = null;
        void flushClassroomStatePatch();
      }, delay);
    },
    [flushClassroomStatePatch, isTeacher, sessionId]
  );

  useEffect(() => {
    return () => {
      if (classroomStateSaveTimeoutRef.current) {
        clearTimeout(classroomStateSaveTimeoutRef.current);
        classroomStateSaveTimeoutRef.current = null;
      }
      void flushClassroomStatePatch();
    };
  }, [flushClassroomStatePatch]);

  const handleVideoModerationChange = useCallback((nextState) => {
    setVideoModeration({
      ready: Boolean(nextState?.ready),
      participants: Array.isArray(nextState?.participants)
        ? nextState.participants
        : [],
      actions: nextState?.actions || null,
    });
  }, []);

  const handleNetworkQualityChange = useCallback((nextQuality) => {
    setNetworkQuality(nextQuality || null);
  }, []);

  const runVideoModerationAction = useCallback(
    (actionName, ...args) => {
      const action = videoModeration.actions?.[actionName];
      if (typeof action !== "function") {
        setModerationNotice("Video controls are still connecting.");
        return false;
      }

      const ok = action(...args);
      if (!ok) {
        setModerationNotice("That video control is not available yet.");
        return false;
      }

      setModerationNotice("");
      return true;
    },
    [videoModeration.actions]
  );

  const handleToggleClassroomLock = useCallback(
    (locked) => {
      if (!isTeacher) return;
      const nextLocked = Boolean(locked);
      setIsClassroomLocked(nextLocked);
      setModerationNotice(
        nextLocked
          ? "Classroom locked. Late joins are now blocked."
          : "Classroom unlocked. Learners can join again."
      );

      if (ready) {
        send({
          type: "CLASSROOM_LOCK",
          locked: nextLocked,
        });
      }

      persistClassroomState(
        {
          moderation: {
            locked: nextLocked,
          },
        },
        { immediate: true }
      );
    },
    [isTeacher, persistClassroomState, ready, send]
  );

  useEffect(() => {
    customSplitRef.current = customSplit;
    pendingSplitRef.current = customSplit;
  }, [customSplit]);

  useEffect(() => {
    selectedResourceIdRef.current = selectedResourceId;
  }, [selectedResourceId]);

  const applyPersistedContentScroll = useCallback((scrollNorm, resourceId) => {
    if (!resourceId) return;
    const norm = clampScrollNorm(scrollNorm);
    if (norm === null) return;

    pendingContentScrollNormRef.current = { resourceId, scrollNorm: norm };

    requestAnimationFrame(() => {
      if (selectedResourceIdRef.current !== resourceId) return;

      const el = contentScrollRef.current;
      if (!el) return;

      const maxScroll = Math.max(1, el.scrollHeight - el.clientHeight);
      el.scrollTop = norm * maxScroll;
      pendingContentScrollNormRef.current = null;
    });
  }, []);

  useEffect(() => {
    const pending = pendingContentScrollNormRef.current;
    if (pending === null || pending === undefined) return;
    applyPersistedContentScroll(pending.scrollNorm, pending.resourceId);
  }, [applyPersistedContentScroll, selectedResourceId, isMobile, mobileActiveTab]);

  useEffect(() => {
    let cancelled = false;

    async function loadClassroomState() {
      if (!sessionId) return;
      setClassroomStateLoaded(false);

      try {
        const { data } = await api.get(`/sessions/${sessionId}/classroom-state`);
        if (cancelled) return;

        const state = data?.state && typeof data.state === "object" ? data.state : {};
        setClassroomStateSnapshot(state);
        setIsClassroomLocked(Boolean(state.moderation?.locked));

        const savedResourceId =
          state.resourceId && resourcesById[state.resourceId]
            ? state.resourceId
            : null;

        selectedResourceIdRef.current = savedResourceId;
        setSelectedResourceId(savedResourceId);

        if (typeof window !== "undefined") {
          try {
            const key = `classroom_resource_${sessionId}`;
            if (savedResourceId) {
              sessionStorage.setItem(key, savedResourceId);
            } else {
              sessionStorage.removeItem(key);
            }
          } catch (_) { }
        }

        const layout = state.layout || {};
        if (CLASSROOM_FOCUS_MODES.has(layout.focusMode)) {
          setFocusMode(layout.focusMode);
        }

        const nextSplit =
          layout.customSplit === null || layout.customSplit === undefined
            ? null
            : clampSplitPercent(layout.customSplit);
        customSplitRef.current = nextSplit;
        pendingSplitRef.current = nextSplit;
        setCustomSplit(nextSplit);

        if (layout.teacherAllowsFollowing !== undefined) {
          setTeacherAllowsFollowing(!!layout.teacherAllowsFollowing);
        }

        const savedContentScroll = getContentScrollForResource(
          state.contentScroll,
          savedResourceId
        );
        if (savedContentScroll) {
          applyPersistedContentScroll(
            savedContentScroll.scrollNorm,
            savedResourceId
          );
        }
      } catch (err) {
        console.warn("Failed to load classroom state:", err);
        setClassroomStateSnapshot({});
      } finally {
        if (!cancelled) setClassroomStateLoaded(true);
      }
    }

    loadClassroomState();
    return () => {
      cancelled = true;
    };
  }, [sessionId, resourcesById, applyPersistedContentScroll]);

  useEffect(() => {
    return () => {
      if (splitDragRafRef.current) {
        cancelAnimationFrame(splitDragRafRef.current);
      }
    };
  }, []);

  /* -----------------------------------------------------------
     Drag-to-resize logic
  ----------------------------------------------------------- */
  const canResizePanels = isTeacher || !followTeacherLayout;

  const updateCustomSplit = useCallback((nextSplit, { defer = true } = {}) => {
    if (nextSplit === null || nextSplit === undefined) return;
    const roundedSplit = Math.round(nextSplit * 10) / 10;
    if (!Number.isFinite(roundedSplit)) return;

    customSplitRef.current = roundedSplit;
    pendingSplitRef.current = roundedSplit;

    if (!defer) {
      if (splitDragRafRef.current) {
        cancelAnimationFrame(splitDragRafRef.current);
        splitDragRafRef.current = null;
      }
      setCustomSplit(roundedSplit);
      return;
    }

    if (splitDragRafRef.current) return;
    splitDragRafRef.current = requestAnimationFrame(() => {
      splitDragRafRef.current = null;
      setCustomSplit(pendingSplitRef.current);
    });
  }, []);

  const updateSplitFromClientX = useCallback(
    (clientX) => {
      if (!canResizePanels || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const nextSplit = clampSplitPercent(
        ((clientX - rect.left) / rect.width) * 100
      );

      updateCustomSplit(nextSplit);
    },
    [canResizePanels, updateCustomSplit]
  );

  const commitCurrentSplitLayout = useCallback(() => {
    if (isTeacher && ready) {
      send({
        type: "LAYOUT_STATE",
        focusMode,
        customSplit: customSplitRef.current,
        teacherAllowsFollowing,
      });
    }
    if (isTeacher) {
      persistClassroomState(
        {
          layout: {
            focusMode,
            customSplit: customSplitRef.current,
            teacherAllowsFollowing,
          },
        },
        { immediate: true }
      );
    }
  }, [isTeacher, ready, send, focusMode, teacherAllowsFollowing, persistClassroomState]);

  const finishResize = useCallback(() => {
    if (splitDragRafRef.current) {
      cancelAnimationFrame(splitDragRafRef.current);
      splitDragRafRef.current = null;
    }

    // Reset divider transform
    const divEl = dividerRef.current;
    if (divEl) divEl.style.transform = '';

    // Commit the final width from the preview — spring transition kicks in via CSS
    const finalSplit = pendingSplitRef.current;
    if (finalSplit !== null && finalSplit !== undefined) {
      customSplitRef.current = finalSplit;
      setCustomSplit(finalSplit);
    }

    setIsDragging(false);
    activePointerIdRef.current = null;
    dragStartSplitRef.current = null;
    // ✅ Immediately broadcast final position on drag end for snappier sync
    commitCurrentSplitLayout();
  }, [commitCurrentSplitLayout]);

  const handlePointerDown = useCallback(
    (e) => {
      if (!canResizePanels) return;
      if (e.button !== undefined && e.button !== 0) return;

      e.preventDefault();
      activePointerIdRef.current = e.pointerId;
      if (e.currentTarget?.setPointerCapture && e.pointerId !== undefined) {
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch (_) { }
      }

      // Freeze panels at current width; only divider moves during drag
      const currentSplit = customSplitRef.current ?? getFocusModeSplitPercentage(focusMode);
      dragStartSplitRef.current = currentSplit;
      pendingSplitRef.current = currentSplit;
      setIsDragging(true);
    },
    [canResizePanels, focusMode]
  );

  const handlePointerMove = useCallback(
    (e) => {
      if (!isDragging || activePointerIdRef.current === null) return;
      if (e.pointerId !== activePointerIdRef.current) return;

      e.preventDefault();

      // Compute target split but don't commit to panels
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const nextSplit = clampSplitPercent(
        ((e.clientX - rect.left) / rect.width) * 100
      );
      if (nextSplit === null) return;

      pendingSplitRef.current = nextSplit;

      // Move divider visually via transform (no panel relayout)
      const divEl = dividerRef.current;
      if (divEl) {
        const startSplit = dragStartSplitRef.current ?? nextSplit;
        const deltaPercent = nextSplit - startSplit;
        const deltaPx = (deltaPercent / 100) * rect.width;
        divEl.style.transform = `translateX(${deltaPx}px)`;
      }
    },
    [isDragging]
  );

  const handlePointerUp = useCallback(
    (e) => {
      if (activePointerIdRef.current === null) return;
      if (e.pointerId !== activePointerIdRef.current) return;

      finishResize();
    },
    [finishResize]
  );

  const handleDividerKeyDown = useCallback(
    (e) => {
      if (!canResizePanels) return;
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;

      e.preventDefault();
      const currentSplit =
        customSplitRef.current ?? getFocusModeSplitPercentage(focusMode);
      const step = e.shiftKey ? 5 : 2;
      const direction = e.key === "ArrowLeft" ? -1 : 1;
      const nextSplit = clampSplitPercent(currentSplit + direction * step);
      updateCustomSplit(nextSplit, { defer: false });
      commitCurrentSplitLayout();
    },
    [canResizePanels, commitCurrentSplitLayout, focusMode, updateCustomSplit]
  );

  useEffect(() => {
    if (!isDragging) return;

    const listenerOptions = { passive: false };
    document.addEventListener("pointermove", handlePointerMove, listenerOptions);
    document.addEventListener("pointerup", handlePointerUp);
    document.addEventListener("pointercancel", handlePointerUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    return () => {
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerup", handlePointerUp);
      document.removeEventListener("pointercancel", handlePointerUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isDragging, handlePointerMove, handlePointerUp]);

  useEffect(() => {
    if (canResizePanels || !isDragging) return;
    finishResize();
  }, [canResizePanels, finishResize, isDragging]);

  useEffect(() => {
    if (isChatOpen) setChatUnreadCount(0);
  }, [isChatOpen]);

  const getSplitPercentage = () => {
    if (customSplit !== null) return customSplit;

    return getFocusModeSplitPercentage(focusMode);
  };

  const leftPanelWidth = getSplitPercentage();

  const resetToMode = (mode) => {
    setFocusMode(mode);
    customSplitRef.current = null;
    pendingSplitRef.current = null;
    setCustomSplit(null);
    persistClassroomState(
      {
        layout: {
          focusMode: mode,
          customSplit: null,
          teacherAllowsFollowing,
        },
      },
      { immediate: true }
    );
  };


  // ✅ Teacher: broadcast layout (focusMode + customSplit + follow control)
  useEffect(() => {
    if (!isTeacher) return;

    const now = Date.now();
    if (now - lastLayoutSentAtRef.current < 100) return; // ~10fps — smooth enough for layout sync
    if (layoutRafPendingRef.current) return;

    layoutRafPendingRef.current = true;

    requestAnimationFrame(() => {
      layoutRafPendingRef.current = false;
      lastLayoutSentAtRef.current = Date.now();

      if (ready) {
        send({
          type: "LAYOUT_STATE",
          focusMode,
          customSplit,
          teacherAllowsFollowing, // ✅ NEW: broadcast teacher's follow control
        });
      }

      persistClassroomState(
        {
          layout: {
            focusMode,
            customSplit,
            teacherAllowsFollowing,
          },
        },
        { delay: 700 }
      );
    });
  }, [
    ready,
    isTeacher,
    send,
    focusMode,
    customSplit,
    teacherAllowsFollowing,
    persistClassroomState,
  ]);

  // ✅ Teacher: broadcast content scroll (works for PDF + any resource)
  useEffect(() => {
    if (!isTeacher) return;

    const el = contentScrollRef.current;
    if (!el) return;

    const onScroll = () => {
      const now = Date.now();
      if (now - lastContentScrollSentAtRef.current < 80) return; // ~12fps — smooth enough for scroll sync
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
        const resourceId = selectedResourceIdRef.current;
        if (!resourceId) return;

        lastContentScrollSentAtRef.current = Date.now();

        if (ready) {
          send({
            type: "CONTENT_SCROLL",
            resourceId,
            scrollNorm,
          });
        }

        persistClassroomState(
          {
            contentScroll: { resourceId, scrollNorm },
          },
          { delay: 1500 }
        );
      });
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [ready, isTeacher, send, persistClassroomState]);

  useEffect(() => {
    if (!ready) return;

    const unsub = subscribe((msg) => {
      if (!msg) return;

      if (msg.type === "CLASSROOM_LOCK") {
        setIsClassroomLocked(Boolean(msg.locked));
        return;
      }

      // ✅ Learner: follow teacher content scroll (PDF + any resource)
      if (msg.type === "CONTENT_SCROLL" && !isTeacher) {
        if (msg.resourceId !== selectedResourceIdRef.current) return;

        const norm = Math.min(1, Math.max(0, Number(msg.scrollNorm) || 0));

        // ✅ Apply immediately for snappier sync (removed setTimeout)
        const el = contentScrollRef.current;
        if (el) {
          const maxScroll = Math.max(1, el.scrollHeight - el.clientHeight);
          el.scrollTop = norm * maxScroll;
        }

        return;
      }

      // ✅ Learner: receive teacher's follow control + layout updates
      if (msg.type === "LAYOUT_STATE" && !isTeacher) {
        // ✅ Teacher controls whether learners can follow
        if (msg.teacherAllowsFollowing !== undefined) {
          setTeacherAllowsFollowing(!!msg.teacherAllowsFollowing);
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
            customSplitRef.current = null;
            pendingSplitRef.current = null;
            setCustomSplit(null);
          } else if (Number.isFinite(nextSplit)) {
            const clampedSplit = Math.min(
              Math.max(nextSplit, MIN_SPLIT_PERCENT),
              MAX_SPLIT_PERCENT
            );
            customSplitRef.current = clampedSplit;
            pendingSplitRef.current = clampedSplit;
            setCustomSplit(clampedSplit);
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

      // Learner follow preference is local; it must not change the teacher's global setting.
      if (msg.type === "LEARNER_FOLLOW_PREFERENCE" && isTeacher) {
        return;
      }

      if (msg.type === "SET_RESOURCE") {
        const { resourceId } = msg;
        if (resourceId && resourcesById[resourceId]) {
          selectedResourceIdRef.current = resourceId;
          setSelectedResourceId(resourceId);
          if (typeof window !== "undefined") {
            try {
              sessionStorage.setItem(`classroom_resource_${sessionId}`, resourceId);
            } catch (_) { }
          }
        } else {
          console.warn("[Classroom] ⚠️ Resource NOT found in resourcesById!");
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
    teacherAllowsFollowing,
    learnerWantsToFollow,
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

  // ✅ Learner: request the saved teacher layout when turning follow back on.
  useEffect(() => {
    if (!ready) return;
    if (isTeacher) return;

    // Request layout when turning follow ON
    if (learnerWantsToFollow && teacherAllowsFollowing) {
      send({ type: "REQUEST_LAYOUT" });
    }
  }, [ready, isTeacher, learnerWantsToFollow, teacherAllowsFollowing, send]);

  useEffect(() => {
    if (!isTeacher || selectedResourceId) return;
    if (!classroomStateLoaded) return;

    const all = Object.values(resourcesById || {});
    if (all.length && all[0]?._id) {
      const firstResourceId = all[0]._id;
      selectedResourceIdRef.current = firstResourceId;
      setSelectedResourceId(firstResourceId);
      persistClassroomState(
        {
          resourceId: firstResourceId,
          contentScroll: {
            resourceId: firstResourceId,
            scrollNorm: 0,
          },
        },
        { immediate: true }
      );
    }
  }, [
    isTeacher,
    selectedResourceId,
    resourcesById,
    classroomStateLoaded,
    persistClassroomState,
  ]);

  /* -----------------------------------------------------------
     Resource & viewer
  ----------------------------------------------------------- */
  const resource = selectedResourceId
    ? resourcesById[selectedResourceId]
    : null;
  const viewer = resource ? getViewerInfo(resource) : null;
  const leaveSummary = useMemo(() => {
    const overBySeconds =
      sessionTiming.endMs && nowMs > sessionTiming.endMs
        ? Math.floor((nowMs - sessionTiming.endMs) / 1000)
        : 0;
    const participantLabel = isGroup
      ? `${participantCount}${capacity ? `/${capacity}` : ""}`
      : participantCount === 1
        ? "1 learner"
        : `${participantCount || 1} learners`;
    const resourceLabel =
      resource?.title || resource?.name || "No resource selected";

    let statusLabel = "No scheduled end";
    if (sessionTiming.endMs) {
      statusLabel = sessionTiming.hasEnded
        ? overBySeconds > 0
          ? `Over by ${formatCompactDuration(overBySeconds)}`
          : "Time is up"
        : `Ends in ${sessionTiming.remainingLabel}`;
    }

    return {
      statusLabel,
      elapsedLabel: sessionTiming.elapsedLabel,
      scheduledLabel: sessionTiming.scheduledLabel || "Open-ended",
      participantLabel,
      resourceLabel,
      endLabel: formatSessionEndLabel(sessionTiming.endMs),
    };
  }, [
    capacity,
    isGroup,
    nowMs,
    participantCount,
    resource?.name,
    resource?.title,
    sessionTiming.elapsedLabel,
    sessionTiming.endMs,
    sessionTiming.hasEnded,
    sessionTiming.remainingLabel,
    sessionTiming.scheduledLabel,
  ]);
  const hasScreenShareStream =
    !!(screenShareStream && typeof screenShareStream.getTracks === "function");

  const sharedScreenVideoRef = useRef(null);

  const assignSharedScreenVideoRef = useCallback(
    (node) => {
      sharedScreenVideoRef.current = node;
      if (!node) return;

      const stream = hasScreenShareStream ? screenShareStream : null;
      if (node.srcObject !== stream) {
        node.srcObject = stream;
      }
    },
    [hasScreenShareStream, screenShareStream]
  );

  // ✅ Track resource usage when teacher changes resource
  const handleChangeResourceId = async (newId) => {
    selectedResourceIdRef.current = newId;
    setSelectedResourceId(newId);
    setIsPickerOpen(false);

    // Persist selection
    if (typeof window !== "undefined") {
      try {
        const key = `classroom_resource_${sessionId}`;
        if (newId) {
          sessionStorage.setItem(key, newId);
        } else {
          sessionStorage.removeItem(key);
        }
      } catch { }
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

    if (isTeacher) {
      persistClassroomState(
        {
          resourceId: newId || null,
          contentScroll: { resourceId: newId || null, scrollNorm: 0 },
        },
        { immediate: true }
      );
    }
  };

  const handleScreenShareStreamChange = useCallback((payload) => {
    // Supports both old boolean callback and richer payload shape.
    if (payload && typeof payload.getTracks === "function") {
      setIsScreenShareActive(true);
      setScreenShareStream(payload);
      return;
    }

    if (payload && typeof payload === "object") {
      const active = !!payload.active;
      const stream =
        payload.stream && typeof payload.stream.getTracks === "function"
          ? payload.stream
          : null;

      setIsScreenShareActive(active);
      setScreenShareStream(stream);
      return;
    }

    const active = !!payload;
    setIsScreenShareActive(active);
    if (!active) {
      setScreenShareStream(null);
    }
  }, []);

  /* -----------------------------------------------------------
   Page Recording (local download, teacher only)
----------------------------------------------------------- */
  const [isPageRecording, setIsPageRecording] = useState(false);
  const [pageRecError, setPageRecError] = useState(null);
  const [pageRecWarning, setPageRecWarning] = useState(null);

  const pageRecorderRef = useRef(null);
  const pageStreamRef = useRef(null);
  const pageChunksRef = useRef([]);

  async function startPageRecording() {
    let displayStream = null;
    let micStream = null;
    let audioContext = null;

    try {
      setPageRecError(null);
      setPageRecWarning(null);

      const support = getPageRecordingSupport();
      if (!support.supported) {
        setPageRecError(PAGE_RECORDING_UNSUPPORTED_MESSAGE);
        return;
      }

      const mimeType = pickSupportedPageRecordingMime();
      if (!mimeType) {
        setPageRecError(PAGE_RECORDING_UNSUPPORTED_MESSAGE);
        return;
      }

      displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 30 },
        audio: true, // tab/system audio
        preferCurrentTab: true,
      });

      micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // ✅ SOLUTION: Use Web Audio API to properly mix audio sources
      audioContext = new AudioContext();
      const baseLatency = Number(audioContext.baseLatency || 0);
      if (baseLatency > 0.03) {
        setPageRecWarning(
          `Recording audio latency is elevated (${Math.round(baseLatency * 1000)}ms).`
        );
      }

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
        mimeType,
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
      displayStream?.getTracks().forEach((track) => track.stop());
      micStream?.getTracks().forEach((track) => track.stop());
      audioContext?.close();
      const support = getPageRecordingSupport();
      setPageRecError(
        support.supported
          ? "Recording could not start. Check screen and microphone permissions, then try again."
          : PAGE_RECORDING_UNSUPPORTED_MESSAGE
      );
      setPageRecWarning(null);
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
      setPageRecWarning(null);
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

  // ─── Waiting Room: block classroom until admitted ───
  if (lobby.isInWaitingRoom || lobby.isDenied) {
    return (
      <ClassroomWaitingRoom
        sessionId={sessionId}
        sessionInfo={{
          teacherName,
          sessionTitle: headerTitle,
          startTime: session?.startAt,
          participantCount,
          capacity,
        }}
        userName={userName}
        status={lobby.isDenied ? "denied" : "waiting"}
        wsConnected={classroomChannel?.ready || false}
        onRetry={lobby.retryJoin}
        onLeave={() => {
          if (typeof window !== "undefined") {
            window.location.href = prefix || "/dashboard";
          }
        }}
      />
    );
  }

  return (
    <div className="cr-shell">
      {/* Lobby Panel (teacher only, for admitting waiting learners) */}
      {isTeacher && (
        <ClassroomLobbyPanel
          waitingLearners={lobby.waitingLearners}
          onAdmit={lobby.admitLearner}
          onDeny={lobby.denyLearner}
          onAdmitAll={lobby.admitAll}
          isOpen={lobby.isLobbyPanelOpen}
          onToggle={lobby.togglePanel}
          onClose={lobby.closePanel}
        />
      )}

      {/* Header */}
      <ClassroomHeaderBar
        prefix={prefix}
        setShowLeaveConfirm={setShowLeaveConfirm}
        headerTitle={headerTitle}
        typeLabel={typeLabel}
        isGroup={isGroup}
        countLabel={countLabel}
        isTeacher={isTeacher}
        teacherName={teacherName}
        learnerName={learnerName}
        setShowParticipantList={setShowParticipantList}
        wsStatus={classroomChannel?.status}
        networkQuality={networkQuality}
        sessionTiming={sessionTiming}
      />

      <ClassroomConnectionBanner
        channel={classroomChannel}
        onRejoin={handleHardRejoin}
      />

      <ClassroomTimeWarning
        warningLevel={isTeacher ? sessionTiming.warningLevel : null}
        remainingLabel={sessionTiming.remainingLabel}
      />

      {/* Late-Join Banner (learner only, when joining mid-session) */}
      {showLateJoinBanner && !isTeacher && (
        <ClassroomLateJoinBanner
          elapsedMinutes={Math.floor((sessionTiming.elapsedSeconds || 0) / 60)}
          currentResourceTitle={resource?.title || resource?.name || null}
          recentMessages={lateJoinMessages}
          onDismiss={() => setShowLateJoinBanner(false)}
          onOpenChat={() => setIsChatOpen(true)}
        />
      )}

      {/* Main Content - Desktop only (hidden on mobile where MobileClassroomLayout is used) */}
      {!isMobile && (
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
                onModerationStateChange={handleVideoModerationChange}
                onNetworkQualityChange={handleNetworkQualityChange}
                onAudioMuteChange={handleAudioMuteChange}
              />
              <ClassroomRaiseHandOverlay
                raisedHands={raisedHands}
                isTeacher={isTeacher}
                onLowerHand={lowerHand}
              />
              <ClassroomCaptionsOverlay captions={captions} />
            </div>

            <div
              className={`cr-chat-container ${!isChatOpen ? "cr-chat-container--collapsed" : ""
                }`}
              data-lenis-prevent
            >
              <button
                className="cr-chat-toggle"
                onClick={() => setIsChatOpen(!isChatOpen)}
                aria-label={isChatOpen ? "Collapse chat" : "Expand chat"}
              >
                <span className="cr-chat-toggle__label">
                  <MessageSquare size={14} /> Chat
                  {chatUnreadCount > 0 && !isChatOpen && (
                    <span className="cr-chat-toggle__unread" aria-label={`${chatUnreadCount} unread`}>
                      {chatUnreadCount > 9 ? "9+" : chatUnreadCount}
                    </span>
                  )}
                </span>
                <span
                  className={`cr-chat-toggle__icon ${isChatOpen ? "cr-chat-toggle__icon--open" : ""
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
            ref={dividerRef}
            className={[
              "cr-divider",
              isDragging ? "cr-divider--active" : "",
              !canResizePanels ? "cr-divider--disabled" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onKeyDown={handleDividerKeyDown}
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize panels"
            aria-disabled={!canResizePanels}
            aria-valuemin={MIN_SPLIT_PERCENT}
            aria-valuemax={MAX_SPLIT_PERCENT}
            aria-valuenow={Math.round(leftPanelWidth)}
            aria-valuetext={`Left panel ${Math.round(leftPanelWidth)} percent`}
            tabIndex={canResizePanels ? 0 : -1}
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
            <div className="cr-content-viewer" ref={contentScrollRef} data-lenis-prevent>
              {isScreenShareActive ? (
                <div className="cr-screen-share">
                  {hasScreenShareStream ? (
                    <video
                      ref={assignSharedScreenVideoRef}
                      className="cr-screen-share__video"
                      playsInline
                      autoPlay
                      muted
                    />
                  ) : (
                    <div className="cr-placeholder">
                      <div className="cr-placeholder__icon">
                        <Monitor size={32} />
                      </div>
                      <h2 className="cr-placeholder__title">Screen sharing is active</h2>
                      <p className="cr-placeholder__text">
                        The shared screen is being initialized. Please wait a moment.
                      </p>
                    </div>
                  )}
                </div>
              ) : resource ? (
                <PrepShell
                  resource={resource}
                  viewer={viewer}
                  hideSidebar={true}
                  hideBreadcrumbs={true}
                  classroomChannel={classroomChannel}
                  isTeacher={isTeacher}
                  locale={locale}
                  initialAudioState={classroomStateSnapshot?.audio || null}
                  initialPdfScroll={classroomStateSnapshot?.pdfScroll || null}
                  onClassroomStateChange={persistClassroomState}
                  onExportReady={(fn) => { exportFnRef.current = fn; }}
                  className="cr-prep-shell-fullsize"
                />
              ) : (
                <div className="cr-placeholder">
                  <div className="cr-placeholder__icon">
                    <BookOpen size={32} />
                  </div>
                  <h2 className="cr-placeholder__title">No resource selected</h2>
                  <p className="cr-placeholder__text">
                    {isTeacher
                      ? "Click the resource picker below to choose content."
                      : "Waiting for the teacher to select a resource."}
                  </p>
                  {isTeacher && (
                    <button
                      className="cr-placeholder__action"
                      onClick={() => setIsPickerOpen(true)}
                    >
                      <BookOpen size={16} /> Choose Resource
                    </button>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {/* Bottom Control Bar - Desktop only */}
      <ClassroomControlBar
        isMobile={isMobile}
        isTeacher={isTeacher}
        setIsPickerOpen={setIsPickerOpen}
        isPageRecording={isPageRecording}
        pageRecError={pageRecError}
        pageRecWarning={pageRecWarning}
        stopPageRecording={stopPageRecording}
        startPageRecording={startPageRecording}
        isGroup={isGroup}
        setShowParticipantList={setShowParticipantList}
        participantCount={participantCount}
        focusMode={focusMode}
        FOCUS_MODE_ORDER={FOCUS_MODE_ORDER}
        focusModeLabel={focusModeLabel}
        focusModeIcon={focusModeIcon}
        resetToMode={resetToMode}
        customSplit={customSplit}
        setCustomSplit={setCustomSplit}
        teacherAllowsFollowing={teacherAllowsFollowing}
        onTeacherAllowsFollowingChange={handleTeacherAllowsFollowingChange}
        learnerWantsToFollow={learnerWantsToFollow}
        onLearnerWantsToFollowChange={handleLearnerWantsToFollowChange}
        isChatOpen={isChatOpen}
        setIsChatOpen={setIsChatOpen}
        chatUnreadCount={chatUnreadCount}
        isHandRaised={isHandRaised}
        toggleHand={toggleHand}
        captionsEnabled={captionsEnabled}
        captionsSupported={captionsSupported}
        onToggleCaptions={toggleCaptions}
        captionsPausedForMute={captionsPausedForMute}
        onExportPage={(format) => exportFnRef.current?.(format)}
        hasResource={Boolean(resource)}
      />

      {/* Mobile Layout (shown only on screens < 900px) */}
      {isMobile && (
        <MobileClassroomLayout
          activeTab={mobileActiveTab}
          onTabChange={setMobileActiveTab}
          isTeacher={isTeacher}
          onOpenPicker={() => setIsPickerOpen(true)}
          onOpenParticipants={() => setShowParticipantList(true)}
          chatUnreadCount={chatUnreadCount}
          hasResource={!!resource}
          isHandRaised={isHandRaised}
          toggleHand={toggleHand}
          captionsEnabled={captionsEnabled}
          captionsSupported={captionsSupported}
          onToggleCaptions={toggleCaptions}
          videoComponent={
            <>
              <PrepVideoCall
                roomId={sessionId}
                userName={userName}
                isTeacher={isTeacher}
                onScreenShareStreamChange={handleScreenShareStreamChange}
                onModerationStateChange={handleVideoModerationChange}
                onNetworkQualityChange={handleNetworkQualityChange}
                onAudioMuteChange={handleAudioMuteChange}
              />
              <ClassroomRaiseHandOverlay
                raisedHands={raisedHands}
                isTeacher={isTeacher}
                onLowerHand={lowerHand}
              />
              <ClassroomCaptionsOverlay captions={captions} />
            </>
          }
          contentComponent={
            isScreenShareActive ? (
              <div className="cr-screen-share">
                {hasScreenShareStream ? (
                  <video
                    ref={assignSharedScreenVideoRef}
                    className="cr-screen-share__video"
                    playsInline
                    autoPlay
                    muted
                  />
                ) : (
                  <div className="cr-placeholder">
                    <div className="cr-placeholder__icon">
                      <Monitor size={32} />
                    </div>
                    <h2 className="cr-placeholder__title">Screen sharing is active</h2>
                    <p className="cr-placeholder__text">
                      The shared screen is being initialized. Please wait a moment.
                    </p>
                  </div>
                )}
              </div>
            ) : resource ? (
              <PrepShell
                resource={resource}
                viewer={viewer}
                hideSidebar={true}
                hideBreadcrumbs={true}
                classroomChannel={classroomChannel}
                isTeacher={isTeacher}
                locale={locale}
                initialAudioState={classroomStateSnapshot?.audio || null}
                initialPdfScroll={classroomStateSnapshot?.pdfScroll || null}
                onClassroomStateChange={persistClassroomState}
                onExportReady={(fn) => { exportFnRef.current = fn; }}
              />
            ) : (
              <div className="cr-placeholder">
                <div className="cr-placeholder__icon">
                  <BookOpen size={32} />
                </div>
                <h2 className="cr-placeholder__title">
                  No resource selected
                </h2>
                <p className="cr-placeholder__text">
                  {isTeacher
                    ? "Tap the Resources button to choose content."
                    : "Waiting for the teacher to select a resource."}
                </p>
              </div>
            )
          }
          chatComponent={
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
          }
        />
      )}

      <ClassroomResourcePickerModal
        isOpen={isPickerOpen}
        setIsPickerOpen={setIsPickerOpen}
        isTeacher={isTeacher}
        tracks={tracks}
        selectedResourceId={selectedResourceId}
        handleChangeResourceId={handleChangeResourceId}
        sessionId={sessionId}
      />

      <ClassroomParticipantsModal
        show={showParticipantList}
        setShowParticipantList={setShowParticipantList}
        participantCount={participantCount}
        capacity={capacity}
        teacherName={teacherName}
        learners={learners}
        buildDisplayName={buildDisplayName}
        isTeacher={isTeacher}
        raisedHands={raisedHands}
        videoParticipants={videoModeration.participants}
        videoControlsReady={videoModeration.ready}
        isClassroomLocked={isClassroomLocked}
        moderationNotice={moderationNotice}
        onMuteAll={() => runVideoModerationAction("muteAll")}
        onMuteParticipant={(participantId) =>
          runVideoModerationAction("muteParticipant", participantId)
        }
        onPinParticipant={(participantId) =>
          runVideoModerationAction("pinParticipant", participantId)
        }
        onRemoveParticipant={(participantId) =>
          runVideoModerationAction("kickParticipant", participantId)
        }
        onLowerHand={lowerHand}
        onToggleClassroomLock={handleToggleClassroomLock}
      />

      <ClassroomLeaveConfirmModal
        show={showLeaveConfirm}
        setShowLeaveConfirm={setShowLeaveConfirm}
        prefix={prefix}
        summary={leaveSummary}
        isTeacher={isTeacher}
      />
    </div>
  );
}
