// src/components/NotificationsBell.jsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import api from "@/lib/api";

function timeAgo(iso) {
  try {
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    const sec = Math.floor(diff / 1000);
    if (sec < 10) return "just now";
    if (sec < 60) return `${sec}s ago`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h ago`;
    const day = Math.floor(hr / 24);
    return `${day}d ago`;
  } catch {
    return "";
  }
}

export default function NotificationsBell({ locale = "en" }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const rootRef = useRef(null);

  const labels = useMemo(() => {
    const ar = locale === "ar";
    return {
      title: ar ? "الإشعارات" : "Notifications",
      empty: ar ? "لا توجد إشعارات بعد" : "No notifications yet",
      markAll: ar ? "تحديد الكل كمقروء" : "Mark all as read",
      open: ar ? "فتح الإشعارات" : "Open notifications",
    };
  }, [locale]);

  async function refresh() {
    setLoading(true);
    try {
      const res = await api.get("/notifications", {
        headers: { "Cache-Control": "no-store" },
      });
      setItems(res.data?.items || []);
      setUnreadCount(Number(res.data?.unreadCount || 0));
    } finally {
      setLoading(false);
    }
  }

  async function markOneRead(id) {
    try {
      await api.post(`/notifications/${id}/read`);
      // Optimistic UI
      setItems((prev) =>
        prev.map((n) =>
          n.id === id
            ? { ...n, readAt: n.readAt || new Date().toISOString() }
            : n
        )
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      // ignore
    }
  }

  async function markAllRead() {
    try {
      await api.post("/notifications/read-all");
      setItems((prev) =>
        prev.map((n) => ({
          ...n,
          readAt: n.readAt || new Date().toISOString(),
        }))
      );
      setUnreadCount(0);
    } catch {
      // ignore
    }
  }

  // Load count once on mount
  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Click-outside to close
  useEffect(() => {
    function onDocDown(e) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, []);

  // Refresh whenever dropdown opens (so it feels live)
  useEffect(() => {
    if (open) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <div className="spx-notif" ref={rootRef}>
      <button
        type="button"
        className={"spx-notif__btn" + (open ? " spx-notif__btn--open" : "")}
        aria-label={labels.open}
        aria-haspopup="menu"
        aria-expanded={open ? "true" : "false"}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="spx-notif__icon" aria-hidden="true">
          🔔
        </span>

        {unreadCount > 0 && (
          <span
            className="spx-notif__badge"
            aria-label={`${unreadCount} unread`}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="spx-notif__panel" role="menu" aria-label={labels.title}>
          <div className="spx-notif__header">
            <div className="spx-notif__title">{labels.title}</div>

            <button
              type="button"
              className="spx-notif__markall"
              onClick={markAllRead}
              disabled={unreadCount === 0}
            >
              {labels.markAll}
            </button>
          </div>

          <div className="spx-notif__body">
            {loading ? (
              <div className="spx-notif__empty">
                {locale === "ar" ? "جارٍ التحميل…" : "Loading…"}
              </div>
            ) : items.length === 0 ? (
              <div className="spx-notif__empty">{labels.empty}</div>
            ) : (
              <ul className="spx-notif__list">
                {items.map((n) => {
                  const isUnread = !n.readAt;
                  return (
                    <li
                      key={n.id}
                      className={
                        "spx-notif__item" +
                        (isUnread ? " spx-notif__item--unread" : "")
                      }
                    >
                      <button
                        type="button"
                        className="spx-notif__itembtn"
                        onClick={() => markOneRead(n.id)}
                      >
                        <div className="spx-notif__itemtop">
                          <div className="spx-notif__itemtitle">{n.title}</div>
                          <div className="spx-notif__time">
                            {timeAgo(n.createdAt)}
                          </div>
                        </div>
                        {n.body && (
                          <div className="spx-notif__itembody">{n.body}</div>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
