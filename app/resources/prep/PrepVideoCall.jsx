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

const JITSI_DOMINANT_SPEAKER_STYLE_ID = "speexify-dominant-speaker-style";
const JITSI_DOMINANT_SPEAKER_CSS = `
  .videocontainer.dominant-speaker,
  .dominant-speaker .videocontainer,
  .dominant-speaker,
  .dominant-speaker-indicator,
  .dominant-speaker-indicator__indicator,
  .spx-active-speaker {
    outline: 2px solid rgba(45, 212, 191, 0.94) !important;
    box-shadow:
      0 0 0 2px rgba(20, 184, 166, 0.28),
      0 0 24px rgba(20, 184, 166, 0.34) !important;
    border-radius: 12px !important;
  }
`;

// ─────────────────────────────────────────────────────────────
// Teams-style adaptive tile grid
//
// We override Jitsi's internal tile sizing entirely. The iframe gets
// a stylesheet that lays the tile container out as a CSS Grid whose
// column count is supplied as a CSS variable (--spx-tile-cols). The
// parent React tree computes the optimal column count from the live
// participant count and container size, and writes the variable on
// the iframe's <html> element. Result: tiles always fill the panel,
// always pick the column count whose cell aspect ratio is closest to
// 16:9, and recompute on every join, leave, and resize.
// ─────────────────────────────────────────────────────────────
const JITSI_TILE_GRID_STYLE_ID = "speexify-tile-grid-style";
const JITSI_TILE_GRID_CSS = `
  /* Make sure the filmstrip container fills the iframe in tile view */
  .filmstrip.is-tile-view,
  .filmstrip.tile-view,
  div[class*="filmstrip"][class*="tile"] {
    width: 100% !important;
    height: 100% !important;
    position: absolute !important;
    inset: 0 !important;
    padding: 0 !important;
    margin: 0 !important;
  }

  /* Tile container becomes a CSS grid with our computed column count */
  .tile-view .filmstrip__videos,
  .is-tile-view .filmstrip__videos,
  .filmstrip__videos.is-tile-view,
  div[class*="tileViewContainer"],
  div[class*="tile-view"] > div[class*="filmstrip"] {
    display: grid !important;
    grid-template-columns: repeat(var(--spx-tile-cols, 2), 1fr) !important;
    grid-auto-rows: 1fr !important;
    gap: 10px !important;
    width: 100% !important;
    height: 100% !important;
    padding: 10px !important;
    box-sizing: border-box !important;
    overflow: hidden !important;
  }

  /* Hide the stage video container in tile view — we don't use it */
  .tile-view #largeVideoContainer,
  .is-tile-view #largeVideoContainer,
  #largeVideoContainer.tile-view-mode {
    display: none !important;
  }

  /* Each tile fills its grid cell uniformly */
  .tile-view .videocontainer,
  .is-tile-view .videocontainer,
  .tile-view #localVideoContainer,
  .is-tile-view #localVideoContainer,
  .tile-view span.videocontainer,
  .is-tile-view span.videocontainer {
    position: relative !important;
    display: block !important;
    width: 100% !important;
    height: 100% !important;
    min-width: 0 !important;
    min-height: 0 !important;
    max-width: 100% !important;
    max-height: 100% !important;
    margin: 0 !important;
    padding: 0 !important;
    border-radius: 12px !important;
    overflow: hidden !important;
    background: #0f172a !important;
  }

  /* Video and avatar inside each tile fill the cell with cover-fit */
  .tile-view .videocontainer video,
  .is-tile-view .videocontainer video,
  .tile-view .videocontainer .avatar-container,
  .is-tile-view .videocontainer .avatar-container {
    width: 100% !important;
    height: 100% !important;
    object-fit: cover !important;
  }

  /* Center the avatar circle within its tile regardless of cell size */
  .tile-view .avatar-container,
  .is-tile-view .avatar-container {
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
  }
`;

/**
 * Pick the column count for an adaptive tile grid in the Teams style.
 *
 * We try every cols ∈ [1, count], compute the resulting cell aspect
 * (containerWidth/cols ÷ containerHeight/ceil(count/cols)), and score
 * each candidate by how far it deviates from 16:9 — plus a small
 * penalty per empty cell so 4 participants pick 2×2 instead of 3×2.
 */
