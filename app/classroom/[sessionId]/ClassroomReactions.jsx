// app/classroom/[sessionId]/ClassroomReactions.jsx
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { SmilePlus } from "lucide-react";

/* ─── Available reactions ─────────────────────────────────────────────── */
const REACTIONS = [
  { emoji: "✋", label: "Raise hand" },
  { emoji: "👏", label: "Clap" },
  { emoji: "❓", label: "Question" },
  { emoji: "✅", label: "Agree" },
  { emoji: "😂", label: "Laugh" },
  { emoji: "🔥", label: "Fire" },
];

/* ─── Single Floating Reaction ────────────────────────────────────────── */
let reactionIdCounter = 0;

function FloatingReaction({ emoji, userName, onDone, id }) {
  const leftOffset = useRef(15 + Math.random() * 70); // 15-85% from left

  useEffect(() => {
    const timer = setTimeout(onDone, 2400);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div
      className="cr-reaction-float"
      style={{ left: `${leftOffset.current}%` }}
      key={id}
    >
      <span className="cr-reaction-float__emoji">{emoji}</span>
      <span className="cr-reaction-float__name">{userName}</span>
    </div>
  );
}

/* ─── Reactions Overlay (renders floating emoji) ─────────────────────── */
export function ClassroomReactionsOverlay({ reactions, onReactionDone }) {
  return (
    <div className="cr-reactions-overlay" aria-live="polite" aria-atomic="false">
      {reactions.map((r) => (
        <FloatingReaction
          key={r.id}
          id={r.id}
          emoji={r.emoji}
          userName={r.userName}
          onDone={() => onReactionDone(r.id)}
        />
      ))}
    </div>
  );
}

/* ─── Reaction Picker (the button + popup) ───────────────────────────── */
export function ClassroomReactionPicker({ onReact }) {
  const [isOpen, setIsOpen] = useState(false);
  const pickerRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen]);

  const handleReact = (emoji) => {
    onReact(emoji);
    setIsOpen(false);
  };

  return (
    <div className="cr-reaction-picker" ref={pickerRef}>
      <button
        type="button"
        className={`cr-controls__btn cr-controls__btn--ghost ${isOpen ? "cr-controls__btn--active" : ""}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Send a reaction"
        aria-expanded={isOpen}
        title="Reactions"
      >
        <span className="cr-controls__btn-icon"><SmilePlus size={16} /></span>
        <span className="cr-controls__btn-label">React</span>
      </button>

      {isOpen && (
        <div className="cr-reaction-picker__popup" role="menu">
          {REACTIONS.map((r) => (
            <button
              key={r.emoji}
              type="button"
              className="cr-reaction-picker__btn"
              onClick={() => handleReact(r.emoji)}
              aria-label={r.label}
              title={r.label}
              role="menuitem"
            >
              {r.emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Hook: manage reactions state + WebSocket ───────────────────────── */
export function useClassroomReactions(classroomChannel, userName) {
  const [reactions, setReactions] = useState([]);
  const ready = classroomChannel?.ready ?? false;
  const send = classroomChannel?.send ?? (() => {});
  const subscribe = classroomChannel?.subscribe ?? (() => () => {});

  // Send a reaction
  const sendReaction = useCallback(
    (emoji) => {
      if (!ready) return;

      const reaction = {
        id: ++reactionIdCounter,
        emoji,
        userName: userName || "Someone",
      };

      // Show locally immediately
      setReactions((prev) => [...prev, reaction]);

      // Broadcast to others
      send({
        type: "REACTION",
        emoji,
        userName: userName || "Someone",
      });
    },
    [ready, send, userName]
  );

  // Receive reactions from others
  useEffect(() => {
    if (!ready) return;

    const unsub = subscribe((msg) => {
      if (msg?.type === "REACTION" && msg.emoji) {
        const reaction = {
          id: ++reactionIdCounter,
          emoji: msg.emoji,
          userName: msg.userName || "Someone",
        };
        setReactions((prev) => [...prev, reaction]);
      }
    });

    return unsub;
  }, [ready, subscribe]);

  // Remove a finished reaction
  const removeReaction = useCallback((id) => {
    setReactions((prev) => prev.filter((r) => r.id !== id));
  }, []);

  return { reactions, sendReaction, removeReaction };
}
