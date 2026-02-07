"use client";

import { useEffect, useState, useRef, useCallback, memo } from "react";
import { usePathname } from "next/navigation";
import {
  MessageCircle,
  X,
  Send,
  Loader2,
  ArrowLeft,
  Paperclip,
  AlertCircle,
  Check,
  CheckCheck,
  Download,
  FileText,
} from "lucide-react";
import {
  listSupportTickets,
  getSupportTicket,
  createSupportTicket,
  replyToSupportTicket,
  uploadSupportAttachment,
} from "@/lib/supportApi";
import "@/styles/support-widget.scss";

const CATEGORIES = [
  { key: "PAYMENT", label: "Payment issue", icon: "💳" },
  { key: "BOOKING", label: "Booking / scheduling", icon: "📅" },
  { key: "CLASSROOM_TECH", label: "Classroom / audio / video", icon: "🎥" },
  { key: "ACCOUNT", label: "Account", icon: "👤" },
  { key: "OTHER", label: "Other", icon: "💬" },
];

// Check if file is an image
function isImageFile(mimeType, fileName) {
  if (mimeType && mimeType.startsWith("image/")) return true;
  if (!fileName) return false;
  const ext = fileName.toLowerCase().split(".").pop();
  return ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"].includes(ext);
}

// Format file size
function formatFileSize(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

// Memoized message component - FIXED: Proper image and file handling
const Message = memo(({ message, isUser, getAttachmentUrl, onImageClick }) => {
  const hasAttachments = message.attachments?.length > 0;

  return (
    <div
      className={`sw-message ${isUser ? "sw-message--user" : "sw-message--staff"
        }`}
    >
      {message.body && <div className="sw-message__text">{message.body}</div>}

      {hasAttachments && (
        <div className="sw-message__attachments">
          {message.attachments.map((a) => {
            const isImage = isImageFile(a.mimeType, a.fileName);
            const fileUrl = getAttachmentUrl(a.id);

            if (isImage) {
              // FIXED: Display image inline with proper loading
              return (
                <div key={a.id} className="sw-message__image-wrapper">
                  <img
                    src={fileUrl}
                    alt={a.fileName || "Attachment"}
                    className="sw-message__image"
                    loading="lazy"
                    onClick={() => onImageClick?.(fileUrl, a.fileName)}
                    onError={(e) => {
                      // Fallback if image fails to load
                      e.target.style.display = "none";
                      const parent = e.target.parentElement;
                      if (parent) {
                        parent.innerHTML = `
                          <div class="sw-message__file-download" style="display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem; background: rgba(0,0,0,0.05); border-radius: 8px;">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                              <polyline points="7 10 12 15 17 10"></polyline>
                              <line x1="12" y1="15" x2="12" y2="3"></line>
                            </svg>
                            <span>${a.fileName || "Download file"}</span>
                          </div>
                        `;
                        parent.onclick = () => {
                          const link = document.createElement("a");
                          link.href = fileUrl;
                          link.download = a.fileName || "file";
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        };
                      }
                    }}
                  />
                </div>
              );
            } else {
              // FIXED: Show download link for non-images with proper download behavior
              return (
                <button
                  key={a.id}
                  className="sw-message__file-download"
                  onClick={(e) => {
                    e.preventDefault();
                    // Force download instead of navigation
                    const link = document.createElement("a");
                    link.href = fileUrl;
                    link.download = a.fileName || "file";
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                >
                  <FileText size={16} />
                  <div className="sw-message__file-info">
                    <div className="sw-message__file-name">
                      {a.fileName || "Download file"}
                    </div>
                    {a.fileSize && (
                      <div className="sw-message__file-size">
                        {formatFileSize(a.fileSize)}
                      </div>
                    )}
                  </div>
                  <Download size={14} />
                </button>
              );
            }
          })}
        </div>
      )}

      <div className="sw-message__time">
        {new Date(message.createdAt).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </div>
    </div>
  );
});

Message.displayName = "Message";

// Image lightbox modal - FIXED: Better overlay
const ImageLightbox = memo(({ imageUrl, fileName, onClose }) => {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") onClose();
    };

    // Prevent body scroll when lightbox is open
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  return (
    <div className="sw-lightbox" onClick={onClose}>
      <button
        className="sw-lightbox__close"
        onClick={onClose}
        aria-label="Close"
      >
        <X size={24} />
      </button>
      <div
        className="sw-lightbox__content"
        onClick={(e) => e.stopPropagation()}
      >
        <img src={imageUrl} alt={fileName} className="sw-lightbox__image" />
        {fileName && <div className="sw-lightbox__caption">{fileName}</div>}
        <button
          className="sw-lightbox__download"
          onClick={(e) => {
            e.stopPropagation();
            const link = document.createElement("a");
            link.href = imageUrl;
            link.download = fileName || "image";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }}
        >
          <Download size={16} />
          Download
        </button>
      </div>
    </div>
  );
});

ImageLightbox.displayName = "ImageLightbox";

export default function SupportWidget() {
  const pathname = usePathname();

  // Hide support widget in classroom
  const isClassroom = pathname?.startsWith("/classroom");

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const [tickets, setTickets] = useState([]);
  const [activeTicket, setActiveTicket] = useState(null);
  const [view, setView] = useState("home"); // home | list | ticket

  const [category, setCategory] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(null);

  // Unread badge
  const [unreadCount, setUnreadCount] = useState(0);

  // WebSocket
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const [wsConnected, setWsConnected] = useState(false);

  // Typing
  const [typingUsers, setTypingUsers] = useState(new Set());
  const typingTimeoutRef = useRef(null);

  // Message status
  const [messageStatus, setMessageStatus] = useState("sent");

  // Image lightbox
  const [lightboxImage, setLightboxImage] = useState(null);

  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const getAttachmentUrl = useCallback((attachmentId) => {
    const id = Number(attachmentId);
    if (!Number.isFinite(id)) return "#";
    return `/api/support/attachments/${id}`;
  }, []);

  // ============================================================================
  // LocalStorage helpers
  // ============================================================================
  const getStoredSeen = useCallback(() => {
    if (typeof window === "undefined") return {};
    try {
      return JSON.parse(localStorage.getItem("support_seen") || "{}");
    } catch {
      return {};
    }
  }, []);

  const setStoredSeen = useCallback((map) => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem("support_seen", JSON.stringify(map));
    } catch (err) {
      console.warn("Failed to save to localStorage:", err);
    }
  }, []);

  // ============================================================================
  // WebSocket Connection
  // ============================================================================
  const buildSupportWsUrl = useCallback(() => {
    const apiBase = process.env.NEXT_PUBLIC_API_URL;
    if (apiBase) {
      try {
        const url = new URL(apiBase);
        url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
        url.pathname = "/ws/support";
        url.search = "";
        return url.toString();
      } catch {
        // Fall through to same-origin fallback.
      }
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${window.location.host}/ws/support`;
  }, []);

  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const wsUrl = buildSupportWsUrl();

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("[Support WS] Connected");
        setWsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleWebSocketMessage(data);
        } catch (err) {
          console.error("[Support WS] Failed to parse message:", err);
        }
      };

      ws.onerror = (error) => {
        console.error("[Support WS] Error:", error);
      };

      ws.onclose = () => {
        console.log("[Support WS] Disconnected");
        setWsConnected(false);

        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket();
        }, 3000);
      };
    } catch (err) {
      console.error("[Support WS] Connection failed:", err);
    }
  }, [buildSupportWsUrl]);

  const handleWebSocketMessage = useCallback(
    (data) => {
      const { type } = data;

      switch (type) {
        case "connected":
          console.log("[Support WS] Connection confirmed");
          break;

        case "new_message":
          handleNewMessage(data);
          break;

        case "ticket_status_change":
          handleTicketStatusChange(data);
          break;

        case "typing":
          handleTypingIndicator(data);
          break;

        case "pong":
          break;

        default:
          console.warn("[Support WS] Unknown message type:", type);
      }
    },
    [activeTicket, open]
  );

  const handleNewMessage = useCallback(
    (data) => {
      const { ticketId, message } = data;

      if (activeTicket?.id === ticketId) {
        setActiveTicket((prev) => ({
          ...prev,
          messages: [...(prev?.messages || []), message],
        }));

        const seen = getStoredSeen();
        seen[ticketId] = Number(message.id);
        setStoredSeen(seen);

        setTimeout(
          () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }),
          100
        );
      } else {
        setTickets((prev) => {
          const updated = prev.map((t) =>
            t.id === ticketId
              ? {
                ...t,
                lastMessage: message,
                updatedAt: new Date().toISOString(),
              }
              : t
          );
          return updated.sort(
            (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
          );
        });

        if (message.isStaff && !open) {
          setUnreadCount((prev) => prev + 1);
          playNotificationSound();
        }
      }

      setMessageStatus("delivered");
    },
    [activeTicket, open, getStoredSeen, setStoredSeen]
  );

  const handleTicketStatusChange = useCallback(
    (data) => {
      const { ticketId, status } = data;

      if (activeTicket?.id === ticketId) {
        setActiveTicket((prev) => ({
          ...prev,
          status,
        }));
      }

      setTickets((prev) =>
        prev.map((t) => (t.id === ticketId ? { ...t, status } : t))
      );
    },
    [activeTicket]
  );

  const handleTypingIndicator = useCallback(
    (data) => {
      const { ticketId, userId, isTyping } = data;

      if (activeTicket?.id === ticketId && userId !== activeTicket.userId) {
        setTypingUsers((prev) => {
          const next = new Set(prev);
          if (isTyping) {
            next.add(userId);
          } else {
            next.delete(userId);
          }
          return next;
        });

        if (isTyping) {
          clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => {
            setTypingUsers((prev) => {
              const next = new Set(prev);
              next.delete(userId);
              return next;
            });
          }, 3000);
        }
      }
    },
    [activeTicket]
  );

  const sendTypingIndicator = useCallback(
    (isTyping) => {
      if (wsRef.current?.readyState === WebSocket.OPEN && activeTicket) {
        wsRef.current.send(
          JSON.stringify({
            type: "typing",
            data: {
              ticketId: activeTicket.id,
              isTyping,
            },
          })
        );
      }
    },
    [activeTicket]
  );

  const playNotificationSound = useCallback(() => {
    try {
      const audio = new Audio("/sounds/notification.mp3");
      audio.volume = 0.3;
      audio.play().catch(() => { });
    } catch (err) { }
  }, []);

  useEffect(() => {
    if (open) {
      connectWebSocket();

      const heartbeat = setInterval(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: "ping" }));
        }
      }, 30000);

      return () => {
        clearInterval(heartbeat);
      };
    } else {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    }
  }, [open, connectWebSocket]);

  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  // ============================================================================
  // Ticket Loading
  // ============================================================================
  const loadTicket = useCallback(
    async (id) => {
      setLoading(true);
      setError(null);

      try {
        const res = await getSupportTicket(id);
        const ticket = res.ticket;
        setActiveTicket(ticket);
        setView("ticket");

        const latest = ticket?.messages?.[ticket.messages.length - 1];
        if (latest) {
          const seen = getStoredSeen();
          seen[id] = Number(latest.id);
          setStoredSeen(seen);
        }

        await refreshTickets();

        setTimeout(
          () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }),
          100
        );
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    },
    [getStoredSeen, setStoredSeen]
  );

  const refreshTickets = useCallback(async () => {
    try {
      const res = await listSupportTickets();
      const t = res?.tickets || [];
      setTickets(t);

      const seen = getStoredSeen();
      const unread = t.filter((ticket) => {
        const lm = ticket.lastMessage;
        if (!lm) return false;

        const isStaffMsg = lm.authorId !== ticket.userId;
        if (!isStaffMsg) return false;

        const lastSeenId = Number(seen[ticket.id] || 0);
        return Number(lm.id) > lastSeenId;
      });

      setUnreadCount(unread.length);
    } catch (err) { }
  }, [getStoredSeen]);

  useEffect(() => {
    if (open) {
      setLoading(true);
      refreshTickets().finally(() => setLoading(false));
    }
  }, [open, refreshTickets]);

  // ============================================================================
  // Message Sending
  // ============================================================================
  const sendMessage = useCallback(async () => {
    if (!message.trim() || sending) return;

    setSending(true);
    setError(null);
    setMessageStatus("sending");

    try {
      if (activeTicket) {
        await replyToSupportTicket({
          ticketId: activeTicket.id,
          message,
        });

        await loadTicket(activeTicket.id);
      } else {
        const res = await createSupportTicket({
          category,
          message,
        });

        await refreshTickets();
        await loadTicket(res.ticket.id);
      }

      setMessage("");
      setMessageStatus("sent");
    } catch (e) {
      setError(e.message);
      setMessageStatus("sent");
    } finally {
      setSending(false);
    }
  }, [message, sending, activeTicket, category, loadTicket, refreshTickets]);

  const handleFileSelect = useCallback(
    async (e) => {
      const file = e.target.files?.[0];
      if (!file || !activeTicket) return;

      setSending(true);
      setError(null);

      try {
        await uploadSupportAttachment({
          ticketId: activeTicket.id,
          file,
        });

        await loadTicket(activeTicket.id);
      } catch (e) {
        setError(e.message);
      } finally {
        setSending(false);
        e.target.value = "";
      }
    },
    [activeTicket, loadTicket]
  );

  const handleKeyPress = useCallback(
    (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    },
    [sendMessage]
  );

  const handleTyping = useCallback(
    (e) => {
      setMessage(e.target.value);

      if (activeTicket) {
        sendTypingIndicator(true);

        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
          sendTypingIndicator(false);
        }, 1000);
      }
    },
    [activeTicket, sendTypingIndicator]
  );

  const reset = useCallback(() => {
    setActiveTicket(null);
    setCategory(null);
    setMessage("");
    setError(null);
    setView("home");
  }, []);

  // FIXED: Proper toggle function
  const toggleWidget = useCallback(() => {
    setOpen((prev) => !prev);
    // Reset unread count when opening
    if (!open) {
      setUnreadCount(0);
    }
  }, [open]);

  useEffect(() => {
    if (open && (view === "ticket" || category)) {
      textareaRef.current?.focus();
    }
  }, [open, view, category]);

  const showBack = activeTicket || category || view === "list";

  // Don't render support widget in classroom
  if (isClassroom) {
    return null;
  }

  return (
    <>
      {/* FIXED: FAB Button with proper toggle */}
      <button
        className="sw-fab"
        onClick={toggleWidget}
        aria-label={open ? "Close support" : "Contact support"}
      >
        {open ? <X size={24} /> : <MessageCircle size={24} />}
        {!open && unreadCount > 0 && (
          <span className="sw-fab__badge">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* FIXED: Widget Panel with proper positioning */}
      {open && (
        <div className="sw-panel" data-lenis-prevent>
          {/* FIXED: Header always visible */}
          <header className="sw-header">
            <div className="sw-header__left">
              {showBack && (
                <button
                  onClick={reset}
                  className="sw-header__back"
                  aria-label="Go back"
                >
                  <ArrowLeft size={20} />
                </button>
              )}
              <div>
                <div className="sw-header__title">Support</div>
                {wsConnected && (
                  <div className="sw-header__status">
                    <span className="sw-status-dot"></span>
                    Online
                  </div>
                )}
              </div>
            </div>

            {/* FIXED: Close button always visible */}
            <button
              onClick={() => setOpen(false)}
              className="sw-header__close"
              aria-label="Close support"
            >
              <X size={20} />
            </button>
          </header>

          {/* Body */}
          <div className="sw-body" data-lenis-prevent>
            {loading && !activeTicket ? (
              <div className="sw-loading">
                <Loader2 size={24} className="sw-spin" />
                <p>Loading...</p>
              </div>
            ) : activeTicket ? (
              /* Ticket View */
              <>
                <div className="sw-ticket-header">
                  <div className="sw-ticket-header__category">
                    {CATEGORIES.find((c) => c.key === activeTicket.category)
                      ?.label || activeTicket.category}
                  </div>
                  <div className="sw-ticket-header__status">
                    {activeTicket.status}
                  </div>
                </div>

                <div className="sw-messages" data-lenis-prevent>
                  {(activeTicket.messages || []).map((m) => (
                    <Message
                      key={m.id}
                      message={m}
                      isUser={m.authorId === activeTicket.userId}
                      getAttachmentUrl={getAttachmentUrl}
                      onImageClick={(url, name) =>
                        setLightboxImage({ url, name })
                      }
                    />
                  ))}

                  {typingUsers.size > 0 && (
                    <div className="sw-typing">
                      Support is typing
                      <span className="sw-typing__dots">...</span>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                <div className="sw-input-area">
                  {error && (
                    <div className="sw-error">
                      <AlertCircle size={16} />
                      {error}
                    </div>
                  )}

                  <div className="sw-input-row">
                    <button
                      type="button"
                      className="sw-attach-btn"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={sending}
                      aria-label="Attach file"
                    >
                      <Paperclip size={20} />
                    </button>

                    <textarea
                      ref={textareaRef}
                      className="sw-textarea"
                      value={message}
                      onChange={handleTyping}
                      onKeyPress={handleKeyPress}
                      placeholder="Type your message..."
                      disabled={sending}
                      rows={1}
                    />

                    <button
                      className="sw-send-btn"
                      onClick={sendMessage}
                      disabled={sending || !message.trim()}
                      aria-label="Send message"
                    >
                      {sending ? (
                        <Loader2 size={20} className="sw-spin" />
                      ) : (
                        <Send size={20} />
                      )}
                    </button>
                  </div>

                  {messageStatus === "sending" && (
                    <div className="sw-message-status">
                      <Loader2 size={14} className="sw-spin" />
                      Sending...
                    </div>
                  )}
                  {messageStatus === "delivered" && (
                    <div className="sw-message-status">
                      <CheckCheck size={14} />
                      Delivered
                    </div>
                  )}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf,.doc,.docx"
                  hidden
                  onChange={handleFileSelect}
                />
              </>
            ) : view === "list" ? (
              /* Ticket List */
              <>
                <div className="sw-section-title">Your conversations</div>

                {tickets.length === 0 ? (
                  <div className="sw-empty">
                    <MessageCircle size={48} />
                    <p>No conversations yet</p>
                  </div>
                ) : (
                  <div className="sw-ticket-list" data-lenis-prevent>
                    {tickets.map((t) => (
                      <button
                        key={t.id}
                        className="sw-ticket-card"
                        onClick={() => loadTicket(t.id)}
                      >
                        <div className="sw-ticket-card__top">
                          <span className="sw-ticket-card__category">
                            {CATEGORIES.find((c) => c.key === t.category)?.icon}{" "}
                            {t.category}
                          </span>
                          <span
                            className={`sw-ticket-card__status sw-ticket-card__status--${t.status.toLowerCase()}`}
                          >
                            {t.status}
                          </span>
                        </div>

                        {t.lastMessage?.body && (
                          <div className="sw-ticket-card__preview">
                            {t.lastMessage.body}
                          </div>
                        )}

                        <div className="sw-ticket-card__time">
                          {new Date(t.updatedAt).toLocaleDateString()}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {error && (
                  <div className="sw-error">
                    <AlertCircle size={16} />
                    {error}
                  </div>
                )}
              </>
            ) : !category ? (
              /* Home View */
              <>
                <div className="sw-welcome">
                  <div className="sw-welcome__icon">💬</div>
                  <div className="sw-welcome__title">How can we help?</div>
                  <div className="sw-welcome__subtitle">
                    Choose a category to get started
                  </div>
                </div>

                <button
                  className="sw-my-chats-btn"
                  onClick={() => setView("list")}
                >
                  <MessageCircle size={18} />
                  My conversations
                  {unreadCount > 0 && (
                    <span className="sw-badge">{unreadCount}</span>
                  )}
                </button>

                <div className="sw-categories">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c.key}
                      className="sw-category-btn"
                      onClick={() => setCategory(c.key)}
                    >
                      <span className="sw-category-btn__icon">{c.icon}</span>
                      <span className="sw-category-btn__label">{c.label}</span>
                    </button>
                  ))}
                </div>

                {error && (
                  <div className="sw-error">
                    <AlertCircle size={16} />
                    {error}
                  </div>
                )}
              </>
            ) : (
              /* New Ticket Form */
              <>
                <div className="sw-section-title">Start a conversation</div>
                <div className="sw-section-subtitle">
                  Tell us about your{" "}
                  {CATEGORIES.find(
                    (c) => c.key === category
                  )?.label.toLowerCase()}{" "}
                  issue
                </div>

                <textarea
                  ref={textareaRef}
                  className="sw-textarea sw-textarea--large"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe your issue in detail..."
                  disabled={sending}
                  rows={6}
                />

                {error && (
                  <div className="sw-error">
                    <AlertCircle size={16} />
                    {error}
                  </div>
                )}

                <button
                  className="sw-send-btn sw-send-btn--full"
                  onClick={sendMessage}
                  disabled={sending || !message.trim()}
                >
                  {sending ? (
                    <>
                      <Loader2 size={20} className="sw-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send size={20} />
                      Send message
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* FIXED: Image Lightbox with download */}
      {lightboxImage && (
        <ImageLightbox
          imageUrl={lightboxImage.url}
          fileName={lightboxImage.name}
          onClose={() => setLightboxImage(null)}
        />
      )}
    </>
  );
}
