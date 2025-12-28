// src/components/NotificationsBell.jsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Bell, X, CheckCheck } from "lucide-react";
import useAuth from "@/hooks/useAuth";

/**
 * NotificationsBell
 * - Desktop: anchored popover dropdown
 * - Mobile: bottom-sheet
 * - Fetches /api/notifications (assumes you already have it working in-app)
 * - Marks read + clear read if endpoints exist
 *
 * If your endpoints differ, adjust the fetch URLs at the top.
 */

const API_LIST = "/api/notifications";
const API_MARK_READ = (id) => `/api/notifications/${id}/read`;
const API_MARK_ALL_READ = "/api/notifications/read-all";
const API_CLEAR_READ = "/api/notifications/clear-read";

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

export default function NotificationsBell({ locale = "en" }) {
  const { user } = useAuth();
  const isMobile = useIsMobile(640);

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");

  const panelRef = useRef(null);
  const btnRef = useRef(null);

  const unreadCount = useMemo(
    () => items.filter((n) => !n.readAt).length,
    [items]
  );

  async function fetchNotifications() {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(API_LIST, { credentials: "include" });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data?.error || "Failed to load notifications");
      setItems(Array.isArray(data) ? data : data?.items || []);
    } catch (e) {
      setError(e.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  // Open -> load
  useEffect(() => {
    if (open) fetchNotifications();
    // lock body scroll on mobile sheet
    if (open && isMobile) document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

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

  async function markRead(id) {
    try {
      await fetch(API_MARK_READ(id), {
        method: "POST",
        credentials: "include",
      });
      setItems((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, readAt: new Date().toISOString() } : n
        )
      );
    } catch {}
  }

  async function markAllRead() {
    try {
      await fetch(API_MARK_ALL_READ, {
        method: "POST",
        credentials: "include",
      });
      setItems((prev) =>
        prev.map((n) => ({
          ...n,
          readAt: n.readAt || new Date().toISOString(),
        }))
      );
    } catch {}
  }

  async function clearRead() {
    try {
      await fetch(API_CLEAR_READ, { method: "POST", credentials: "include" });
      setItems((prev) => prev.filter((n) => !n.readAt));
    } catch {}
  }

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
        {unreadCount > 0 && (
          <span
            className="spx-notif__badge"
            aria-label={`${unreadCount} unread`}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && <div className="spx-notif__backdrop" />}

      {open && (
        <div
          ref={panelRef}
          className={`spx-notif__panel${isMobile ? " is-sheet" : ""}`}
          role="dialog"
        >
          <div className="spx-notif__header">
            <div className="spx-notif__title">
              {locale === "ar" ? "الإشعارات" : "Notifications"}
              {unreadCount > 0 ? ` (${unreadCount})` : ""}
            </div>

            <div className="spx-notif__actions">
              <button
                type="button"
                className="spx-notif__iconBtn"
                onClick={markAllRead}
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
                {locale === "ar" ? "جار التحميل..." : "Loading..."}
              </div>
            )}

            {!loading && error && (
              <div className="spx-notif__state">{error}</div>
            )}

            {!loading && !error && items.length === 0 && (
              <div className="spx-notif__state">
                {locale === "ar" ? "لا توجد إشعارات" : "No notifications"}
              </div>
            )}

            {!loading &&
              !error &&
              items.map((n) => {
                const isUnread = !n.readAt;
                const title = n.title || "";
                const body = n.body || "";
                const sessionId = n?.data?.sessionId;

                // If you have a session details page, link it here:
                const href = sessionId
                  ? `/dashboard?sessionId=${sessionId}`
                  : "/dashboard";

                return (
                  <div
                    key={n.id}
                    className={`spx-notif__item${isUnread ? " is-unread" : ""}`}
                    onClick={() => markRead(n.id)}
                    role="button"
                    tabIndex={0}
                  >
                    <Link
                      href={href}
                      className="spx-notif__itemLink"
                      onClick={() => setOpen(false)}
                    >
                      <div className="spx-notif__itemTop">
                        <div className="spx-notif__itemTitle">{title}</div>
                        <div className="spx-notif__itemTime">
                          {n.createdAt ? fmtTime(n.createdAt, locale) : ""}
                        </div>
                      </div>

                      {body && (
                        <div className="spx-notif__itemBody">{body}</div>
                      )}
                    </Link>
                  </div>
                );
              })}
          </div>

          <div className="spx-notif__footer">
            <button
              type="button"
              className="spx-notif__ghost"
              onClick={fetchNotifications}
            >
              {locale === "ar" ? "تحديث" : "Refresh"}
            </button>

            <button
              type="button"
              className="spx-notif__ghost"
              onClick={clearRead}
            >
              {locale === "ar" ? "حذف المقروء" : "Clear read"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
