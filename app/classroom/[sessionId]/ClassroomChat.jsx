// app/classroom/[sessionId]/ClassroomChat.jsx
"use client";

import { useEffect, useRef, useState, useCallback } from "react";

const STORAGE_PREFIX = "speexify_classroom_chat_";

function formatTime(isoString) {
  if (!isoString) return "";
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function ClassroomChat({
  classroomChannel,
  sessionId,
  isTeacher,
  teacherName,
  learnerName,
  isOpen = true,
  onUnreadCountChange,
}) {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);

  // “Other user is typing…”
  const [otherTypingName, setOtherTypingName] = useState(null);

  // role + display name for this client
  const myRole = isTeacher ? "teacher" : "learner";
  const myName = isTeacher
    ? teacherName || "Teacher"
    : learnerName || "Learner";

  const ready = classroomChannel?.ready ?? false;
  const send = classroomChannel?.send ?? (() => { });
  const subscribe = classroomChannel?.subscribe ?? (() => () => { });

  const storageKey = `${STORAGE_PREFIX}${sessionId}`;

  const otherTypingTimeoutRef = useRef(null);
  const localTypingTimeoutRef = useRef(null);
  const hasSentTypingRef = useRef(false);

  // ✅ NEW: prevent duplicate join/leave spam on reconnects
  const hasAnnouncedJoinRef = useRef(false);
  const hasAnnouncedLeaveRef = useRef(false);
  const seenSystemEventsRef = useRef(new Set());

  // ─────────────────────────────────────────────────────────────
  // Load persisted chat from localStorage
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setMessages(parsed);
      }
    } catch (err) {
      console.warn("Failed to load classroom chat history", err);
    }
  }, [storageKey]);

  // Persist chat to localStorage whenever it changes
  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(messages));
    } catch (err) {
      console.warn("Failed to persist classroom chat history", err);
    }
  }, [messages, storageKey]);

  useEffect(() => {
    hasAnnouncedJoinRef.current = false;
    hasAnnouncedLeaveRef.current = false;
    seenSystemEventsRef.current = new Set();
  }, [sessionId]);

  // ─────────────────────────────────────────────────────────────
  // Helper: push message into state
  // ─────────────────────────────────────────────────────────────
  const appendMessage = useCallback(
    (msg, { countAsUnread = true } = {}) => {
      setMessages((prev) => [...prev, msg]);

      // If chat is closed, bump unread count in parent
      if (
        !isOpen &&
        countAsUnread &&
        typeof onUnreadCountChange === "function"
      ) {
        onUnreadCountChange((prev) =>
          typeof prev === "number" ? prev + 1 : 1
        );
      }
    },
    [isOpen, onUnreadCountChange]
  );

  // ─────────────────────────────────────────────────────────────
  // Join / leave system messages
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!ready) return;

    // ✅ Only announce JOIN once per session/page load (not on every reconnect)
    if (!hasAnnouncedJoinRef.current) {
      hasAnnouncedJoinRef.current = true;

      // Broadcast join
      send({
        type: "CHAT_SYSTEM",
        kind: "join",
        role: myRole,
        name: myName,
        sessionId,
        at: new Date().toISOString(),
      });

      // Local “you joined” message (not broadcast)
      appendMessage(
        {
          id: `local_join_${sessionId}_${myRole}`,
          type: "system_local",
          text: `You joined as ${myName} (${myRole === "teacher" ? "teacher" : "learner"
            })`,
          at: new Date().toISOString(),
        },
        { countAsUnread: false }
      );
    }

    return () => {
      // ✅ Only announce LEAVE once
      if (hasAnnouncedLeaveRef.current) return;
      hasAnnouncedLeaveRef.current = true;

      try {
        send({
          type: "CHAT_SYSTEM",
          kind: "leave",
          role: myRole,
          name: myName,
          sessionId,
          at: new Date().toISOString(),
        });
      } catch {
        // ignore
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  // ─────────────────────────────────────────────────────────────
  // Listen to incoming messages on the channel
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!ready) return;

    const unsubscribe = subscribe((msg) => {
      if (!msg || !msg.type) return;

      if (msg.sessionId && String(msg.sessionId) !== String(sessionId)) {
        // Different classroom
        return;
      }

      switch (msg.type) {
        case "CHAT_MESSAGE": {
          const isMine =
            msg.role === myRole && (msg.name === myName || !msg.name); // best-effort match

          const messageObj = {
            id:
              msg.id ||
              `remote_${Date.now()}_${Math.random().toString(16).slice(2)}`,
            type: "message",
            role: msg.role || "unknown",
            name: msg.name || (msg.role === "teacher" ? "Teacher" : "Learner"),
            text: msg.text || "",
            at: msg.at || new Date().toISOString(),
            isMine,
          };

          appendMessage(messageObj, { countAsUnread: !isMine });
          break;
        }

        case "CHAT_SYSTEM": {
          const who = (msg.name || "Someone").trim();
          const kind =
            msg.kind === "join" ? "join" : msg.kind === "leave" ? "leave" : "";
          if (!kind) return;

          // ✅ Dedupe: ignore repeated join/leave spam (usually from reconnects)
          const dedupeKey = `${sessionId}:${kind}:${who}`;
          if (seenSystemEventsRef.current.has(dedupeKey)) return;
          seenSystemEventsRef.current.add(dedupeKey);

          const systemText =
            kind === "join"
              ? `${who} joined the classroom`
              : `${who} left the classroom`;

          appendMessage(
            {
              id:
                msg.id ||
                `system_${kind}_${Date.now()}_${Math.random()
                  .toString(16)
                  .slice(2)}`,
              type: "system",
              text: systemText,
              at: msg.at || new Date().toISOString(),
            },
            { countAsUnread: false }
          );
          break;
        }

        case "CHAT_TYPING": {
          // ignore our own typing echoes
          if (msg.role === myRole) return;

          if (msg.isTyping) {
            setOtherTypingName(
              msg.name || (msg.role === "teacher" ? "Teacher" : "Learner")
            );

            if (otherTypingTimeoutRef.current) {
              clearTimeout(otherTypingTimeoutRef.current);
            }
            otherTypingTimeoutRef.current = setTimeout(() => {
              setOtherTypingName(null);
            }, 5000);
          } else {
            setOtherTypingName(null);
            if (otherTypingTimeoutRef.current) {
              clearTimeout(otherTypingTimeoutRef.current);
              otherTypingTimeoutRef.current = null;
            }
          }
          break;
        }

        default:
          break;
      }
    });

    return () => {
      unsubscribe?.();
      if (otherTypingTimeoutRef.current) {
        clearTimeout(otherTypingTimeoutRef.current);
        otherTypingTimeoutRef.current = null;
      }
    };
  }, [ready, subscribe, appendMessage, myRole, myName, sessionId]);

  // ─────────────────────────────────────────────────────────────
  // Local typing: send “is typing” with debounce
  // ─────────────────────────────────────────────────────────────
  const sendTyping = useCallback(
    (isTyping) => {
      if (!ready) return;

      try {
        send({
          type: "CHAT_TYPING",
          isTyping: Boolean(isTyping),
          role: myRole,
          name: myName,
          sessionId,
          at: new Date().toISOString(),
        });
      } catch (err) {
        console.warn("Failed to send typing event", err);
      }
    },
    [ready, send, myRole, myName, sessionId]
  );

  const handleInputChange = (e) => {
    const nextValue = e.target.value;
    setInputValue(nextValue);

    // If user started typing, send typing-on once
    if (nextValue.trim() && !hasSentTypingRef.current) {
      hasSentTypingRef.current = true;
      sendTyping(true);
    }

    // Reset local typing timeout
    if (localTypingTimeoutRef.current) {
      clearTimeout(localTypingTimeoutRef.current);
    }
    localTypingTimeoutRef.current = setTimeout(() => {
      if (hasSentTypingRef.current) {
        hasSentTypingRef.current = false;
        sendTyping(false);
      }
    }, 3000);
  };

  // Clear local typing on blur
  const handleInputBlur = () => {
    if (hasSentTypingRef.current) {
      hasSentTypingRef.current = false;
      sendTyping(false);
    }
    if (localTypingTimeoutRef.current) {
      clearTimeout(localTypingTimeoutRef.current);
      localTypingTimeoutRef.current = null;
    }
  };

  // ─────────────────────────────────────────────────────────────
  // Send message
  // ─────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    const text = inputValue.trim();
    if (!text || !ready) return;

    setIsSending(true);

    const nowIso = new Date().toISOString();
    const id = `chat_${Date.now()}_${Math.random().toString(16).slice(2)}`;

    const outgoing = {
      type: "CHAT_MESSAGE",
      id,
      role: myRole,
      name: myName,
      text,
      at: nowIso,
      sessionId,
    };

    // Optimistic local append
    appendMessage(
      {
        ...outgoing,
        type: "message",
        isMine: true,
      },
      { countAsUnread: false }
    );

    try {
      send(outgoing);
    } catch (err) {
      console.warn("Failed to send chat message", err);
    }

    setInputValue("");
    setIsSending(false);

    // Ensure typing state is reset
    if (hasSentTypingRef.current) {
      hasSentTypingRef.current = false;
      sendTyping(false);
    }
    if (localTypingTimeoutRef.current) {
      clearTimeout(localTypingTimeoutRef.current);
      localTypingTimeoutRef.current = null;
    }

    // When chat is open and user sends a message, reset unread count
    if (isOpen && typeof onUnreadCountChange === "function") {
      onUnreadCountChange(0);
    }
  };

  // When chat just became open, clear unread count
  useEffect(() => {
    if (isOpen && typeof onUnreadCountChange === "function") {
      onUnreadCountChange(0);
    }
  }, [isOpen, onUnreadCountChange]);

  // ─────────────────────────────────────────────────────────────
  // Scroll to bottom on new messages
  // ─────────────────────────────────────────────────────────────
  const messagesEndRef = useRef(null);
  useEffect(() => {
    if (!messagesEndRef.current) return;
    messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  // ─────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────
  const hasMessages = messages.length > 0;

  return (
    <div className="cr-chat">
      <div className="cr-chat__messages" data-lenis-prevent>
        {!hasMessages && (
          <div className="cr-chat__empty">
            <div className="cr-chat__empty-icon">💭</div>
            <p className="cr-chat__empty-text">No messages yet</p>
            <p className="cr-chat__empty-hint">
              Start the conversation with your{" "}
              {isTeacher ? "learner" : "teacher"}.
            </p>
          </div>
        )}

        {hasMessages &&
          messages.map((msg) => {
            if (msg.type === "system" || msg.type === "system_local") {
              return (
                <div
                  key={msg.id}
                  className="cr-chat__message cr-chat__message--system"
                >
                  <div className="cr-chat__bubble cr-chat__bubble--system">
                    <div className="cr-chat__bubble-text">{msg.text}</div>
                    {msg.at && (
                      <div className="cr-chat__bubble-time">
                        {formatTime(msg.at)}
                      </div>
                    )}
                  </div>
                </div>
              );
            }

            const isMine = msg.isMine;
            const roleClass =
              msg.role === "teacher"
                ? "cr-chat__message--teacher"
                : msg.role === "learner"
                  ? "cr-chat__message--learner"
                  : "";

            const sideClass = isMine
              ? "cr-chat__message--self"
              : "cr-chat__message--other";

            return (
              <div
                key={msg.id}
                className={`cr-chat__message ${roleClass} ${sideClass}`}
              >
                <div className="cr-chat__bubble">
                  <div className="cr-chat__bubble-header">
                    <span className="cr-chat__bubble-name">
                      {msg.name ||
                        (msg.role === "teacher" ? "Teacher" : "Learner")}
                    </span>
                    <span className="cr-chat__bubble-time">
                      {formatTime(msg.at)}
                    </span>
                  </div>
                  <div className="cr-chat__bubble-text">{msg.text}</div>
                </div>
              </div>
            );
          })}

        {otherTypingName && (
          <div className="cr-chat__typing">
            <div className="cr-chat__typing-dots">
              <span />
              <span />
              <span />
            </div>
            <div className="cr-chat__typing-text">
              {otherTypingName} is typing…
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <form className="cr-chat__form" onSubmit={handleSubmit}>
        <input
          type="text"
          className="cr-chat__input"
          placeholder="Type a message…"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          disabled={!ready || isSending}
        />
        <button
          type="submit"
          className="cr-chat__send"
          disabled={!ready || isSending || !inputValue.trim()}
          aria-label="Send message"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M4 20L20 12L4 4V10L14 12L4 14V20Z" fill="currentColor" />
          </svg>
        </button>
      </form>
    </div>
  );
}
