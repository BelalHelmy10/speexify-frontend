// app/classroom/[sessionId]/ClassroomChat.jsx
"use client";

import { useEffect, useRef, useState } from "react";

export default function ClassroomChat({
  classroomChannel,
  sessionId,
  userId,
  userName,
}) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const listRef = useRef(null);

  const ready = classroomChannel?.ready ?? false;
  const send = classroomChannel?.send ?? (() => {});
  const subscribe = classroomChannel?.subscribe ?? (() => () => {});

  // listen for chat messages
  useEffect(() => {
    if (!ready) return;

    const unsubscribe = subscribe((msg) => {
      if (!msg || msg.type !== "CHAT_MESSAGE") return;
      if (String(msg.sessionId) !== String(sessionId)) return;

      setMessages((prev) => [...prev, msg]);
    });

    return unsubscribe;
  }, [ready, sessionId, subscribe]);

  // auto-scroll to bottom on new message
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || !ready) return;

    const msg = {
      type: "CHAT_MESSAGE",
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      sessionId: String(sessionId),
      userId: userId ?? null,
      userName: userName || "Unknown",
      text: trimmed,
      createdAt: Date.now(),
    };

    // send over channel + append locally
    send(msg);
    setMessages((prev) => [...prev, msg]);
    setInput("");
  }

  return (
    <div className="classroom-chat">
      <div className="classroom-chat__messages" ref={listRef}>
        {messages.map((m) => {
          const isOwn =
            userId && m.userId && String(m.userId) === String(userId);
          const senderLabel = (m.userName || "Unknown").toUpperCase();

          return (
            <div
              key={m.id}
              className={
                "classroom-chat__message" +
                (isOwn
                  ? " classroom-chat__message--own"
                  : " classroom-chat__message--other")
              }
            >
              <div className="classroom-chat__sender">{senderLabel}</div>
              <div className="classroom-chat__bubble">{m.text}</div>
            </div>
          );
        })}
      </div>

      <form className="classroom-chat__form" onSubmit={handleSubmit}>
        <input
          className="classroom-chat__input"
          placeholder="Type a message…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button
          type="submit"
          className="classroom-chat__send"
          disabled={!ready || !input.trim()}
        >
          Send
        </button>
      </form>
    </div>
  );
}
