"use client";

// Classroom screen sharing, browser to browser.
//
// The presenter captures their screen in this page (not inside the Jitsi
// call), so the share can be shown in the classroom's content panel while
// the video column stays as it is. Each viewer gets its own WebRTC
// connection from the presenter; the classroom socket carries the setup.
//
//   presenter                         viewer
//   SCREEN_RTC_START (everyone)  ──▶
//                                ◀──  SCREEN_RTC_REQUEST (to presenter)
//   SCREEN_RTC_OFFER (to viewer) ──▶
//                                ◀──  SCREEN_RTC_ANSWER (to presenter)
//   SCREEN_RTC_CANDIDATE (both ways, as each network route is found)
//   SCREEN_RTC_STOP (everyone)   ──▶
//
// Late joiners send SCREEN_RTC_HELLO and the presenter announces again.
// The server stamps every event with the authenticated sender (`_from`) and
// delivers the targeted ones only to their recipient.
import { useCallback, useEffect, useRef, useState } from "react";
import api from "@/lib/api";
import { createIceServerCache } from "@/lib/iceServerCache.mjs";

const OFFER_TIMEOUT_MS = 8000;
const CONNECT_TIMEOUT_MS = 20000;
const MAX_ATTEMPTS = 4;
// Screen text stays sharp at a low frame rate; this keeps each viewer's
// stream light enough for small groups on home connections.
const VIDEO_MAX_BITRATE = 1_500_000;
const PRIVILEGED = new Set(["teacher", "admin"]);

function newId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

// Sends each network route ("ICE candidate") as soon as the browser finds
// it, so a slow relay route still arrives. Routes found before the offer or
// answer has gone out wait until it has, keeping them in order.
function trickleCandidates(pc, sendCandidate) {
  const held = [];
  let open = false;
  pc.onicecandidate = (event) => {
    if (!event.candidate) return;
    const candidate = typeof event.candidate.toJSON === "function" ? event.candidate.toJSON() : event.candidate;
    if (open) sendCandidate(candidate);
    else held.push(candidate);
  };
  return () => {
    open = true;
    held.splice(0).forEach(sendCandidate);
  };
}

// Routes can arrive before the other side's offer/answer has been applied;
// keep them until it has.
async function addRemoteCandidate(pc, pending, candidate) {
  if (!pc || !pc.remoteDescription) {
    pending.push(candidate);
    return;
  }
  try {
    await pc.addIceCandidate(candidate);
  } catch (err) {
    console.warn("Screen share route rejected", err);
  }
}

async function flushRemoteCandidates(pc, pending) {
  for (const candidate of pending.splice(0)) {
    try {
      await pc.addIceCandidate(candidate);
    } catch (err) {
      console.warn("Screen share route rejected", err);
    }
  }
}

const sameUser = (a, b) => a != null && b != null && String(a) === String(b);

