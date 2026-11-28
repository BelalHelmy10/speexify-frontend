// app/resources/prep/PrepVideoCall.jsx
"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, RotateCw } from "lucide-react";
import { buildJitsiOptions, fetchClassroomVideoAccess } from "@/lib/jitsiConfig";
import { loadJitsiScript } from "@/lib/loadJitsiScript.mjs";
import { monitorClassroomConnection } from "@/lib/classroomConnectionMonitor.mjs";
import { normalizeContentSharingIds } from "@/lib/classroomScreenShare.mjs";
import api from "@/lib/api";
import { getDictionary, t } from "@/app/i18n";

// The Jitsi call lives in a cross-origin iframe (meet.speexify.com). Its
// document cannot be styled or inspected from here, so every layout decision
// goes through the documented iframe API (commands + events) only.

// Teachers always start with their microphone on. In a 1:1 lesson the learner
// does too, so lessons do not open with "can you hear me?". Group learners
// start muted so a room full of open microphones does not echo.
export function shouldStartAudioMuted({ isTeacher, isGroup }) {
  if (isTeacher) return false;
  return Boolean(isGroup);
}
const START_WITH_VIDEO_MUTED = false;

function PrepVideoCall({
  roomId,
  userName,
  isTeacher,
  isGroup = false,
  onLocalScreenShareChange,
  onContentSharingChange,
  onModerationStateChange,
  onConnectionStateChange,
  onAudioMuteChange,
  onVideoMuteChange,
  onParticipantCountChange,
  suspendTileViewLock = false,
  locale = "en",
}) {
  const containerRef = useRef(null);
  const apiRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [joinDelayed, setJoinDelayed] = useState(false);
  const [deviceNotice, setDeviceNotice] = useState(null);
  const [sessionAudioMuted, setSessionAudioMuted] = useState(true);
  const [sessionVideoMuted, setSessionVideoMuted] = useState(false);
  const [activeSpeakerName, setActiveSpeakerName] = useState("");
  const [remoteParticipantCount, setRemoteParticipantCount] = useState(0);

  const jitsiParticipantsRef = useRef(new Map());
  const localParticipantIdRef = useRef(null);
  const activeSpeakerIdRef = useRef(null);
  const contentSharingIdsRef = useRef([]);

  // Callbacks are read through refs so a parent re-render never rebuilds the
  // call or re-registers Jitsi listeners.
  const callbacksRef = useRef({});
  callbacksRef.current = {
    onLocalScreenShareChange,
    onContentSharingChange,
    onModerationStateChange,
    onConnectionStateChange,
    onAudioMuteChange,
    onVideoMuteChange,
    onParticipantCountChange,
  };
  const userNameRef = useRef(userName);
  userNameRef.current = userName;
  const isTeacherRef = useRef(isTeacher);
  isTeacherRef.current = isTeacher;

  const dict = getDictionary(locale, "classroom");

  const reportCallEvent = useCallback((event, details = {}) => {
    if (!roomId || typeof window === "undefined") return;
    const payload = {
      event,
      details,
      userAgent: window.navigator?.userAgent || "",
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio || 1,
      },
      online: window.navigator?.onLine !== false,
      visibility: document.visibilityState,
      occurredAt: new Date().toISOString(),
    };
    void api.post(`/sessions/${roomId}/classroom-event`, payload).catch(() => {
      // Telemetry is best-effort and must never prevent someone joining.
    });
  }, [roomId]);

  const executeJitsiCommand = useCallback((command, ...args) => {
    const current = apiRef.current;
    if (!current || typeof current.executeCommand !== "function") return false;
    try {
      current.executeCommand(command, ...args);
      return true;
    } catch (err) {
      console.warn(`Jitsi command failed: ${command}`, err);
      return false;
    }
  }, []);

  // ─────────────────────────────────────────────
  // Tile view
  //
  // The classroom shows everyone as equal tiles. Jitsi switches viewers to
  // stage view by itself when someone presents (verified with synthetic
  // callers), and the shell passes `suspendTileViewLock` while a remote share
  // is active. Resizing the panel does NOT re-issue layout commands: Jitsi
  // handles its own resizes, and re-forcing tile view on every resize caused
  // extra layout passes and quality-layer switches.
  // ─────────────────────────────────────────────
  const suspendTileViewLockRef = useRef(suspendTileViewLock);
  suspendTileViewLockRef.current = suspendTileViewLock;
  const forceTileTimeoutRef = useRef(null);

  const scheduleForceTileView = useCallback((delayMs = 150) => {
    if (forceTileTimeoutRef.current) clearTimeout(forceTileTimeoutRef.current);
    forceTileTimeoutRef.current = setTimeout(() => {
      forceTileTimeoutRef.current = null;
      if (suspendTileViewLockRef.current || contentSharingIdsRef.current.length) return;
      executeJitsiCommand("setTileView", true);
    }, Math.max(0, delayMs));
  }, [executeJitsiCommand]);

  useEffect(() => () => {
    if (forceTileTimeoutRef.current) clearTimeout(forceTileTimeoutRef.current);
  }, []);

  useEffect(() => {
    if (!apiRef.current) return;
    if (suspendTileViewLock) {
      executeJitsiCommand("setTileView", false);
    } else {
      scheduleForceTileView(0);
    }
  }, [suspendTileViewLock, executeJitsiCommand, scheduleForceTileView]);

  useEffect(() => {
    const cb = callbacksRef.current.onParticipantCountChange;
    if (typeof cb === "function") cb(Math.max(1, remoteParticipantCount + 1));
  }, [remoteParticipantCount]);

  useEffect(() => {
    const cb = callbacksRef.current.onAudioMuteChange;
    if (typeof cb === "function") cb(sessionAudioMuted);
  }, [sessionAudioMuted]);

  useEffect(() => {
    const cb = callbacksRef.current.onVideoMuteChange;
    if (typeof cb === "function") cb(sessionVideoMuted);
  }, [sessionVideoMuted]);

  // ─────────────────────────────────────────────
  // Participants, moderation and screen sharing
  // ─────────────────────────────────────────────
  const normalizeJitsiParticipant = useCallback((participant) => {
    if (!participant || typeof participant !== "object") return null;
    const id =
      participant.participantId ||
      participant.id ||
      participant.jid ||
      participant.endpointId ||
      null;
    if (!id || id === "local" || String(id) === localParticipantIdRef.current) return null;
    const displayName =
      participant.displayName ||
      participant.formattedDisplayName ||
      participant.displayname ||
      participant.name ||
      "Participant";
    return {
      id: String(id),
      displayName,
      avatarUrl: participant.avatarURL || participant.avatarUrl || "",
    };
  }, []);

  const publishContentSharing = useCallback(() => {
    const cb = callbacksRef.current.onContentSharingChange;
    if (typeof cb !== "function") return;
    const names = new Map();
    for (const [id, participant] of jitsiParticipantsRef.current) {
      names.set(id, participant.displayName);
    }
    cb({
      sharingIds: [...contentSharingIdsRef.current],
      localId: localParticipantIdRef.current,
      participants: names,
    });
  }, []);

  const publishModerationState = useCallback(() => {
    const cb = callbacksRef.current.onModerationStateChange;
    const current = apiRef.current;
    if (current && typeof current.getParticipantsInfo === "function") {
      try {
        for (const participant of current.getParticipantsInfo() || []) {
          const normalized = normalizeJitsiParticipant(participant);
          if (normalized) jitsiParticipantsRef.current.set(normalized.id, normalized);
        }
      } catch (err) {
        console.warn("Failed to read Jitsi participants", err);
      }
    }
    setRemoteParticipantCount(jitsiParticipantsRef.current.size);
    if (typeof cb !== "function") return;

    // Mutes this client's own mic/camera only if it is currently on
    // (toggleAudio/toggleVideo would otherwise turn it back on).
    const muteLocal = (media) => {
      const latest = apiRef.current;
      if (!latest) return false;
      const isMuted = media === "video" ? latest.isVideoMuted?.() : latest.isAudioMuted?.();
      const command = media === "video" ? "toggleVideo" : "toggleAudio";
      if (typeof isMuted?.then !== "function") return false;
      isMuted.then((muted) => {
        if (!muted) executeJitsiCommand(command);
      }).catch(() => { });
      return true;
    };

    cb({
      ready: Boolean(current),
      participants: Array.from(jitsiParticipantsRef.current.values()),
      localParticipantId: localParticipantIdRef.current || null,
      actions: {
        // Native Jitsi moderation; enforced by Jitsi only when this client
        // holds the moderator role (teacher JWT). The classroom channel
        // additionally asks each learner's client to comply.
        muteAll: () => executeJitsiCommand("muteEveryone", "audio"),
        stopAllVideo: () => executeJitsiCommand("muteEveryone", "video"),
        muteLocalAudio: () => muteLocal("audio"),
        muteLocalVideo: () => muteLocal("video"),
        // The compact phone layout has its own mic and camera buttons.
        toggleLocalAudio: () => executeJitsiCommand("toggleAudio"),
        toggleLocalVideo: () => executeJitsiCommand("toggleVideo"),
        hangup: () => executeJitsiCommand("hangup"),
        pinParticipant: (participantId) => executeJitsiCommand("pinParticipant", participantId),
        unpinParticipant: () => executeJitsiCommand("pinParticipant", ""),
        kickParticipant: (participantId) => executeJitsiCommand("kickParticipant", participantId),
        startScreenShare: () => executeJitsiCommand("toggleShareScreen"),
        stopScreenShare: () => executeJitsiCommand("toggleShareScreen"),
        setTileViewEnabled: (enabled) => executeJitsiCommand("setTileView", Boolean(enabled)),
      },
    });
  }, [executeJitsiCommand, normalizeJitsiParticipant]);

  const clearDominantSpeaker = useCallback(() => {
    activeSpeakerIdRef.current = null;
    setActiveSpeakerName("");
  }, []);

  const clearModerationState = useCallback(() => {
    jitsiParticipantsRef.current = new Map();
    localParticipantIdRef.current = null;
    contentSharingIdsRef.current = [];
    const cb = callbacksRef.current.onModerationStateChange;
    if (typeof cb === "function") cb({ ready: false, participants: [], actions: null });
    publishContentSharing();
    clearDominantSpeaker();
  }, [clearDominantSpeaker, publishContentSharing]);

  const getSpeakerDisplayName = useCallback((speakerId) => {
    if (!speakerId) return "";
    const id = String(speakerId);
    if (localParticipantIdRef.current && id === localParticipantIdRef.current) {
      return userNameRef.current || (isTeacherRef.current ? "Teacher" : "You");
    }
    return jitsiParticipantsRef.current.get(id)?.displayName || "Speaking";
  }, []);

  // Keep lesson renders from restarting the call; rebuild on explicit Retry.
  useEffect(() => {
    let cancelled = false;
    let joinTimer;
    let stopConnectionMonitor;
    let fatalConnectionFailure = false;
    const joinStartedAt = Date.now();
    const publishConnectionState = (state) => {
      if (!cancelled) callbacksRef.current.onConnectionStateChange?.(state);
    };
    const failConnection = (message, reason = "unknown", details = {}) => {
      if (cancelled) return;
      fatalConnectionFailure = !["media_transport_timeout", "network_offline"].includes(reason);
      window.clearTimeout(joinTimer);
      setIsLoading(false);
      setJoinDelayed(false);
      setError(message);
      publishConnectionState("failed");
      reportCallEvent("connection_failed", {
        reason,
        elapsedMs: Date.now() - joinStartedAt,
        ...details,
      });
    };

    async function init() {
      if (typeof window === "undefined") return;
      if (!roomId) return;
      if (!containerRef.current) return;

      setIsLoading(true);
      setError(null);
      publishConnectionState("connecting");
      setJoinDelayed(false);
      reportCallEvent("jitsi_initializing", { retryAttempt });
      joinTimer = window.setTimeout(() => {
        if (cancelled) return;
        // Permission prompts/lobby admission can legitimately take longer.
        // Keep the iframe usable and allow a later join to complete.
        setIsLoading(false);
        setJoinDelayed(true);
        setError(t(dict, "classroom_video_error_timeout"));
        reportCallEvent("join_delayed", {
          elapsedMs: Date.now() - joinStartedAt,
          retryAttempt,
        });
      }, 30000);

      let access;
      try {
        access = await fetchClassroomVideoAccess(api, roomId);
      } catch (accessErr) {
        if (cancelled) return;
        failConnection(
          t(dict, accessErr?.code === "classroom_locked" ? "classroom_video_error_locked" : "classroom_video_error_access"),
          "video_access_denied",
          { code: accessErr?.code, status: accessErr?.status }
        );
        return;
      }
      if (cancelled) return;

      try {
        await loadJitsiScript(access.domain);
        if (cancelled) return;

        const JitsiAPI = window.JitsiMeetExternalAPI;
        if (!JitsiAPI) throw new Error("JitsiMeetExternalAPI not available on window");

        const startWithAudioMuted = shouldStartAudioMuted({ isTeacher, isGroup });
        const options = buildJitsiOptions({
          roomId,
          roomName: access.roomName,
          jwt: access.jwt,
          userName: userNameRef.current,
          isTeacher: !!isTeacher,
          parentNode: containerRef.current,
          startWithAudioMuted,
          startWithVideoMuted: START_WITH_VIDEO_MUTED,
        });

        const jitsi = new JitsiAPI(access.domain, options);
        apiRef.current = jitsi;
        setSessionAudioMuted(startWithAudioMuted);
        setSessionVideoMuted(Boolean(START_WITH_VIDEO_MUTED));

        jitsi.addListener("videoConferenceJoined", (event) => {
          if (cancelled) return;
          window.clearTimeout(joinTimer);
          setIsLoading(false);
          setJoinDelayed(false);
          setError(null);
          try {
            const localId = event?.id || jitsi.getCurrentUserID?.();
            if (localId) localParticipantIdRef.current = String(localId);
          } catch {
            // Ignore local participant lookup failures.
          }
          // participantId is the Jitsi endpoint id; it links this classroom
          // user to the video-quality collector's per-participant summaries.
          reportCallEvent("conference_joined", {
            elapsedMs: Date.now() - joinStartedAt,
            retryAttempt,
            participantId: localParticipantIdRef.current || null,
          });
          const audioMutedPromise = jitsi.isAudioMuted?.();
          if (typeof audioMutedPromise?.then === "function") {
            audioMutedPromise.then((muted) => setSessionAudioMuted(Boolean(muted))).catch(() => { });
          }
          publishModerationState();
          // Jitsi needs a short beat after join before it accepts layout
          // commands cleanly.
          scheduleForceTileView(150);
          window.setTimeout(() => {
            if (!cancelled) scheduleForceTileView(0);
          }, 900);
        });

        stopConnectionMonitor = monitorClassroomConnection(jitsi, {
          onStateChange: (state) => {
            if (fatalConnectionFailure) return;
            publishConnectionState(state);
            if (state === "waiting") {
              setError(null);
              setJoinDelayed(false);
            }
          },
          onTransportReady: () => {
            if (cancelled || fatalConnectionFailure) return;
            setError(null);
            setJoinDelayed(false);
            setIsLoading(false);
          },
          onUnavailable: ({ reason }) => {
            if (fatalConnectionFailure) return;
            failConnection(t(dict, "classroom_video_error_media"), reason);
            // Preserve the iframe so a late ICE connection can still recover.
            setJoinDelayed(true);
          },
        });

        jitsi.addListener("audioMuteStatusChanged", (status) => {
          const muted = Boolean(status?.muted);
          setSessionAudioMuted(muted);
          if (!muted) setDeviceNotice((current) => (current?.kind === "audio" ? null : current));
        });

        jitsi.addListener("videoMuteStatusChanged", (status) => {
          setSessionVideoMuted(Boolean(status?.muted));
          if (status?.muted === false) {
            setDeviceNotice((current) => (current?.kind === "video" ? null : current));
          }
        });

        jitsi.addListener("participantJoined", (participant) => {
          const normalized = normalizeJitsiParticipant(participant);
          if (!normalized) return;
          jitsiParticipantsRef.current.set(normalized.id, normalized);
          publishModerationState();
          publishContentSharing();
        });

        jitsi.addListener("participantLeft", (participant) => {
          const id = participant?.participantId || participant?.id;
          if (!id) return;
          const normalizedId = String(id);
          jitsiParticipantsRef.current.delete(normalizedId);
          if (activeSpeakerIdRef.current === normalizedId) clearDominantSpeaker();
          publishModerationState();
          publishContentSharing();
        });

        jitsi.addListener("displayNameChange", (participant) => {
          const normalized = normalizeJitsiParticipant(participant);
          if (!normalized) return;
          jitsiParticipantsRef.current.set(normalized.id, normalized);
          if (activeSpeakerIdRef.current === normalized.id) {
            setActiveSpeakerName(getSpeakerDisplayName(normalized.id));
          }
          publishModerationState();
          publishContentSharing();
        });

        // Jitsi's own source of truth for presenters (local and remote).
        jitsi.addListener("contentSharingParticipantsChanged", (payload) => {
          contentSharingIdsRef.current = normalizeContentSharingIds(payload);
          publishContentSharing();
        });

        // If something other than a presentation flips us out of tile view
        // (a toolbar click, an internal Jitsi state change), snap back. The
        // delay lets the matching contentSharingParticipantsChanged event
        // arrive first: Jitsi emits the two within a few hundred ms.
        jitsi.addListener("tileViewChanged", (status) => {
          if (status && status.enabled === false) scheduleForceTileView(600);
        });

        jitsi.addListener("dominantSpeakerChanged", (payload) => {
          const speakerId = typeof payload === "string" ? payload : payload?.id || payload?.participantId || null;
          activeSpeakerIdRef.current = speakerId ? String(speakerId) : null;
          setActiveSpeakerName(getSpeakerDisplayName(speakerId));
        });

        jitsi.addListener("videoConferenceLeft", () => {
          failConnection(t(dict, "classroom_video_error_connection"), "conference_left");
        });
        jitsi.addListener("peerConnectionFailure", () => {
          failConnection(t(dict, "classroom_video_error_connection"), "peer_connection_failure");
        });
        jitsi.addListener("errorOccurred", (e) => {
          console.error("Jitsi error:", e);
          // Device/other recoverable errors must not cover a connected call.
          if (e?.isFatal === false) return;
          const name = e?.name || e?.error?.name;
          if (name === "conference.connectionError" || e?.type === "CONNECTION") {
            failConnection(t(dict, "classroom_video_error_connection"), "jitsi_connection_error", {
              name,
              type: e?.type || "",
            });
          } else if (e?.isFatal === true || e?.error) {
            failConnection(t(dict, "classroom_video_error_generic"), "jitsi_fatal_error", {
              name,
              type: e?.type || "",
            });
          }
        });

        jitsi.addListener("cameraError", (event) => {
          setDeviceNotice({ kind: "video", text: t(dict, "classroom_video_camera_unavailable") });
          reportCallEvent("camera_error", { name: event?.name || event?.type || "camera_error" });
        });
        jitsi.addListener("micError", (event) => {
          setDeviceNotice({ kind: "audio", text: t(dict, "classroom_video_mic_unavailable") });
          reportCallEvent("microphone_error", { name: event?.name || event?.type || "microphone_error" });
        });

        // The iframe API reports only on/off for the local share; media
        // streams never cross the iframe boundary.
        jitsi.addListener("screenSharingStatusChanged", (status) => {
          callbacksRef.current.onLocalScreenShareChange?.(Boolean(status?.on));
        });

        publishModerationState();
      } catch (err) {
        console.error("Failed to initialize Jitsi:", err);
        clearModerationState();
        if (!cancelled) {
          failConnection(t(dict, "classroom_video_error_generic"), "initialization_error", {
            name: err?.name || "Error",
            message: err?.message || "Jitsi initialization failed",
          });
        }
      }
    }

    init();

    // Reloading or closing the tab: leave the call properly, so the others
    // don't keep a leftover tile until the video server times it out.
    const leaveOnPageHide = (event) => {
      if (event.persisted) return;
      try {
        apiRef.current?.executeCommand?.("hangup");
      } catch {
        // The page is going away; nothing else to do.
      }
    };
    window.addEventListener("pagehide", leaveOnPageHide);

    return () => {
      window.removeEventListener("pagehide", leaveOnPageHide);
      cancelled = true;
      window.clearTimeout(joinTimer);
      stopConnectionMonitor?.();
      try {
        callbacksRef.current.onLocalScreenShareChange?.(false);
        apiRef.current?.dispose();
      } catch (e) {
        console.warn("Error disposing Jitsi API:", e);
      }
      apiRef.current = null;
      clearModerationState();
      setRemoteParticipantCount(0);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, retryAttempt]); // Retry rebuilds only the call, preserving lesson state.

  // Keep the external call identity in sync if auth data arrives after the
  // call starts. Group learners must remain labeled as their own account.
  useEffect(() => {
    if (!userName || !apiRef.current) return;
    executeJitsiCommand("displayName", userName);
  }, [userName, executeJitsiCommand]);

  return (
    <div
      className={[
        "cr-video",
        activeSpeakerName ? "cr-video--active-speaker" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {isLoading && !error && (
        <div className="cr-video__loading" role="status">
          <div className="cr-video__spinner" />
          <span>{t(dict, "classroom_video_connecting")}</span>
        </div>
      )}

      {error && (
        <div className={`cr-video__error${joinDelayed ? " cr-video__error--waiting" : ""}`} role="alert">
          <span className="cr-video__error-icon" aria-hidden="true">
            <AlertTriangle size={28} />
          </span>
          <p>{error}</p>
          <button
            type="button"
            className="cr-video__retry"
            onClick={() => setRetryAttempt((attempt) => attempt + 1)}
          >
            {t(dict, "classroom_video_retry")}
          </button>
        </div>
      )}

      {!isLoading && !error && (
        <button
          type="button"
          className="cr-video__reconnect"
          title={t(dict, "classroom_video_reconnect_hint")}
          aria-label={t(dict, "classroom_video_reconnect")}
          onClick={() => setRetryAttempt((attempt) => attempt + 1)}
        >
          <RotateCw size={14} aria-hidden="true" />
          <span className="cr-video__reconnect-label">{t(dict, "classroom_video_reconnect")}</span>
        </button>
      )}

      <div
        ref={containerRef}
        className="cr-video__frame"
        style={{
          width: "100%",
          height: "100%",
          opacity: error && !joinDelayed ? 0.2 : 1,
          transition: "opacity 0.3s ease",
        }}
      />

      {deviceNotice && !error && <div className="cr-video__device-notice" role="status">{deviceNotice.text}</div>}

      {activeSpeakerName && (
        <div className="cr-video__speaker-indicator" aria-live="polite">
          <span className="cr-video__speaker-dot" aria-hidden="true" />
          <span>Speaking: {activeSpeakerName}</span>
        </div>
      )}
    </div>
  );
}

export default memo(PrepVideoCall);
