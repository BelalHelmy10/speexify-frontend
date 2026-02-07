"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import useAuth from "@/hooks/useAuth";
import {
  MessageCircle,
  Loader2,
  RefreshCw,
  Search,
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowUp,
  ArrowDown,
  Minus,
} from "lucide-react";
import "@/styles/admin-support.scss";
import SupportTicketDetailPane from "./SupportTicketDetailPane";

const STATUS_OPTIONS = ["OPEN", "IN_PROGRESS", "RESOLVED"];
const PRIORITY_OPTIONS = ["LOW", "NORMAL", "HIGH", "URGENT"];

const PRIORITY_CONFIG = {
  LOW: { color: "#6b7280", icon: ArrowDown, label: "Low" },
  NORMAL: { color: "#3b82f6", icon: Minus, label: "Normal" },
  HIGH: { color: "#f59e0b", icon: ArrowUp, label: "High" },
  URGENT: { color: "#ef4444", icon: ArrowUp, label: "Urgent" },
};

const STATUS_CONFIG = {
  OPEN: { color: "#f59e0b", icon: Clock, label: "Open" },
  IN_PROGRESS: { color: "#3b82f6", icon: Loader2, label: "In Progress" },
  RESOLVED: { color: "#10b981", icon: CheckCircle, label: "Resolved" },
};

