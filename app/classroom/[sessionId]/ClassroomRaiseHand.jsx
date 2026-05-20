// app/classroom/[sessionId]/ClassroomRaiseHand.jsx
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Hand } from "lucide-react";

/* ─── Soft acknowledgment tone (Web Audio API) ─────────────────────────── */
function playRaiseHandTone() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    // Two-note chime: soft, warm
    osc.type = "sine";
    osc.frequency.setValueAtTime(660, ctx.currentTime);
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
    osc.onended = () => ctx.close();
  } catch (_) {
    // Audio not available — silently ignore
  }
}

/* ─── Elapsed time formatter ───────────────────────────────────────────── */
function formatElapsed(raisedAtMs) {
  if (!raisedAtMs) return "";
  const sec = Math.max(0, Math.floor((Date.now() - raisedAtMs) / 1000));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/* ─── Single badge with live elapsed counter ───────────────────────────── */
function RaiseHandBadge({ userName, raisedAt, onLower }) {
  const [elapsed, setElapsed] = useState(() => formatElapsed(raisedAt));

  useEffect(() => {
    if (!raisedAt) return;
    setElapsed(formatElapsed(raisedAt));
    const id = setInterval(() => setElapsed(formatElapsed(raisedAt)), 1000);
    return () => clearInterval(id);
  }, [raisedAt]);

  return (
    <div className="cr-raise-hand-badge">
      <span className="cr-raise-hand-badge__icon">✋</span>
      <span className="cr-raise-hand-badge__name">{userName}</span>
      {elapsed && (
        <span className="cr-raise-hand-badge__elapsed">{elapsed}</span>
      )}
      {onLower && (
        <button
          type="button"
          className="cr-raise-hand-badge__dismiss"
          onClick={() => onLower(userName)}
          aria-label={`Lower ${userName}'s hand`}
          title="Lower hand"
        >
          ×
        </button>
      )}
    </div>
  );
}

/* ─── Persistent Raise Hand Overlay ─────────────────────────────────────── */
export function ClassroomRaiseHandOverlay({ raisedHands, isTeacher, onLowerHand }) {
  if (!raisedHands || raisedHands.length === 0) return null;

  return (
    <div className="cr-raise-hand-overlay" aria-live="polite">
      {raisedHands.map((entry) => {
        const name = typeof entry === "string" ? entry : entry.userName;
        const raisedAt = typeof entry === "string" ? null : entry.raisedAt;
        return (
          <RaiseHandBadge
            key={name}
            userName={name}
            raisedAt={raisedAt}
            onLower={isTeacher ? onLowerHand : undefined}
          />
        );
      })}
    </div>
  );
}

/* ─── Raise Hand Toggle Button ───────────────────────────────────────────── */
export function ClassroomRaiseHandButton({ isHandRaised, onToggleHand }) {
  return (
    <button
      type="button"
      className={`cr-controls__btn cr-controls__btn--ghost ${isHandRaised ? "cr-controls__btn--active" : ""}`}
      onClick={onToggleHand}
      aria-label={isHandRaised ? "Lower hand" : "Raise hand"}
      title={isHandRaised ? "Lower hand" : "Raise hand"}
    >
      <span className="cr-controls__btn-icon">
        <Hand size={16} fill={isHandRaised ? "currentColor" : "none"} />
      </span>
      <span className="cr-controls__btn-label">
        {isHandRaised ? "Lower" : "Raise"} Hand
      </span>
    </button>
  );
}

/* ─── Hook: manage raise hand state + WebSocket ───────────────────────── */
export function useClassroomRaiseHand(classroomChannel, userName, { isTeacher = false } = {}) {
  // Map<userName, raisedAtMs>
  const [raisedHandsMap, setRaisedHandsMap] = useState(new Map());
  const [isHandRaised, setIsHandRaised] = useState(false);
  const isTeacherRef = useRef(isTeacher);
  useEffect(() => { isTeacherRef.current = isTeacher; }, [isTeacher]);

  const ready = classroomChannel?.ready ?? false;
  const send = classroomChannel?.send ?? (() => {});
  const subscribe = classroomChannel?.subscribe ?? (() => () => {});

  // Toggle my own hand
  const toggleHand = useCallback(() => {
    if (!ready) return;

    const newState = !isHandRaised;
    setIsHandRaised(newState);
    const name = userName || "Someone";

    // Update local state immediately
    setRaisedHandsMap((prev) => {
      const next = new Map(prev);
      if (newState) next.set(name, Date.now());
      else next.delete(name);
      return next;
    });

    // Broadcast to others
    send({
      type: "RAISE_HAND",
      isRaised: newState,
      userName: name,
    });
  }, [ready, send, userName, isHandRaised]);

  const lowerHand = useCallback(
    (targetUserName = userName) => {
      if (!ready || !targetUserName) return;

      setRaisedHandsMap((prev) => {
        const next = new Map(prev);
        next.delete(targetUserName);
        return next;
      });

      if (targetUserName === userName) {
        setIsHandRaised(false);
      }

      send({
        type: "RAISE_HAND",
        isRaised: false,
        userName: targetUserName,
      });
    },
    [ready, send, userName]
  );

  // Receive from others
  useEffect(() => {
    if (!ready) return;

    const unsub = subscribe((msg) => {
      if (msg?.type === "RAISE_HAND" && msg.userName) {
        if (msg.userName === userName) {
          setIsHandRaised(Boolean(msg.isRaised));
        }

        setRaisedHandsMap((prev) => {
          const next = new Map(prev);
          if (msg.isRaised) {
            next.set(msg.userName, Date.now());
            // Play tone for the teacher when someone else raises
            if (isTeacherRef.current && msg.userName !== userName) {
              playRaiseHandTone();
            }
          } else {
            next.delete(msg.userName);
          }
          return next;
        });
      }
    });

    return unsub;
  }, [ready, subscribe, userName]);

  // Convert Map to sorted array (longest-waiting first) with timestamps
  const raisedHands = Array.from(raisedHandsMap.entries())
    .sort((a, b) => a[1] - b[1])
    .map(([name, raisedAt]) => ({ userName: name, raisedAt }));

  return { 
    raisedHands,
    isHandRaised, 
    toggleHand,
    lowerHand,
  };
}
