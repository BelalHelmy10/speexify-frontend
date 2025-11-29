// app/classroom/[sessionId]/ClassroomChat.jsx
"use client";

import { useEffect, useRef, useState } from "react";

export default function ClassroomChat({
  classroomChannel,
  sessionId,
  isTeacher,
  currentUserId,
  userName,
  otherName,
}) {
  const [messages, setMessages] = useState([]);
  const [pending, setPending] = useState("");
  const listRef = useRef(null);

  const role = isTeacher ? "teacher" : "learner";

  // Listen for incoming chat messages
  useEffect(() => {
    if (!classroomChannel?.ready || !classroomChannel.subscribe) return;

    const unsubscribe = classroomChannel.subscribe((msg) => {
      if (!msg) return;

      // We accept both old and new message types
      const isChatType =
        msg.type === "CHAT_MESSAGE" || msg.type === "CLASSROOM_CHAT_MESSAGE";
      if (!isChatType) return;

      // If sessionId is present, make sure it matches this classroom
      if (msg.sessionId && msg.sessionId !== String(sessionId)) return;

      setMessages((prev) => {
        if (msg.id && prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });

    return unsubscribe;
  }, [classroomChannel, sessionId]);

  // Always scroll to the newest message
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  function handleSend(e) {
    if (e) e.preventDefault();
    const text = pending.trim();
    if (!text || !classroomChannel?.ready) return;

    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    const message = {
      type: "CHAT_MESSAGE", // keep this string to match the signaling layer
      id,
      sessionId: String(sessionId),
      senderId: currentUserId || role, // fallback if we DON'T have an id
      senderRole: role,
      senderName: userName,
      text,
      createdAt: Date.now(),
    };

    // optimistic update
    setMessages((prev) => [...prev, message]);
    classroomChannel.send(message);
    setPending("");
  }

  return (
    <div className="classroom-chat">
      <div ref={listRef} className="classroom-chat__messages">
        {messages.map((msg) => {
          const isOwn = currentUserId
            ? msg.senderId === currentUserId
            : msg.senderRole === role;

          const displayName =
            msg.senderName ||
            (isOwn ? userName : otherName) ||
            (msg.senderRole === "teacher" ? "Teacher" : "Learner");

          return (
            <div
              key={msg.id || msg.createdAt}
              className={
                "classroom-chat__message " +
                (isOwn
                  ? "classroom-chat__message--own"
                  : "classroom-chat__message--other")
              }
            >
              <div className="classroom-chat__sender">{displayName}</div>
              <div
                className={
                  "classroom-chat__bubble " +
                  (isOwn
                    ? "classroom-chat__bubble--own"
                    : "classroom-chat__bubble--other")
                }
              >
                {msg.text}
              </div>
            </div>
          );
        })}
      </div>

      <form className="classroom-chat__input-row" onSubmit={handleSend}>
        <input
          className="classroom-chat__input"
          placeholder="Type a message..."
          value={pending}
          onChange={(e) => setPending(e.target.value)}
        />
        <button
          type="submit"
          className="classroom-chat__send-button"
          disabled={!pending.trim()}
        >
          Send
        </button>
      </form>
    </div>
  );
}
