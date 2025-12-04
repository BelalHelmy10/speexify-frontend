// app/classroom/[sessionId]/ClassroomChat.jsx
"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Classroom chat between teacher and learner.
 * Features:
 *  - Timestamps on messages
 *  - Empty state
 *  - Auto-scroll
 *  - Role-based styling
 */
export default function ClassroomChat({
  classroomChannel,
  sessionId,
  isTeacher,
  teacherName = "Teacher",
  learnerName = "Learner",
}) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (!messagesEndRef.current) return;
    messagesEndRef.current.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }, [messages]);

  // Listen for incoming chat messages on the classroom channel
  useEffect(() => {
    if (!classroomChannel || !classroomChannel.ready) return;
    if (!classroomChannel.subscribe) return;

    const unsubscribe = classroomChannel.subscribe((msg) => {
      if (!msg) return;

      if (msg.type === "CHAT_MESSAGE") {
        if (String(msg.sessionId) !== String(sessionId)) return;
        // Avoid duplicates (from our own optimistic update)
        setMessages((prev) => {
          const exists = prev.some(
            (m) =>
              m.ts === msg.ts &&
              m.fromRole === msg.fromRole &&
              m.text === msg.text
          );
          if (exists) return prev;
          return [...prev, msg];
        });
      }

      if (msg.type === "TYPING_INDICATOR") {
        if (String(msg.sessionId) !== String(sessionId)) return;
        // Show typing indicator from the other person
        const fromTeacher = msg.fromRole === "teacher";
        if ((isTeacher && !fromTeacher) || (!isTeacher && fromTeacher)) {
          setIsTyping(msg.isTyping);
        }
      }
    });

    return unsubscribe;
  }, [classroomChannel, sessionId, isTeacher]);

  // Send typing indicator (debounced)
  // Send typing indicator (debounced)
  useEffect(() => {
    if (!classroomChannel || !classroomChannel.send) return;

    // If input is empty, immediately send "not typing"
    if (!input.trim()) {
      classroomChannel.send({
        type: "TYPING_INDICATOR",
        sessionId: String(sessionId),
        fromRole: isTeacher ? "teacher" : "learner",
        isTyping: false,
      });
      return;
    }

    const timeout = setTimeout(() => {
      classroomChannel.send({
        type: "TYPING_INDICATOR",
        sessionId: String(sessionId),
        fromRole: isTeacher ? "teacher" : "learner",
        isTyping: false,
      });
    }, 1500);

    classroomChannel.send({
      type: "TYPING_INDICATOR",
      sessionId: String(sessionId),
      fromRole: isTeacher ? "teacher" : "learner",
      isTyping: true,
    });

    return () => clearTimeout(timeout);
  }, [input, classroomChannel, sessionId, isTeacher]);

  function handleSubmit(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;

    const message = {
      type: "CHAT_MESSAGE",
      sessionId: String(sessionId),
      fromRole: isTeacher ? "teacher" : "learner",
      text,
      ts: Date.now(),
    };

    // Send over websocket
    if (classroomChannel && classroomChannel.send) {
      classroomChannel.send(message);
    }

    // Optimistic local update
    setMessages((prev) => [...prev, message]);
    setInput("");

    // Keep focus on input
    inputRef.current?.focus();
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  function handleBlur() {
    // Clear typing indicator when input loses focus
    if (classroomChannel && classroomChannel.send) {
      classroomChannel.send({
        type: "TYPING_INDICATOR",
        sessionId: String(sessionId),
        fromRole: isTeacher ? "teacher" : "learner",
        isTyping: false,
      });
    }
  }

  const viewerRole = isTeacher ? "teacher" : "learner";
  const viewerLabel = isTeacher ? teacherName : learnerName;
  const otherLabel = isTeacher ? learnerName : teacherName;

  return (
    <div className="cr-chat" aria-label="Classroom chat panel">
      {/* Messages */}
      <div
        className="cr-chat__messages"
        role="log"
        aria-label="Chat messages"
        aria-live="polite"
      >
        {messages.length === 0 ? (
          <div className="cr-chat__empty">
            <span className="cr-chat__empty-icon">💬</span>
            <p className="cr-chat__empty-text">No messages yet</p>
            <p className="cr-chat__empty-hint">
              Start the conversation with your{" "}
              {isTeacher ? "learner" : "teacher"}
            </p>
          </div>
        ) : (
          messages.map((m, idx) => {
            const isFromTeacher = m.fromRole === "teacher";
            const isSelf = m.fromRole === viewerRole;
            const label = isFromTeacher ? teacherName : learnerName;
            const time = formatTime(m.ts);

            return (
              <div
                key={`${m.ts}-${idx}`}
                className={`cr-chat__message ${
                  isSelf ? "cr-chat__message--self" : "cr-chat__message--other"
                } ${
                  isFromTeacher
                    ? "cr-chat__message--teacher"
                    : "cr-chat__message--learner"
                }`}
                role="article"
                aria-label={`${label} at ${time}: ${m.text}`}
              >
                <div className="cr-chat__bubble">
                  <div className="cr-chat__bubble-header">
                    <span className="cr-chat__bubble-name">{label}</span>
                    <span className="cr-chat__bubble-time">{time}</span>
                  </div>
                  <div className="cr-chat__bubble-text">{m.text}</div>
                </div>
              </div>
            );
          })
        )}

        {/* Typing indicator */}
        {isTyping && (
          <div className="cr-chat__typing">
            <span className="cr-chat__typing-dots">
              <span></span>
              <span></span>
              <span></span>
            </span>
            <span className="cr-chat__typing-text">
              {otherLabel} is typing…
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        className="cr-chat__form"
        onSubmit={handleSubmit}
        aria-label="Send a message"
      >
        <input
          ref={inputRef}
          className="cr-chat__input"
          type="text"
          placeholder="Type a message…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          aria-label="Chat message"
          autoComplete="off"
        />
        <button
          className="cr-chat__send"
          type="submit"
          disabled={!input.trim()}
          aria-label="Send message"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22,2 15,22 11,13 2,9" />
          </svg>
        </button>
      </form>
    </div>
  );
}

/* -----------------------------------------------------------
   Helper: Format timestamp
----------------------------------------------------------- */
function formatTime(ts) {
  if (!ts) return "";
  const date = new Date(ts);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