function niceCategory(cat) {
  if (!cat) return "";
  return String(cat)
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function fmtTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getInitials(name, email) {
  if (name) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  if (email) {
    return email.slice(0, 2).toUpperCase();
  }
  return "??";
}

export default function AdminSupportInboxPage() {
  const { user, checking } = useAuth();
  const isAdmin = user?.role === "admin";
  const router = useRouter();

  // Loading states
  const [loadingList, setLoadingList] = useState(false);
  const [loadingTicket, setLoadingTicket] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);
  const [savingAssignment, setSavingAssignment] = useState(false);
  const [savingPriority, setSavingPriority] = useState(false);
  const [addingNote, setAddingNote] = useState(false);

  // Filters
  const [q, setQ] = useState("");
  const [qDebounced, setQDebounced] = useState("");
  const [statusFilter, setStatusFilter] = useState("OPEN");
  const [priorityFilter, setPriorityFilter] = useState("");

  // Data
  const [tickets, setTickets] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [activeTicket, setActiveTicket] = useState(null);
  const [staffMembers, setStaffMembers] = useState([]);

  // UI state
  const [reply, setReply] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [error, setError] = useState(null);
  const [typingUsers, setTypingUsers] = useState(new Set());

  // WebSocket
  const wsRef = useRef(null);
  const [wsConnected, setWsConnected] = useState(false);
  const reconnectTimeoutRef = useRef(null);
  const bottomRef = useRef(null);

  const getAttachmentUrl = useCallback((attachmentId) => {
    const id = Number(attachmentId);
    if (!Number.isFinite(id)) return "#";
    return `/api/support/attachments/${id}`;
  }, []);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setQDebounced(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  // Build list params
  const listParams = useMemo(() => {
    const params = {};
    if (statusFilter) params.status = statusFilter;
    if (priorityFilter) params.priority = priorityFilter;
    if (qDebounced) params.q = qDebounced;
    return params;
  }, [statusFilter, priorityFilter, qDebounced]);

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
    if (!isAdmin) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const wsUrl = buildSupportWsUrl();

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("[Admin Support WS] Connected");
        setWsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleWebSocketMessage(data);
        } catch (err) {
          console.error("[Admin Support WS] Failed to parse message:", err);
        }
      };

      ws.onerror = (error) => {
        console.error("[Admin Support WS] Error:", error);
      };

      ws.onclose = () => {
        console.log("[Admin Support WS] Disconnected");
        setWsConnected(false);

        // Reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket();
        }, 3000);
      };
    } catch (err) {
      console.error("[Admin Support WS] Connection failed:", err);
    }
  }, [isAdmin, buildSupportWsUrl]);

  const handleWebSocketMessage = useCallback(
    (data) => {
      const { type } = data;

      switch (type) {
        case "connected":
          console.log("[Admin Support WS] Connection confirmed");
          break;

        case "new_message":
          handleNewMessage(data);
          break;

        case "new_ticket":
          handleNewTicket(data);
          break;

        case "ticket_status_change":
          handleTicketStatusChange(data);
          break;

        case "typing":
          handleTypingIndicator(data);
          break;

        case "pong":
          // Heartbeat response
          break;

        default:
          console.warn("[Admin Support WS] Unknown message type:", type);
      }
    },
    [activeId, activeTicket]
  );

  const handleNewMessage = useCallback(
    (data) => {
      const { ticketId, message } = data;

      // Update active ticket if viewing
      if (activeTicket?.id === ticketId) {
        setActiveTicket((prev) => ({
          ...prev,
          messages: [...(prev?.messages || []), message],
        }));

        // Scroll to bottom (messages container only, not entire page)
        setTimeout(
          () =>
            bottomRef.current?.scrollIntoView({
              behavior: "smooth",
              block: "nearest",
              inline: "nearest",
            }),
          100
        );
      }

      // Update ticket list
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
    },
    [activeTicket]
  );

  const handleNewTicket = useCallback((data) => {
    const { ticket } = data;

    // Add to ticket list
    setTickets((prev) => [ticket, ...prev]);

    // Show notification
    if (Notification.permission === "granted") {
      new Notification("New Support Ticket", {
        body: `${ticket.category}: ${ticket.subject || "New ticket"}`,
        icon: "/logo.png",
      });
    }
  }, []);

  const handleTicketStatusChange = useCallback(
    (data) => {
      const { ticketId, status } = data;

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

      if (activeTicket?.id === ticketId) {
        setTypingUsers((prev) => {
          const next = new Set(prev);
          if (isTyping) {
            next.add(userId);
          } else {
            next.delete(userId);
          }
          return next;
        });
      }
    },
    [activeTicket]
  );

  // Connect WebSocket on mount
  useEffect(() => {
    if (isAdmin) {
      connectWebSocket();

      // Send heartbeat every 30 seconds
      const heartbeat = setInterval(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: "ping" }));
        }
      }, 30000);

      return () => {
        clearInterval(heartbeat);
        if (wsRef.current) {
          wsRef.current.close();
        }
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
      };
    }
  }, [isAdmin, connectWebSocket]);

  // ============================================================================
  // API Functions
  // ============================================================================
  async function loadTickets() {
    setLoadingList(true);
    setError(null);
    try {
      const { data } = await api.get("/support/admin/tickets", {
        params: { ...listParams, t: Date.now() },
        headers: { "Cache-Control": "no-store" },
      });

      const items = Array.isArray(data?.tickets) ? data.tickets : [];
      setTickets(items);

      if (!activeId && items.length > 0) {
        setActiveId(items[0].id);
      }
    } catch (e) {
      setError(e?.response?.data?.error || "Failed to load tickets");
    } finally {
      setLoadingList(false);
    }
  }

  async function loadTicket(id) {
    if (!id) return;
    setLoadingTicket(true);
    setError(null);
    try {
      const { data } = await api.get(`/support/admin/tickets/${id}`, {
        params: { t: Date.now() },
        headers: { "Cache-Control": "no-store" },
      });

      setActiveTicket(data?.ticket || null);
      // Scroll messages to bottom (container only, not entire page)
      setTimeout(
        () =>
          bottomRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
            inline: "nearest",
          }),
        50
      );
    } catch (e) {
      setError(e?.response?.data?.error || "Failed to load ticket");
    } finally {
      setLoadingTicket(false);
    }
  }

  async function loadStaffMembers() {
    try {
      const { data } = await api.get("/admin/users", {
        params: { role: "admin", t: Date.now() },
      });
      setStaffMembers(Array.isArray(data?.users) ? data.users : []);
    } catch (e) {
      console.error("Failed to load staff members:", e);
    }
  }

  async function updateStatus(nextStatus) {
    if (!activeTicket?.id) return;
    setSavingStatus(true);
    setError(null);
    try {
      await api.patch(`/support/admin/tickets/${activeTicket.id}/status`, {
        status: nextStatus,
      });

      setActiveTicket((prev) => ({ ...prev, status: nextStatus }));
      setTickets((prev) =>
        prev.map((t) =>
          t.id === activeTicket.id ? { ...t, status: nextStatus } : t
        )
      );
    } catch (e) {
      setError(e?.response?.data?.error || "Failed to update status");
    } finally {
      setSavingStatus(false);
    }
  }

  async function updatePriority(nextPriority) {
    if (!activeTicket?.id) return;
    setSavingPriority(true);
    setError(null);
    try {
      await api.patch(`/support/admin/tickets/${activeTicket.id}/priority`, {
        priority: nextPriority,
      });

      setActiveTicket((prev) => ({ ...prev, priority: nextPriority }));
      setTickets((prev) =>
        prev.map((t) =>
          t.id === activeTicket.id ? { ...t, priority: nextPriority } : t
        )
      );
    } catch (e) {
      setError(e?.response?.data?.error || "Failed to update priority");
    } finally {
      setSavingPriority(false);
    }
  }

  async function updateAssignment(assignedToId) {
    if (!activeTicket?.id) return;
    setSavingAssignment(true);
    setError(null);
    try {
      await api.patch(`/support/admin/tickets/${activeTicket.id}/assign`, {
        assignedToId: assignedToId || null,
      });

      const assignedTo = assignedToId
        ? staffMembers.find((s) => s.id === assignedToId)
        : null;

      setActiveTicket((prev) => ({ ...prev, assignedToId, assignedTo }));
      setTickets((prev) =>
        prev.map((t) =>
          t.id === activeTicket.id ? { ...t, assignedToId, assignedTo } : t
        )
      );
    } catch (e) {
      setError(e?.response?.data?.error || "Failed to update assignment");
    } finally {
      setSavingAssignment(false);
    }
  }

  async function sendReply() {
    if (!activeTicket?.id) return;
    if (!reply.trim()) return;

    setSendingReply(true);
    setError(null);
    try {
      await api.post(`/support/admin/tickets/${activeTicket.id}/reply`, {
        message: reply.trim(),
      });

      setReply("");
    } catch (e) {
      setError(e?.response?.data?.error || "Failed to send reply");
    } finally {
      setSendingReply(false);
    }
  }

  async function addInternalNote() {
    if (!activeTicket?.id) return;
    if (!internalNote.trim()) return;

    setAddingNote(true);
    setError(null);
    try {
      const { data } = await api.post(
        `/support/admin/tickets/${activeTicket.id}/notes`,
        {
          note: internalNote.trim(),
        }
      );

      setActiveTicket((prev) => ({
        ...prev,
        internalNotes: [...(prev.internalNotes || []), data.note],
      }));

      setInternalNote("");
      setShowNoteInput(false);
    } catch (e) {
      setError(e?.response?.data?.error || "Failed to add note");
    } finally {
      setAddingNote(false);
    }
  }

  // Load tickets on filter change
  useEffect(() => {
    if (!isAdmin) return;
    loadTickets();
  }, [isAdmin, statusFilter, priorityFilter, qDebounced]);

  // Load active ticket
  useEffect(() => {
    if (!isAdmin) return;
    if (!activeId) return;
    loadTicket(activeId);
  }, [isAdmin, activeId]);

  // Load staff members
  useEffect(() => {
    if (isAdmin) {
      loadStaffMembers();
    }
  }, [isAdmin]);

  // Redirect if not admin
  useEffect(() => {
    if (checking) return;
    if (!user) router.push("/login");
    else if (!isAdmin) router.push("/dashboard");
  }, [checking, user, isAdmin, router]);

  // Request notification permission
  useEffect(() => {
    if (isAdmin && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, [isAdmin]);

  if (checking || !user || !isAdmin) return null;

  const activePriorityConfig = activeTicket
    ? PRIORITY_CONFIG[activeTicket.priority]
    : null;
  const activeStatusConfig = activeTicket
    ? STATUS_CONFIG[activeTicket.status]
    : null;

  return (
    <main className="asp-admin-support">
      {/* Header */}
      <header className="asp-header">
        <div className="asp-header__left">
          <div className="asp-header__icon">
            <MessageCircle size={28} />
          </div>
          <div>
            <h1 className="asp-header__title">Support Inbox</h1>
            <p className="asp-header__subtitle">
              {wsConnected ? (
                <>
                  <span className="asp-status-dot"></span>
                  Real-time updates enabled
                </>
              ) : (
                <>Connecting...</>
              )}
            </p>
          </div>
        </div>

        <div className="asp-header__actions">
          <button
            className="asp-btn asp-btn--secondary"
            onClick={loadTickets}
            disabled={loadingList}
          >
            <RefreshCw size={16} className={loadingList ? "asp-spin" : ""} />
            Refresh
          </button>
        </div>
      </header>

      {/* Filters */}
      <div className="asp-filters">
        <div className="asp-search-box">
          <Search size={18} />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search tickets..."
            className="asp-search-input"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="asp-filter-select"
        >
          <option value="">All Status</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s.replace("_", " ")}
            </option>
          ))}
        </select>

        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="asp-filter-select"
        >
          <option value="">All Priority</option>
          {PRIORITY_OPTIONS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      {/* Error */}
      {error && (
        <div className="asp-error">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Main Content */}
      <div className="asp-content">
        {/* Ticket List */}
        <aside className="asp-sidebar">
          <div className="asp-sidebar__header">
            <h2>Tickets</h2>
            <span className="asp-badge">{tickets.length}</span>
          </div>

          <div className="asp-ticket-list">
            {loadingList ? (
              <div className="asp-loading">
                <Loader2 size={24} className="asp-spin" />
                <p>Loading tickets...</p>
              </div>
            ) : tickets.length === 0 ? (
              <div className="asp-empty">
                <MessageCircle size={48} />
                <p>No tickets found</p>
              </div>
            ) : (
              tickets.map((t) => {
                const isActive = t.id === activeId;
                const priorityConf = PRIORITY_CONFIG[t.priority];
                const PriorityIcon = priorityConf?.icon;

                return (
                  <button
                    key={t.id}
                    onClick={() => setActiveId(t.id)}
                    className={`asp-ticket-card ${isActive ? "asp-ticket-card--active" : ""
                      }`}
                  >
                    <div className="asp-ticket-card__header">
                      <div className="asp-ticket-card__category">
                        {niceCategory(t.category)}
                      </div>
                      <div
                        className="asp-ticket-card__priority"
                        style={{ color: priorityConf?.color }}
                      >
                        {PriorityIcon && <PriorityIcon size={14} />}
                      </div>
                    </div>

                    <div className="asp-ticket-card__user">
                      <div className="asp-avatar asp-avatar--small">
                        {getInitials(t.user?.name, t.user?.email)}
                      </div>
                      <div className="asp-user-info">
                        <div className="asp-user-name">
                          {t.user?.name || "User"}
                        </div>
                        <div className="asp-user-email">{t.user?.email}</div>
                      </div>
                    </div>

                    {t.lastMessage?.body && (
                      <div className="asp-ticket-card__preview">
                        {t.lastMessage.body.slice(0, 80)}
                        {t.lastMessage.body.length > 80 ? "..." : ""}
                      </div>
                    )}

                    <div className="asp-ticket-card__footer">
                      <div
                        className="asp-status-badge"
                        style={{
                          background: `${STATUS_CONFIG[t.status]?.color}20`,
                          color: STATUS_CONFIG[t.status]?.color,
                        }}
                      >
                        {t.status}
                      </div>
                      <div className="asp-ticket-card__time">
                        {fmtTime(t.updatedAt || t.createdAt)}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Ticket Detail */}
        <SupportTicketDetailPane
          activeId={activeId}
          loadingTicket={loadingTicket}
          activeTicket={activeTicket}
          getInitials={getInitials}
          niceCategory={niceCategory}
          fmtTime={fmtTime}
          STATUS_OPTIONS={STATUS_OPTIONS}
          PRIORITY_OPTIONS={PRIORITY_OPTIONS}
          updateStatus={updateStatus}
          savingStatus={savingStatus}
          updatePriority={updatePriority}
          savingPriority={savingPriority}
          activePriorityConfig={activePriorityConfig}
          updateAssignment={updateAssignment}
          savingAssignment={savingAssignment}
          staffMembers={staffMembers}
          getAttachmentUrl={getAttachmentUrl}
          typingUsers={typingUsers}
          bottomRef={bottomRef}
          showNoteInput={showNoteInput}
          setShowNoteInput={setShowNoteInput}
          internalNote={internalNote}
          setInternalNote={setInternalNote}
          addInternalNote={addInternalNote}
          addingNote={addingNote}
          reply={reply}
          setReply={setReply}
          sendReply={sendReply}
          sendingReply={sendingReply}
        />
      </div>
    </main>
  );
}
