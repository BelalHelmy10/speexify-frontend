// components/SupportWidget.jsx
"use client";

import { useEffect, useState, useRef, useCallback, memo } from "react";
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

// Memoized message component for performance
const Message = memo(({ message, isUser, API_BASE }) => (
  <div
    className={`sw-message ${
      isUser ? "sw-message--user" : "sw-message--staff"
    }`}
  >
    {message.attachments?.length > 0 ? (
      message.attachments.map((a) => (
        <a
          key={a.id}
          href={`${API_BASE}/uploads/support/${a.filePath}`}
          target="_blank"
          rel="noreferrer"
          className="sw-message__attachment"
        >
          <img
            src={`${API_BASE}/uploads/support/${a.filePath}`}
            alt={a.fileName}
            loading="lazy"
          />
        </a>
      ))
    ) : (
      <div className="sw-message__text">{message.body}</div>
    )}
    <div className="sw-message__time">
      {new Date(message.createdAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })}
    </div>
  </div>
));

Message.displayName = "Message";

export default function SupportWidget() {
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "";

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

  // WebSocket connection
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const [wsConnected, setWsConnected] = useState(false);

  // Typing indicator
  const [typingUsers, setTypingUsers] = useState(new Set());
  const typingTimeoutRef = useRef(null);

  // Message status
  const [messageStatus, setMessageStatus] = useState("sent"); // sending | sent | delivered

  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // ============================================================================
  // LocalStorage helpers for seen messages
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
  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws/support`;

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

        // Reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket();
        }, 3000);
      };
    } catch (err) {
      console.error("[Support WS] Connection failed:", err);
    }
  }, []);

  const handleWebSocketMessage = useCallback((data) => {
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

      case "new_ticket":
        // Admin only
        break;

      case "typing":
        handleTypingIndicator(data);
        break;

      case "pong":
        // Heartbeat response
        break;

      default:
        console.warn("[Support WS] Unknown message type:", type);
    }
  }, []);

  const handleNewMessage = useCallback(
    (data) => {
      const { ticketId, message, ticket } = data;

      // Update active ticket if viewing
      if (activeTicket?.id === ticketId) {
        setActiveTicket((prev) => ({
          ...prev,
          messages: [...(prev?.messages || []), message],
        }));

        // Mark as seen
        const seen = getStoredSeen();
        seen[ticketId] = Number(message.id);
        setStoredSeen(seen);

        // Scroll to bottom
        setTimeout(
          () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }),
          100
        );
      } else {
        // Update ticket list
        setTickets((prev) => {
          const updated = prev.map((t) =>
            t.id === ticketId
              ? { ...t, lastMessage: message, updatedAt: ticket.updatedAt }
              : t
          );
          return updated.sort(
            (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
          );
        });

        // Increment unread if staff message
        if (message.isStaff && !open) {
          setUnreadCount((prev) => prev + 1);

          // Play subtle notification sound (optional)
          playNotificationSound();
        }
      }

      setMessageStatus("delivered");
    },
    [activeTicket, open, getStoredSeen, setStoredSeen]
  );

  const handleTicketStatusChange = useCallback(
    (data) => {
      const { ticketId, status, ticket } = data;

      // Update active ticket
      if (activeTicket?.id === ticketId) {
        setActiveTicket((prev) => ({
          ...prev,
          status,
        }));
      }

      // Update ticket list
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

        // Clear typing after 3 seconds
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
    // Optional: play a subtle notification sound
    try {
      const audio = new Audio("/sounds/notification.mp3");
      audio.volume = 0.3;
      audio.play().catch(() => {
        // Ignore errors (user interaction required)
      });
    } catch (err) {
      // Sound not available
    }
  }, []);

  // Connect WebSocket when widget opens
  useEffect(() => {
    if (open) {
      connectWebSocket();

      // Send heartbeat every 30 seconds
      const heartbeat = setInterval(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: "ping" }));
        }
      }, 30000);

      return () => {
        clearInterval(heartbeat);
      };
    } else {
      // Close WebSocket when widget closes
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    }
  }, [open, connectWebSocket]);

  // Cleanup on unmount
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

        // Mark as seen
        const latest = ticket?.messages?.[ticket.messages.length - 1];
        if (latest) {
          const seen = getStoredSeen();
          seen[id] = Number(latest.id);
          setStoredSeen(seen);
        }

        // Recalculate unread
        await refreshTickets();

        // Scroll to bottom
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

      // Calculate unread
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
    } catch (err) {
      // Silent fail for background refresh
    }
  }, [getStoredSeen]);

  // Load tickets when widget opens
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
        // Reply to existing ticket
        await replyToSupportTicket({
          ticketId: activeTicket.id,
          message,
        });

        // Reload ticket
        await loadTicket(activeTicket.id);
      } else {
        // Create new ticket
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

  // Handle file upload
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

        // Reload ticket
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

  // Handle Enter key
  const handleKeyPress = useCallback(
    (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    },
    [sendMessage]
  );

  // Handle typing
  const handleTyping = useCallback(
    (e) => {
      setMessage(e.target.value);

      // Send typing indicator (debounced)
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

  // Reset to home
  const reset = useCallback(() => {
    setActiveTicket(null);
    setCategory(null);
    setMessage("");
    setError(null);
    setView("home");
  }, []);

  // Focus textarea when view changes
  useEffect(() => {
    if (open && (view === "ticket" || category)) {
      textareaRef.current?.focus();
    }
  }, [open, view, category]);

  const showBack = activeTicket || category || view === "list";

  return (
    <>
      {/* FAB Button */}
      <button
        className="sw-fab"
        onClick={() => setOpen(true)}
        aria-label="Contact support"
      >
        <MessageCircle size={24} />
        {unreadCount > 0 && (
          <span className="sw-fab__badge">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Widget Panel */}
      {open && (
        <div className="sw-panel">
          {/* Header */}
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

            <button
              onClick={() => setOpen(false)}
              className="sw-header__close"
              aria-label="Close support"
            >
              <X size={20} />
            </button>
          </header>

          {/* Body */}
          <div className="sw-body">
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

                <div className="sw-messages">
                  {(activeTicket.messages || []).map((m) => (
                    <Message
                      key={m.id}
                      message={m}
                      isUser={m.authorId === activeTicket.userId}
                      API_BASE={API_BASE}
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
                  accept="image/*"
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
                  <div className="sw-ticket-list">
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
    </>
  );
}