function computeTileColumns(count, width, height) {
  if (!Number.isFinite(count) || count <= 1) return 1;
  if (!width || !height || width <= 0 || height <= 0) {
    return Math.min(count, 2);
  }

  const TARGET_ASPECT = 16 / 9;
  const EMPTY_CELL_PENALTY = 0.18;

  let bestCols = 1;
  let bestScore = Infinity;

  for (let cols = 1; cols <= count; cols++) {
    const rows = Math.ceil(count / cols);
    const cellW = width / cols;
    const cellH = height / rows;
    if (cellW <= 0 || cellH <= 0) continue;

    const aspect = cellW / cellH;
    const aspectScore = Math.abs(Math.log(aspect / TARGET_ASPECT));
    const emptyCells = cols * rows - count;
    const score = aspectScore + emptyCells * EMPTY_CELL_PENALTY;

    if (score < bestScore) {
      bestScore = score;
      bestCols = cols;
    }
  }

  return bestCols;
}

export default function PrepVideoCall({
  roomId,
  userName,
  isTeacher,
  onScreenShareStreamChange,
  onModerationStateChange,
  onNetworkQualityChange,
  onAudioMuteChange,
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
  const [networkStatus, setNetworkStatus] = useState({
    state: "checking",
    label: "Checking network",
    detail: "Measuring connection quality...",
    latency: null,
  });
  const [activeSpeakerName, setActiveSpeakerName] = useState("");
  const [isTestingSpeaker, setIsTestingSpeaker] = useState(false);
  const previewVideoRef = useRef(null);
  const previewStreamRef = useRef(null);
  const micAudioContextRef = useRef(null);
  const micMeterRafRef = useRef(null);
  const speakerTestRef = useRef(null);
  const speakerTestTimeoutRef = useRef(null);
  const moderationCbRef = useRef(onModerationStateChange);
  const networkQualityCbRef = useRef(onNetworkQualityChange);
  const jitsiParticipantsRef = useRef(new Map());
  const localParticipantIdRef = useRef(null);
  const activeSpeakerIdRef = useRef(null);

  // ─────────────────────────────────────────────
  // Page recording is handled by ClassroomShell
  // (which mixes mic + display audio via Web Audio API)
  // ─────────────────────────────────────────────


  const dict = getDictionary(locale, "classroom");

  useEffect(() => {
    moderationCbRef.current = onModerationStateChange;
  }, [onModerationStateChange]);

  useEffect(() => {
    networkQualityCbRef.current = onNetworkQualityChange;
  }, [onNetworkQualityChange]);

  const getFirstFiniteNumber = useCallback((...values) => {
    for (const value of values) {
      const num = Number(value);
      if (Number.isFinite(num)) return num;
    }
    return null;
  }, []);

  const normalizeConnectionQuality = useCallback(
    (payload = {}) => {
      const quality = getFirstFiniteNumber(
        payload.connectionQuality,
        payload.quality,
        payload.score,
        payload.value
      );
      const latencyMs = getFirstFiniteNumber(
        payload.jvbRTT,
        payload.p2pRTT,
        payload.rtt,
        payload.latency,
        payload.stats?.jvbRTT,
        payload.stats?.p2pRTT,
        payload.statistics?.jvbRTT,
        payload.statistics?.p2pRTT
      );

      if (quality === null && latencyMs === null) return null;

      const normalizedQuality =
        quality === null ? null : Math.max(0, Math.min(100, quality));

      let level = "unknown";
      let label = "Checking";
      if (normalizedQuality !== null) {
        if (normalizedQuality >= 85) {
          level = "excellent";
          label = "Excellent";
        } else if (normalizedQuality >= 65) {
          level = "good";
          label = "Good";
        } else if (normalizedQuality >= 35) {
          level = "fair";
          label = "Fair";
        } else {
          level = "poor";
          label = "Poor";
        }
      } else if (latencyMs !== null) {
        if (latencyMs <= 90) {
          level = "excellent";
          label = "Excellent";
        } else if (latencyMs <= 180) {
          level = "good";
          label = "Good";
        } else if (latencyMs <= 350) {
          level = "fair";
          label = "Fair";
        } else {
          level = "poor";
          label = "Poor";
        }
      }

      return {
        level,
        label,
        quality: normalizedQuality,
        latencyMs: latencyMs === null ? null : Math.round(latencyMs),
      };
    },
    [getFirstFiniteNumber]
  );

  const publishNetworkQuality = useCallback(
    (payload) => {
      const cb = networkQualityCbRef.current;
      if (typeof cb !== "function") return;

      const participantId =
        payload?.participantId || payload?.id || payload?.endpointId || null;
      if (
        participantId &&
        localParticipantIdRef.current &&
        String(participantId) !== localParticipantIdRef.current
      ) {
        return;
      }

      cb(normalizeConnectionQuality(payload));
    },
    [normalizeConnectionQuality]
  );

  const clearNetworkQuality = useCallback(() => {
    const cb = networkQualityCbRef.current;
    if (typeof cb === "function") cb(null);
  }, []);

  const getJitsiIframeDocument = useCallback(() => {
    try {
      const iframe =
        apiRef.current?.getIFrame?.() ||
        containerRef.current?.querySelector?.("iframe");
      return iframe?.contentDocument || iframe?.contentWindow?.document || null;
    } catch {
      return null;
    }
  }, []);

  const injectDominantSpeakerStyles = useCallback(() => {
    const doc = getJitsiIframeDocument();
    if (!doc?.head) return false;
    if (doc.getElementById(JITSI_DOMINANT_SPEAKER_STYLE_ID)) return true;

    const style = doc.createElement("style");
    style.id = JITSI_DOMINANT_SPEAKER_STYLE_ID;
    style.textContent = JITSI_DOMINANT_SPEAKER_CSS;
    doc.head.appendChild(style);
    return true;
  }, [getJitsiIframeDocument]);

  const injectTileGridStyles = useCallback(() => {
    const doc = getJitsiIframeDocument();
    if (!doc?.head) return false;
    if (doc.getElementById(JITSI_TILE_GRID_STYLE_ID)) return true;

    const style = doc.createElement("style");
    style.id = JITSI_TILE_GRID_STYLE_ID;
    style.textContent = JITSI_TILE_GRID_CSS;
    doc.head.appendChild(style);
    return true;
  }, [getJitsiIframeDocument]);

  const getAttributeSelectorValue = useCallback((value) => {
    return String(value || "")
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"');
  }, []);

  const markDominantSpeakerTile = useCallback(
    (participantId) => {
      const doc = getJitsiIframeDocument();
      if (!doc) return false;

      injectDominantSpeakerStyles();
      doc
        .querySelectorAll(".spx-active-speaker")
        .forEach((node) => node.classList.remove("spx-active-speaker"));

      if (!participantId) return true;

      const escapedId = getAttributeSelectorValue(participantId);
      const selectors = [
        `[data-participant-id="${escapedId}"]`,
        `[data-participantid="${escapedId}"]`,
        `[data-endpoint-id="${escapedId}"]`,
        `[participantid="${escapedId}"]`,
        `[id="${escapedId}"]`,
        `[id="participant_${escapedId}"]`,
        `[data-testid="participant_${escapedId}"]`,
        `[id*="${escapedId}"]`,
        `[data-testid*="${escapedId}"]`,
      ];

      let target = null;
      for (const selector of selectors) {
        target = doc.querySelector(selector);
        if (target) break;
      }

      const tile =
        target?.closest?.(
          ".videocontainer, .filmstrip__tile, [class*='tile'], [class*='participant'], [class*='video-container']"
        ) || target;
      tile?.classList?.add("spx-active-speaker");
      return Boolean(tile);
    },
    [getAttributeSelectorValue, getJitsiIframeDocument, injectDominantSpeakerStyles]
  );

  const getDominantSpeakerId = useCallback((payload) => {
    if (typeof payload === "string") return payload || null;
    if (!payload || typeof payload !== "object") return null;
    return (
      payload.id ||
      payload.participantId ||
      payload.participantID ||
      payload.endpointId ||
      null
    );
  }, []);

  const getSpeakerDisplayName = useCallback(
    (speakerId) => {
      if (!speakerId) return "";
      const normalizedSpeakerId = String(speakerId);
      if (
        localParticipantIdRef.current &&
        normalizedSpeakerId === localParticipantIdRef.current
      ) {
        return userName || (isTeacher ? "Teacher" : "You");
      }

      return (
        jitsiParticipantsRef.current.get(normalizedSpeakerId)?.displayName ||
        "Speaking"
      );
    },
    [isTeacher, userName]
  );

  const clearDominantSpeaker = useCallback(() => {
    activeSpeakerIdRef.current = null;
    setActiveSpeakerName("");
    markDominantSpeakerTile(null);
  }, [markDominantSpeakerTile]);

  const handleDominantSpeakerChanged = useCallback(
    (payload) => {
      const speakerId = getDominantSpeakerId(payload);
      activeSpeakerIdRef.current = speakerId ? String(speakerId) : null;
      setActiveSpeakerName(getSpeakerDisplayName(speakerId));
      markDominantSpeakerTile(speakerId);
    },
    [getDominantSpeakerId, getSpeakerDisplayName, markDominantSpeakerTile]
  );

  const executeJitsiCommand = useCallback((command, ...args) => {
    const api = apiRef.current;
    if (!api || typeof api.executeCommand !== "function") return false;

    try {
      api.executeCommand(command, ...args);
      return true;
    } catch (err) {
      console.warn(`Jitsi command failed: ${command}`, err);
      return false;
    }
  }, []);

  // ─────────────────────────────────────────────
  // Teams-style adaptive grid lock
  //
  // Jitsi defaults to stage view in 1:1 (one big remote tile + a
  // small floating self-view that gets clipped on narrow containers).
  // We lock the conference in tile view so every participant — self
  // included — is always visible as a uniform tile. A short debounce
  // coalesces rapid join/leave bursts so we don't thrash the layout.
  // ─────────────────────────────────────────────
  const forceTileRafRef = useRef(null);
  const forceTileTimeoutRef = useRef(null);

  // Live remote-participant count drives the adaptive grid. Stored
  // as React state (not just a ref) so the grid recompute effect
  // fires when participants join or leave.
  const [remoteParticipantCount, setRemoteParticipantCount] = useState(0);

  const applyTileGridLayout = useCallback(() => {
    const doc = getJitsiIframeDocument();
    if (!doc?.documentElement) return;

    const node = containerRef.current;
    const rect = node?.getBoundingClientRect?.();
    const width = rect?.width || node?.clientWidth || 0;
    const height = rect?.height || node?.clientHeight || 0;

    const totalParticipants = remoteParticipantCount + 1; // +1 for self
    const cols = computeTileColumns(totalParticipants, width, height);

    doc.documentElement.style.setProperty("--spx-tile-cols", String(cols));
  }, [getJitsiIframeDocument, remoteParticipantCount]);

  const forceTileViewNow = useCallback(() => {
    const api = apiRef.current;
    if (!api || typeof api.executeCommand !== "function") return;
    try {
      api.executeCommand("setTileView", true);
    } catch {
      // Older Jitsi builds expose `toggleTileView` only; try that as a
      // fallback after checking current state to avoid flipping off.
      try {
        const maybePromise = api.isTileViewEnabled?.();
        const apply = (enabled) => {
          if (!enabled) {
            api.executeCommand("toggleTileView");
          }
        };
        if (maybePromise && typeof maybePromise.then === "function") {
          maybePromise.then(apply).catch(() => apply(false));
        } else {
          apply(Boolean(maybePromise));
        }
      } catch {
        // No tile-view API available; nothing we can do here.
      }
    }
  }, []);

  const scheduleForceTileView = useCallback(
    (delayMs = 120) => {
      if (forceTileTimeoutRef.current) {
        clearTimeout(forceTileTimeoutRef.current);
      }
      forceTileTimeoutRef.current = setTimeout(() => {
        forceTileTimeoutRef.current = null;
        if (forceTileRafRef.current) {
          cancelAnimationFrame(forceTileRafRef.current);
        }
        forceTileRafRef.current = requestAnimationFrame(() => {
          forceTileRafRef.current = null;
          forceTileViewNow();
        });
      }, Math.max(0, delayMs));
    },
    [forceTileViewNow]
  );

  useEffect(() => {
    return () => {
      if (forceTileTimeoutRef.current) {
        clearTimeout(forceTileTimeoutRef.current);
        forceTileTimeoutRef.current = null;
      }
      if (forceTileRafRef.current) {
        cancelAnimationFrame(forceTileRafRef.current);
        forceTileRafRef.current = null;
      }
    };
  }, []);

  // When the container's width changes (panel resize, focus-mode switch,
  // mobile rotation), nudge Jitsi to recompute the tile grid and re-run
  // our Teams-style column picker. Without this, tiles can disappear or
  // letterbox awkwardly mid-drag.
  useEffect(() => {
    if (!hasJoined) return;
    if (typeof window === "undefined" || typeof ResizeObserver === "undefined")
      return;
    const node = containerRef.current;
    if (!node) return;

    let layoutRaf = null;
    const requestLayout = () => {
      if (layoutRaf) cancelAnimationFrame(layoutRaf);
      layoutRaf = requestAnimationFrame(() => {
        layoutRaf = null;
        applyTileGridLayout();
      });
    };

    let firstObservation = true;
    const observer = new ResizeObserver(() => {
      requestLayout();
      // ResizeObserver fires once on attach; skip the force-tile on that.
      if (firstObservation) {
        firstObservation = false;
        return;
      }
      scheduleForceTileView(200);
    });
    observer.observe(node);

    // Apply the layout once on mount/hasJoined transition.
    requestLayout();

    return () => {
      observer.disconnect();
      if (layoutRaf) cancelAnimationFrame(layoutRaf);
    };
  }, [hasJoined, scheduleForceTileView, applyTileGridLayout]);

  // Recompute the grid every time the remote participant count changes
  // (the resize observer alone won't catch joins/leaves at constant width).
  useEffect(() => {
    if (!hasJoined) return;
    applyTileGridLayout();
  }, [hasJoined, remoteParticipantCount, applyTileGridLayout]);

  const normalizeJitsiParticipant = useCallback((participant) => {
    if (!participant || typeof participant !== "object") return null;
    const id =
      participant.participantId ||
      participant.id ||
      participant.jid ||
      participant.endpointId ||
      null;
    if (!id || id === localParticipantIdRef.current) return null;

    const displayName =
      participant.displayName ||
      participant.formattedDisplayName ||
      participant.name ||
      "Participant";

    return {
      id: String(id),
      displayName,
      avatarUrl: participant.avatarURL || participant.avatarUrl || "",
    };
  }, []);

  const publishModerationState = useCallback(() => {
    const cb = moderationCbRef.current;
    if (typeof cb !== "function") return;

    const api = apiRef.current;
    if (api && typeof api.getParticipantsInfo === "function") {
      try {
        const info = api.getParticipantsInfo() || [];
        info.forEach((participant) => {
          const normalized = normalizeJitsiParticipant(participant);
          if (normalized) jitsiParticipantsRef.current.set(normalized.id, normalized);
        });
      } catch (err) {
        console.warn("Failed to read Jitsi participants", err);
      }
    }

    cb({
      ready: Boolean(api),
      participants: Array.from(jitsiParticipantsRef.current.values()),
      actions: {
        muteAll: () => executeJitsiCommand("muteEveryone"),
        muteParticipant: (participantId) =>
          executeJitsiCommand("muteParticipant", participantId, "audio"),
        pinParticipant: (participantId) => {
          const pinned =
            executeJitsiCommand("setLargeVideoParticipant", participantId) ||
            executeJitsiCommand("pinParticipant", participantId);
          if (!pinned) return false;
          executeJitsiCommand("pinParticipant", participantId);
          return true;
        },
        kickParticipant: (participantId) =>
          executeJitsiCommand("kickParticipant", participantId),
      },
    });
  }, [executeJitsiCommand, normalizeJitsiParticipant]);

  const clearModerationState = useCallback(() => {
    jitsiParticipantsRef.current = new Map();
    localParticipantIdRef.current = null;
    const cb = moderationCbRef.current;
    if (typeof cb === "function") {
      cb({ ready: false, participants: [], actions: null });
    }
    clearDominantSpeaker();
  }, [clearDominantSpeaker]);

  const updateParticipantDisplayName = useCallback(
    (participant) => {
      const normalized = normalizeJitsiParticipant(participant);
      if (!normalized) return;

      jitsiParticipantsRef.current.set(normalized.id, normalized);
      if (activeSpeakerIdRef.current === normalized.id) {
        setActiveSpeakerName(getSpeakerDisplayName(normalized.id));
      }
      publishModerationState();
    },
    [getSpeakerDisplayName, normalizeJitsiParticipant, publishModerationState]
  );

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

  // keep callback stable
  const screenShareCbRef = useRef(onScreenShareStreamChange);
  useEffect(() => {
    screenShareCbRef.current = onScreenShareStreamChange;
  }, [onScreenShareStreamChange]);

  const audioMuteCbRef = useRef(onAudioMuteChange);
  useEffect(() => {
    audioMuteCbRef.current = onAudioMuteChange;
  }, [onAudioMuteChange]);

  // Bubble the initial mute state to parent whenever it changes locally
  // (covers the prejoin → joined transition where joinAudioMuted seeds state).
  useEffect(() => {
    const cb = audioMuteCbRef.current;
    if (typeof cb === "function") cb(sessionAudioMuted);
  }, [sessionAudioMuted]);

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
          try {
            const localId = api.getCurrentUserID?.();
            if (localId) localParticipantIdRef.current = String(localId);
          } catch {
            // Ignore local participant lookup failures.
          }
          const audioMutedPromise = api.isAudioMuted?.();
          if (typeof audioMutedPromise?.then === "function") {
            audioMutedPromise
              .then((muted) => setSessionAudioMuted(Boolean(muted)))
              .catch(() => { });
          }
          injectDominantSpeakerStyles();
          injectTileGridStyles();
          publishModerationState();

          // Lock the conference in tile view so the learner always sees
          // themselves and every remote participant from the moment they
          // join. Jitsi needs a short beat after join before it accepts
          // layout commands cleanly.
          scheduleForceTileView(150);
          scheduleForceTileView(900);

          // Apply the adaptive grid as soon as Jitsi has rendered.
          // The grid effect below will re-apply on participant/size change.
          window.setTimeout(() => applyTileGridLayout(), 200);
          window.setTimeout(() => applyTileGridLayout(), 1000);
        });

        api.addListener("audioMuteStatusChanged", (status) => {
          const muted = Boolean(status?.muted);
          setSessionAudioMuted(muted);
          const cb = audioMuteCbRef.current;
          if (typeof cb === "function") cb(muted);
        });

        api.addListener("participantJoined", (participant) => {
          updateParticipantDisplayName(participant);
          // Recompute the grid so the new tile slots in cleanly.
          scheduleForceTileView();
          setRemoteParticipantCount(jitsiParticipantsRef.current.size);
        });

        api.addListener("participantLeft", (participant) => {
          const id = participant?.participantId || participant?.id;
          if (id) {
            const normalizedId = String(id);
            jitsiParticipantsRef.current.delete(normalizedId);
            if (activeSpeakerIdRef.current === normalizedId) {
              clearDominantSpeaker();
            }
            publishModerationState();
          }
          // Re-tile so remaining participants fill the space.
          scheduleForceTileView();
          setRemoteParticipantCount(jitsiParticipantsRef.current.size);
        });

        // If anything (toolbar click, internal Jitsi state) flips us out
        // of tile view, snap right back. Treat tile view as load-bearing.
        api.addListener("tileViewChanged", (status) => {
          if (status && status.enabled === false) {
            scheduleForceTileView(50);
          }
        });

        api.addListener("displayNameChange", (participant) => {
          updateParticipantDisplayName(participant);
        });

        const handleDominantSpeakerEvent = (payload) => {
          handleDominantSpeakerChanged(payload);
        };
        if (typeof api.on === "function") {
          api.on("dominantSpeakerChanged", handleDominantSpeakerEvent);
        } else {
          api.addListener("dominantSpeakerChanged", handleDominantSpeakerEvent);
        }

        const handleConnectionQualityChanged = (payload) => {
          publishNetworkQuality(payload);
        };
        if (typeof api.on === "function") {
          api.on("connectionQualityChanged", handleConnectionQualityChanged);
        } else {
          api.addListener("connectionQualityChanged", handleConnectionQualityChanged);
        }

        injectDominantSpeakerStyles();
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
        publishModerationState();
      } catch (err) {
        console.error("Failed to initialize Jitsi:", err);
        clearNetworkQuality();
        clearModerationState();
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
      clearNetworkQuality();
      clearModerationState();
      setRemoteParticipantCount(0);
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
    <div
      className={[
        "cr-video",
        activeSpeakerName ? "cr-video--active-speaker" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
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

      {activeSpeakerName && (
        <div className="cr-video__speaker-indicator" aria-live="polite">
          <span className="cr-video__speaker-dot" aria-hidden="true" />
          <span>Speaking: {activeSpeakerName}</span>
        </div>
      )}

    </div>
  );
}
