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

  const screenSenderRef = useRef(null);

  // Store the remote camera stream separately
  const remoteCameraStreamRef = useRef(null);

  // Store the remote screen share stream (to check stream ID for audio routing)
  const remoteScreenStreamRef = useRef(null);

  // Track remote screen sharing state in a ref for use in ontrack
  const remoteScreenSharingRef = useRef(false);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  const onScreenShareChangeRef = useRef(onScreenShareStreamChange);
  useEffect(() => {
    onScreenShareChangeRef.current = onScreenShareStreamChange;
  }, [onScreenShareStreamChange]);

  // Keep ref in sync with state
  useEffect(() => {
    remoteScreenSharingRef.current = remoteScreenSharing;
  }, [remoteScreenSharing]);

  function createPeerConnection() {
    if (pcRef.current) return pcRef.current;

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal("candidate", event.candidate);
      }
    };

    // Handle incoming tracks - CAMERA stays in video panel, SCREEN goes to main viewer
    pc.ontrack = (event) => {
      const track = event.track;
      const streams = event.streams;
      const stream = streams[0] || new MediaStream([track]);
      const streamId = stream.id;

      if (track.kind === "audio") {
        // Check if this audio belongs to a screen share stream (not camera)
        // Screen share audio will come with the same stream as screen share video
        if (remoteScreenSharingRef.current && remoteScreenStreamRef.current) {
          // If this audio is from the screen share stream, don't add to camera
          if (streamId === remoteScreenStreamRef.current.id) {
            // Audio is already part of screen share stream, nothing to do
            return;
          }
        }

        // This is camera/microphone audio - add to camera stream
        if (remoteCameraStreamRef.current) {
          const existingAudio = remoteCameraStreamRef.current.getAudioTracks();
          if (existingAudio.length === 0) {
            remoteCameraStreamRef.current.addTrack(track);
          }
        } else {
          remoteCameraStreamRef.current = stream;
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = stream;
          }
        }
        return;
      }

      if (track.kind === "video") {
        // KEY DECISION: Is this a camera or screen share?

        // If we DON'T have a camera stream yet, this is the camera
        if (!remoteCameraStreamRef.current) {
          remoteCameraStreamRef.current = stream;
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = stream;
          }
          return;
        }

        // We already have a camera stream...
        // If remote is screen sharing, this new track is the screen share
        if (remoteScreenSharingRef.current) {
          // Store the screen share stream reference (for audio routing check)
          remoteScreenStreamRef.current = stream;

          // Pass to parent for main viewer (right side)
          if (onScreenShareChangeRef.current) {
            onScreenShareChangeRef.current(stream);
          }

          // When track ends, clear screen share
          track.onended = () => {
            remoteScreenStreamRef.current = null;
            if (onScreenShareChangeRef.current) {
              onScreenShareChangeRef.current(null);
            }
          };
          return;
        }

        // Not screen sharing - might be camera renegotiation, update camera
        remoteCameraStreamRef.current = stream;
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = stream;
        }
      }
    };

    pc.onconnectionstatechange = () => {};

    // Handle negotiation needed (when we add/remove tracks)
    pc.onnegotiationneeded = async () => {
      if (!isInitiatorRef.current) {
        return;
      }

      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        sendSignal("offer", pc.localDescription);
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

    // Reset tracking
    remoteCameraStreamRef.current = null;

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
          remoteCameraStreamRef.current = null;
          remoteScreenStreamRef.current = null;
          setRemoteScreenSharing(false);
          remoteScreenSharingRef.current = false;
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
    // 🔥 Screen share signals
    else if (signalType === "screen-share-start") {
      setRemoteScreenSharing(true);
      remoteScreenSharingRef.current = true; // Update ref immediately for ontrack
    } else if (signalType === "screen-share-stop") {
      setRemoteScreenSharing(false);
      remoteScreenSharingRef.current = false;
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
    remoteScreenSharingRef.current = false;
    remoteCameraStreamRef.current = null;
    remoteScreenStreamRef.current = null;

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

  async function startScreenShare() {
    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true, // 🔊 Enable system audio sharing
      });

      screenStreamRef.current = displayStream;
      const displayTrack = displayStream.getVideoTracks()[0];
      const displayAudioTrack = displayStream.getAudioTracks()[0]; // May be null if user didn't check "Share audio"
      const pc = pcRef.current;

      // Signal remote FIRST so they know the next video track is screen share
      sendSignal("screen-share-start", {});

      // Small delay to ensure signal arrives before track
      await new Promise((resolve) => setTimeout(resolve, 100));

      if (pc) {
        // Add video track
        if (displayTrack) {
          const sender = pc.addTrack(displayTrack, displayStream);
          screenSenderRef.current = sender;
        }

        // Add audio track if available
        if (displayAudioTrack) {
          pc.addTrack(displayAudioTrack, displayStream);
        }
      }

      setScreenOn(true);

      // 🔥 LOCAL screen share - show in main viewer on teacher's side too
      if (onScreenShareChangeRef.current) {
        onScreenShareChangeRef.current(displayStream);
      }

      displayTrack.onended = () => {
        stopScreenShare();
      };
    } catch (err) {
      console.error("Screen share failed", err);
      setError("Could not start screen sharing.");
    }
  }

  async function stopScreenShare() {
    // Signal remote first
    sendSignal("screen-share-stop", {});

    const pc = pcRef.current;

    if (pc && screenSenderRef.current) {
      try {
        pc.removeTrack(screenSenderRef.current);
        screenSenderRef.current = null;
      } catch (err) {
        console.warn("[PrepVideoCall] Error removing track:", err);
      }
    }

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
          {/* Remote camera - always shows other person's face */}
          <video
            ref={remoteVideoRef}
            className="prep-video__remote"
            autoPlay
            playsInline
          />
          {/* Local camera - always shows your face */}
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
      </div>
    </section>
  );
}
