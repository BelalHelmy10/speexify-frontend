// src/components/NotificationsBell.jsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, X, CheckCheck, Trash2, RefreshCw } from "lucide-react";
import useAuth from "@/hooks/useAuth";

/**
 * NotificationsBell
 * - Desktop: anchored popover dropdown
 * - Mobile: bottom-sheet
 * - Fetches /api/notifications
 * - Mark read, mark all read, clear read, delete individual
 * - Click notification to navigate to relevant page
 * - Includes CSRF token support
 */

const API_LIST = "/api/notifications";
const API_MARK_READ = (id) => `/api/notifications/${id}/read`;
const API_MARK_ALL_READ = "/api/notifications/read-all";
const API_CLEAR_READ = "/api/notifications/clear-read";
const API_DELETE = (id) => `/api/notifications/${id}/delete`;
const API_CSRF = "/api/csrf-token";

function useIsMobile(breakpoint = 640) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= breakpoint);
    check();
    window.addEventListener("resize", check, { passive: true });
    return () => window.removeEventListener("resize", check);
  }, [breakpoint]);
  return isMobile;
}

function fmtTime(ts, locale = "en") {
  try {
    const d = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    // Relative time for recent notifications
    if (diffMins < 1) return locale === "ar" ? "الآن" : "Just now";
    if (diffMins < 60)
      return locale === "ar" ? `منذ ${diffMins} دقيقة` : `${diffMins}m ago`;
    if (diffHours < 24)
      return locale === "ar" ? `منذ ${diffHours} ساعة` : `${diffHours}h ago`;
    if (diffDays < 7)
      return locale === "ar" ? `منذ ${diffDays} يوم` : `${diffDays}d ago`;

    // Absolute date for older notifications
    return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", {
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return "";
  }
}

// Get icon based on notification type
function getNotificationIcon(type) {
  switch (type) {
    case "booking_confirmed":
    case "new_booking":
      return "📅";
    case "session_canceled":
      return "❌";
    case "reminder_24h":
    case "reminder_6h":
    case "reminder_1h":
      return "⏰";
    case "session_completed":
      return "✅";
    case "feedback_received":
      return "💬";
    case "payment_receipt":
      return "💳";
    default:
      return "🔔";
  }
}

// Determine where to navigate based on notification type and data
function getNotificationHref(notification) {
  const data = notification?.data || {};

  switch (notification.type) {
    case "booking_confirmed":
    case "new_booking":
    case "session_canceled":
    case "reminder_24h":
    case "reminder_6h":
    case "reminder_1h":
    case "session_completed":
    case "feedback_received":
      if (data.sessionId) {
        return `/dashboard/sessions/${data.sessionId}`;
      }
      return "/dashboard";

    case "payment_receipt":
      return "/dashboard/packages";

    default:
      return "/dashboard";
  }
}

