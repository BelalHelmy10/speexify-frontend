// app/resources/prep/PrepVideoCall.jsx
"use client";

import { useEffect, useRef, useState } from "react";

const ICE_SERVERS = [
  { urls: "stun:167.172.34.31:3478" },
  {
    urls: "turn:167.172.34.31:3478",
    username: "speexifyturn",
    credential: "belalBILLYhelmy10b",
  },
  {
    urls: "turn:167.172.34.31:3478?transport=tcp",
    username: "speexifyturn",
    credential: "belalBILLYhelmy10b",
  },
];

/**
 * Wrapper component:
 * - mode = "one-to-one" → original behavior
 * - mode = "group"      → new multiparty behavior
 *
 * Your ClassroomShell currently calls this WITHOUT mode, so it defaults
 * to one-to-one and nothing changes until you explicitly pass mode="group".
 */
export default function PrepVideoCall(props) {
  const { mode = "one-to-one" } = props;

  if (mode === "group") {
    return <GroupPrepVideoCall {...props} />;
  }

  return <OneToOnePrepVideoCall {...props} />;
}

/* ============================================================================
 * GROUP IMPLEMENTATION (NEW)
 * ==========================================================================*/

function createClientId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `client-${Math.random().toString(36).slice(2)}-${Date.now()}`;
}

