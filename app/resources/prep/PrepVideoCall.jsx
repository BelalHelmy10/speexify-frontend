// app/resources/prep/PrepVideoCall.jsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { JITSI_DOMAIN, buildJitsiOptions } from "@/lib/jitsiConfig";
import { getDictionary, t } from "@/app/i18n";
import {
  Camera,
  CameraOff,
  Mic,
  MicOff,
  Play,
  RefreshCw,
  Volume2,
  Wifi,
} from "lucide-react";

export default function PrepVideoCall({
  roomId,
  userName,
  isTeacher,
  onScreenShareStreamChange,
  locale = "en",
}) {
  const containerRef = useRef(null);
  const apiRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasJoined, setHasJoined] = useState(true);
  const [joinAudioMuted, setJoinAudioMuted] = useState(true);
  const [joinVideoMuted, setJoinVideoMuted] = useState(false);
  const [prejoinError, setPrejoinError] = useState(null);
  const [devices, setDevices] = useState({
    audioInputs: [],
    videoInputs: [],
    audioOutputs: [],
  });
  const [selectedAudioInputId, setSelectedAudioInputId] = useState("");
  const [selectedVideoInputId, setSelectedVideoInputId] = useState("");
  const [selectedAudioOutputId, setSelectedAudioOutputId] = useState("");
  const [micLevel, setMicLevel] = useState(0);
  const [sessionAudioMuted, setSessionAudioMuted] = useState(true);
  const [micMonitorUnavailable, setMicMonitorUnavailable] = useState(false);
  const [networkStatus, setNetworkStatus] = useState({
    state: "checking",
    label: "Checking network",
    detail: "Measuring connection quality...",
    latency: null,
  });
  const [isTestingSpeaker, setIsTestingSpeaker] = useState(false);
  const previewVideoRef = useRef(null);
  const previewStreamRef = useRef(null);
  const micAudioContextRef = useRef(null);
  const micMeterRafRef = useRef(null);
  const speakerTestRef = useRef(null);
  const speakerTestTimeoutRef = useRef(null);

  // ─────────────────────────────────────────────
  // Page recording is handled by ClassroomShell
  // (which mixes mic + display audio via Web Audio API)
  // ─────────────────────────────────────────────


  const dict = getDictionary(locale, "classroom");

  const stopMicMeter = useCallback(() => {
    if (micMeterRafRef.current) {
      cancelAnimationFrame(micMeterRafRef.current);
      micMeterRafRef.current = null;
    }

    if (micAudioContextRef.current) {
      micAudioContextRef.current.close().catch(() => { });
      micAudioContextRef.current = null;
    }

    setMicLevel(0);
  }, []);

  const stopPreviewStream = useCallback(() => {
    stopMicMeter();

    if (previewVideoRef.current) {
      previewVideoRef.current.srcObject = null;
    }

    previewStreamRef.current?.getTracks().forEach((track) => track.stop());
    previewStreamRef.current = null;
  }, [stopMicMeter]);

  const refreshDevices = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices) return;

    const allDevices = await navigator.mediaDevices.enumerateDevices();
    const nextDevices = {
      audioInputs: allDevices.filter((device) => device.kind === "audioinput"),
      videoInputs: allDevices.filter((device) => device.kind === "videoinput"),
      audioOutputs: allDevices.filter((device) => device.kind === "audiooutput"),
    };

    setDevices(nextDevices);
    setSelectedAudioInputId((current) =>
      current || nextDevices.audioInputs[0]?.deviceId || ""
    );
    setSelectedVideoInputId((current) =>
      current || nextDevices.videoInputs[0]?.deviceId || ""
    );
    setSelectedAudioOutputId((current) =>
      current || nextDevices.audioOutputs[0]?.deviceId || ""
    );
  }, []);

  const startMicMeter = useCallback(
    (stream) => {
      stopMicMeter();

      const audioTrack = stream?.getAudioTracks?.()[0];
      const AudioContextImpl =
        window.AudioContext || window.webkitAudioContext;
      if (!audioTrack || !AudioContextImpl) {
        setMicLevel(0);
        return;
      }

      const audioContext = new AudioContextImpl();
      const source = audioContext.createMediaStreamSource(
        new MediaStream([audioTrack])
      );
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      micAudioContextRef.current = audioContext;

      const data = new Uint8Array(analyser.frequencyBinCount);

      const tick = () => {
        analyser.getByteFrequencyData(data);
        const average =
          data.reduce((total, value) => total + value, 0) / data.length;
        setMicLevel(Math.min(1, average / 110));
        micMeterRafRef.current = requestAnimationFrame(tick);
      };

      tick();
    },
    [stopMicMeter]
  );

  const buildPreviewConstraints = useCallback(() => {
    const audio = selectedAudioInputId
      ? {
          deviceId: { exact: selectedAudioInputId },
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      : {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        };

    const video = joinVideoMuted
      ? false
      : selectedVideoInputId
        ? {
            deviceId: { exact: selectedVideoInputId },
            width: { ideal: 960 },
            height: { ideal: 540 },
          }
        : {
            width: { ideal: 960 },
            height: { ideal: 540 },
          };

    return { audio, video };
  }, [joinVideoMuted, selectedAudioInputId, selectedVideoInputId]);

  const buildAudioMonitorConstraints = useCallback(() => {
    const audio = selectedAudioInputId
      ? {
          deviceId: { exact: selectedAudioInputId },
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      : {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        };

    return { audio, video: false };
  }, [selectedAudioInputId]);

  const runNetworkCheck = useCallback(async () => {
    if (typeof window === "undefined") return;

    const connection =
      navigator.connection ||
      navigator.mozConnection ||
      navigator.webkitConnection ||
      null;
    const start = performance.now();

    try {
      await fetch(`/api/ws-config?prejoin=${Date.now()}`, {
        method: "GET",
        cache: "no-store",
        credentials: "include",
      });

      const latency = Math.round(performance.now() - start);
      const effectiveType = connection?.effectiveType || "";
      const downlink = Number(connection?.downlink || 0);
      const detailParts = [`${latency} ms`];
      if (effectiveType) detailParts.push(effectiveType.toUpperCase());
      if (downlink) detailParts.push(`${downlink} Mbps`);

      const state =
        latency < 180 && (!downlink || downlink >= 2)
          ? "good"
          : latency < 450
            ? "fair"
            : "poor";

      setNetworkStatus({
        state,
        label:
          state === "good"
            ? "Network ready"
            : state === "fair"
              ? "Network is usable"
              : "Network may be unstable",
        detail: detailParts.join(" - "),
        latency,
      });
    } catch {
      setNetworkStatus({
        state: "poor",
        label: "Network check failed",
        detail: "Check your connection before joining.",
        latency: null,
      });
    }
  }, []);

  const stopSpeakerTest = useCallback((shouldUpdateState = true) => {
    if (speakerTestTimeoutRef.current) {
      window.clearTimeout(speakerTestTimeoutRef.current);
      speakerTestTimeoutRef.current = null;
    }

    const currentSpeakerTest = speakerTestRef.current;
    if (currentSpeakerTest) {
      try {
        currentSpeakerTest.oscillator.stop();
      } catch {
        // already stopped
      }

      currentSpeakerTest.audio.pause();
      currentSpeakerTest.audio.srcObject
        ?.getTracks?.()
        .forEach((track) => track.stop());
      currentSpeakerTest.audio.srcObject = null;
      currentSpeakerTest.audioContext.close().catch(() => { });
      speakerTestRef.current = null;
    }

    if (shouldUpdateState) {
      setIsTestingSpeaker(false);
    }
  }, []);

  const playSpeakerTest = useCallback(async () => {
    if (typeof window === "undefined") return;
    const AudioContextImpl = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextImpl || isTestingSpeaker) return;

    setIsTestingSpeaker(true);

    try {
      const audioContext = new AudioContextImpl();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      const destination = audioContext.createMediaStreamDestination();
      const audio = new Audio();

      oscillator.type = "sine";
      oscillator.frequency.value = 660;
      gain.gain.value = 0.08;
      oscillator.connect(gain);
      gain.connect(destination);

      audio.srcObject = destination.stream;
      speakerTestRef.current = { audio, audioContext, oscillator };

      if (selectedAudioOutputId && typeof audio.setSinkId === "function") {
        await audio.setSinkId(selectedAudioOutputId);
      }

      oscillator.start();
      await audio.play();

      speakerTestTimeoutRef.current = window.setTimeout(() => {
        stopSpeakerTest();
      }, 900);
    } catch {
      stopSpeakerTest();
    }
  }, [isTestingSpeaker, selectedAudioOutputId, stopSpeakerTest]);

  const handleJoin = useCallback(() => {
    stopPreviewStream();
    setHasJoined(true);
  }, [stopPreviewStream]);

  useEffect(() => {
    if (hasJoined) return;

    let cancelled = false;

    async function initPrejoinPreview() {
      if (typeof navigator === "undefined" || !navigator.mediaDevices) {
        setPrejoinError("Camera and microphone are not available in this browser.");
        return;
      }

      try {
        setPrejoinError(null);
        const stream = await navigator.mediaDevices.getUserMedia(
          buildPreviewConstraints()
        );
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        stopPreviewStream();
        previewStreamRef.current = stream;

        if (previewVideoRef.current && !joinVideoMuted) {
          previewVideoRef.current.srcObject = stream;
          await previewVideoRef.current.play().catch(() => { });
        }

        startMicMeter(stream);
        await refreshDevices();
      } catch (err) {
        stopPreviewStream();
        setPrejoinError(
          err?.name === "NotAllowedError"
            ? "Allow camera and microphone access, or join with devices muted."
            : "Could not start camera or microphone preview."
        );
        setJoinAudioMuted(true);
        if (!joinVideoMuted) setJoinVideoMuted(true);
        await refreshDevices().catch(() => { });
      }
    }

    initPrejoinPreview();

    return () => {
      cancelled = true;
      stopPreviewStream();
    };
  }, [
    buildPreviewConstraints,
    hasJoined,
    joinVideoMuted,
    refreshDevices,
    startMicMeter,
    stopPreviewStream,
  ]);

  useEffect(() => {
    if (hasJoined) return;
    runNetworkCheck();
    const intervalId = window.setInterval(runNetworkCheck, 30000);
    return () => window.clearInterval(intervalId);
  }, [hasJoined, runNetworkCheck]);

  useEffect(() => {
    return () => {
      stopPreviewStream();
      stopSpeakerTest(false);
    };
  }, [stopPreviewStream, stopSpeakerTest]);

  useEffect(() => {
    if (!hasJoined || sessionAudioMuted) {
      stopPreviewStream();
      setMicMonitorUnavailable(false);
      return;
    }

    let cancelled = false;

    async function startSessionMicMonitor() {
      if (typeof navigator === "undefined" || !navigator.mediaDevices) {
        setMicMonitorUnavailable(true);
        setMicLevel(0);
        return;
      }

      try {
        setMicMonitorUnavailable(false);
        const stream = await navigator.mediaDevices.getUserMedia(
          buildAudioMonitorConstraints()
        );

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        stopPreviewStream();
        previewStreamRef.current = stream;
        startMicMeter(stream);
      } catch {
        setMicMonitorUnavailable(true);
        setMicLevel(0);
      }
    }

    startSessionMicMonitor();

    return () => {
      cancelled = true;
      stopPreviewStream();
    };
  }, [
    buildAudioMonitorConstraints,
    hasJoined,
    sessionAudioMuted,
    startMicMeter,
    stopPreviewStream,
  ]);

  // keep callback stable
  const screenShareCbRef = useRef(onScreenShareStreamChange);
  useEffect(() => {
    screenShareCbRef.current = onScreenShareStreamChange;
  }, [onScreenShareStreamChange]);

  const isMediaStreamLike = (value) =>
    !!value &&
    typeof value === "object" &&
    typeof value.getTracks === "function" &&
    typeof value.getVideoTracks === "function";

  const isMediaStreamTrackLike = (value) =>
    !!value &&
    typeof value === "object" &&
    typeof value.kind === "string" &&
    (value.kind === "video" || value.kind === "audio") &&
    typeof value.id === "string";

  const findMediaStream = (value, visited = new WeakSet(), depth = 0) => {
    if (!value || depth > 4) return null;
    if (isMediaStreamLike(value)) return value;
    if (typeof value !== "object") return null;
    if (visited.has(value)) return null;
    visited.add(value);

    for (const entry of Object.values(value)) {
      const found = findMediaStream(entry, visited, depth + 1);
      if (found) return found;
    }

    return null;
  };

  const collectMediaStreamTracks = (
    value,
    acc = [],
    visited = new WeakSet(),
    depth = 0
  ) => {
    if (!value || depth > 5) return acc;
    if (isMediaStreamLike(value)) {
      return [...acc, ...value.getTracks()];
    }
    if (isMediaStreamTrackLike(value)) {
      acc.push(value);
      return acc;
    }
    if (typeof value !== "object") return acc;
    if (visited.has(value)) return acc;

    visited.add(value);
    for (const entry of Object.values(value)) {
      collectMediaStreamTracks(entry, acc, visited, depth + 1);
    }
    return acc;
  };

  async function ensureJitsiScript() {
    if (typeof window === "undefined") return;

    if (window.JitsiMeetExternalAPI) return;

    const existing = document.getElementById("jitsi-external-api");
    if (existing) {
      await new Promise((resolve, reject) => {
        if (existing.getAttribute("data-loaded") === "true") return resolve();
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", (e) => reject(e), { once: true });
      });
      return;
    }

    await new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.id = "jitsi-external-api";
      script.src = `https://${JITSI_DOMAIN}/external_api.js`;
      script.async = true;
      script.onload = () => {
        script.setAttribute("data-loaded", "true");
        resolve();
      };
      script.onerror = (e) => reject(e);
      document.body.appendChild(script);
    });
  }

  // 🔧 MAIN FIX: only depend on roomId (and optionally locale if you really want)
  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (typeof window === "undefined") return;
      if (!roomId) return;
      if (!hasJoined) return;
      if (!containerRef.current) return;

      setIsLoading(true);
      setError(null);

      try {
        await ensureJitsiScript();
        if (cancelled) return;

        const JitsiAPI = window.JitsiMeetExternalAPI;
        if (!JitsiAPI) {
          throw new Error("JitsiMeetExternalAPI not available on window");
        }

        const options = buildJitsiOptions({
          roomId,
          userName,
          isTeacher: !!isTeacher,
          parentNode: containerRef.current,
          devices: {
            audioInput: selectedAudioInputId,
            audioOutput: selectedAudioOutputId,
            videoInput: selectedVideoInputId,
          },
          startWithAudioMuted: joinAudioMuted,
          startWithVideoMuted: joinVideoMuted,
        });

        const api = new JitsiAPI(JITSI_DOMAIN, options);
        apiRef.current = api;
        setSessionAudioMuted(Boolean(joinAudioMuted));

        setIsLoading(false);
        setError(null);

        api.addListener("videoConferenceJoined", () => {
          setError(null);
          const audioMutedPromise = api.isAudioMuted?.();
          if (typeof audioMutedPromise?.then === "function") {
            audioMutedPromise
              .then((muted) => setSessionAudioMuted(Boolean(muted)))
              .catch(() => { });
          }
        });

        api.addListener("audioMuteStatusChanged", (status) => {
          setSessionAudioMuted(Boolean(status?.muted));
        });

        api.addListener("errorOccurred", (e) => {
          console.error("Jitsi error:", e);
          if (e?.error?.name === "conference.connectionError") {
            setError(t(dict, "classroom_video_error_connection"));
          } else {
            setError(t(dict, "classroom_video_error_generic"));
          }
        });

        api.addListener("screenSharingStatusChanged", (status) => {
          const cb = screenShareCbRef.current;
          if (typeof cb === "function") {
            let stream = findMediaStream(status);
            if (!stream && status?.on) {
              const tracks = collectMediaStreamTracks(status);
              if (tracks.length > 0) {
                const uniqueTracks = Array.from(
                  new Map(tracks.map((track) => [track.id, track])).values()
                );
                stream = new MediaStream(uniqueTracks);
              }
            }

            cb({
              active: !!status?.on,
              stream,
            });
          }
        });
      } catch (err) {
        console.error("Failed to initialize Jitsi:", err);
        if (!cancelled) {
          setError(t(dict, "classroom_video_error_generic"));
          setIsLoading(false);
        }
      }
    }

    init();

    return () => {
      cancelled = true;
      try {
        const cb = screenShareCbRef.current;
        if (typeof cb === "function") {
          cb({ active: false, stream: null });
        }
        apiRef.current?.dispose();
      } catch (e) {
        console.warn("Error disposing Jitsi API:", e);
      }
      apiRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, hasJoined]); // Jitsi mounts only after the custom prejoin lobby

  if (!hasJoined) {
    const networkClass = `cr-prejoin__network cr-prejoin__network--${networkStatus.state}`;
    const levelPercent = Math.round(micLevel * 100);

    return (
      <div className="cr-video cr-video--prejoin">
        <div className="cr-prejoin">
          <section className="cr-prejoin__preview" aria-label="Camera preview">
            {!joinVideoMuted && !prejoinError ? (
              <video
                ref={previewVideoRef}
                className="cr-prejoin__video"
                autoPlay
                muted
                playsInline
              />
            ) : (
              <div className="cr-prejoin__camera-off">
                <CameraOff size={32} />
                <span>{joinVideoMuted ? "Camera off" : "Preview unavailable"}</span>
              </div>
            )}

            <div className="cr-prejoin__preview-bar">
              <span>{userName || (isTeacher ? "Teacher" : "Learner")}</span>
              <span>{joinAudioMuted ? "Joining muted" : "Mic on"}</span>
            </div>
          </section>

          <section className="cr-prejoin__panel" aria-label="Prejoin setup">
            <div className="cr-prejoin__header">
              <span className="cr-prejoin__eyebrow">Classroom Lobby</span>
              <h2>Ready to join?</h2>
              <p>Check your devices before entering the live session.</p>
            </div>

            {prejoinError && (
              <div className="cr-prejoin__notice" role="status">
                {prejoinError}
              </div>
            )}

            <div className="cr-prejoin__quick-actions">
              <button
                type="button"
                className={`cr-prejoin__pill ${joinAudioMuted ? "" : "cr-prejoin__pill--active"}`}
                onClick={() => setJoinAudioMuted((value) => !value)}
                aria-pressed={!joinAudioMuted}
              >
                {joinAudioMuted ? <MicOff size={16} /> : <Mic size={16} />}
                {joinAudioMuted ? "Join muted" : "Mic on"}
              </button>

              <button
                type="button"
                className={`cr-prejoin__pill ${joinVideoMuted ? "" : "cr-prejoin__pill--active"}`}
                onClick={() => setJoinVideoMuted((value) => !value)}
                aria-pressed={!joinVideoMuted}
              >
                {joinVideoMuted ? <CameraOff size={16} /> : <Camera size={16} />}
                {joinVideoMuted ? "Camera off" : "Camera on"}
              </button>

              <button
                type="button"
                className="cr-prejoin__pill"
                onClick={refreshDevices}
              >
                <RefreshCw size={16} />
                Refresh
              </button>
            </div>

            <div className="cr-prejoin__device-grid">
              <label className="cr-prejoin__field">
                <span>Microphone</span>
                <select
                  value={selectedAudioInputId}
                  onChange={(e) => setSelectedAudioInputId(e.target.value)}
                >
                  {devices.audioInputs.length ? (
                    devices.audioInputs.map((device, index) => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label || `Microphone ${index + 1}`}
                      </option>
                    ))
                  ) : (
                    <option value="">Default microphone</option>
                  )}
                </select>
              </label>

              <label className="cr-prejoin__field">
                <span>Camera</span>
                <select
                  value={selectedVideoInputId}
                  onChange={(e) => setSelectedVideoInputId(e.target.value)}
                >
                  {devices.videoInputs.length ? (
                    devices.videoInputs.map((device, index) => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label || `Camera ${index + 1}`}
                      </option>
                    ))
                  ) : (
                    <option value="">Default camera</option>
                  )}
                </select>
              </label>

              <label className="cr-prejoin__field cr-prejoin__field--wide">
                <span>Speaker</span>
                <div className="cr-prejoin__speaker-row">
                  <select
                    value={selectedAudioOutputId}
                    onChange={(e) => setSelectedAudioOutputId(e.target.value)}
                  >
                    {devices.audioOutputs.length ? (
                      devices.audioOutputs.map((device, index) => (
                        <option key={device.deviceId} value={device.deviceId}>
                          {device.label || `Speaker ${index + 1}`}
                        </option>
                      ))
                    ) : (
                      <option value="">System default speaker</option>
                    )}
                  </select>

                  <button
                    type="button"
                    className="cr-prejoin__test"
                    onClick={playSpeakerTest}
                    disabled={isTestingSpeaker}
                  >
                    {isTestingSpeaker ? <Volume2 size={16} /> : <Play size={16} />}
                    {isTestingSpeaker ? "Playing" : "Test"}
                  </button>
                </div>
              </label>
            </div>

            <div className="cr-prejoin__checks">
              <div className="cr-prejoin__meter" aria-label="Microphone level">
                <div className="cr-prejoin__meter-header">
                  <span>Mic level</span>
                  <span>{levelPercent}%</span>
                </div>
                <div className="cr-prejoin__meter-track">
                  <span style={{ width: `${levelPercent}%` }} />
                </div>
              </div>

              <div className={networkClass}>
                <Wifi size={16} />
                <div>
                  <strong>{networkStatus.label}</strong>
                  <span>{networkStatus.detail}</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              className="cr-prejoin__join"
              onClick={handleJoin}
            >
              Join classroom
            </button>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="cr-video">
      {isLoading && !error && (
        <div className="cr-video__loading">
          <div className="cr-video__spinner" />
          <span>{t(dict, "classroom_video_connecting")}</span>
        </div>
      )}

      {error && (
        <div className="cr-video__error">
          <span className="cr-video__error-icon">⚠️</span>
          <p>{error}</p>
          <button
            className="cr-video__retry"
            onClick={() => window.location.reload()}
          >
            {t(dict, "classroom_video_retry")}
          </button>
        </div>
      )}

      <div
        ref={containerRef}
        className="cr-video__frame"
        style={{
          width: "100%",
          height: "100%",
          opacity: error ? 0.2 : 1,
          transition: "opacity 0.3s ease",
        }}
      />

      <div
        className={
          "cr-video__mic-status" +
          (sessionAudioMuted ? " cr-video__mic-status--muted" : "") +
          (micMonitorUnavailable ? " cr-video__mic-status--unavailable" : "")
        }
        title={
          sessionAudioMuted
            ? "Microphone is muted"
            : micMonitorUnavailable
              ? "Microphone level monitor unavailable"
              : "Live microphone level"
        }
        aria-label={
          sessionAudioMuted
            ? "Microphone muted"
            : micMonitorUnavailable
              ? "Microphone level unavailable"
              : "Live microphone level"
        }
      >
        {sessionAudioMuted ? <MicOff size={14} /> : <Mic size={14} />}
        <span className="cr-video__mic-bars" aria-hidden="true">
          {[0.18, 0.38, 0.62, 0.84].map((threshold) => (
            <span
              key={threshold}
              className={micLevel >= threshold ? "is-active" : ""}
            />
          ))}
        </span>
        <span className="cr-video__mic-label">
          {sessionAudioMuted
            ? "Muted"
            : micMonitorUnavailable
              ? "No meter"
              : "Mic"}
        </span>
      </div>
    </div>
  );
}