export default function useClassroomScreenStream({
  channel,
  sessionId,
  userId,
  userName = "",
  isTeacher = false,
  allowLearners = true,
} = {}) {
  const ready = Boolean(channel?.ready);
  const send = channel?.send;
  const subscribe = channel?.subscribe;

  const [localStream, setLocalStream] = useState(null);
  const [remote, setRemote] = useState(null); // { shareId, userId, name, role, peer }
  const [remoteStream, setRemoteStream] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | live | connecting | failed
  const [viewerCount, setViewerCount] = useState(0);
  const [startError, setStartError] = useState(null);

  const peerIdRef = useRef(newId());
  const localRef = useRef(null); // { shareId, stream }
  const presenterPcsRef = useRef(new Map()); // `${userId}:${peer}` -> pc
  const remoteRef = useRef(null);
  const viewerPcRef = useRef(null);
  const attemptRef = useRef(0);
  const timersRef = useRef({ offer: null, connect: null });
  // Routes from the presenter that arrived before this viewer's connection.
  const viewerPendingRef = useRef([]);
  // Per viewer, routes that arrived before their answer was applied.
  const presenterPendingRef = useRef(new Map());
  const live = useRef({});
  live.current = { send, userId, userName, isTeacher, allowLearners, sessionId };

  const emit = useCallback((event) => {
    live.current.send?.({ ...event, at: Date.now() });
  }, []);

  const iceCacheRef = useRef(null);
  if (!iceCacheRef.current) {
    iceCacheRef.current = createIceServerCache({
      load: async () =>
        (await api.get(`/sessions/${encodeURIComponent(live.current.sessionId)}/screen-share/ice`)).data,
    });
  }
  const iceServers = useCallback(() => iceCacheRef.current.get(), []);

  const countViewers = useCallback(() => {
    const connected = [...presenterPcsRef.current.values()].filter((pc) => pc.connectionState === "connected").length;
    setViewerCount(connected);
  }, []);

  // ── Viewer side ──────────────────────────────────────────────

  const clearTimers = useCallback(() => {
    clearTimeout(timersRef.current.offer);
    clearTimeout(timersRef.current.connect);
    timersRef.current = { offer: null, connect: null };
  }, []);

  const closeViewerPc = useCallback(() => {
    const pc = viewerPcRef.current;
    viewerPcRef.current = null;
    if (pc) {
      pc.ontrack = null;
      pc.onicecandidate = null;
      pc.onconnectionstatechange = null;
      pc.close();
    }
  }, []);

  const endRemote = useCallback(() => {
    clearTimers();
    closeViewerPc();
    remoteRef.current = null;
    attemptRef.current = 0;
    setRemote(null);
    setRemoteStream(null);
    if (!localRef.current) setStatus("idle");
  }, [clearTimers, closeViewerPc]);

  const requestOffer = useCallback(() => {
    const share = remoteRef.current;
    if (!share) return;
    clearTimers();
    closeViewerPc();
    viewerPendingRef.current = [];
    attemptRef.current += 1;
    setStatus("connecting");
    emit({ type: "SCREEN_RTC_REQUEST", to: share.userId, shareId: share.shareId, peer: peerIdRef.current });
    // No offer at all means the presenter is gone: the share has ended.
    timersRef.current.offer = setTimeout(() => {
      if (remoteRef.current?.shareId !== share.shareId) return;
      if (attemptRef.current < MAX_ATTEMPTS) requestOffer();
      else endRemote();
    }, OFFER_TIMEOUT_MS);
  }, [clearTimers, closeViewerPc, emit, endRemote]);

  const handleOffer = useCallback(
    async (msg) => {
      const share = remoteRef.current;
      if (!share || msg.shareId !== share.shareId || !sameUser(msg._from?.userId, share.userId)) return;
      clearTimeout(timersRef.current.offer);
      closeViewerPc();
      const pc = new RTCPeerConnection({ iceServers: await iceServers() });
      viewerPcRef.current = pc;
      const releaseCandidates = trickleCandidates(pc, (candidate) => {
        if (viewerPcRef.current !== pc) return;
        emit({
          type: "SCREEN_RTC_CANDIDATE",
          to: share.userId,
          toPeer: msg.peer,
          peer: peerIdRef.current,
          shareId: share.shareId,
          candidate,
        });
      });
      const stream = new MediaStream();
      pc.ontrack = (event) => {
        if (!stream.getTracks().includes(event.track)) stream.addTrack(event.track);
        setRemoteStream(new MediaStream(stream.getTracks()));
      };
      pc.onconnectionstatechange = () => {
        if (viewerPcRef.current !== pc) return;
        if (pc.connectionState === "connected") {
          clearTimeout(timersRef.current.connect);
          attemptRef.current = 0;
          setStatus("live");
        } else if (pc.connectionState === "failed") {
          clearTimeout(timersRef.current.connect);
          if (attemptRef.current < MAX_ATTEMPTS) requestOffer();
          else setStatus("failed");
        }
      };
      try {
        await pc.setRemoteDescription({ type: "offer", sdp: msg.sdp });
        await flushRemoteCandidates(pc, viewerPendingRef.current);
        await pc.setLocalDescription(await pc.createAnswer());
        if (viewerPcRef.current !== pc) return;
        emit({
          type: "SCREEN_RTC_ANSWER",
          to: share.userId,
          toPeer: msg.peer,
          peer: peerIdRef.current,
          shareId: share.shareId,
          sdp: pc.localDescription.sdp,
        });
        releaseCandidates();
        timersRef.current.connect = setTimeout(() => {
          if (viewerPcRef.current !== pc || pc.connectionState === "connected") return;
          if (attemptRef.current < MAX_ATTEMPTS) requestOffer();
          else setStatus("failed");
        }, CONNECT_TIMEOUT_MS);
      } catch (err) {
        console.warn("Screen share answer failed", err);
        if (viewerPcRef.current === pc) setStatus("failed");
      }
    },
    [closeViewerPc, emit, iceServers, requestOffer]
  );

  const handleStart = useCallback(
    (msg) => {
      const from = msg._from;
      if (!from?.userId || sameUser(from.userId, live.current.userId)) return;
      const role = String(from.role || "learner");
      // A learner may only present while the teacher allows it.
      if (!PRIVILEGED.has(role) && !live.current.allowLearners) return;
      // The teacher's share takes over from a learner's.
      if (localRef.current) {
        if (PRIVILEGED.has(role) && !live.current.isTeacher) stopRef.current?.();
        else return;
      }
      const current = remoteRef.current;
      if (current?.shareId === msg.shareId && viewerPcRef.current?.connectionState === "connected") return;
      const share = {
        shareId: msg.shareId,
        userId: from.userId,
        role,
        name: typeof msg.name === "string" ? msg.name.slice(0, 120) : "",
        peer: msg.peer,
      };
      remoteRef.current = share;
      attemptRef.current = 0;
      setRemote(share);
      setRemoteStream(null);
      requestOffer();
    },
    [requestOffer]
  );

  // ── Presenter side ───────────────────────────────────────────

  const handleRequest = useCallback(
    async (msg) => {
      const local = localRef.current;
      const from = msg._from;
      if (!local || msg.shareId !== local.shareId || !from?.userId || !msg.peer) return;
      const key = `${from.userId}:${msg.peer}`;
      presenterPcsRef.current.get(key)?.close();
      presenterPendingRef.current.set(key, []);
      const pc = new RTCPeerConnection({ iceServers: await iceServers() });
      presenterPcsRef.current.set(key, pc);
      const releaseCandidates = trickleCandidates(pc, (candidate) => {
        if (presenterPcsRef.current.get(key) !== pc) return;
        emit({
          type: "SCREEN_RTC_CANDIDATE",
          to: from.userId,
          toPeer: msg.peer,
          peer: peerIdRef.current,
          shareId: local.shareId,
          candidate,
        });
      });
      local.stream.getTracks().forEach((track) => pc.addTrack(track, local.stream));
      pc.onconnectionstatechange = () => {
        if (["failed", "closed"].includes(pc.connectionState) && presenterPcsRef.current.get(key) === pc) {
          presenterPcsRef.current.delete(key);
          pc.close();
        }
        countViewers();
      };
      try {
        await pc.setLocalDescription(await pc.createOffer());
        // Keep text readable: hold resolution and cap the bitrate per viewer.
        for (const sender of pc.getSenders()) {
          if (sender.track?.kind !== "video") continue;
          const params = sender.getParameters();
          params.degradationPreference = "maintain-resolution";
          params.encodings = (params.encodings?.length ? params.encodings : [{}]).map((encoding) => ({
            ...encoding,
            maxBitrate: VIDEO_MAX_BITRATE,
          }));
          await sender.setParameters(params).catch(() => {});
        }
        if (presenterPcsRef.current.get(key) !== pc || localRef.current !== local) return;
        emit({
          type: "SCREEN_RTC_OFFER",
          to: from.userId,
          toPeer: msg.peer,
          peer: peerIdRef.current,
          shareId: local.shareId,
          sdp: pc.localDescription.sdp,
        });
        releaseCandidates();
      } catch (err) {
        console.warn("Screen share offer failed", err);
        presenterPcsRef.current.delete(key);
        pc.close();
      }
    },
    [countViewers, emit, iceServers]
  );

  const handleAnswer = useCallback(async (msg) => {
    const local = localRef.current;
    const from = msg._from;
    if (!local || msg.shareId !== local.shareId || !from?.userId) return;
    const key = `${from.userId}:${msg.peer}`;
    const pc = presenterPcsRef.current.get(key);
    if (!pc || pc.signalingState !== "have-local-offer") return;
    try {
      await pc.setRemoteDescription({ type: "answer", sdp: msg.sdp });
      await flushRemoteCandidates(pc, presenterPendingRef.current.get(key) || []);
    } catch (err) {
      console.warn("Screen share answer rejected", err);
    }
  }, []);

  const handleCandidate = useCallback(async (msg) => {
    const from = msg._from;
    if (!from?.userId || !msg.candidate) return;
    // From the presenter we are watching.
    const share = remoteRef.current;
    if (share && msg.shareId === share.shareId && sameUser(from.userId, share.userId)) {
      await addRemoteCandidate(viewerPcRef.current, viewerPendingRef.current, msg.candidate);
      return;
    }
    // From one of our viewers.
    const local = localRef.current;
    if (local && msg.shareId === local.shareId) {
      const key = `${from.userId}:${msg.peer}`;
      const pending = presenterPendingRef.current.get(key);
      if (!pending) return;
      await addRemoteCandidate(presenterPcsRef.current.get(key), pending, msg.candidate);
    }
  }, []);

  const stop = useCallback(() => {
    const local = localRef.current;
    if (!local) return;
    localRef.current = null;
    for (const pc of presenterPcsRef.current.values()) pc.close();
    presenterPcsRef.current.clear();
    presenterPendingRef.current.clear();
    local.stream.getTracks().forEach((track) => track.stop());
    setLocalStream(null);
    setViewerCount(0);
    setStatus(remoteRef.current ? "connecting" : "idle");
    emit({ type: "SCREEN_RTC_STOP", shareId: local.shareId, peer: peerIdRef.current });
  }, [emit]);
  const stopRef = useRef(stop);
  stopRef.current = stop;

  const start = useCallback(async () => {
    if (localRef.current) return { ok: true };
    setStartError(null);
    const mediaDevices = typeof navigator !== "undefined" ? navigator.mediaDevices : null;
    if (!mediaDevices?.getDisplayMedia) {
      setStartError("unsupported");
      return { ok: false, reason: "unsupported" };
    }
    let stream;
    try {
      stream = await mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: 15, max: 30 }, width: { max: 1920 }, height: { max: 1080 } },
        audio: true,
        // Never offer this classroom tab: sharing it shows a mirror of the call.
        selfBrowserSurface: "exclude",
        surfaceSwitching: "include",
        systemAudio: "include",
      });
    } catch (err) {
      // Closing the browser's picker is not an error.
      const cancelled = err?.name === "NotAllowedError" || err?.name === "AbortError";
      if (!cancelled) setStartError("failed");
      return { ok: false, reason: cancelled ? "cancelled" : "failed" };
    }
    const [videoTrack] = stream.getVideoTracks();
    if (videoTrack && "contentHint" in videoTrack) videoTrack.contentHint = "detail";
    // The browser's own "Stop sharing" bar ends the track.
    videoTrack?.addEventListener("ended", () => stopRef.current?.());

    // Starting a share ends watching someone else's.
    if (remoteRef.current) endRemote();
    const shareId = newId();
    localRef.current = { shareId, stream };
    setLocalStream(stream);
    setStatus("live");
    emit({
      type: "SCREEN_RTC_START",
      shareId,
      peer: peerIdRef.current,
      name: live.current.userName,
    });
    return { ok: true };
  }, [emit, endRemote]);

  const retry = useCallback(() => {
    if (!remoteRef.current) return;
    attemptRef.current = 0;
    requestOffer();
  }, [requestOffer]);

  // The teacher can stop a learner's share.
  const stopRemote = useCallback(() => {
    const share = remoteRef.current;
    if (!share || !live.current.isTeacher) return;
    emit({ type: "SCREEN_RTC_STOP_REQUEST", to: share.userId, shareId: share.shareId });
  }, [emit]);

  // ── Messages ─────────────────────────────────────────────────

  useEffect(() => {
    if (!ready || typeof subscribe !== "function") return undefined;
    return subscribe((msg) => {
      if (!msg || typeof msg.type !== "string" || !msg.type.startsWith("SCREEN_RTC_")) return;
      const forMe = msg.to == null || sameUser(msg.to, live.current.userId);
      const forThisTab = !msg.toPeer || msg.toPeer === peerIdRef.current;
      if (!forMe || !forThisTab) return;

      switch (msg.type) {
        case "SCREEN_RTC_START":
          handleStart(msg);
          break;
        case "SCREEN_RTC_STOP":
          if (remoteRef.current?.shareId === msg.shareId && sameUser(msg._from?.userId, remoteRef.current.userId)) {
            endRemote();
          }
          break;
        case "SCREEN_RTC_HELLO":
          if (localRef.current) {
            emit({
              type: "SCREEN_RTC_START",
              shareId: localRef.current.shareId,
              peer: peerIdRef.current,
              name: live.current.userName,
            });
          }
          break;
        case "SCREEN_RTC_REQUEST":
          void handleRequest(msg);
          break;
        case "SCREEN_RTC_OFFER":
          void handleOffer(msg);
          break;
        case "SCREEN_RTC_ANSWER":
          void handleAnswer(msg);
          break;
        case "SCREEN_RTC_CANDIDATE":
          void handleCandidate(msg);
          break;
        case "SCREEN_RTC_STOP_REQUEST":
          if (PRIVILEGED.has(String(msg._from?.role || "")) && localRef.current?.shareId === msg.shareId) {
            stopRef.current?.();
          }
          break;
        default:
          break;
      }
    });
  }, [ready, subscribe, emit, endRemote, handleAnswer, handleCandidate, handleOffer, handleRequest, handleStart]);

  // On (re)connecting: a presenter announces again; others ask what's on.
  useEffect(() => {
    if (!ready) return;
    if (localRef.current) {
      emit({
        type: "SCREEN_RTC_START",
        shareId: localRef.current.shareId,
        peer: peerIdRef.current,
        name: live.current.userName,
      });
    } else {
      emit({ type: "SCREEN_RTC_HELLO", peer: peerIdRef.current });
    }
  }, [ready, emit]);

  // A learner's share ends for everyone if the teacher turns sharing off.
  useEffect(() => {
    if (allowLearners) return;
    if (remoteRef.current && !PRIVILEGED.has(remoteRef.current.role)) endRemote();
    if (localRef.current && !isTeacher) stopRef.current?.();
  }, [allowLearners, endRemote, isTeacher]);

  // Leaving the classroom ends the share.
  useEffect(
    () => () => {
      stopRef.current?.();
      clearTimeout(timersRef.current.offer);
      clearTimeout(timersRef.current.connect);
      viewerPcRef.current?.close();
    },
    []
  );

  return {
    isLocal: Boolean(localStream),
    remote,
    localStream,
    remoteStream,
    status,
    viewerCount,
    startError,
    start,
    stop,
    stopRemote,
    retry,
  };
}