export default function NotificationsBell({ locale = "en" }) {
  const { user } = useAuth();
  const router = useRouter();
  const isMobile = useIsMobile(640);

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [csrfToken, setCsrfToken] = useState("");

  const panelRef = useRef(null);
  const btnRef = useRef(null);

  const unreadCount = useMemo(
    () => items.filter((n) => !n.readAt).length,
    [items]
  );

  const readCount = useMemo(
    () => items.filter((n) => n.readAt).length,
    [items]
  );

  // Separate state for polled unread count (used when dropdown is closed)
  const [polledUnreadCount, setPolledUnreadCount] = useState(0);

  // Display count: use items count when we have items, otherwise use polled count
  const displayUnreadCount = items.length > 0 ? unreadCount : polledUnreadCount;

  // Fetch CSRF token on mount
  useEffect(() => {
    const fetchCsrf = async () => {
      try {
        const res = await fetch(API_CSRF, { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          setCsrfToken(data.csrfToken || "");
        }
      } catch (e) {
        console.error("Failed to fetch CSRF token:", e);
      }
    };
    fetchCsrf();
  }, []);

  // Poll for unread count every 30 seconds (only when dropdown is closed)
  useEffect(() => {
    if (!user) return;

    const pollUnreadCount = async () => {
      // Don't poll if dropdown is open (we already have fresh data)
      if (open) return;

      try {
        const res = await fetch(`${API_LIST}?limit=1`, {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          if (typeof data.unreadCount === "number") {
            setPolledUnreadCount(data.unreadCount);
          }
        }
      } catch (e) {
        // Silent fail - polling is best-effort
      }
    };

    // Initial poll
    pollUnreadCount();

    // Poll every 30 seconds
    const interval = setInterval(pollUnreadCount, 30000);

    return () => clearInterval(interval);
  }, [user, open]);

  // Helper for POST requests with CSRF
  const postWithCsrf = useCallback(
    async (url) => {
      const headers = {
        "Content-Type": "application/json",
      };
      if (csrfToken) {
        headers["x-csrf-token"] = csrfToken;
      }
      return fetch(url, {
        method: "POST",
        credentials: "include",
        headers,
      });
    },
    [csrfToken]
  );

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(API_LIST, { credentials: "include" });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data?.error || "Failed to load notifications");
      const loadedItems = Array.isArray(data) ? data : data?.items || [];
      setItems(loadedItems);
      // Sync polled count with actual data
      if (typeof data.unreadCount === "number") {
        setPolledUnreadCount(data.unreadCount);
      } else {
        setPolledUnreadCount(loadedItems.filter((n) => !n.readAt).length);
      }
    } catch (e) {
      setError(e.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Open -> load
  useEffect(() => {
    if (open) fetchNotifications();
    // lock body scroll on mobile sheet
    if (open && isMobile) document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open, fetchNotifications, isMobile]);

  // close on outside click
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      const panel = panelRef.current;
      const btn = btnRef.current;
      if (!panel || !btn) return;
      if (panel.contains(e.target) || btn.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [open]);

  // close on ESC
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Mark single notification as read
  const markRead = useCallback(
    async (id) => {
      try {
        const res = await postWithCsrf(API_MARK_READ(id));
        if (res.ok) {
          setItems((prev) =>
            prev.map((n) =>
              n.id === id ? { ...n, readAt: new Date().toISOString() } : n
            )
          );
          // Sync polled count
          setPolledUnreadCount((prev) => Math.max(0, prev - 1));
        } else {
          console.error("Mark read failed:", await res.text());
        }
      } catch (e) {
        console.error("Failed to mark as read:", e);
      }
    },
    [postWithCsrf]
  );

  // Mark all notifications as read
  const markAllRead = useCallback(async () => {
    if (unreadCount === 0) return;
    setActionLoading(true);
    try {
      const res = await postWithCsrf(API_MARK_ALL_READ);
      if (res.ok) {
        setItems((prev) =>
          prev.map((n) => ({
            ...n,
            readAt: n.readAt || new Date().toISOString(),
          }))
        );
        // Sync polled count
        setPolledUnreadCount(0);
      } else {
        console.error("Mark all read failed:", await res.text());
      }
    } catch (e) {
      console.error("Failed to mark all as read:", e);
    } finally {
      setActionLoading(false);
    }
  }, [unreadCount, postWithCsrf]);

  // Clear all read notifications (delete them)
  const clearRead = useCallback(async () => {
    if (readCount === 0) return;
    setActionLoading(true);
    try {
      const res = await postWithCsrf(API_CLEAR_READ);
      if (res.ok) {
        // Remove read notifications from state
        setItems((prev) => prev.filter((n) => !n.readAt));
      } else {
        console.error("Clear read failed:", await res.text());
      }
    } catch (e) {
      console.error("Failed to clear read:", e);
    } finally {
      setActionLoading(false);
    }
  }, [readCount, postWithCsrf]);

  // Delete single notification
  const deleteNotification = useCallback(
    async (id, e) => {
      e.stopPropagation();
      e.preventDefault();
      try {
        // Check if notification is unread before deleting
        const notification = items.find((n) => n.id === id);
        const wasUnread = notification && !notification.readAt;

        const res = await postWithCsrf(API_DELETE(id));
        if (res.ok) {
          setItems((prev) => prev.filter((n) => n.id !== id));
          // Sync polled count if was unread
          if (wasUnread) {
            setPolledUnreadCount((prev) => Math.max(0, prev - 1));
          }
        } else {
          console.error("Delete failed:", await res.text());
        }
      } catch (err) {
        console.error("Failed to delete notification:", err);
      }
    },
    [postWithCsrf, items]
  );

  // Handle notification click - mark as read and navigate
  const handleNotificationClick = useCallback(
    async (notification, e) => {
      e.preventDefault();
      e.stopPropagation();

      // Mark as read first
      if (!notification.readAt) {
        await markRead(notification.id);
      }

      // Close the panel
      setOpen(false);

      // Navigate to relevant page
      const href = getNotificationHref(notification);
      router.push(href);
    },
    [markRead, router]
  );

  if (!user) return null;

  return (
    <div className="spx-notif">
      <button
        ref={btnRef}
        type="button"
        className={`spx-notif__btn${open ? " is-open" : ""}`}
        aria-label="Notifications"
        aria-haspopup="dialog"
        aria-expanded={open ? "true" : "false"}
        onClick={() => setOpen((v) => !v)}
      >
        <Bell size={20} />
        {displayUnreadCount > 0 && (
          <span
            className="spx-notif__badge"
            aria-label={`${displayUnreadCount} unread`}
          >
            {displayUnreadCount > 9 ? "9+" : displayUnreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="spx-notif__backdrop" onClick={() => setOpen(false)} />
      )}

      {open && (
        <div
          ref={panelRef}
          className={`spx-notif__panel${isMobile ? " is-sheet" : ""}`}
          role="dialog"
          aria-label="Notifications"
        >
          <div className="spx-notif__header">
            <div className="spx-notif__title">
              {locale === "ar" ? "الإشعارات" : "Notifications"}
              {unreadCount > 0 && (
                <span className="spx-notif__unreadBadge">{unreadCount}</span>
              )}
            </div>

            <div className="spx-notif__actions">
              <button
                type="button"
                className="spx-notif__iconBtn"
                onClick={markAllRead}
                disabled={unreadCount === 0 || actionLoading}
                title={locale === "ar" ? "تحديد الكل كمقروء" : "Mark all read"}
              >
                <CheckCheck size={18} />
              </button>

              <button
                type="button"
                className="spx-notif__iconBtn"
                onClick={() => setOpen(false)}
                title={locale === "ar" ? "إغلاق" : "Close"}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="spx-notif__body">
            {loading && (
              <div className="spx-notif__state">
                <RefreshCw size={20} className="spx-notif__spinner" />
                {locale === "ar" ? "جار التحميل..." : "Loading..."}
              </div>
            )}

            {!loading && error && (
              <div className="spx-notif__state spx-notif__state--error">
                {error}
                <button
                  type="button"
                  className="spx-notif__retryBtn"
                  onClick={fetchNotifications}
                >
                  {locale === "ar" ? "إعادة المحاولة" : "Retry"}
                </button>
              </div>
            )}

            {!loading && !error && items.length === 0 && (
              <div className="spx-notif__state spx-notif__state--empty">
                <span className="spx-notif__emptyIcon">🔔</span>
                {locale === "ar" ? "لا توجد إشعارات" : "No notifications yet"}
              </div>
            )}

            {!loading &&
              !error &&
              items.map((n) => {
                const isUnread = !n.readAt;
                const title = n.title || "";
                const body = n.body || "";
                const icon = getNotificationIcon(n.type);

                return (
                  <div
                    key={n.id}
                    className={`spx-notif__item${isUnread ? " is-unread" : ""}`}
                    onClick={(e) => handleNotificationClick(n, e)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        handleNotificationClick(n, e);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label={`${isUnread ? "Unread: " : ""}${title}`}
                  >
                    <div className="spx-notif__itemIcon">{icon}</div>

                    <div className="spx-notif__itemContent">
                      <div className="spx-notif__itemTop">
                        <div className="spx-notif__itemTitle">{title}</div>
                        <div className="spx-notif__itemTime">
                          {n.createdAt ? fmtTime(n.createdAt, locale) : ""}
                        </div>
                      </div>

                      {body && (
                        <div className="spx-notif__itemBody">{body}</div>
                      )}
                    </div>

                    <button
                      type="button"
                      className="spx-notif__itemDelete"
                      onClick={(e) => deleteNotification(n.id, e)}
                      title={locale === "ar" ? "حذف" : "Delete"}
                      aria-label="Delete notification"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                );
              })}
          </div>

          <div className="spx-notif__footer">
            <button
              type="button"
              className="spx-notif__ghost"
              onClick={fetchNotifications}
              disabled={loading}
            >
              <RefreshCw
                size={14}
                className={loading ? "spx-notif__spinner" : ""}
              />
              {locale === "ar" ? "تحديث" : "Refresh"}
            </button>

            <button
              type="button"
              className="spx-notif__ghost spx-notif__ghost--danger"
              onClick={clearRead}
              disabled={readCount === 0 || actionLoading}
            >
              <Trash2 size={14} />
              {locale === "ar" ? "حذف المقروء" : "Clear read"}
              {readCount > 0 && <span>({readCount})</span>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
