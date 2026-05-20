// app/classroom/[sessionId]/ClassroomDeviceCheck.jsx
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Mic, Camera, Wifi, Check, X, Loader2 } from "lucide-react";

/* ─── localStorage keys ──────────────────────────────────────────────── */
const LS_AUDIO_DEVICE = "speexify-classroom-audioInput";
const LS_VIDEO_DEVICE = "speexify-classroom-videoInput";

/* ─── Device check statuses ──────────────────────────────────────────── */
const STATUS = { PENDING: "pending", CHECKING: "checking", OK: "ok", FAIL: "fail" };

/* ─── Preferred device helpers ───────────────────────────────────────── */
function savePreferredDevices(audioId, videoId) {
  try {
    if (audioId) localStorage.setItem(LS_AUDIO_DEVICE, audioId);
    if (videoId) localStorage.setItem(LS_VIDEO_DEVICE, videoId);
  } catch (_) {}
}

function getPreferredDevices() {
  try {
    return {
      audioId: localStorage.getItem(LS_AUDIO_DEVICE) || undefined,
      videoId: localStorage.getItem(LS_VIDEO_DEVICE) || undefined,
    };
  } catch (_) {
    return {};
  }
}

/* ─── Single check item ──────────────────────────────────────────────── */
function CheckItem({ icon: Icon, label, status, detail }) {
  return (
    <div className={`cr-device-check__item cr-device-check__item--${status}`}>
      <span className="cr-device-check__item-icon">
        {status === STATUS.CHECKING ? (
          <Loader2 size={18} className="cr-device-check__spinner" />
        ) : status === STATUS.OK ? (
          <Check size={18} />
        ) : status === STATUS.FAIL ? (
          <X size={18} />
        ) : (
          <Icon size={18} />
        )}
      </span>
      <span className="cr-device-check__item-label">{label}</span>
      {detail && (
        <span className="cr-device-check__item-detail">{detail}</span>
      )}
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────────────── */
export default function ClassroomDeviceCheck({ userName = "Learner", onReady }) {
  const [micStatus, setMicStatus] = useState(STATUS.PENDING);
  const [camStatus, setCamStatus] = useState(STATUS.PENDING);
  const [netStatus, setNetStatus] = useState(STATUS.PENDING);
  const [micDetail, setMicDetail] = useState("");
  const [camDetail, setCamDetail] = useState("");
  const [netDetail, setNetDetail] = useState("");
  const [allDone, setAllDone] = useState(false);
  const [entering, setEntering] = useState(false);
  const streamRef = useRef(null);
  const hasRun = useRef(false);

  const runChecks = useCallback(async () => {
    if (hasRun.current) return;
    hasRun.current = true;

    const prefs = getPreferredDevices();

    // ── Step 1: Mic ──
    await new Promise((r) => setTimeout(r, 400));
    setMicStatus(STATUS.CHECKING);

    try {
      const audioConstraints = prefs.audioId
        ? { deviceId: { ideal: prefs.audioId } }
        : true;

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints,
        video: false,
      });

      const audioTrack = stream.getAudioTracks()[0];
      const audioLabel = audioTrack?.label || "Microphone";
      setMicDetail(audioLabel);
      savePreferredDevices(audioTrack?.getSettings?.()?.deviceId, null);

      // Stop audio-only stream; we'll get a combined one for video
      stream.getTracks().forEach((t) => t.stop());
      setMicStatus(STATUS.OK);
    } catch (_) {
      setMicDetail("Permission denied or unavailable");
      setMicStatus(STATUS.FAIL);
    }

    // ── Step 2: Camera ──
    await new Promise((r) => setTimeout(r, 600));
    setCamStatus(STATUS.CHECKING);

    try {
      const videoConstraints = prefs.videoId
        ? { deviceId: { ideal: prefs.videoId } }
        : true;

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: videoConstraints,
      });

      const videoTrack = stream.getVideoTracks()[0];
      const videoLabel = videoTrack?.label || "Camera";
      setCamDetail(videoLabel);
      savePreferredDevices(null, videoTrack?.getSettings?.()?.deviceId);

      streamRef.current = stream;
      setCamStatus(STATUS.OK);
    } catch (_) {
      setCamDetail("Permission denied or unavailable");
      setCamStatus(STATUS.FAIL);
    }

    // ── Step 3: Network ──
    await new Promise((r) => setTimeout(r, 500));
    setNetStatus(STATUS.CHECKING);

    try {
      const start = performance.now();
      await fetch("/api/health", { method: "HEAD", cache: "no-store" }).catch(
        () => fetch("/", { method: "HEAD", cache: "no-store" })
      );
      const latency = Math.round(performance.now() - start);
      setNetDetail(
        latency < 100
          ? `Excellent · ${latency}ms`
          : latency < 250
            ? `Good · ${latency}ms`
            : `Fair · ${latency}ms`
      );
      setNetStatus(STATUS.OK);
    } catch (_) {
      setNetDetail("Could not reach server");
      setNetStatus(STATUS.FAIL);
    }

    // ── Done ──
    await new Promise((r) => setTimeout(r, 500));
    setAllDone(true);
  }, []);

  useEffect(() => {
    runChecks();

    return () => {
      // Cleanup camera stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [runChecks]);

  const handleEnter = useCallback(() => {
    // Stop camera preview before entering classroom
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setEntering(true);
    // Let the fade-out animation play, then call onReady
    setTimeout(() => onReady?.(), 500);
  }, [onReady]);

  // Auto-enter after a brief pause when all checks pass
  useEffect(() => {
    if (!allDone) return;
    const timeout = setTimeout(handleEnter, 1500);
    return () => clearTimeout(timeout);
  }, [allDone, handleEnter]);

  return (
    <div
      className={[
        "cr-device-check",
        entering ? "cr-device-check--exiting" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="cr-device-check__orbs" aria-hidden="true">
        <span className="cr-device-check__orb cr-device-check__orb--1" />
        <span className="cr-device-check__orb cr-device-check__orb--2" />
      </div>

      <div className="cr-device-check__card">
        <div className="cr-device-check__avatar">
          {(userName || "L").charAt(0).toUpperCase()}
        </div>

        <span className="cr-device-check__eyebrow">Welcome back</span>
        <h1 className="cr-device-check__title">{userName}</h1>
        <p className="cr-device-check__subtitle">
          {allDone
            ? "All set — entering classroom…"
            : "Let's check your devices"}
        </p>

        <div className="cr-device-check__list">
          <CheckItem
            icon={Mic}
            label="Microphone"
            status={micStatus}
            detail={micDetail}
          />
          <CheckItem
            icon={Camera}
            label="Camera"
            status={camStatus}
            detail={camDetail}
          />
          <CheckItem
            icon={Wifi}
            label="Network"
            status={netStatus}
            detail={netDetail}
          />
        </div>

        {allDone && (
          <button
            type="button"
            className="cr-device-check__enter"
            onClick={handleEnter}
          >
            Enter classroom
          </button>
        )}
      </div>
    </div>
  );
}