function GroupPrepVideoCall({ roomId, isTeacher = false }) {
  const [status, setStatus] = useState("idle"); // idle | connecting | in-call
  const [error, setError] = useState("");

  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);

  // All participants: local + remotes
  const [participants, setParticipants] = useState([]); // [{id, name, role, isLocal, stream}]

  const wsRef = useRef(null);
  const localStreamRef = useRef(null);
  const peerConnectionsRef = useRef(new Map()); // remoteId -> RTCPeerConnection
  const remoteStreamsRef = useRef(new Map()); // remoteId -> MediaStream

  const myIdRef = useRef(createClientId());

  const localVideoRefs = useRef(new Map()); // id -> HTMLVideoElement

  function toggleTracksEnabled(tracks, enabled) {
    tracks.forEach((t) => {
      t.enabled = enabled;
    });
  }

  async function startLocalMedia() {
    if (localStreamRef.current) return localStreamRef.current;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      localStreamRef.current = stream;

      toggleTracksEnabled(stream.getAudioTracks(), micOn);
      toggleTracksEnabled(stream.getVideoTracks(), camOn);

      // Register local participant
      setParticipants((prev) => {
        const others = prev.filter((p) => !p.isLocal);
        return [
          ...others,
          {
            id: myIdRef.current,
            name: isTeacher ? "Teacher" : "Learner",
            role: isTeacher ? "teacher" : "learner",
            isLocal: true,
            stream,
          },
        ];
      });

      // Attach to all existing peer connections (if any)
      peerConnectionsRef.current.forEach((pc) => {
        stream.getTracks().forEach((track) => {
          pc.addTrack(track, stream);
        });
      });

      return stream;
    } catch (err) {
      console.error("[GroupPrepVideoCall] Failed to get user media", err);
      setError("Could not access camera/microphone.");
      throw err;
    }
  }

  function sendSignal(signalType, data) {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.warn(
        "[GroupPrepVideoCall] WS not open, cannot send:",
        signalType
      );
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

  function sendIntro() {
    sendSignal("intro", {
      clientId: myIdRef.current,
      role: isTeacher ? "teacher" : "learner",
      displayName: isTeacher ? "Teacher" : "Learner",
    });
  }

  function getOrCreatePeerConnection(remoteId) {
    const existing = peerConnectionsRef.current.get(remoteId);
    if (existing) return existing;

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    // ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal("candidate", {
          fromId: myIdRef.current,
          toId: remoteId,
          candidate: event.candidate,
        });
      }
    };

    // Remote track(s)
    pc.ontrack = (event) => {
      const [stream] = event.streams;
      if (!stream) return;

      remoteStreamsRef.current.set(remoteId, stream);

      setParticipants((prev) => {
        const others = prev.filter((p) => p.id !== remoteId);
        const existing = prev.find((p) => p.id === remoteId);
        if (existing) {
          return [
            ...others,
            {
              ...existing,
              stream,
            },
          ];
        }

        // If we somehow didn't get an intro yet, create a generic entry
        return [
          ...others,
          {
            id: remoteId,
            name: "Participant",
            role: "learner",
            isLocal: false,
            stream,
          },
        ];
      });
    };

    // Connection state
    pc.onconnectionstatechange = () => {
      if (
        pc.connectionState === "disconnected" ||
        pc.connectionState === "failed" ||
        pc.connectionState === "closed"
      ) {
        cleanupRemotePeer(remoteId);
      }
    };

    // If we already have local media, attach tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    peerConnectionsRef.current.set(remoteId, pc);
    return pc;
  }

  function cleanupRemotePeer(remoteId) {
    const pc = peerConnectionsRef.current.get(remoteId);
    if (pc) {
      try {
        pc.close();
      } catch (e) {
        // ignore
      }
      peerConnectionsRef.current.delete(remoteId);
    }

    const stream = remoteStreamsRef.current.get(remoteId);
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      remoteStreamsRef.current.delete(remoteId);
    }

    setParticipants((prev) => prev.filter((p) => p.id !== remoteId));
  }

  async function handleIntro(data) {
    const { clientId, role, displayName } = data || {};
    if (!clientId || clientId === myIdRef.current) return;

    // Update participant list
    setParticipants((prev) => {
      const others = prev.filter((p) => p.id !== clientId);
      const existing = prev.find((p) => p.id === clientId);
      const stream =
        existing?.stream || remoteStreamsRef.current.get(clientId) || null;

      return [
        ...others,
        {
          id: clientId,
          name: displayName || (role === "teacher" ? "Teacher" : "Learner"),
          role: role || "learner",
          isLocal: false,
          stream,
        },
      ];
    });

    // Only teacher proactively initiates connections
    if (isTeacher) {
      const pc = getOrCreatePeerConnection(clientId);
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        sendSignal("offer", {
          fromId: myIdRef.current,
          toId: clientId,
          description: pc.localDescription,
        });
      } catch (err) {
        console.error("[GroupPrepVideoCall] Failed to create/send offer", err);
      }
    }
  }

  async function handleOffer(data) {
    const { fromId, toId, description } = data || {};
    if (!fromId || toId !== myIdRef.current || !description) return;

    // Ensure we have local media before answering
    if (!localStreamRef.current) {
      await startLocalMedia();
    }

    const pc = getOrCreatePeerConnection(fromId);

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(description));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      sendSignal("answer", {
        fromId: myIdRef.current,
        toId: fromId,
        description: pc.localDescription,
      });
    } catch (err) {
      console.error("[GroupPrepVideoCall] Error handling offer", err);
    }
  }

  async function handleAnswer(data) {
    const { fromId, toId, description } = data || {};
    if (!fromId || toId !== myIdRef.current || !description) return;

    const pc = peerConnectionsRef.current.get(fromId);
    if (!pc) return;

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(description));
    } catch (err) {
      console.error("[GroupPrepVideoCall] Error handling answer", err);
    }
  }

  async function handleCandidate(data) {
    const { fromId, toId, candidate } = data || {};
    if (!fromId || toId !== myIdRef.current || !candidate) return;

    const pc = getOrCreatePeerConnection(fromId);

    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      console.warn("[GroupPrepVideoCall] Error adding ICE candidate", err);
    }
  }

  async function handleSignalMessage(msg) {
    const { signalType, data } = msg;

    switch (signalType) {
      case "intro":
        await handleIntro(data);
        break;
      case "offer":
        await handleOffer(data);
        break;
      case "answer":
        await handleAnswer(data);
        break;
      case "candidate":
        await handleCandidate(data);
        break;
      default:
        // Ignore unknown signal types; keeps backward-compat with other clients.
        break;
    }
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

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = async () => {
      ws.send(JSON.stringify({ type: "join", roomId }));
    };

    ws.onerror = (ev) => {
      console.error("[GroupPrepVideoCall] WebSocket error", ev);
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
          setError(
            "This classroom is full. (Server is limited to a certain number of participants.)"
          );
          setStatus("idle");
          break;

        case "joined":
          // We are now in the room. Start local media and introduce ourselves.
          try {
            await startLocalMedia();
            setStatus("in-call");
            sendIntro();
          } catch {
            // error already set
          }
          break;

        case "peer-joined":
          // Someone new joined; re-send intro so they learn about us.
          sendIntro();
          break;

        case "signal":
          await handleSignalMessage(msg);
          break;

        case "peer-left":
          // We don't know which peer from this message, but each peer connection
          // will detect disconnect and clean itself up via onconnectionstatechange.
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

    // Close WS
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {}
      wsRef.current = null;
    }

    // Close all peer connections
    peerConnectionsRef.current.forEach((pc) => {
      try {
        pc.close();
      } catch {}
    });
    peerConnectionsRef.current.clear();

    // Stop local media
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }

    // Stop remote streams
    remoteStreamsRef.current.forEach((stream) => {
      stream.getTracks().forEach((t) => t.stop());
    });
    remoteStreamsRef.current.clear();

    // Clear participants
    setParticipants([]);
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
        <h2 className="prep-video__title">Live video (group)</h2>
        <p className="prep-video__subtitle">
          Group call: 1 teacher and multiple learners in this classroom.
        </p>
      </header>

      {error && <p className="prep-video__error">{error}</p>}

      <div className="prep-video__body">
        <div className="prep-video__frame-wrapper prep-video__frame-wrapper--group">
          {participants.length === 0 && (
            <div className="prep-video__placeholder">
              No one is in the call yet.
            </div>
          )}

          {participants.map((p) => (
            <div key={p.id} className="prep-video__tile">
              <video
                ref={(el) => {
                  if (!el) {
                    localVideoRefs.current.delete(p.id);
                    return;
                  }
                  localVideoRefs.current.set(p.id, el);
                  if (p.stream && el.srcObject !== p.stream) {
                    el.srcObject = p.stream;
                    el.play().catch(() =>
                      console.warn("[GroupPrepVideoCall] play() failed")
                    );
                  }
                }}
                className={
                  p.isLocal
                    ? "prep-video__local"
                    : "prep-video__remote prep-video__remote--group"
                }
                muted={p.isLocal}
                autoPlay
                playsInline
              />
              <div className="prep-video__name-tag">
                {p.name}{" "}
                {p.role === "teacher" && (
                  <span className="prep-video__role-tag">Teacher</span>
                )}
                {p.isLocal && <span className="prep-video__role-tag">You</span>}
              </div>
            </div>
          ))}
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

          {/* For now, screen share is not implemented in group mode */}
          <button
            type="button"
            className="prep-video__icon-btn"
            disabled
            title="Screen share is not yet available in group calls."
          >
            🖥 Share screen (soon)
          </button>
        </div>

        {status === "connecting" && (
          <p className="prep-video__hint">Connecting…</p>
        )}
      </div>
    </section>
  );
}

