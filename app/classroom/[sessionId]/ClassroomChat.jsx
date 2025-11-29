// app/classroom/[sessionId]/ClassroomChat.jsx
"use client";

import { useEffect, useRef, useState } from "react";

export default function ClassroomChat({
  classroomChannel,
  sessionId,
  userId,
  userName,
  isTeacher,
}) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef(null);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    if (!messagesEndRef.current) return;
    messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  // Subscribe to incoming chat messages
  useEffect(() => {
    if (
      !classroomChannel ||
      !classroomChannel.ready ||
      typeof classroomChannel.subscribe !== "function"
    ) {
      return;
    }

    const unsubscribe = classroomChannel.subscribe((msg) => {
      if (!msg || msg.type !== "CHAT_MESSAGE") return;
      if (String(msg.sessionId) !== String(sessionId)) return;

      setMessages((prev) => [...prev, msg]);
    });

    return unsubscribe;
  }, [classroomChannel, sessionId]);

  function actuallySend(text) {
    const trimmed = text.trim();
    if (!trimmed) return;

    const now = Date.now();

    const safeUserId = userId ? String(userId) : "unknown";
    const safeName = userName || (isTeacher ? "Teacher" : "Learner");

    const msg = {
      type: "CHAT_MESSAGE",
      sessionId: String(sessionId),
      fromUserId: safeUserId,
      fromRole: isTeacher ? "teacher" : "learner",
      fromName: safeName,
      text: trimmed,
      ts: now,
    };

    // Optimistic UI
    setMessages((prev) => [...prev, { ...msg, id: `local-${now}` }]);

    if (classroomChannel && typeof classroomChannel.send === "function") {
      try {
        classroomChannel.send(msg);
      } catch (err) {
        console.warn("Failed to send chat message over channel", err);
      }
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    actuallySend(input);
    setInput("");
  }

  function handleKeyDown(e) {
    // Enter = send, Shift+Enter = newline
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault(); // stop the page from scrolling
      actuallySend(input);
      setInput("");
    }
  }

  return (
    <div className="classroom-chat">
      <div className="classroom-chat__messages">
        {messages.map((m) => {
          const mine =
            (m.fromUserId &&
              userId &&
              String(m.fromUserId) === String(userId)) ||
            (m.fromRole === "teacher" && isTeacher) ||
            (m.fromRole === "learner" && !isTeacher);

          const label =
            m.fromName || (m.fromRole === "teacher" ? "Teacher" : "Learner");

          return (
            <div
              key={m.id || m.ts}
              className={
                "classroom-chat__message" +
                (mine ? " classroom-chat__message--mine" : "")
              }
            >
              <div className="classroom-chat__bubble">
                <div className="classroom-chat__bubble-label">{label}</div>
                <div className="classroom-chat__bubble-text">{m.text}</div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <form className="classroom-chat__input-row" onSubmit={handleSubmit}>
        <textarea
          className="classroom-chat__input"
          rows={1}
          placeholder="Type a message…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button className="classroom-chat__send" type="submit">
          Send
        </button>
      </form>
    </div>
  );
}
