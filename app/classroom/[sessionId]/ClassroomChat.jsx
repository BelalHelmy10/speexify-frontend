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
 */
export default function ClassroomChat({
  classroomChannel,
  sessionId,
  isTeacher,
}) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef(null);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (!messagesEndRef.current) return;
    messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
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

  return (
    <div className="classroom-chat">
      <div className="classroom-chat__header">
        <span className="classroom-chat__title">Classroom chat</span>
        <span className="classroom-chat__role">
          You are {isTeacher ? "Teacher" : "Learner"}
        </span>
      </div>

      <div className="classroom-chat__messages">
        {messages.map((m, idx) => {
          const isSelf = m.fromRole === (isTeacher ? "teacher" : "learner");
          const label = m.fromRole === "teacher" ? "Teacher" : "Learner";

          return (
            <div
              key={m.ts ?? idx}
              className={
                "classroom-chat__message" +
                (isSelf ? " classroom-chat__message--self" : "")
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

      <form className="classroom-chat__form" onSubmit={handleSubmit}>
        <input
          className="classroom-chat__input"
          type="text"
          placeholder="Type a message…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button className="classroom-chat__send" type="submit">
          Send
        </button>
      </form>
    </div>
  );
}
