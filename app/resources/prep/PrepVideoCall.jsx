// app/resources/prep/PrepVideoCall.jsx
"use client";

import { useEffect, useRef, useState } from "react";

const BASE_STUN = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

function buildIceServers() {
  const urlsEnv = process.env.NEXT_PUBLIC_ICE_URLS || "";
  const username = process.env.NEXT_PUBLIC_ICE_USERNAME || "";
  const credential = process.env.NEXT_PUBLIC_ICE_CREDENTIAL || "";

  if (!urlsEnv) {
    return BASE_STUN;
  }

  const allUrls = urlsEnv
    .split(",")
    .map((u) => u.trim())
    .filter(Boolean);

  const stunUrls = allUrls.filter((u) => u.startsWith("stun:"));
  const turnUrls = allUrls.filter(
    (u) => u.startsWith("turn:") || u.startsWith("turns:")
  );

  const iceServers = [...BASE_STUN];

  if (stunUrls.length) {
    iceServers.push({ urls: stunUrls });
  }

  if (turnUrls.length && username && credential) {
    iceServers.push({
      urls: turnUrls,
      username,
      credential,
    });
  }

  return iceServers;
}

const ICE_SERVERS = buildIceServers();

export default function PrepVideoCall({
  roomId,
  isTeacher = false,
  onScreenShareStreamChange,
}) {
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [screenOn, setScreenOn] = useState(false);
  const [remoteScreenSharing, setRemoteScreenSharing] = useState(false);

  const [isInitiator, setIsInitiator] = useState(false);
  const isInitiatorRef = useRef(false);
  const [peerJoined, setPeerJoined] = useState(false);

  const wsRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);

  // 🔥 Store the screen share sender so we can remove it later
  const screenSenderRef = useRef(null);

  // 🔥 Store remote screen share stream separately
  const remoteScreenStreamRef = useRef(null);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  const onScreenShareChangeRef = useRef(onScreenShareStreamChange);
  useEffect(() => {
    onScreenShareChangeRef.current = onScreenShareStreamChange;
  }, [onScreenShareStreamChange]);

  // 🔥 When we detect remote screen share stopped, clear it
  useEffect(() => {
    if (!remoteScreenSharing && remoteScreenStreamRef.current) {
      console.log("[PrepVideoCall] Clearing remote screen share stream");
      remoteScreenStreamRef.current = null;
      if (onScreenShareChangeRef.current) {
        onScreenShareChangeRef.current(null);
      }
    }
  }, [remoteScreenSharing]);

  function createPeerConnection() {
    if (pcRef.current) return pcRef.current;

    console.log("[PrepVideoCall] Creating RTCPeerConnection");

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal("candidate", event.candidate);
      }
    };

    // 🔥 Handle incoming tracks - detect screen share vs camera
    pc.ontrack = (event) => {
      const track = event.track;
      const streams = event.streams;

      console.log(
        "[PrepVideoCall] ontrack:",
        track.kind,
        "label:",
        track.label,
        "streams:",
        streams.length
      );

      // Check if this is a screen share track
      // Screen share tracks often have labels containing "screen" or "display"
      // Or we check the stream ID to see if it's different from the main stream
      const trackLabel = (track.label || "").toLowerCase();
      const isScreenTrack =
        trackLabel.includes("screen") ||
        trackLabel.includes("display") ||
        trackLabel.includes("window") ||
        trackLabel.includes("monitor");

      if (track.kind === "video") {
        if (
          isScreenTrack ||
          (streams[0] &&
            streams[0].id !== localStreamRef.current?.id &&
            remoteScreenSharing)
        ) {
          // This is a screen share track
          console.log("[PrepVideoCall] 🖥️ Received SCREEN SHARE track");

          const screenStream = streams[0] || new MediaStream([track]);
          remoteScreenStreamRef.current = screenStream;

          if (onScreenShareChangeRef.current) {
            console.log(
              "[PrepVideoCall] Passing screen share stream to parent"
            );
            onScreenShareChangeRef.current(screenStream);
          }

          // When track ends, clear screen share
          track.onended = () => {
            console.log("[PrepVideoCall] Remote screen track ended");
            remoteScreenStreamRef.current = null;
            setRemoteScreenSharing(false);
            if (onScreenShareChangeRef.current) {
              onScreenShareChangeRef.current(null);
            }
          };
        } else {
          // This is a camera track - show in remote video
          console.log("[PrepVideoCall] 📷 Received CAMERA track");
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject =
              streams[0] || new MediaStream([track]);
          }
        }
      } else if (track.kind === "audio") {
        // Audio track - add to remote video if not already there
        console.log("[PrepVideoCall] 🔊 Received AUDIO track");
        if (remoteVideoRef.current && remoteVideoRef.current.srcObject) {
          // Audio should go with the camera stream
        } else if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject =
            streams[0] || new MediaStream([track]);
        }
      }
    };

    pc.onconnectionstatechange = () => {
      console.log("[PrepVideoCall] Connection state:", pc.connectionState);
    };

    // 🔥 Handle negotiation needed (when we add/remove tracks)
    pc.onnegotiationneeded = async () => {
      console.log("[PrepVideoCall] Negotiation needed");

      // Only initiator creates offers
      if (!isInitiatorRef.current) {
        console.log("[PrepVideoCall] Not initiator, skipping offer creation");
        return;
      }

      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        sendSignal("offer", pc.localDescription);
        console.log("[PrepVideoCall] Sent renegotiation offer");
      } catch (err) {
        console.error("[PrepVideoCall] Renegotiation failed:", err);
      }
    };

    pcRef.current = pc;
    return pc;
  }

  async function startLocalMedia() {
    if (localStreamRef.current) return localStreamRef.current;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      localStreamRef.current = stream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const pc = createPeerConnection();
      stream.getTracks().forEach((track) => {
        console.log("[PrepVideoCall] Adding local track:", track.kind);
        pc.addTrack(track, stream);
      });

      toggleTracksEnabled(stream.getAudioTracks(), micOn);
      toggleTracksEnabled(stream.getVideoTracks(), camOn);

      return stream;
    } catch (err) {
      console.error("Failed to get user media", err);
      setError("Could not access camera/microphone.");
      throw err;
    }
  }

  function toggleTracksEnabled(tracks, enabled) {
    tracks.forEach((t) => {
      t.enabled = enabled;
    });
  }

  function sendSignal(signalType, data) {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.warn("[PrepVideoCall] WS not open, cannot send:", signalType);
      return;
    }
    console.log("[PrepVideoCall] Sending signal:", signalType);
    ws.send(
      JSON.stringify({
        type: "signal",
        signalType,
        data,
      })
    );
  }

  async function startCall() {
    if (!roomId) {
      setError("Missing room id.");
      return;
    }
    if (status !== "idle") return;

    setError("");
    setStatus("connecting");

    let wsUrl = "";
    const apiBase = process.env.NEXT_PUBLIC_API_URL;

    if (apiBase) {
      const url = new URL(apiBase);
      url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
      url.pathname = "/ws/prep";
      url.search = "";
      wsUrl = url.toString();
    } else {
      const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      wsUrl = `${wsProtocol}//${window.location.host}/ws/prep`;
    }

    console.log("[PrepVideoCall] Connecting to", wsUrl);

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "join", roomId }));
    };

    ws.onerror = (ev) => {
      console.error("WebSocket error", ev);
      setError("Connection error.");
      setStatus("idle");
    };

    ws.onclose = () => {
      cleanupCall();
    };

    ws.onmessage = async (event) => {
      let msg;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }
      if (!msg || !msg.type) return;

      switch (msg.type) {
        case "room-full":
          setError("This prep room already has two participants.");
          setStatus("idle");
          break;

        case "joined": {
          const flag = !!msg.isInitiator;
          setIsInitiator(flag);
          isInitiatorRef.current = flag;
          await startLocalMedia();
          break;
        }

        case "peer-joined":
          setPeerJoined(true);
          if (isInitiatorRef.current) {
            await createAndSendOffer();
          }
          break;

        case "peer-left":
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = null;
          }
          remoteScreenStreamRef.current = null;
          setRemoteScreenSharing(false);
          if (onScreenShareChangeRef.current) {
            onScreenShareChangeRef.current(null);
          }
          setPeerJoined(false);
          break;

        case "signal":
          await handleSignalMessage(msg);
          break;

        default:
          break;
      }
    };
  }

  async function handleSignalMessage(msg) {
    const { signalType, data } = msg;
    const pc = createPeerConnection();

    console.log("[PrepVideoCall] Received signal:", signalType);

    if (signalType === "offer") {
      if (!localStreamRef.current) {
        await startLocalMedia();
      }
      await pc.setRemoteDescription(new RTCSessionDescription(data));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      sendSignal("answer", pc.localDescription);
      setStatus("in-call");
    } else if (signalType === "answer") {
      await pc.setRemoteDescription(new RTCSessionDescription(data));
      setStatus("in-call");
    } else if (signalType === "candidate") {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(data));
      } catch (err) {
        console.warn("Error adding ICE candidate", err);
      }
    }
    // Screen share signals
    else if (signalType === "screen-share-start") {
      console.log("[PrepVideoCall] >>> REMOTE SCREEN SHARE STARTED <<<");
      setRemoteScreenSharing(true);
      // The actual stream will come via ontrack
    } else if (signalType === "screen-share-stop") {
      console.log("[PrepVideoCall] >>> REMOTE SCREEN SHARE STOPPED <<<");
      setRemoteScreenSharing(false);
      remoteScreenStreamRef.current = null;
      if (onScreenShareChangeRef.current) {
        onScreenShareChangeRef.current(null);
      }
    }
  }

  async function createAndSendOffer() {
    const pc = createPeerConnection();
    if (!localStreamRef.current) {
      await startLocalMedia();
    }
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    sendSignal("offer", pc.localDescription);
    setStatus("in-call");
  }

  function leaveCall() {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "leave" }));
      ws.close();
    } else {
      cleanupCall();
    }
  }

  function cleanupCall() {
    setStatus("idle");
    setIsInitiator(false);
    isInitiatorRef.current = false;
    setPeerJoined(false);
    setScreenOn(false);
    setRemoteScreenSharing(false);

    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }

    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }

    screenSenderRef.current = null;
    remoteScreenStreamRef.current = null;

    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;

    if (onScreenShareChangeRef.current) {
      onScreenShareChangeRef.current(null);
    }

    wsRef.current = null;
  }

  function toggleMic() {
    const next = !micOn;
    setMicOn(next);
    if (localStreamRef.current) {
      toggleTracksEnabled(localStreamRef.current.getAudioTracks(), next);
    }
  }

  function toggleCamera() {
    const next = !camOn;
    setCamOn(next);
    if (localStreamRef.current) {
      toggleTracksEnabled(localStreamRef.current.getVideoTracks(), next);
    }
  }

  // 🔥 NEW APPROACH: Add screen share as ADDITIONAL track (don't replace)
  async function startScreenShare() {
    try {
      console.log("[PrepVideoCall] ===== STARTING SCREEN SHARE =====");

      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });

      screenStreamRef.current = displayStream;
      const displayTrack = displayStream.getVideoTracks()[0];
      const pc = pcRef.current;

      if (pc && displayTrack) {
        // 🔥 ADD the screen track as a NEW track (triggers renegotiation)
        console.log(
          "[PrepVideoCall] Adding screen share track to peer connection"
        );
        const sender = pc.addTrack(displayTrack, displayStream);
        screenSenderRef.current = sender;
        console.log("[PrepVideoCall] Screen track added, sender:", sender);
      }

      setScreenOn(true);

      // Notify parent (local screen share)
      if (onScreenShareChangeRef.current) {
        console.log("[PrepVideoCall] Notifying parent of LOCAL screen share");
        onScreenShareChangeRef.current(displayStream);
      }

      // Signal remote peer
      sendSignal("screen-share-start", {});

      displayTrack.onended = () => {
        console.log("[PrepVideoCall] Display track ended by user");
        stopScreenShare();
      };
    } catch (err) {
      console.error("Screen share failed", err);
      setError("Could not start screen sharing.");
    }
  }

  async function stopScreenShare() {
    console.log("[PrepVideoCall] ===== STOPPING SCREEN SHARE =====");

    // Signal remote first
    sendSignal("screen-share-stop", {});

    const pc = pcRef.current;

    // 🔥 Remove the screen share track from peer connection
    if (pc && screenSenderRef.current) {
      try {
        console.log(
          "[PrepVideoCall] Removing screen share track from peer connection"
        );
        pc.removeTrack(screenSenderRef.current);
        screenSenderRef.current = null;
      } catch (err) {
        console.warn("[PrepVideoCall] Error removing track:", err);
      }
    }

    // Stop the display stream
    const displayStream = screenStreamRef.current;
    if (displayStream) {
      displayStream.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }

    setScreenOn(false);

    if (onScreenShareChangeRef.current) {
      onScreenShareChangeRef.current(null);
    }
  }

  function toggleScreen() {
    if (screenOn) {
      stopScreenShare();
    } else {
      startScreenShare();
    }
  }

  useEffect(() => {
    return () => {
      leaveCall();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const inCall = status === "in-call";

  return (
    <section className="prep-video">
      <header className="prep-video__header">
        <h2 className="prep-video__title">Live video</h2>
        <p className="prep-video__subtitle">
          Start a 1-to-1 call with your learner directly in the prep room.
        </p>
      </header>

      {error && <p className="prep-video__error">{error}</p>}

      <div className="prep-video__body">
        <div className="prep-video__frame-wrapper">
          <video
            ref={remoteVideoRef}
            className="prep-video__remote"
            autoPlay
            playsInline
          />
          <video
            ref={localVideoRef}
            className="prep-video__local"
            muted
            autoPlay
            playsInline
          />
        </div>

        <div className="prep-video__controls">
          {status === "idle" ? (
            <button
              type="button"
              className="resources-button resources-button--primary"
              onClick={startCall}
            >
              Join call
            </button>
          ) : (
            <button
              type="button"
              className="resources-button resources-button--ghost"
              onClick={leaveCall}
            >
              Leave
            </button>
          )}

          <button
            type="button"
            className="prep-video__icon-btn"
            onClick={toggleMic}
            disabled={!inCall && status === "idle"}
          >
            {micOn ? "🎙 Mic on" : "🎙 Mic off"}
          </button>

          <button
            type="button"
            className="prep-video__icon-btn"
            onClick={toggleCamera}
            disabled={!inCall && status === "idle"}
          >
            {camOn ? "📷 Cam on" : "📷 Cam off"}
          </button>

          <button
            type="button"
            className="prep-video__icon-btn"
            onClick={toggleScreen}
            disabled={!inCall}
          >
            {screenOn ? "🖥 Stop share" : "🖥 Share screen"}
          </button>
        </div>

        {status === "connecting" && (
          <p className="prep-video__hint">Connecting…</p>
        )}
        {inCall && !peerJoined && (
          <p className="prep-video__hint">
            Waiting for the other person to join this prep room…
          </p>
        )}

        <p
          className="prep-video__hint"
          style={{ fontSize: "10px", opacity: 0.6 }}
        >
          Screen: {screenOn ? "sharing" : "off"} | Remote:{" "}
          {remoteScreenSharing ? "sharing" : "off"}
        </p>
      </div>
    </section>
  );
}
