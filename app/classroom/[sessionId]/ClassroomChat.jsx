// app/classroom/[sessionId]/ClassroomChat.jsx
"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Simple 1-to-1 chat between teacher and learner.
 *
 * Props:
 *  - classroomChannel: { ready, send, subscribe }
 *  - sessionId: string
 *  - isTeacher: boolean
 *  - teacherName?: string
 *  - learnerName?: string
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
  const messagesEndRef = useRef(null);

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
      if (!msg || msg.type !== "CHAT_MESSAGE") return;
      if (String(msg.sessionId) !== String(sessionId)) return;

      setMessages((prev) => [...prev, msg]);
    });

    return unsubscribe;
  }, [classroomChannel, sessionId]);

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

    // send over websocket
    if (classroomChannel && classroomChannel.send) {
      classroomChannel.send(message);
    }

    // optimistic local update
    setMessages((prev) => [...prev, message]);
    setInput("");
  }

  const viewerRole = isTeacher ? "teacher" : "learner";
  const viewerLabel = isTeacher ? teacherName : learnerName;

  return (
    <div className="spx-classroom-chat" aria-label="Classroom chat panel">
      <div className="spx-classroom-chat__header">
        <span className="spx-classroom-chat__title">Classroom chat</span>
        <span className="spx-classroom-chat__role">
          You are{" "}
          <strong>
            {viewerLabel} ({isTeacher ? "Teacher" : "Learner"})
          </strong>
        </span>
      </div>

      <div
        className="spx-classroom-chat__messages"
        role="list"
        aria-label="Chat messages"
      >
        {messages.map((m, idx) => {
          const isFromTeacher = m.fromRole === "teacher";
          const isSelf = m.fromRole === viewerRole;
          const label = isFromTeacher ? teacherName : learnerName;

          const roleClass = isFromTeacher
            ? " spx-classroom-chat__message--teacher"
            : " spx-classroom-chat__message--learner";

          return (
            <div
              key={m.ts ?? idx}
              className={
                "spx-classroom-chat__message" +
                (isSelf ? " spx-classroom-chat__message--self" : "") +
                roleClass
              }
              role="listitem"
              aria-label={`${label}: ${m.text}`}
            >
              <div className="spx-classroom-chat__bubble">
                <div className="spx-classroom-chat__bubble-label">{label}</div>
                <div className="spx-classroom-chat__bubble-text">{m.text}</div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <form
        className="spx-classroom-chat__form"
        onSubmit={handleSubmit}
        aria-label="Send a message"
      >
        <input
          className="spx-classroom-chat__input"
          type="text"
          placeholder="Type a message…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          aria-label="Chat message"
        />
        <button className="spx-classroom-chat__send" type="submit">
          Send
        </button>
      </form>
    </div>
  );
}
