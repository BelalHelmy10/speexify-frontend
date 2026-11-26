// app/classroom/[sessionId]/ClassroomShell.jsx
"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import PrepVideoCall from "@/app/resources/prep/PrepVideoCall";
import ClassroomResourceWorkspace from "./ClassroomResourceWorkspace";
import PrepShell from "@/app/resources/prep/PrepShell";
import ClassroomChat from "./ClassroomChat";
import { formatNumber, getIntlLocale } from "@/utils/locale";
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
import {
  ClassroomScreenShareBanner,
  ClassroomScreenShareConfirmModal,
  useClassroomScreenShare,
} from "./ClassroomScreenShare";
import {
  buildResourceIndex,
  buildReviewResourceSnapshot,
  getViewerInfo,
} from "./classroomHelpers";
import useAuth from "@/hooks/useAuth";
import { formatCompactDuration, getSessionTiming, useSessionTiming } from "./classroomTime";
import { useClassroomChannel } from "@/app/resources/prep/useClassroomChannel";
import { getDictionary, t } from "@/app/i18n";
import useClassroomVideoModeration from "./useClassroomVideoModeration";
import api from "@/lib/api";
import { MessageCircle, MessageSquare, BookOpenText, Target, BookOpen } from "lucide-react";

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

function getParticipantId(source) {
  return source?._id || source?.id || source?.userId || null;
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
  const isTraining = s.type === "TRAINING";
  const learners = s.learners || [];

  const learnerObj =
    (isTraining ? s.trainingAdmin : null) ||
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
    (isTraining ? "Admin trainer" : "Learner");

  const learnerSources = (learners.length > 0 ? learners : learnerObj ? [learnerObj] : [])
    .filter((person) => !isTraining || String(getParticipantId(person)) !== String(getParticipantId(teacherObj) || s.teacherId));
  const allLearnerNames = learnerSources.map(
    (l) => buildDisplayName(l) || l.email?.split("@")[0] || "Learner"
  );
  const chatParticipants = [
    {
      id: getParticipantId(teacherObj) || s.teacherId || s.teacherUserId || null,
      name: teacherName,
      role: "teacher",
    },
    ...learnerSources.map((learner) => ({
      id: getParticipantId(learner),
      name: buildDisplayName(learner) || learner.email?.split("@")[0] || "Learner",
      role: "learner",
    })),
  ].filter((participant) => participant.id != null);

  return {
    teacherName,
    learnerName,
    isGroup,
    isTraining,
    learners,
    allLearnerNames,
    chatParticipants,
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
// While someone is sharing their screen, the resource viewer on the right
// is hidden entirely and the Jitsi stage view fills the full classroom
// width — same as Zoom / Teams when content is being shared.
const SCREEN_SHARE_LEFT_PERCENT = 100;
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

function formatSessionEndLabel(endMs, locale = "en") {
  if (!endMs) return "";

  const time = new Date(endMs).toLocaleTimeString(getIntlLocale(locale), {
    hour: "2-digit",
    minute: "2-digit",
  });

  return `Scheduled end ${time}`;
}

/* -----------------------------------------------------------
   MAIN COMPONENT
----------------------------------------------------------- */
function ClassroomTimeWarningClock({ startedAt, endAt, locale }) {
  const timing = useSessionTiming({ startedAt, endAt, locale });
  return (
    <ClassroomTimeWarning
      warningLevel={timing.warningLevel}
      remainingLabel={timing.remainingLabel}
    />
  );
}

// The leave dialog's summary includes a live clock; it only ticks while the
// dialog is open.
function ClassroomLeaveConfirm({
  show,
  startedAt,
  endAt,
  locale,
  participantLabel,
  resourceLabel,
  ...modalProps
}) {
  const timing = useSessionTiming({ startedAt, endAt, locale, enabled: show });
  const summary = useMemo(() => {
    const nowMs = Date.now();
    const overBySeconds =
      timing.endMs && nowMs > timing.endMs
        ? Math.floor((nowMs - timing.endMs) / 1000)
        : 0;

    let statusLabel = "No scheduled end";
    if (timing.endMs) {
      statusLabel = timing.hasEnded
        ? overBySeconds > 0
          ? `Over by ${formatCompactDuration(overBySeconds, locale)}`
          : "Time is up"
        : `Ends in ${timing.remainingLabel}`;
    }

    return {
      statusLabel,
      elapsedLabel: timing.elapsedLabel,
      scheduledLabel: timing.scheduledLabel || "Open-ended",
      participantLabel,
      resourceLabel,
      endLabel: formatSessionEndLabel(timing.endMs, locale),
    };
  }, [timing, locale, participantLabel, resourceLabel]);

  return <ClassroomLeaveConfirmModal show={show} summary={summary} {...modalProps} />;
}

export default function ClassroomShell({
  session,
  sessionId,
  tracks,
  locale = "en",
  prefix = "",
}) {
  const { user: authUser } = useAuth();
  const {
    teacherName,
    learnerName,
    isGroup,
    isTraining,
    learners,
    allLearnerNames,
    chatParticipants,
    participantCount,
    capacity,
  } = useMemo(() => getParticipantsFromSession(session), [session]);

  const isTeacher =
    session?.isTeacher === true ||
    session?.role === "teacher" ||
    session?.userType === "teacher" ||
    (session?.currentUser && session.currentUser.role === "teacher") ||
    (isTraining && session?.isAdmin === true);

  // Group sessions contain every learner, so the first learner in the API
  // response is not necessarily the person viewing this classroom. Resolve
  // the local identity from the authenticated account for all participant
  // labels, chat messages, lobby events, video, and private annotations.
  const authUserId = authUser?._id || authUser?.id || null;
  const showUnpaidTraining =
    authUser?.role === "teacher" ||
    (authUser?.role === "admin" && !authUser?._impersonating);
  const sessionUserId = session?.currentUser?._id || session?.currentUser?.id || null;
  const localUserId = authUserId || sessionUserId || null;
  const currentLearner = learners.find((learner) => {
    const learnerId = learner?._id || learner?.id || learner?.userId || null;
    return localUserId != null && learnerId != null && String(learnerId) === String(localUserId);
  });
  const currentLearnerName =
    buildDisplayName(currentLearner) ||
    (localUserId != null && !isTeacher ? buildDisplayName(authUser) : "") ||
    (isGroup ? "Learner" : learnerName);
  const userName = isTraining && session?.isAdmin === true
    ? buildDisplayName(authUser) || "Admin trainer"
    : isTeacher ? teacherName : currentLearnerName;
  const sessionStartedAt = session?.startedAt || session?.startAt;

  // The live clock is rendered by the header, time warning and leave dialog
  // themselves (useSessionTiming). The shell must not tick every second: that
  // re-rendered the whole classroom, including every open resource.

  /* -----------------------------------------------------------
     Resources
  ----------------------------------------------------------- */
  const { resourcesById: libraryResourcesById } = useMemo(
    () => buildResourceIndex(tracks || []),
    [tracks]
  );
  const [uploadedMaterials, setUploadedMaterials] = useState([]);
  const [maxPdfBytes, setMaxPdfBytes] = useState(25 * 1024 * 1024);
  const resourcesById = useMemo(() => {
    const uploadedById = Object.fromEntries(
      uploadedMaterials.map((material) => [material._id, material])
    );
    return { ...libraryResourcesById, ...uploadedById };
  }, [libraryResourcesById, uploadedMaterials]);

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
  const [openResourceIds, setOpenResourceIds] = useState(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(`classroom_tabs_${sessionId}`));
      return Array.isArray(saved) ? [...new Set(saved.filter((id) => typeof id === "string"))] : [];
    } catch { return []; }
  });
  const openResourceIdsRef = useRef(openResourceIds);
  const resourceSelectionVersionRef = useRef(0);
  const didInitializeResourceRef = useRef(false);
  const hasSavedTabsRef = useRef(false);
  useEffect(() => {
    try { hasSavedTabsRef.current = sessionStorage.getItem(`classroom_tabs_${sessionId}`) !== null; } catch { }
  }, [sessionId]);
  const updateOpenResources = useCallback((ids) => {
    const next = [...new Set(ids.filter((id) => typeof id === "string" && id))];
    openResourceIdsRef.current = next;
    setOpenResourceIds(next);
    try { sessionStorage.setItem(`classroom_tabs_${sessionId}`, JSON.stringify(next)); } catch { }
  }, [sessionId]);
  useEffect(() => {
    if (selectedResourceId && !openResourceIdsRef.current.includes(selectedResourceId)) {
      updateOpenResources([...openResourceIdsRef.current, selectedResourceId]);
    }
  }, [selectedResourceId, updateOpenResources]);
  const [isScreenShareActive, setIsScreenShareActive] = useState(false);
  const [jitsiSharing, setJitsiSharing] = useState(null);

  /* -----------------------------------------------------------
     Focus Mode & Layout State
  ----------------------------------------------------------- */
  const [focusMode, setFocusMode] = useState(FOCUS_MODES.BALANCED);
  const [customSplit, setCustomSplit] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef(null);
  const videoHostRef = useRef(null);
  const [videoHost, setVideoHost] = useState(null);
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

  // Chat defaults to closed. Incoming messages get a compact unread count and
  // a brief attention cue; opening chat clears the indicator on every layout.
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);

  // Portrait phones retain navigation tabs; the underlying call stays mounted.
  const [isMobile, setIsMobile] = useState(false);
  const [isCompactLandscape, setIsCompactLandscape] = useState(false);
  const [mobileActiveTab, setMobileActiveTab] = useState('video');
  useEffect(() => {
    const query = window.matchMedia('(max-width: 900px) and (orientation: portrait)');
    const compact = window.matchMedia('(max-width: 1366px) and (max-height: 600px) and (orientation: landscape) and (pointer: coarse)');
    const update = () => { setIsMobile(query.matches); setIsCompactLandscape(compact.matches); };
    update();
    query.addEventListener('change', update);
    compact.addEventListener('change', update);
    return () => { query.removeEventListener('change', update); compact.removeEventListener('change', update); };
  }, []);

  // Attach the portal host once. Reparenting a live iframe reloads the call.
  useEffect(() => {
    if (!videoHostRef.current) {
      videoHostRef.current = document.createElement('div');
      videoHostRef.current.className = 'cr-video-host';
    }
    setVideoHost(videoHostRef.current);
  }, []);

  // The target does not exist while the learner is waiting for admission.
  // Attach when that element actually mounts, including after admission or
  // a lobby retry. A host-only effect never reruns for those transitions.
  const attachVideoHost = useCallback((target) => {
    if (videoHost && target && videoHost.parentNode !== target) target.appendChild(videoHost);
  }, [videoHost]);

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
  const handleExportReady = useCallback((fn) => {
    exportFnRef.current = fn;
  }, []);
  const [isClassroomLocked, setIsClassroomLocked] = useState(() =>
    Boolean(session?.classroomState?.moderation?.locked)
  );
  const [moderationNotice, setModerationNotice] = useState("");
  const [videoModeration, setVideoModeration] = useState({
    ready: false,
    participants: [],
    localParticipantId: null,
    actions: null,
  });
  const [liveVideoParticipantCount, setLiveVideoParticipantCount] = useState(
    () => Math.max(1, Number(participantCount) || 1)
  );
  const [videoConnectionState, setVideoConnectionState] = useState("connecting");

  const handleVideoParticipantCountChange = useCallback((count) => {
    const nextCount = Math.max(0, Number(count) || 0);
    setLiveVideoParticipantCount(nextCount);
  }, []);

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
    userId: localUserId,
  });

  // A waiting learner's live-sync socket stops retrying once the server says
  // admission is required; reconnect as soon as they are admitted.
  const channelStatus = classroomChannel?.status;
  const retryChannel = classroomChannel?.retryNow;
  const lastAdmissionRetryRef = useRef(0);
  useEffect(() => {
    if (!lobby.isAdmitted || channelStatus !== "awaiting_admission") return undefined;
    // Never faster than every 5 s, in case the socket and REST views of the
    // lobby briefly disagree.
    const wait = Math.max(0, lastAdmissionRetryRef.current + 5000 - Date.now());
    const id = setTimeout(() => {
      lastAdmissionRetryRef.current = Date.now();
      retryChannel?.();
    }, wait);
    return () => clearTimeout(id);
  }, [lobby.isAdmitted, channelStatus, retryChannel]);

  const moderationDict = useMemo(() => getDictionary(locale, "classroom"), [locale]);
  const videoModerationControls = useClassroomVideoModeration({
    isTeacher,
    localUserId,
    sessionId,
    ready,
    send,
    subscribe,
    videoModeration,
    onRemoved: lobby.markRemoved,
  });

  /* -----------------------------------------------------------
     Late-Join Experience — show catch-up banner for learners
     who join after the session has started
  ----------------------------------------------------------- */
  const [showLateJoinBanner, setShowLateJoinBanner] = useState(false);
  const [lateJoinElapsedMinutes, setLateJoinElapsedMinutes] = useState(0);
  const [lateJoinMessages, setLateJoinMessages] = useState([]);
  const lateJoinCheckedRef = useRef(false);

  useEffect(() => {
    if (isTeacher || lateJoinCheckedRef.current) return;
    lateJoinCheckedRef.current = true;

    // Only show if session has started and learner is joining > 1 min late
    const joinTiming = getSessionTiming({
      startedAt: sessionStartedAt,
      endAt: session?.endAt,
      nowMs: Date.now(),
      locale,
    });
    const elapsedMin = Math.floor((joinTiming.elapsedSeconds || 0) / 60);
    if (!joinTiming.hasStarted || elapsedMin < 1) return;

    setLateJoinElapsedMinutes(elapsedMin);
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
  }, [isTeacher, sessionId, sessionStartedAt, session?.endAt, locale]);

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
  const [localVideoMuted, setLocalVideoMuted] = useState(false);
  const handleVideoMuteChange = useCallback((muted) => {
    setLocalVideoMuted(Boolean(muted));
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

  /* -----------------------------------------------------------
     Screen Sharing (cross-side state + UI gates)
  ----------------------------------------------------------- */
  const screenShare = useClassroomScreenShare(classroomChannel, {
    userName,
    userId: localUserId,
    isTeacher,
    isLocalSharing: isScreenShareActive,
    jitsiSharing,
  });

  const [showScreenShareConfirm, setShowScreenShareConfirm] = useState(false);

  const requestStartScreenShare = useCallback(() => {
    if (screenShare.isSomeoneSharing) return;
    if (!isTeacher && !screenShare.teacherAllowsScreenShare) return;
    setShowScreenShareConfirm(true);
  }, [
    screenShare.isSomeoneSharing,
    screenShare.teacherAllowsScreenShare,
    isTeacher,
  ]);

  const confirmStartScreenShare = useCallback(() => {
    setShowScreenShareConfirm(false);
    const action = videoModeration.actions?.startScreenShare;
    if (typeof action === "function") {
      action();
    }
  }, [videoModeration.actions]);

  const stopScreenShare = useCallback(() => {
    const action = videoModeration.actions?.stopScreenShare;
    if (typeof action === "function") {
      action();
    }
  }, [videoModeration.actions]);

  // Jitsi puts a presenter's screen on stage for viewers by itself, so the
  // classroom no longer pins anything; it only stops forcing tile view while
  // a remote presentation is active (see suspendTileViewLock below).

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
      localParticipantId: nextState?.localParticipantId || null,
      actions: nextState?.actions || null,
    });
  }, []);

  const applyModerationResult = useCallback((result) => {
    if (result?.message) setModerationNotice(result.message);
    return Boolean(result?.ok);
  }, []);

  const handleRemoveParticipant = useCallback(
    async (participantId, learnerUserId, learnerName) => {
      const who = learnerName || "this participant";
      if (
        typeof window !== "undefined" &&
        !window.confirm(`Remove ${who} from the lesson? They will need your admission to come back.`)
      ) {
        return false;
      }
      const result = await videoModerationControls.removeParticipant(participantId, learnerUserId);
      return applyModerationResult(result);
    },
    [videoModerationControls, applyModerationResult]
  );

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
        const selectionVersionAtLoad = resourceSelectionVersionRef.current;
        const [stateResult, materialsResult] = await Promise.all([
          api.get(`/sessions/${sessionId}/classroom-state`),
          api.get(`/sessions/${sessionId}/materials`).catch((error) => {
            console.warn("Failed to load classroom PDFs:", error);
            return { data: { materials: [] } };
          }),
        ]);
        if (cancelled) return;

        const materials = materialsResult.data?.materials || [];
        if (Number.isSafeInteger(materialsResult.data?.maxPdfBytes) && materialsResult.data.maxPdfBytes > 0) {
          setMaxPdfBytes(materialsResult.data.maxPdfBytes);
        }
        const selectionChanged = selectionVersionAtLoad !== resourceSelectionVersionRef.current;
        setUploadedMaterials((current) => selectionChanged
          ? [...new Map([...materials, ...current].map((item) => [item._id, item])).values()]
          : materials);
        const uploadedById = Object.fromEntries(materials.map((item) => [item._id, item]));
        if (!selectionChanged) {
          updateOpenResources(openResourceIdsRef.current.filter((id) => libraryResourcesById[id] || uploadedById[id]));
        }
        const state = stateResult.data?.state && typeof stateResult.data.state === "object"
          ? stateResult.data.state : {};
        setClassroomStateSnapshot(state);
        setIsClassroomLocked(Boolean(state.moderation?.locked));

        const savedResourceId = selectionChanged ? selectedResourceIdRef.current :
          state.resourceId && (libraryResourcesById[state.resourceId] || uploadedById[state.resourceId])
            ? state.resourceId
            : isTeacher
              ? ((libraryResourcesById[selectedResourceIdRef.current] || uploadedById[selectedResourceIdRef.current])
                ? selectedResourceIdRef.current
                : openResourceIdsRef.current[0] || null)
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
  }, [sessionId, libraryResourcesById, applyPersistedContentScroll, isTeacher, updateOpenResources]);

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
  // While someone else presents, viewers get the full-width stage, so the
  // divider is inert. The presenter keeps their normal lesson layout.
  const canResizePanels =
    !screenShare.isRemoteSharing && (isTeacher || !followTeacherLayout);

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

  const isChatVisible = isMobile
    ? mobileActiveTab === "chat"
    : isChatOpen;

  useEffect(() => {
    if (isChatVisible) setChatUnreadCount(0);
  }, [isChatVisible]);

  const getSplitPercentage = () => {
    // Viewers of a presentation get the full-width stage. The presenter keeps
    // their own layout so the lesson stays visible (and sharing this tab no
    // longer produces a mirror of the call).
    if (screenShare.isRemoteSharing) return SCREEN_SHARE_LEFT_PERCENT;

    if (customSplit !== null) return customSplit;

    if (isCompactLandscape) {
      // The video column also holds the header and controls on phones.
      return focusMode === FOCUS_MODES.CONTENT ? 24 : focusMode === FOCUS_MODES.VIDEO ? 50 : 30;
    }
    return getFocusModeSplitPercentage(focusMode);
  };

  const leftPanelWidth = getSplitPercentage();

  // The media surface adapts its framing to the live room shape. A group
  // session keeps the group treatment even while people are still joining;
  // the live count then updates the data attribute as Jitsi reports joins and
  // leaves so the video panel never feels like an empty fixed placeholder.
  const videoParticipantCount = Math.max(
    1,
    Number(liveVideoParticipantCount) || Number(participantCount) || 1
  );
  const videoLayoutClass = isGroup
    ? "cr-video-container--group"
    : videoParticipantCount > 1
      ? "cr-video-container--pair"
      : "cr-video-container--solo";

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


  // Teacher: broadcast layout (focusMode + customSplit + follow control).
  // Throttled to ~10/s with a trailing send, so the final position is never
  // skipped (the old throttle dropped changes made within 100 ms of the last).
  const layoutTrailingTimeoutRef = useRef(null);
  useEffect(() => () => {
    if (layoutTrailingTimeoutRef.current) clearTimeout(layoutTrailingTimeoutRef.current);
  }, []);
  useEffect(() => {
    if (!isTeacher) return;

    const wait = Math.max(0, lastLayoutSentAtRef.current + 100 - Date.now());
    if (layoutTrailingTimeoutRef.current) clearTimeout(layoutTrailingTimeoutRef.current);
    layoutRafPendingRef.current = true;

    layoutTrailingTimeoutRef.current = setTimeout(() => {
      layoutTrailingTimeoutRef.current = null;
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
    }, wait);
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
  }, [ready, isTeacher, send, persistClassroomState, selectedResourceId, isMobile]);

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
        resourceSelectionVersionRef.current += 1;
        const { resourceId } = msg;
        if (Array.isArray(msg.openResourceIds)) updateOpenResources(msg.openResourceIds);
        if (resourceId === null) {
          selectedResourceIdRef.current = null;
          setSelectedResourceId(null);
          try { sessionStorage.removeItem(`classroom_resource_${sessionId}`); } catch { }
        } else if (resourceId && resourcesById[resourceId]) {
          selectedResourceIdRef.current = resourceId;
          setSelectedResourceId(resourceId);
          if (typeof window !== "undefined") {
            try {
              sessionStorage.setItem(`classroom_resource_${sessionId}`, resourceId);
            } catch (_) { }
          }
        } else if (resourceId?.startsWith("upload-")) {
          selectedResourceIdRef.current = resourceId;
        }
        const incomingIds = Array.isArray(msg.openResourceIds) ? msg.openResourceIds : [resourceId];
        if (incomingIds.some((id) => typeof id === "string" && id.startsWith("upload-") && !resourcesById[id])) {
          // Resolve every open PDF for late joiners, including background tabs.
          // A delayed material response must not undo a more recent selection.
          void api.get(`/sessions/${sessionId}/materials`).then(({ data }) => {
            const materials = data?.materials || [];
            setUploadedMaterials(materials);
            if (selectedResourceIdRef.current === resourceId && materials.some((item) => item._id === resourceId)) {
              setSelectedResourceId(resourceId);
              try { sessionStorage.setItem(`classroom_resource_${sessionId}`, resourceId); } catch { }
            }
          }).catch((error) => console.warn("Failed to load classroom PDFs", error));
        }
      }

      if (
        msg.type === "REQUEST_RESOURCE" &&
        isTeacher
      ) {
        send({ type: "SET_RESOURCE", resourceId: selectedResourceIdRef.current, openResourceIds: openResourceIdsRef.current });
      }
    });

    return unsub;
  }, [
    ready,
    resourcesById,
    isTeacher,
    selectedResourceId,
    updateOpenResources,
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
    if (!isTeacher || !classroomStateLoaded || didInitializeResourceRef.current) return;
    if (selectedResourceId || openResourceIdsRef.current.length || hasSavedTabsRef.current) {
      didInitializeResourceRef.current = true;
      return;
    }
    didInitializeResourceRef.current = true;

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
  const leaveParticipantLabel = isTraining
    ? "admin trainer"
    : isGroup
    ? `${formatNumber(participantCount, locale)}${capacity ? `/${formatNumber(capacity, locale)}` : ""}`
    : participantCount === 1
      ? `${formatNumber(1, locale)} learner`
      : `${formatNumber(participantCount || 1, locale)} learners`;
  const leaveResourceLabel = resource?.title || resource?.name || "No resource selected";
  // ✅ Track resource usage when teacher changes resource
  const handleChangeResourceId = useCallback(async (newId, resourceOverride = null, tabsOverride = null) => {
    const nextTabs = tabsOverride || (newId ? [...openResourceIdsRef.current, newId] : openResourceIdsRef.current);
    updateOpenResources(nextTabs);
    const previousId = selectedResourceIdRef.current;
    resourceSelectionVersionRef.current += 1;
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


    if (ready && isTeacher) {
      send({ type: "SET_RESOURCE", resourceId: newId, openResourceIds: openResourceIdsRef.current });
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
    // Track resource usage (teacher only)
    if (isTeacher && newId && newId !== previousId && sessionId) {
      try {
        const resource = resourceOverride || resourcesById[newId];
        await api.post(`/sessions/${sessionId}/resources-used`, {
          resourceId: newId,
          resourceTitle: resource?.title || resource?.name || null,
          resourceSnapshot: buildReviewResourceSnapshot(resource),
        });
      } catch (err) {
        console.warn("Failed to track resource:", err);
      }
    }

  }, [isTeacher, resourcesById, ready, send, sessionId, persistClassroomState, updateOpenResources]);

  const handleCloseResource = useCallback((id) => {
    const current = openResourceIdsRef.current;
    const index = current.indexOf(id);
    const next = current.filter((resourceId) => resourceId !== id);
    const nextId = selectedResourceIdRef.current === id
      ? next[Math.min(index, next.length - 1)] || null
      : selectedResourceIdRef.current;
    void handleChangeResourceId(nextId, null, next);
  }, [handleChangeResourceId]);

  // Everything handed to the resource workspace must keep its identity
  // between renders, otherwise memo(PrepShell) re-renders every open PDF on
  // any classroom state change (chat, lobby, timers...).
  const openResources = useMemo(
    () => openResourceIds.map((id) => resourcesById[id]).filter(Boolean),
    [openResourceIds, resourcesById]
  );
  const viewersByResourceId = useMemo(() => {
    const viewers = new Map();
    for (const item of openResources) viewers.set(item._id, getViewerInfo(item));
    return viewers;
  }, [openResources]);
  const snapshotAudioKey = JSON.stringify(classroomStateSnapshot?.audio ?? null);
  const snapshotPdfScrollKey = JSON.stringify(classroomStateSnapshot?.pdfScroll ?? null);
  const initialAudioState = useMemo(
    () => (snapshotAudioKey === "null" ? null : JSON.parse(snapshotAudioKey)),
    [snapshotAudioKey]
  );
  const initialPdfScroll = useMemo(
    () => (snapshotPdfScrollKey === "null" ? null : JSON.parse(snapshotPdfScrollKey)),
    [snapshotPdfScrollKey]
  );
  const openPicker = useCallback(() => setIsPickerOpen(true), []);

  const renderResource = useCallback((item, active) => (
    <PrepShell resource={item} viewer={viewersByResourceId.get(item._id) || getViewerInfo(item)}
      isActive={active} hideSidebar hideBreadcrumbs
      classroomChannel={classroomChannel} isTeacher={isTeacher}
      sessionId={sessionId} locale={locale}
      initialAudioState={initialAudioState}
      initialPdfScroll={initialPdfScroll}
      onClassroomStateChange={persistClassroomState}
      onExportReady={active ? handleExportReady : undefined} />
  ), [
    viewersByResourceId,
    classroomChannel,
    isTeacher,
    sessionId,
    locale,
    initialAudioState,
    initialPdfScroll,
    persistClassroomState,
    handleExportReady,
  ]);

  const emptyResourceContent = useMemo(() => (
    <div className="cr-placeholder">
      <div className="cr-placeholder__icon"><BookOpen size={32} /></div>
      <h2 className="cr-placeholder__title">{locale === "ar" ? "لا توجد موارد مفتوحة" : "No resources open"}</h2>
      <p className="cr-placeholder__text">{isTeacher
        ? (locale === "ar" ? "اختر موردًا لبدء العمل." : "Choose a resource to start working.")
        : (locale === "ar" ? "في انتظار المعلم لفتح مورد." : "Waiting for the teacher to open a resource.")}</p>
      {isTeacher && <button className="cr-placeholder__action" onClick={openPicker}>
        <BookOpen size={16} /> {locale === "ar" ? "فتح مورد" : "Open resource"}
      </button>}
    </div>
  ), [isTeacher, locale, openPicker]);

  const resourceWorkspace = (
    <ClassroomResourceWorkspace
      resources={openResources}
      selectedResourceId={selectedResourceId}
      onSelect={handleChangeResourceId}
      onClose={handleCloseResource}
      onOpenPicker={openPicker}
      canManage={isTeacher}
      locale={locale}
      scrollContainerRef={contentScrollRef}
      emptyContent={emptyResourceContent}
      renderResource={renderResource}
    />
  );

  const handleUploadPdf = useCallback(async (file, onProgress) => {
    const form = new FormData();
    form.append("file", file);
    const { data } = await api.post(`/sessions/${sessionId}/materials`, form, {
      timeout: 180000,
      onUploadProgress: (event) => {
        if (event.total) onProgress?.(Math.round((event.loaded / event.total) * 100));
      },
    });
    const material = data?.material;
    if (!material?._id) throw new Error("The PDF was uploaded but could not be opened");
    setUploadedMaterials((current) => [...current, material]);
    await handleChangeResourceId(material._id, material);
  }, [sessionId, handleChangeResourceId]);

  const handleLocalScreenShareChange = useCallback((active) => {
    setIsScreenShareActive(Boolean(active));
  }, []);

  const handleContentSharingChange = useCallback((next) => {
    setJitsiSharing(next || null);
  }, []);

  /* -----------------------------------------------------------
   Page Recording (local download, teacher only)
----------------------------------------------------------- */
  const [isPageRecording, setIsPageRecording] = useState(false);
  const [pageRecError, setPageRecError] = useState(null);
  const [pageRecWarning, setPageRecWarning] = useState(null);

  useEffect(() => {
    if (!pageRecError) return;
    const t = setTimeout(() => setPageRecError(null), 6000);
    return () => clearTimeout(t);
  }, [pageRecError]);

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
  const typeLabel = isTraining
    ? showUnpaidTraining
      ? locale === "ar" ? "تدريب · بدون أجر" : "TRAINING · UNPAID"
      : locale === "ar" ? "تدريب" : "TRAINING"
    : isGroup ? "GROUP" : "1:1";
  const countLabel = isGroup
    ? `${formatNumber(participantCount, locale)}${capacity ? `/${formatNumber(capacity, locale)}` : ""}`
    : "";
  const sessionEnded =
    session?.status === "canceled";

  // ─── Waiting Room: block classroom until admitted ───
  if (sessionEnded || lobby.isInWaitingRoom || lobby.isDenied || lobby.isEnded) {
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
        locale={locale}
        status={
          sessionEnded || lobby.isEnded
            ? "ended"
            : lobby.isRemoved
              ? "removed"
              : lobby.isDenied
                ? "denied"
              : lobby.isError
                ? "error"
                : "waiting"
        }
        wsConnected={classroomChannel?.ready || false}
        onRetry={lobby.retryJoin}
        onLeave={() => {
          if (typeof window !== "undefined") {
            window.location.href = `${prefix}/dashboard`;
          }
        }}
      />
    );
  }

  const headerBar = (
    <ClassroomHeaderBar
      prefix={prefix}
      setShowLeaveConfirm={setShowLeaveConfirm}
      headerTitle={headerTitle}
      typeLabel={typeLabel}
      isGroup={isGroup}
      countLabel={countLabel}
      isTeacher={isTeacher}
      teacherName={teacherName}
      learnerName={isTeacher ? learnerName : userName}
      setShowParticipantList={setShowParticipantList}
      wsStatus={classroomChannel?.status}
      networkQuality={null}
      videoConnectionState={videoConnectionState}
      startedAt={sessionStartedAt}
      endAt={session?.endAt}
      locale={locale}
      compact={isCompactLandscape}
    />
  );

  const controlBar = (
    <ClassroomControlBar
      variant={isCompactLandscape ? "compact" : "full"}
      micMuted={localAudioMuted}
      cameraMuted={localVideoMuted}
      onToggleMic={() => runVideoModerationAction("toggleLocalAudio")}
      onToggleCamera={() => runVideoModerationAction("toggleLocalVideo")}
      isMobile={isMobile}
      isTeacher={isTeacher}
      setIsPickerOpen={setIsPickerOpen}
      isPageRecording={isPageRecording}
      pageRecError={pageRecError}
      clearPageRecError={() => setPageRecError(null)}
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
      screenShareIsLocalSharer={screenShare.isLocalSharer}
      screenShareIsRemoteSharing={screenShare.isRemoteSharing}
      screenShareBlockedByTeacher={
        !isTeacher && !screenShare.teacherAllowsScreenShare
      }
      onRequestStartScreenShare={requestStartScreenShare}
      onStopScreenShare={stopScreenShare}
      teacherAllowsScreenShare={screenShare.teacherAllowsScreenShare}
      onTeacherAllowsScreenShareChange={
        screenShare.setTeacherAllowsScreenShare
      }
    />
  );

  return (
    <div className={`cr-shell${isCompactLandscape ? " cr-shell--compact-landscape" : ""}`}>
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
          locale={locale}
        />
      )}

      {/* Header (phones in landscape show it above the video instead) */}
      {!isCompactLandscape && headerBar}

      <ClassroomConnectionBanner
        channel={classroomChannel}
        onRejoin={handleHardRejoin}
      />

      {!isTeacher && videoModerationControls.learnerNotice && (
        <div className="cr-moderation-notice" role="status">
          <span>
            {t(
              moderationDict,
              videoModerationControls.learnerNotice === "video"
                ? "classroom_moderation_camera_stopped"
                : "classroom_moderation_muted"
            )}
          </span>
          <button
            type="button"
            className="cr-moderation-notice__close"
            onClick={videoModerationControls.dismissLearnerNotice}
            aria-label={t(moderationDict, "classroom_moderation_dismiss")}
          >
            ×
          </button>
        </div>
      )}

      {isTeacher && (
        <ClassroomTimeWarningClock
          startedAt={sessionStartedAt}
          endAt={session?.endAt}
          locale={locale}
        />
      )}

      <ClassroomScreenShareBanner
        visible={screenShare.isSomeoneSharing}
        sharerName={screenShare.sharerName}
        isLocalSharer={screenShare.isLocalSharer}
        onStop={stopScreenShare}
      />

      <ClassroomScreenShareConfirmModal
        isOpen={showScreenShareConfirm}
        onConfirm={confirmStartScreenShare}
        onCancel={() => setShowScreenShareConfirm(false)}
      />

      {/* Late-Join Banner (learner only, when joining mid-session) */}
      {showLateJoinBanner && !isTeacher && (
        <ClassroomLateJoinBanner
          elapsedMinutes={lateJoinElapsedMinutes}
          currentResourceTitle={resource?.title || resource?.name || null}
          recentMessages={lateJoinMessages}
          onDismiss={() => setShowLateJoinBanner(false)}
          onOpenChat={() => setIsChatOpen(true)}
        />
      )}

      {/* Split classroom on desktop and in landscape. */}
      {(
        <div
          className={[
            "cr-main",
            isMobile ? `cr-main--portrait cr-main--portrait-${mobileActiveTab}` : "",
            isDragging ? "cr-main--dragging" : "",
            screenShare.isRemoteSharing ? "cr-main--screen-share" : "",
            isChatOpen ? "cr-main--chat-open" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          ref={containerRef}
        >
          {/* Left Panel: Video + Chat */}
          <aside
            className="cr-panel cr-panel--left"
            style={{ width: `${leftPanelWidth}%` }}
          >
            {isCompactLandscape && headerBar}
            <div
              className={`cr-video-container ${videoLayoutClass}`}
              data-session-type={isGroup ? "group" : "one-on-one"}
              data-participant-count={videoParticipantCount}
            >
              <div className="cr-video-target" ref={attachVideoHost} />
            </div>
            {isCompactLandscape && controlBar}

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
            <div className="cr-content-viewer" data-lenis-prevent>
              {resourceWorkspace}
            </div>
          </section>
        </div>
      )}

      {/* Desktop chat drawer: anchored to the chat control so opening the
          conversation never steals height from the video or lesson canvas. */}
      {(
        <aside
          id="classroom-chat-drawer"
          className={`cr-chat-drawer ${isMobile ? "cr-chat-drawer--portrait" : ""} ${(isMobile ? mobileActiveTab === "chat" : isChatOpen) ? "cr-chat-drawer--open" : ""}`}
          aria-hidden={isMobile ? mobileActiveTab !== "chat" : !isChatOpen}
          data-lenis-prevent
        >
          <div className="cr-chat-drawer__panel">
            <header className="cr-chat-drawer__header">
              <div className="cr-chat-drawer__title">
                <MessageSquare size={16} aria-hidden="true" />
                <span>Conversation</span>
              </div>
              <span className="cr-chat-drawer__context">
                {isGroup ? "Group thread" : "Private thread"}
              </span>
            </header>
            <ClassroomChat
              classroomChannel={classroomChannel}
              sessionId={sessionId}
              isTeacher={isTeacher}
              teacherName={teacherName}
              learnerName={isTeacher ? learnerName : userName}
              isOpen={isMobile ? mobileActiveTab === "chat" : isChatOpen}
              onUnreadCountChange={setChatUnreadCount}
              allLearnerNames={allLearnerNames}
              chatParticipants={chatParticipants}
              currentUserId={localUserId}
              isGroup={isGroup}
              locale={locale}
            />
          </div>
        </aside>
      )}

      {/* Full classroom controls in the split layout. */}
      {!isCompactLandscape && controlBar}

      {/* Tabbed layout for portrait phones and narrow tablets. */}
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
          chromeOnly
        />
      )}

      {videoHost && createPortal(
        <>
          <PrepVideoCall
            key="classroom-call"
            roomId={sessionId}
            userName={userName}
            isTeacher={isTeacher}
            isGroup={isGroup}
            onLocalScreenShareChange={handleLocalScreenShareChange}
            onContentSharingChange={handleContentSharingChange}
            onModerationStateChange={handleVideoModerationChange}
            onConnectionStateChange={setVideoConnectionState}
            onAudioMuteChange={handleAudioMuteChange}
            onVideoMuteChange={handleVideoMuteChange}
            onParticipantCountChange={handleVideoParticipantCountChange}
            suspendTileViewLock={screenShare.isRemoteSharing}
            locale={locale}
          />
          <ClassroomRaiseHandOverlay
            raisedHands={raisedHands}
            isTeacher={isTeacher}
            onLowerHand={lowerHand}
          />
          <ClassroomCaptionsOverlay captions={captions} />
        </>,
        videoHost,
        'classroom-video'
      )}

      <ClassroomResourcePickerModal
        isOpen={isPickerOpen}
        setIsPickerOpen={setIsPickerOpen}
        isTeacher={isTeacher}
        tracks={tracks}
        uploadedMaterials={uploadedMaterials}
        maxPdfBytes={maxPdfBytes}
        onUploadPdf={handleUploadPdf}
        canUploadPdf={session?.status === "scheduled" || session?.status === "completed"}
        selectedResourceId={selectedResourceId}
        handleChangeResourceId={handleChangeResourceId}
        sessionId={sessionId}
      />

      <ClassroomParticipantsModal
        show={showParticipantList}
        setShowParticipantList={setShowParticipantList}
        participantCount={participantCount}
        capacity={capacity}
        locale={locale}
        teacherName={teacherName}
        learners={learners}
        buildDisplayName={buildDisplayName}
        isTeacher={isTeacher}
        raisedHands={raisedHands}
        videoParticipants={videoModeration.participants}
        videoControlsReady={videoModeration.ready}
        isClassroomLocked={isClassroomLocked}
        moderationNotice={moderationNotice}
        onMuteAll={() => applyModerationResult(videoModerationControls.muteAll())}
        onStopAllVideo={() => applyModerationResult(videoModerationControls.stopAllVideo())}
        onMuteParticipant={(participantId, learnerUserId) =>
          applyModerationResult(
            videoModerationControls.muteParticipant(participantId, learnerUserId)
          )
        }
        onStopParticipantVideo={(participantId, learnerUserId) =>
          applyModerationResult(
            videoModerationControls.stopParticipantVideo(participantId, learnerUserId)
          )
        }
        onPinParticipant={(participantId) =>
          runVideoModerationAction("pinParticipant", participantId)
        }
        onRemoveParticipant={handleRemoveParticipant}
        onLowerHand={lowerHand}
        onToggleClassroomLock={handleToggleClassroomLock}
      />

      <ClassroomLeaveConfirm
        isTraining={isTraining}
        isAdmin={session?.isAdmin === true}
        show={showLeaveConfirm}
        setShowLeaveConfirm={setShowLeaveConfirm}
        prefix={prefix}
        sessionId={sessionId}
        isTeacher={isTeacher}
        startedAt={sessionStartedAt}
        endAt={session?.endAt}
        locale={locale}
        participantLabel={leaveParticipantLabel}
        resourceLabel={leaveResourceLabel}
      />
    </div>
  );
}
