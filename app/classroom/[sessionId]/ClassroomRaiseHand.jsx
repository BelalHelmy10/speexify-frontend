// app/classroom/[sessionId]/ClassroomRaiseHand.jsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { Hand } from "lucide-react";

/* ─── Persistent Raise Hand Overlay ─────────────────────────────────────── */
export function ClassroomRaiseHandOverlay({ raisedHands }) {
  if (!raisedHands || raisedHands.length === 0) return null;

  return (
    <div className="cr-raise-hand-overlay" aria-live="polite">
      {raisedHands.map((userName) => (
        <div key={userName} className="cr-raise-hand-badge">
          <span className="cr-raise-hand-badge__icon">✋</span>
          <span className="cr-raise-hand-badge__name">{userName}</span>
        </div>
      ))}
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
export function useClassroomRaiseHand(classroomChannel, userName) {
  const [raisedHands, setRaisedHands] = useState(new Set());
  const [isHandRaised, setIsHandRaised] = useState(false);

  const ready = classroomChannel?.ready ?? false;
  const send = classroomChannel?.send ?? (() => {});
  const subscribe = classroomChannel?.subscribe ?? (() => () => {});

  // Toggle my own hand
  const toggleHand = useCallback(() => {
    if (!ready) return;

    const newState = !isHandRaised;
    setIsHandRaised(newState);

    // Update local state immediately
    setRaisedHands((prev) => {
      const next = new Set(prev);
      if (newState) next.add(userName || "Someone");
      else next.delete(userName || "Someone");
      return next;
    });

    // Broadcast to others
    send({
      type: "RAISE_HAND",
      isRaised: newState,
      userName: userName || "Someone",
    });
  }, [ready, send, userName, isHandRaised]);

  // Receive from others
  useEffect(() => {
    if (!ready) return;

    const unsub = subscribe((msg) => {
      if (msg?.type === "RAISE_HAND" && msg.userName) {
        setRaisedHands((prev) => {
          const next = new Set(prev);
          if (msg.isRaised) next.add(msg.userName);
          else next.delete(msg.userName);
          return next;
        });
      }
    });

    return unsub;
  }, [ready, subscribe]);

  return { 
    raisedHands: Array.from(raisedHands), 
    isHandRaised, 
    toggleHand 
  };
}
