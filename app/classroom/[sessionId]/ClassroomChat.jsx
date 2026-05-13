// app/classroom/[sessionId]/ClassroomChat.jsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MessageSquare } from "lucide-react";
import api from "@/lib/api";

const CHAT_HISTORY_LIMIT = 100;
const TEMP_MESSAGE_PREFIX = "temp_chat_";

function formatTime(isoString) {
  if (!isoString) return "";
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function getErrorMessage(err, fallback) {
  return err?.response?.data?.error || err?.message || fallback;
}

function createTempId() {
  return `${TEMP_MESSAGE_PREFIX}${Date.now()}_${Math.random()
    .toString(16)
    .slice(2)}`;
}

function normalizeMessage(
  message = {},
  { fallbackMine = false, fallbackCanDelete = false } = {}
) {
  const isDeleted = Boolean(message.isDeleted || message.deletedAt);

  return {
    id: message.id || createTempId(),
    clientId: message.clientId || null,
    type: message.type || "message",
    role: message.role || "learner",
    name:
      message.name ||
      message.senderName ||
      (message.role === "teacher" ? "Teacher" : "Learner"),
    text:
      typeof message.text === "string"
        ? message.text
        : typeof message.body === "string"
          ? message.body
          : "",
    at: message.at || message.createdAt || new Date().toISOString(),
    updatedAt: message.updatedAt || null,
    senderId: message.senderId ?? null,
    isMine:
      typeof message.isMine === "boolean" ? message.isMine : fallbackMine,
    isDeleted,
    deletedAt: message.deletedAt || null,
    canDelete: isDeleted
      ? false
      : Boolean(message.canDelete ?? fallbackCanDelete),
    deliveryStatus: message.deliveryStatus || "sent",
    error: message.error || "",
  };
}

function toSocketMessage(message) {
  const safeMessage = { ...message };
  delete safeMessage.canDelete;
  delete safeMessage.deliveryStatus;
  delete safeMessage.error;
  delete safeMessage.isMine;
  return safeMessage;
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
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [hasMoreHistory, setHasMoreHistory] = useState(false);
  const [nextBefore, setNextBefore] = useState(null);

  // Other user is typing.
  const [otherTypingName, setOtherTypingName] = useState(null);

  const myRole = isTeacher ? "teacher" : "learner";
  const myName = isTeacher
    ? teacherName || "Teacher"
    : learnerName || "Learner";

  const ready = classroomChannel?.ready ?? false;
  const send = classroomChannel?.send ?? (() => undefined);
  const subscribe = classroomChannel?.subscribe ?? (() => () => undefined);

  const messagesEndRef = useRef(null);
  const knownMessageIdsRef = useRef(new Set());
  const otherTypingTimeoutRef = useRef(null);
  const localTypingTimeoutRef = useRef(null);
  const hasSentTypingRef = useRef(false);
  const hasAnnouncedJoinRef = useRef(false);
  const hasAnnouncedLeaveRef = useRef(false);
  const seenSystemEventsRef = useRef(new Set());

  const appendOrMergeMessage = useCallback(
    (
      message,
      {
        countAsUnread = true,
        fallbackMine = false,
        fallbackCanDelete = false,
      } = {}
    ) => {
      const normalized = normalizeMessage(message, {
        fallbackMine,
        fallbackCanDelete,
      });
      const isKnown = knownMessageIdsRef.current.has(normalized.id);
      knownMessageIdsRef.current.add(normalized.id);

      setMessages((prev) => {
        const existingIndex = prev.findIndex((item) => item.id === normalized.id);
        if (existingIndex === -1) {
          return [...prev, normalized];
        }

        const next = [...prev];
        const existing = next[existingIndex];
        next[existingIndex] = {
          ...existing,
          ...normalized,
          isMine: existing.isMine || normalized.isMine,
          canDelete: normalized.isDeleted
            ? false
            : existing.canDelete || normalized.canDelete,
        };
        return next;
      });

      if (
        !isKnown &&
        !normalized.isMine &&
        countAsUnread &&
        !isOpen &&
        typeof onUnreadCountChange === "function"
      ) {
        onUnreadCountChange((prev) =>
          typeof prev === "number" ? prev + 1 : 1
        );
      }

      return normalized;
    },
    [isOpen, onUnreadCountChange]
  );

  const replaceMessage = useCallback(
    (oldId, message, options = {}) => {
      const normalized = normalizeMessage(message, options);
      knownMessageIdsRef.current.delete(oldId);
      knownMessageIdsRef.current.add(normalized.id);

      setMessages((prev) => {
        let replaced = false;
        const withoutDuplicate = prev.filter(
          (item) => item.id === oldId || item.id !== normalized.id
        );
        const next = withoutDuplicate.map((item) => {
          if (item.id !== oldId) return item;
          replaced = true;
          return normalized;
        });
        return replaced ? next : [...next, normalized];
      });

      return normalized;
    },
    []
  );

  const broadcastChatMessage = useCallback(
    (message) => {
      if (!ready) return;
      try {
        const socketMessage = toSocketMessage(message);
        send({
          type: "CHAT_MESSAGE",
          sessionId,
          message: socketMessage,
          id: socketMessage.id,
          role: socketMessage.role,
          name: socketMessage.name,
          text: socketMessage.text,
          at: socketMessage.at,
          senderId: socketMessage.senderId,
        });
      } catch (err) {
        console.warn("Failed to broadcast chat message", err);
      }
    },
    [ready, send, sessionId]
  );

  const broadcastDeletedMessage = useCallback(
    (message) => {
      if (!ready) return;
      try {
        send({
          type: "CHAT_DELETE",
          sessionId,
          message: toSocketMessage(message),
          messageId: message.id,
          at: new Date().toISOString(),
        });
      } catch (err) {
        console.warn("Failed to broadcast deleted chat message", err);
      }
    },
    [ready, send, sessionId]
  );

  const loadInitialHistory = useCallback(async () => {
    if (!sessionId) return;

    setIsLoadingHistory(true);
    setHistoryError("");
    setHasMoreHistory(false);
    setNextBefore(null);

    try {
      const res = await api.get(`/sessions/${sessionId}/chat/messages`, {
        params: { limit: CHAT_HISTORY_LIMIT },
      });
      const normalized = (res.data?.messages || []).map((message) =>
        normalizeMessage(message)
      );

      setMessages((prev) => {
        const byId = new Map(
          normalized.map((message) => [message.id, message])
        );
        prev
          .filter(
            (message) =>
              message.deliveryStatus === "sending" ||
              message.deliveryStatus === "failed" ||
              message.type === "system_local"
          )
          .forEach((message) => {
            if (!byId.has(message.id)) byId.set(message.id, message);
          });

        const next = Array.from(byId.values());
        knownMessageIdsRef.current = new Set(
          next.map((message) => message.id)
        );
        return next;
      });
      setHasMoreHistory(Boolean(res.data?.hasMore));
      setNextBefore(res.data?.nextBefore || null);
    } catch (err) {
      setHistoryError(
        getErrorMessage(err, "Chat transcript could not be loaded.")
      );
      setMessages([]);
      knownMessageIdsRef.current = new Set();
    } finally {
      setIsLoadingHistory(false);
    }
  }, [sessionId]);

  const loadEarlierMessages = useCallback(async () => {
    if (!sessionId || !nextBefore || isLoadingMore) return;

    setIsLoadingMore(true);
    setHistoryError("");

    try {
      const res = await api.get(`/sessions/${sessionId}/chat/messages`, {
        params: { limit: CHAT_HISTORY_LIMIT, before: nextBefore },
      });
      const olderMessages = (res.data?.messages || []).map((message) =>
        normalizeMessage(message)
      );

      setMessages((prev) => {
        const existingIds = new Set(prev.map((message) => message.id));
        const uniqueOlder = olderMessages.filter(
          (message) => !existingIds.has(message.id)
        );
        const next = [...uniqueOlder, ...prev];
        knownMessageIdsRef.current = new Set(
          next.map((message) => message.id)
        );
        return next;
      });

      setHasMoreHistory(Boolean(res.data?.hasMore));
      setNextBefore(res.data?.nextBefore || null);
    } catch (err) {
      setHistoryError(
        getErrorMessage(err, "Earlier chat messages could not be loaded.")
      );
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, nextBefore, sessionId]);

  useEffect(() => {
    hasAnnouncedJoinRef.current = false;
    hasAnnouncedLeaveRef.current = false;
    seenSystemEventsRef.current = new Set();
    knownMessageIdsRef.current = new Set();
    setMessages([]);
    setOtherTypingName(null);
    loadInitialHistory();
  }, [loadInitialHistory, sessionId]);

  useEffect(() => {
    if (!ready) return;

    if (!hasAnnouncedJoinRef.current) {
      hasAnnouncedJoinRef.current = true;

      send({
        type: "CHAT_SYSTEM",
        kind: "join",
        role: myRole,
        name: myName,
        sessionId,
        at: new Date().toISOString(),
      });

      appendOrMergeMessage(
        {
          id: `local_join_${sessionId}_${myRole}`,
          type: "system_local",
          text: `You joined as ${myName} (${myRole})`,
          at: new Date().toISOString(),
        },
        { countAsUnread: false }
      );
    }

    return () => {
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
        // no-op
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  useEffect(() => {
    if (!ready) return;

    const unsubscribe = subscribe((msg) => {
      if (!msg || !msg.type) return;

      if (msg.sessionId && String(msg.sessionId) !== String(sessionId)) {
        return;
      }

      switch (msg.type) {
        case "CHAT_MESSAGE": {
          const incoming = msg.message || {
            id: msg.id,
            type: "message",
            role: msg.role || "unknown",
            name:
              msg.name || (msg.role === "teacher" ? "Teacher" : "Learner"),
            text: msg.text || "",
            at: msg.at || new Date().toISOString(),
            senderId: msg.senderId ?? null,
          };

          appendOrMergeMessage(incoming, {
            countAsUnread: true,
            fallbackMine: false,
            fallbackCanDelete: isTeacher,
          });
          break;
        }

        case "CHAT_DELETE": {
          const incoming = msg.message || {
            id: msg.messageId,
            type: "message",
            isDeleted: true,
            deletedAt: msg.at || new Date().toISOString(),
            at: msg.at || new Date().toISOString(),
          };

          appendOrMergeMessage(incoming, {
            countAsUnread: false,
            fallbackMine: false,
            fallbackCanDelete: false,
          });
          break;
        }

        case "CHAT_SYSTEM": {
          const who = (msg.name || "Someone").trim();
          const kind =
            msg.kind === "join" ? "join" : msg.kind === "leave" ? "leave" : "";
          if (!kind) return;

          const dedupeKey = `${sessionId}:${kind}:${who}`;
          if (seenSystemEventsRef.current.has(dedupeKey)) return;
          seenSystemEventsRef.current.add(dedupeKey);

          const systemText =
            kind === "join"
              ? `${who} joined the classroom`
              : `${who} left the classroom`;

          appendOrMergeMessage(
            {
              id: msg.id || `system_${kind}_${who}`,
              type: "system",
              text: systemText,
              at: msg.at || new Date().toISOString(),
            },
            { countAsUnread: false }
          );
          break;
        }

        case "CHAT_TYPING": {
          if (msg.role === myRole && msg.name === myName) return;

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
  }, [
    appendOrMergeMessage,
    isTeacher,
    myName,
    myRole,
    ready,
    sessionId,
    subscribe,
  ]);

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
    [myName, myRole, ready, send, sessionId]
  );

  const handleInputChange = (e) => {
    const nextValue = e.target.value;
    setInputValue(nextValue);

    if (nextValue.trim() && !hasSentTypingRef.current) {
      hasSentTypingRef.current = true;
      sendTyping(true);
    }

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

  const persistMessage = useCallback(
    async (text, tempId) => {
      const res = await api.post(`/sessions/${sessionId}/chat/messages`, {
        text,
      });

      const saved = replaceMessage(tempId, res.data?.message, {
        fallbackMine: true,
        fallbackCanDelete: true,
      });
      broadcastChatMessage(saved);
      return saved;
    },
    [broadcastChatMessage, replaceMessage, sessionId]
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    const text = inputValue.trim();
    if (!text || isSending) return;

    setIsSending(true);
    setInputValue("");

    const tempId = createTempId();
    appendOrMergeMessage(
      {
        id: tempId,
        clientId: tempId,
        type: "message",
        role: myRole,
        name: myName,
        text,
        at: new Date().toISOString(),
        isMine: true,
        canDelete: false,
        deliveryStatus: "sending",
      },
      { countAsUnread: false, fallbackMine: true }
    );

    try {
      await persistMessage(text, tempId);
    } catch (err) {
      const error = getErrorMessage(err, "Message failed to send.");
      appendOrMergeMessage(
        {
          id: tempId,
          clientId: tempId,
          type: "message",
          role: myRole,
          name: myName,
          text,
          at: new Date().toISOString(),
          isMine: true,
          canDelete: false,
          deliveryStatus: "failed",
          error,
        },
        { countAsUnread: false, fallbackMine: true }
      );
    } finally {
      setIsSending(false);

      if (hasSentTypingRef.current) {
        hasSentTypingRef.current = false;
        sendTyping(false);
      }
      if (localTypingTimeoutRef.current) {
        clearTimeout(localTypingTimeoutRef.current);
        localTypingTimeoutRef.current = null;
      }

      if (isOpen && typeof onUnreadCountChange === "function") {
        onUnreadCountChange(0);
      }
    }
  };

  const handleRetryMessage = async (message) => {
    if (!message?.text) return;

    appendOrMergeMessage(
      {
        ...message,
        deliveryStatus: "sending",
        error: "",
      },
      { countAsUnread: false, fallbackMine: true }
    );

    try {
      await persistMessage(message.text, message.id);
    } catch (err) {
      appendOrMergeMessage(
        {
          ...message,
          deliveryStatus: "failed",
          error: getErrorMessage(err, "Message failed to send."),
        },
        { countAsUnread: false, fallbackMine: true }
      );
    }
  };

  const handleDeleteMessage = async (message) => {
    if (!message?.id || message.deliveryStatus !== "sent") return;

    try {
      const res = await api.delete(
        `/sessions/${sessionId}/chat/messages/${message.id}`
      );
      const deleted = appendOrMergeMessage(res.data?.message, {
        countAsUnread: false,
        fallbackCanDelete: false,
      });
      broadcastDeletedMessage(deleted);
    } catch (err) {
      appendOrMergeMessage(
        {
          ...message,
          error: getErrorMessage(err, "Message could not be deleted."),
        },
        { countAsUnread: false }
      );
    }
  };

  useEffect(() => {
    if (isOpen && typeof onUnreadCountChange === "function") {
      onUnreadCountChange(0);
    }
  }, [isOpen, onUnreadCountChange]);

  useEffect(() => {
    if (!messagesEndRef.current || isLoadingMore) return;
    messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [isLoadingMore, messages]);

  const hasMessages = messages.length > 0;
  const transcriptStatus = historyError
    ? "Transcript unavailable"
    : isLoadingHistory
      ? "Loading transcript"
      : "Transcript saved";

  return (
    <div className="cr-chat">
      <div className="cr-chat__statusbar">
        <span>{transcriptStatus}</span>
        <a
          href={`/api/sessions/${sessionId}/chat/export`}
          className="cr-chat__export"
          target="_blank"
          rel="noreferrer"
        >
          Export
        </a>
      </div>

      <div className="cr-chat__messages" data-lenis-prevent>
        {hasMoreHistory && (
          <button
            type="button"
            className="cr-chat__load-more"
            onClick={loadEarlierMessages}
            disabled={isLoadingMore}
          >
            {isLoadingMore ? "Loading..." : "Load earlier messages"}
          </button>
        )}

        {historyError && (
          <div className="cr-chat__history-error">
            <span>{historyError}</span>
            <button type="button" onClick={loadInitialHistory}>
              Retry
            </button>
          </div>
        )}

        {isLoadingHistory && (
          <div className="cr-chat__loading">Loading transcript...</div>
        )}

        {!isLoadingHistory && !hasMessages && (
          <div className="cr-chat__empty">
            <div className="cr-chat__empty-icon">Chat</div>
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

            const roleClass =
              msg.role === "teacher"
                ? "cr-chat__message--teacher"
                : msg.role === "learner"
                  ? "cr-chat__message--learner"
                  : "";
            const sideClass = msg.isMine
              ? "cr-chat__message--self"
              : "cr-chat__message--other";
            const stateClass = msg.isDeleted
              ? "cr-chat__message--deleted"
              : msg.deliveryStatus === "failed"
                ? "cr-chat__message--failed"
                : "";

            return (
              <div
                key={msg.id}
                className={`cr-chat__message ${roleClass} ${sideClass} ${stateClass}`}
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

                  <div
                    className={`cr-chat__bubble-text ${msg.isDeleted ? "cr-chat__bubble-text--deleted" : ""
                      }`}
                  >
                    {msg.isDeleted ? "Message deleted" : msg.text}
                  </div>

                  {(msg.deliveryStatus === "sending" ||
                    msg.deliveryStatus === "failed" ||
                    msg.error ||
                    (msg.canDelete && !msg.isDeleted)) && (
                      <div className="cr-chat__bubble-footer">
                        {msg.deliveryStatus === "sending" && (
                          <span className="cr-chat__bubble-status">
                            Sending...
                          </span>
                        )}
                        {msg.deliveryStatus === "failed" && (
                          <>
                            <span className="cr-chat__bubble-status cr-chat__bubble-status--failed">
                              {msg.error || "Failed"}
                            </span>
                            <button
                              type="button"
                              className="cr-chat__retry"
                              onClick={() => handleRetryMessage(msg)}
                            >
                              Retry
                            </button>
                          </>
                        )}
                        {msg.error && msg.deliveryStatus !== "failed" && (
                          <span className="cr-chat__bubble-status cr-chat__bubble-status--failed">
                            {msg.error}
                          </span>
                        )}
                        {msg.canDelete &&
                          !msg.isDeleted &&
                          msg.deliveryStatus === "sent" && (
                            <button
                              type="button"
                              className="cr-chat__delete"
                              onClick={() => handleDeleteMessage(msg)}
                            >
                              Delete
                            </button>
                          )}
                      </div>
                    )}
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
              {otherTypingName} is typing...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <form className="cr-chat__form" onSubmit={handleSubmit}>
        <input
          type="text"
          className="cr-chat__input"
          placeholder="Type a message..."
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          maxLength={4000}
        />
        <button
          type="submit"
          className="cr-chat__send"
          disabled={isSending || !inputValue.trim()}
          aria-label="Send message"
          title={ready ? "Send message" : "Send when live sync reconnects"}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M4 20L20 12L4 4V10L14 12L4 14V20Z" fill="currentColor" />
          </svg>
        </button>
      </form>
    </div>
  );
}
