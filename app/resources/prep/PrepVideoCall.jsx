// app/resources/prep/PrepVideoCall.jsx
"use client";

import { useEffect, useRef, useState } from "react";

const STUN_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

export default function PrepVideoCall({ resourceId }) {
  // idle | connecting | waiting | in-call
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [screenOn, setScreenOn] = useState(false);

  const [isInitiator, setIsInitiator] = useState(false);
  const [peerJoined, setPeerJoined] = useState(false);

  const wsRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  // ─────────────────────────────────────────────────────────────
  // Helpers for WebRTC
  // ─────────────────────────────────────────────────────────────
  function toggleTracksEnabled(tracks, enabled) {
    tracks.forEach((t) => {
      t.enabled = enabled;
    });
  }

  function createPeerConnection() {
    if (pcRef.current) return pcRef.current;

    const pc = new RTCPeerConnection({ iceServers: STUN_SERVERS });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal("candidate", event.candidate);
      }
    };

    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (state === "connected") {
        setStatus("in-call");
        setPeerJoined(true);
      } else if (state === "failed" || state === "disconnected") {
        // We could try reconnection later; for now just log
        console.warn("Peer connection state:", state);
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

      // Show local preview
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Add tracks to peer connection
      const pc = createPeerConnection();
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      // Respect current mic/cam toggles
      toggleTracksEnabled(stream.getAudioTracks(), micOn);
      toggleTracksEnabled(stream.getVideoTracks(), camOn);

      return stream;
    } catch (err) {
      console.error("Failed to get user media", err);
      setError("Could not access camera/microphone.");
      setStatus("idle");
      throw err;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // WebSocket signaling
  // ─────────────────────────────────────────────────────────────
  function sendSignal(signalType, data) {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(
      JSON.stringify({
        type: "signal",
        signalType,
        data,
      })
    );
  }

  async function handleSignalMessage(msg) {
    const { signalType, data } = msg;
    const pc = createPeerConnection();

    if (signalType === "offer") {
      // Ensure we have local media before answering
      if (!localStreamRef.current) {
        await startLocalMedia();
      }
      await pc.setRemoteDescription(
        new RTCPeerConnection.prototype.remoteDescription.constructor(data)
      );
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      sendSignal("answer", pc.localDescription);
    } else if (signalType === "answer") {
      await pc.setRemoteDescription(
        new RTCPeerConnection.prototype.remoteDescription.constructor(data)
      );
    } else if (signalType === "candidate") {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(data));
      } catch (err) {
        console.warn("Error adding ICE candidate", err);
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
  }

  // ─────────────────────────────────────────────────────────────
  // Start / leave / cleanup
  // ─────────────────────────────────────────────────────────────
  async function startCall() {
    if (!resourceId) {
      setError("Missing resourceId.");
      return;
    }
    if (status !== "idle") return;

    setError("");
    setStatus("connecting");

    // Start local media immediately so we see ourselves while waiting
    try {
      await startLocalMedia();
    } catch {
      return;
    }

    // Build WebSocket URL pointing to backend (NEXT_PUBLIC_API_BASE_URL)
    let wsUrl = "";
    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;

    if (apiBase) {
      const url = new URL(apiBase);
      url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
      url.pathname = "/ws/prep";
      url.search = "";
      wsUrl = url.toString();
    } else {
      // Fallback: same-origin (only works if frontend and backend share host)
      const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      wsUrl = `${wsProtocol}//${window.location.host}/ws/prep`;
    }

    console.log("[PrepVideoCall] connecting to", wsUrl);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus("waiting");
      ws.send(
        JSON.stringify({
          type: "join",
          roomId: resourceId,
        })
      );
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

        case "joined":
          // Server tells us whether we're first or second in the room
          setIsInitiator(!!msg.isInitiator);
          setPeerJoined(false);
          break;

        case "peer-joined":
          setPeerJoined(true);
          // If we're the initiator and we already have local media, create offer
          if (isInitiator && localStreamRef.current) {
            await createAndSendOffer();
          }
          break;

        case "peer-left":
          setPeerJoined(false);
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = null;
          }
          break;

        case "signal":
          await handleSignalMessage(msg);
          break;

        default:
          break;
      }
    };
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
    setPeerJoined(false);
    setScreenOn(false);

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

    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;

    if (wsRef.current) {
      wsRef.current = null;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Controls: mic, camera, screen share
  // ─────────────────────────────────────────────────────────────
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
      });
      screenStreamRef.current = displayStream;

      const displayTrack = displayStream.getVideoTracks()[0];
      const pc = pcRef.current;
      if (!pc) return;

      // Replace outgoing video track
      const sender = pc
        .getSenders()
        .find((s) => s.track && s.track.kind === "video");
      if (sender) {
        await sender.replaceTrack(displayTrack);
      }

      // Show shared screen locally too
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = displayStream;
      }

      setScreenOn(true);

      displayTrack.onended = () => {
        stopScreenShare();
      };
    } catch (err) {
      console.error("Screen share failed", err);
      setError("Could not start screen sharing.");
    }
  }

  async function stopScreenShare() {
    const displayStream = screenStreamRef.current;
    if (displayStream) {
      displayStream.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }

    const pc = pcRef.current;
    const cameraStream = localStreamRef.current;
    if (pc && cameraStream) {
      const cameraTrack = cameraStream.getVideoTracks()[0];
      const sender = pc
        .getSenders()
        .find((s) => s.track && s.track.kind === "video");
      if (sender && cameraTrack) {
        await sender.replaceTrack(cameraTrack);
      }
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = cameraStream;
      }
    }

    setScreenOn(false);
  }

  function toggleScreen() {
    if (screenOn) {
      stopScreenShare();
    } else {
      startScreenShare();
    }
  }

  // Cleanup when component unmounts
  useEffect(() => {
    return () => {
      leaveCall();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const inCall = status === "in-call";

  // ─────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────
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
          {/* Remote video (main) */}
          <video
            ref={remoteVideoRef}
            className="prep-video__remote"
            autoPlay
            playsInline
          />

          {/* Local preview (small) */}
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
            disabled={status === "idle"}
          >
            {micOn ? "🔊 Mic on" : "🔇 Mic off"}
          </button>

          <button
            type="button"
            className="prep-video__icon-btn"
            onClick={toggleCamera}
            disabled={status === "idle"}
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
          <p className="prep-video__hint">Connecting to server…</p>
        )}
        {status === "waiting" && (
          <p className="prep-video__hint">
            Waiting for another person to join this prep room…
          </p>
        )}
        {inCall && !peerJoined && (
          <p className="prep-video__hint">
            In call. Waiting for the other side to connect…
          </p>
        )}
      </div>
    </section>
  );
}