/* ============================================================================
 * ORIGINAL ONE-TO-ONE IMPLEMENTATION (UNCHANGED)
 * ==========================================================================*/

function OneToOnePrepVideoCall({
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

  const remoteCameraStreamRef = useRef(null);
  const remoteScreenStreamRef = useRef(null);
  const remoteScreenSharingRef = useRef(false);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  const onScreenShareChangeRef = useRef(onScreenShareStreamChange);
  useEffect(() => {
    onScreenShareChangeRef.current = onScreenShareStreamChange;
  }, [onScreenShareStreamChange]);

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

    pc.ontrack = (event) => {
      const track = event.track;
      const streams = event.streams;
      const stream = streams[0] || new MediaStream([track]);
      const streamId = stream.id;

      if (track.kind === "audio") {
        if (remoteScreenSharingRef.current && remoteScreenStreamRef.current) {
          if (streamId === remoteScreenStreamRef.current.id) {
            return;
          }
        }

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
        if (!remoteCameraStreamRef.current) {
          remoteCameraStreamRef.current = stream;
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = stream;
          }
          return;
        }

        if (remoteScreenSharingRef.current) {
          remoteScreenStreamRef.current = stream;

          if (onScreenShareChangeRef.current) {
            onScreenShareChangeRef.current(stream);
          }

          track.onended = () => {
            remoteScreenStreamRef.current = null;
            if (onScreenShareChangeRef.current) {
              onScreenShareChangeRef.current(null);
            }
          };
          return;
        }

        remoteCameraStreamRef.current = stream;
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = stream;
        }
      }
    };

    pc.onconnectionstatechange = () => {};
    pc.onnegotiationneeded = () => {};

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
    } else if (signalType === "screen-share-start") {
      setRemoteScreenSharing(true);
      remoteScreenSharingRef.current = true;
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
        audio: true,
      });

      screenStreamRef.current = displayStream;
      const displayTrack = displayStream.getVideoTracks()[0];
      const displayAudioTrack = displayStream.getAudioTracks()[0];
      const pc = pcRef.current;

      sendSignal("screen-share-start", {});

      await new Promise((resolve) => setTimeout(resolve, 100));

      if (pc) {
        if (displayTrack) {
          const sender = pc.addTrack(displayTrack, displayStream);
          screenSenderRef.current = sender;
        }

        if (displayAudioTrack) {
          pc.addTrack(displayAudioTrack, displayStream);
        }

        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          sendSignal("offer", pc.localDescription);
        } catch (err) {
          console.error("[PrepVideoCall] Renegotiation failed:", err);
        }
      }

      setScreenOn(true);

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
    sendSignal("screen-share-stop", {});

    const pc = pcRef.current;

    if (pc && screenSenderRef.current) {
      try {
        pc.removeTrack(screenSenderRef.current);
        screenSenderRef.current = null;

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        sendSignal("offer", pc.localDescription);
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
      </div>
    </section>
  );
}
