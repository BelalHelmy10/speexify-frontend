// app/classroom/[sessionId]/ClassroomChat.jsx
"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Check,
  ChevronDown,
  LockKeyhole,
  MessageSquare,
  RefreshCw,
  Send,
  Users,
  UserRound,
} from "lucide-react";
import api from "@/lib/api";
import { getIntlLocale } from "@/utils/locale";
import { useClassroomText } from "./classroomText";

const CHAT_HISTORY_LIMIT = 100;
const TEMP_MESSAGE_PREFIX = "temp_chat_";

function formatTime(isoString, locale = "en") {
  if (!isoString) return "";
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString(getIntlLocale(locale), { hour: "2-digit", minute: "2-digit" });
}

function getErrorMessage(err, fallback) {
  return err?.response?.data?.error || err?.message || fallback;
}

function createTempId() {
  return `${TEMP_MESSAGE_PREFIX}${Date.now()}_${Math.random()
    .toString(16)
    .slice(2)}`;
}

function normalizeId(value) {
  if (value === null || value === undefined || value === "") return null;
  return String(value);
}

function isDirectMessage(message = {}) {
  return message.visibility === "direct" || message.recipientId != null;
}

function getInitials(name = "") {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return parts.slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function isLearnerChatMessage(message = {}) {
  const type = message.type || "message";
  const role = String(message.role || message.senderRole || "").toLowerCase();
  return type === "message" && role === "learner";
}

function getClientCanDelete(
  message = {},
  { isTeacher = false, fallbackCanDelete = false } = {}
) {
  if (message.isDeleted || message.deletedAt) return false;
  if (isTeacher && isLearnerChatMessage(message)) return true;
  return Boolean(message.canDelete ?? fallbackCanDelete);
}

function normalizeMessage(
  message = {},
  { fallbackMine = false, fallbackCanDelete = false, isTeacher = false } = {}
) {
  const isDeleted = Boolean(message.isDeleted || message.deletedAt);

  return {
    id: message.id || createTempId(),
    clientId: message.clientId || null,
    type: message.type || "message",
    visibility: isDirectMessage(message) ? "direct" : "public",
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
    recipientId: message.recipientId ?? null,
    isMine:
      typeof message.isMine === "boolean" ? message.isMine : fallbackMine,
    isDeleted,
    deletedAt: message.deletedAt || null,
    canDelete: getClientCanDelete(message, {
      isTeacher,
      fallbackCanDelete,
    }),
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

// The text box owns its own state: typing used to re-render the whole chat
// (message list included) on every keystroke.
const ClassroomChatComposer = memo(function ClassroomChatComposer({
  chatMode,
  selectedRecipient,
  historyError,
  isSending,
  ready,
  onChange,
  onBlur,
  onSend,
}) {
  const ct = useClassroomText();
  const [inputValue, setInputValue] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();
    const text = inputValue.trim();
    if (!text || isSending || (chatMode === "direct" && !selectedRecipient)) return;
    setInputValue("");
    void onSend(text);
  };

  return (
    <form
      className={`cr-chat__form${chatMode === "direct" ? " cr-chat__form--private" : ""}${historyError ? " cr-chat__form--disabled" : ""}`}
      onSubmit={handleSubmit}
    >
      {chatMode === "direct" && selectedRecipient && (
        <div className="cr-chat__composer-scope">
          <LockKeyhole size={12} />
          <span>{ct("cr_chat_only_you_and", { name: selectedRecipient.name })}</span>
        </div>
      )}
      <input
        type="text"
        className="cr-chat__input"
        aria-label={ct("cr_chat_message")}
        disabled={Boolean(historyError)}
        placeholder={
          historyError
            ? ct("cr_chat_ph_retry")
            : chatMode === "direct"
            ? selectedRecipient
              ? ct("cr_chat_ph_direct_to", { name: selectedRecipient.name })
              : ct("cr_chat_ph_direct_choose")
            : ct("cr_chat_ph_room")
        }
        value={inputValue}
        onChange={(event) => {
          setInputValue(event.target.value);
          onChange(event.target.value);
        }}
        onBlur={onBlur}
        maxLength={4000}
      />
      <button
        type="submit"
        className="cr-chat__send"
        disabled={
          isSending ||
          Boolean(historyError) ||
          !inputValue.trim() ||
          (chatMode === "direct" && !selectedRecipient)
        }
        aria-label={ct("cr_chat_send")}
        title={
          chatMode === "direct"
            ? ct("cr_chat_send_private")
            : ready
              ? ct("cr_chat_send")
              : ct("cr_chat_send_later")
        }
      >
        {chatMode === "direct" ? <LockKeyhole size={17} /> : <Send size={17} />}
      </button>
    </form>
  );
});

function ClassroomChat({
  classroomChannel,
  sessionId,
  isTeacher,
  teacherName,
  learnerName,
  chatParticipants = [],
  currentUserId = null,
  isOpen = true,
  onUnreadCountChange,
  locale = "en",
}) {
  const ct = useClassroomText();
  // Listeners read the text through a ref so they don't resubscribe.
  const ctRef = useRef(ct);
  ctRef.current = ct;
  // Server errors are in English; Arabic learners get our own wording.
  const errorText = (err, key) => (locale === "ar" ? ct(key) : getErrorMessage(err, ct(key)));
  const [messages, setMessages] = useState([]);
  const [isSending, setIsSending] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [hasMoreHistory, setHasMoreHistory] = useState(false);
  const [nextBefore, setNextBefore] = useState(null);

  // Other user is typing.
  const [otherTypingName, setOtherTypingName] = useState(null);
  const [chatMode, setChatMode] = useState("room");
  const [selectedRecipientId, setSelectedRecipientId] = useState(null);
  const [recipientMenuOpen, setRecipientMenuOpen] = useState(false);

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
  const recipientMenuRef = useRef(null);

  const directRecipients = useMemo(() => {
    const allowedRole = isTeacher ? "learner" : "teacher";
    const seen = new Set();

    return chatParticipants
      .map((participant) => ({
        id: normalizeId(participant?.id),
        name: participant?.name || (allowedRole === "teacher" ? "Teacher" : "Learner"),
        role: participant?.role || allowedRole,
      }))
      .filter((participant) => {
        if (!participant.id || participant.role !== allowedRole || seen.has(participant.id)) {
          return false;
        }
        seen.add(participant.id);
        return true;
      });
  }, [chatParticipants, isTeacher]);

  const selectedRecipient = directRecipients.find(
    (recipient) => recipient.id === normalizeId(selectedRecipientId)
  ) || null;

  const isMessageInCurrentConversation = useCallback(
    (message) => {
      if (chatMode === "room") return !isDirectMessage(message);
      if (!selectedRecipientId || !isDirectMessage(message)) return false;

      const myId = normalizeId(currentUserId);
      const recipientId = normalizeId(selectedRecipientId);
      const senderId = normalizeId(message.senderId);
      const messageRecipientId = normalizeId(message.recipientId);

      return (
        (senderId === recipientId && messageRecipientId === myId) ||
        (senderId === myId && messageRecipientId === recipientId)
      );
    },
    [chatMode, currentUserId, selectedRecipientId]
  );

  useEffect(() => {
    if (chatMode !== "direct") return;

    if (!directRecipients.length) {
      setSelectedRecipientId(null);
      setRecipientMenuOpen(false);
      return;
    }

    if (!directRecipients.some((recipient) => recipient.id === normalizeId(selectedRecipientId))) {
      setSelectedRecipientId(directRecipients[0].id);
    }
  }, [chatMode, directRecipients, selectedRecipientId]);

  useEffect(() => {
    if (!recipientMenuOpen) return undefined;

    const closeOnOutsideClick = (event) => {
      if (!recipientMenuRef.current?.contains(event.target)) {
        setRecipientMenuOpen(false);
      }
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setRecipientMenuOpen(false);
    };

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [recipientMenuOpen]);

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
        isTeacher,
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
        (!isOpen || !isMessageInCurrentConversation(normalized)) &&
        typeof onUnreadCountChange === "function"
      ) {
        onUnreadCountChange((prev) =>
          typeof prev === "number" ? prev + 1 : 1
        );
      }

      return normalized;
    },
    [isTeacher, isMessageInCurrentConversation, onUnreadCountChange]
  );

  const replaceMessage = useCallback(
    (oldId, message, options = {}) => {
      const normalized = normalizeMessage(message, { ...options, isTeacher });
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
    [isTeacher]
  );

  const broadcastChatMessage = useCallback(
    (message) => {
      if (!ready) return;
      try {
        const socketMessage = toSocketMessage(message);

        if (socketMessage.visibility === "direct") {
          send({
            type: "CHAT_PRIVATE_MESSAGE",
            sessionId,
            messageId: socketMessage.id,
            recipientId: socketMessage.recipientId,
          });
          return;
        }

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
        normalizeMessage(message, { isTeacher })
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
        errorText(err, "cr_chat_load_failed")
      );
      setMessages([]);
      knownMessageIdsRef.current = new Set();
    } finally {
      setIsLoadingHistory(false);
    }
  }, [isTeacher, sessionId]);

  const loadEarlierMessages = useCallback(async () => {
    if (!sessionId || !nextBefore || isLoadingMore) return;

    setIsLoadingMore(true);
    setHistoryError("");

    try {
      const res = await api.get(`/sessions/${sessionId}/chat/messages`, {
        params: { limit: CHAT_HISTORY_LIMIT, before: nextBefore },
      });
      const olderMessages = (res.data?.messages || []).map((message) =>
        normalizeMessage(message, { isTeacher })
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
        errorText(err, "cr_chat_more_failed")
      );
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, isTeacher, nextBefore, sessionId]);

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

    // Do not announce a learner before the authenticated account has supplied
    // its real name. In a group session, sending the first fallback name can
    // make the live transcript attribute the wrong person's messages.
    if (!isTeacher && (!myName || myName === "Learner")) return;

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
          text: ctRef.current("cr_chat_you_joined", { name: myName }),
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
  }, [appendOrMergeMessage, isTeacher, myName, myRole, ready, send, sessionId]);

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
              ? ctRef.current("cr_chat_joined", { name: who })
              : ctRef.current("cr_chat_left", { name: who });

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
          if (chatMode !== "room") return;
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

        case "CHAT_PRIVATE_TYPING": {
          if (chatMode !== "direct") return;
          if (normalizeId(msg.senderId) !== normalizeId(selectedRecipientId)) return;

          if (msg.isTyping) {
            setOtherTypingName(msg.name || "Participant");
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
    chatMode,
    selectedRecipientId,
    sessionId,
    subscribe,
  ]);

  const sendTyping = useCallback(
    (isTyping) => {
      if (!ready || (chatMode === "direct" && !selectedRecipientId)) return;

      try {
        send(
          chatMode === "direct"
            ? {
                type: "CHAT_PRIVATE_TYPING",
                isTyping: Boolean(isTyping),
                recipientId: selectedRecipientId,
                role: myRole,
                name: myName,
                sessionId,
              }
            : {
                type: "CHAT_TYPING",
                isTyping: Boolean(isTyping),
                role: myRole,
                name: myName,
                sessionId,
                at: new Date().toISOString(),
              }
        );
      } catch (err) {
        console.warn("Failed to send typing event", err);
      }
    },
    [chatMode, myName, myRole, ready, selectedRecipientId, send, sessionId]
  );

  const handleInputChange = (nextValue) => {

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
    async (text, tempId, recipientId = null) => {
      const res = await api.post(`/sessions/${sessionId}/chat/messages`, {
        text,
        ...(recipientId ? { recipientId } : {}),
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

  // A failed send stays in the list as "failed" with a retry, so the
  // composer can always clear its text.
  const handleSendText = async (rawText) => {
    const text = String(rawText || "").trim();
    const recipientId = chatMode === "direct" ? selectedRecipient?.id : null;
    if (!text || isSending || (chatMode === "direct" && !recipientId)) return false;

    setIsSending(true);

    const tempId = createTempId();
    appendOrMergeMessage(
      {
        id: tempId,
        clientId: tempId,
        type: "message",
        role: myRole,
        name: myName,
        text,
        visibility: recipientId ? "direct" : "public",
        recipientId,
        at: new Date().toISOString(),
        isMine: true,
        canDelete: false,
        deliveryStatus: "sending",
      },
      { countAsUnread: false, fallbackMine: true }
    );

    try {
      await persistMessage(text, tempId, recipientId);
    } catch (err) {
      const error = errorText(err, "cr_chat_send_failed");
      appendOrMergeMessage(
        {
          id: tempId,
          clientId: tempId,
          type: "message",
          role: myRole,
          name: myName,
          text,
          visibility: recipientId ? "direct" : "public",
          recipientId,
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
      await persistMessage(message.text, message.id, message.recipientId);
    } catch (err) {
      appendOrMergeMessage(
        {
          ...message,
          deliveryStatus: "failed",
          error: errorText(err, "cr_chat_send_failed"),
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
          error: errorText(err, "cr_chat_delete_failed"),
        },
        { countAsUnread: false }
      );
    }
  };

  const handleModeChange = (nextMode) => {
    setChatMode(nextMode);
    setOtherTypingName(null);

    if (nextMode === "direct") {
      if (!selectedRecipientId && directRecipients[0]) {
        setSelectedRecipientId(directRecipients[0].id);
      }
      setRecipientMenuOpen(true);
    } else {
      setRecipientMenuOpen(false);
    }
  };

  const handleRecipientSelect = (recipientId) => {
    setSelectedRecipientId(recipientId);
    setRecipientMenuOpen(false);
    setOtherTypingName(null);
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

  const visibleMessages = messages.filter(isMessageInCurrentConversation);
  const hasMessages = visibleMessages.length > 0;
  const transcriptStatus = historyError
    ? ct("cr_chat_transcript_unavailable")
    : isLoadingHistory
      ? ct("cr_chat_transcript_loading")
      : ct("cr_chat_transcript_saved");

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
          {ct("cr_chat_export")}
        </a>
      </div>

      <div className="cr-chat__audience" ref={recipientMenuRef}>
        <div className="cr-chat__audience-switcher" role="tablist" aria-label={ct("cr_chat_audience")}>
          <button
            type="button"
            className={`cr-chat__audience-tab${chatMode === "room" ? " is-active" : ""}`}
            onClick={() => handleModeChange("room")}
            role="tab"
            aria-selected={chatMode === "room"}
          >
            <Users size={14} />
            <span className="cr-chat__audience-tab-label">
              <span>{ct("cr_chat_room")}</span>
              <small>{ct("cr_chat_everyone")}</small>
            </span>
          </button>
          <button
            type="button"
            className={`cr-chat__audience-tab${chatMode === "direct" ? " is-active is-private" : ""}`}
            onClick={() => handleModeChange("direct")}
            role="tab"
            aria-selected={chatMode === "direct"}
          >
            <LockKeyhole size={14} />
            <span className="cr-chat__audience-tab-label">
              <span>{ct("cr_chat_direct")}</span>
              <small>1:1</small>
            </span>
          </button>
        </div>

        {chatMode === "direct" && (
          <div className="cr-chat__recipient-picker">
            <button
              type="button"
              className={`cr-chat__recipient-trigger${recipientMenuOpen ? " is-open" : ""}`}
              onClick={() => setRecipientMenuOpen((open) => !open)}
              aria-expanded={recipientMenuOpen}
              aria-haspopup="listbox"
              disabled={!directRecipients.length}
            >
              <span className="cr-chat__recipient-avatar">
                {selectedRecipient ? getInitials(selectedRecipient.name) : <UserRound size={14} />}
              </span>
              <span className="cr-chat__recipient-copy">
                <small>{ct("cr_chat_private_to")}</small>
                <strong>{selectedRecipient?.name || ct("cr_chat_choose_someone")}</strong>
              </span>
              <ChevronDown size={15} className="cr-chat__recipient-chevron" />
            </button>

            {recipientMenuOpen && directRecipients.length > 0 && (
              <div className="cr-chat__recipient-menu" role="listbox" aria-label={ct("cr_chat_choose_recipient")}>
                <div className="cr-chat__recipient-menu-label">{ct("cr_chat_choose_conversation")}</div>
                {directRecipients.map((recipient) => (
                  <button
                    type="button"
                    key={recipient.id}
                    className={`cr-chat__recipient-option${selectedRecipient?.id === recipient.id ? " is-selected" : ""}`}
                    onClick={() => handleRecipientSelect(recipient.id)}
                    role="option"
                    aria-selected={selectedRecipient?.id === recipient.id}
                  >
                    <span className="cr-chat__recipient-avatar">{getInitials(recipient.name)}</span>
                    <span className="cr-chat__recipient-copy">
                      <strong>{recipient.name}</strong>
                      <small>{recipient.role === "teacher" ? ct("cr_teacher") : ct("cr_learner")}</small>
                    </span>
                    {selectedRecipient?.id === recipient.id && <Check size={15} />}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="cr-chat__messages" data-lenis-prevent>
        {hasMoreHistory && (
          <button
            type="button"
            className="cr-chat__load-more"
            onClick={loadEarlierMessages}
            disabled={isLoadingMore}
          >
            {isLoadingMore ? ct("cr_chat_loading") : ct("cr_chat_load_earlier")}
          </button>
        )}

        {historyError && (
          <div className="cr-chat__error-state" role="alert">
            <div className="cr-chat__error-icon">
              <AlertCircle size={20} />
            </div>
            <strong className="cr-chat__error-title">{ct("cr_chat_error_title")}</strong>
            <span className="cr-chat__error-detail">{historyError}</span>
            <button
              type="button"
              className="cr-chat__error-action"
              onClick={loadInitialHistory}
            >
              <RefreshCw size={14} />
              {ct("cr_error_try_again")}
            </button>
          </div>
        )}

        {isLoadingHistory && (
          <div className="cr-chat__loading">{ct("cr_chat_loading_transcript")}</div>
        )}

        {!isLoadingHistory && !historyError && !hasMessages && (
          <div className="cr-chat__empty">
            <div className="cr-chat__empty-icon" aria-hidden="true">
              <MessageSquare size={20} />
            </div>
            <p className="cr-chat__empty-text">
              {chatMode === "direct"
                ? ct("cr_chat_direct_start", { name: selectedRecipient?.name || ct("cr_chat_this_person") })
                : ct("cr_chat_no_messages")}
            </p>
            <p className="cr-chat__empty-hint">
              {chatMode === "direct"
                ? ct("cr_chat_direct_hint")
                : isTeacher
                  ? ct("cr_chat_start_learner")
                  : ct("cr_chat_start_teacher")}
            </p>
          </div>
        )}

        {!historyError && hasMessages &&
          visibleMessages.map((msg) => {
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
                        {formatTime(msg.at, locale)}
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
                        (msg.role === "teacher" ? ct("cr_teacher") : ct("cr_learner"))}
                    </span>
                    <span className="cr-chat__bubble-time">
                      {formatTime(msg.at, locale)}
                    </span>
                  </div>

                  {isDirectMessage(msg) && (
                    <div className="cr-chat__bubble-scope">
                      <LockKeyhole size={10} />
                      <span>{ct("cr_chat_private")}</span>
                    </div>
                  )}

                  <div
                    className={`cr-chat__bubble-text ${msg.isDeleted ? "cr-chat__bubble-text--deleted" : ""
                      }`}
                  >
                    {msg.isDeleted ? ct("cr_chat_deleted") : msg.text}
                  </div>

                  {(msg.deliveryStatus === "sending" ||
                    msg.deliveryStatus === "failed" ||
                    msg.error ||
                    (msg.canDelete && !msg.isDeleted)) && (
                      <div className="cr-chat__bubble-footer">
                        {msg.deliveryStatus === "sending" && (
                          <span className="cr-chat__bubble-status">
                            {ct("cr_chat_sending")}
                          </span>
                        )}
                        {msg.deliveryStatus === "failed" && (
                          <>
                            <span className="cr-chat__bubble-status cr-chat__bubble-status--failed">
                              {msg.error || ct("cr_chat_failed")}
                            </span>
                            <button
                              type="button"
                              className="cr-chat__retry"
                              onClick={() => handleRetryMessage(msg)}
                            >
                              {ct("cr_chat_retry")}
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
                              {ct("cr_chat_delete")}
                            </button>
                          )}
                      </div>
                    )}
                </div>
              </div>
            );
          })}

        {!historyError && otherTypingName && (
          <div className="cr-chat__typing">
            <div className="cr-chat__typing-dots">
              <span />
              <span />
              <span />
            </div>
            <div className="cr-chat__typing-text">
              {ct("cr_chat_typing", { name: otherTypingName })}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <ClassroomChatComposer
        chatMode={chatMode}
        selectedRecipient={selectedRecipient}
        historyError={historyError}
        isSending={isSending}
        ready={ready}
        onChange={handleInputChange}
        onBlur={handleInputBlur}
        onSend={handleSendText}
      />
    </div>
  );
}

export default memo(ClassroomChat);
