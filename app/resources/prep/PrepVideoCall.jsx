// app/resources/prep/PrepVideoCall.jsx
"use client";

import { useEffect, useRef, useState } from "react";

const STUN_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

export default function PrepVideoCall({ resourceId }) {
  const [status, setStatus] = useState("idle"); // idle | connecting | in-call
  const [error, setError] = useState("");

  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [screenOn, setScreenOn] = useState(false);

  const [peerJoined, setPeerJoined] = useState(false);
  const [isInitiator, setIsInitiator] = useState(false);
  const isInitiatorRef = useRef(false);

  const wsRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  // ─────────────────────────────────────────────────────────────
  // Utility helpers
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
      console.log("[PrepVideoCall] PC state:", state);
      if (
        state === "failed" ||
        state === "disconnected" ||
        state === "closed"
      ) {
        // We leave cleanup to explicit leave / ws close for now
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

      // Add tracks to peer connection
      const pc = createPeerConnection();
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      toggleTracksEnabled(stream.getAudioTracks(), micOn);
      toggleTracksEnabled(stream.getVideoTracks(), camOn);

      return stream;
    } catch (err) {
      console.error("[PrepVideoCall] Failed to get user media", err);
      setError("Could not access camera/microphone.");
      setStatus("idle");
      throw err;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // WebSocket signaling helpers
  // ─────────────────────────────────────────────────────────────
  function buildWsUrl() {
    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
    if (apiBase) {
      const url = new URL(apiBase);
      url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
      url.pathname = "/ws/prep";
      url.search = "";
      return url.toString();
    } else {
      const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      return `${wsProtocol}//${window.location.host}/ws/prep`;
    }
  }

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
        console.warn("[PrepVideoCall] Error adding ICE candidate", err);
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

  // ─────────────────────────────────────────────────────────────
  // Start / leave call
  // ─────────────────────────────────────────────────────────────
  async function startCall() {
    if (!resourceId) {
      setError("Missing resourceId.");
      return;
    }
    if (status !== "idle") return;

    setError("");
    setStatus("connecting");

    const wsUrl = buildWsUrl();
    console.log("[PrepVideoCall] connecting to", wsUrl);

    let ws;
    try {
      ws = new WebSocket(wsUrl);
    } catch (err) {
      console.error("[PrepVideoCall] WebSocket constructor error", err);
      setError("Connection error.");
      setStatus("idle");
      return;
    }

    wsRef.current = ws;

    ws.onopen = () => {
      console.log("[PrepVideoCall] WebSocket open");
      ws.send(
        JSON.stringify({
          type: "join",
          roomId: resourceId,
        })
      );
    };

    ws.onerror = (ev) => {
      console.error("[PrepVideoCall] WebSocket error", ev);
      setError("Connection error.");
    };

    ws.onclose = (ev) => {
      console.log("[PrepVideoCall] WebSocket closed", ev.code, ev.reason);
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
          const initiator = !!msg.isInitiator;
          isInitiatorRef.current = initiator;
          setIsInitiator(initiator);

          console.log(
            "[PrepVideoCall] joined room as",
            initiator ? "initiator" : "peer"
          );

          await startLocalMedia();
          break;
        }

        case "peer-joined":
          console.log("[PrepVideoCall] peer joined");
          setPeerJoined(true);
          if (isInitiatorRef.current && localStreamRef.current) {
            await createAndSendOffer();
          }
          break;

        case "peer-left":
          console.log("[PrepVideoCall] peer left");
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
    isInitiatorRef.current = false;
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
  // Controls: mic / camera / screen
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

      const sender = pc
        .getSenders()
        .find((s) => s.track && s.track.kind === "video");
      if (sender) {
        await sender.replaceTrack(displayTrack);
      }

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = displayStream;
      }

      setScreenOn(true);

      displayTrack.onended = () => {
        stopScreenShare();
      };
    } catch (err) {
      console.error("[PrepVideoCall] Screen share failed", err);
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

  // Cleanup on unmount
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
