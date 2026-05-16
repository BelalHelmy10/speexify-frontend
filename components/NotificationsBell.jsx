// src/components/NotificationsBell.jsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Bell } from "lucide-react";
import useAuth from "@/hooks/useAuth";
import { useNotificationStream } from "@/hooks/useNotificationStream";
import { useToast } from "@/components/ToastProvider";
import NotificationsPanel from "@/components/notifications/NotificationsPanel";
import { API_LIST, copy } from "@/lib/notifications";

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

export default function NotificationsBell({ locale = "en" }) {
  const { user } = useAuth();
  const isMobile = useIsMobile(640);
  const { toast } = useToast();
  const t = copy(locale);

  const [open, setOpen] = useState(false);
  const [polledUnreadCount, setPolledUnreadCount] = useState(0);
  const [panelStyle, setPanelStyle] = useState({});

  const panelRef = useRef(null);
  const btnRef = useRef(null);

  const pollUnreadCount = useCallback(async () => {
    if (!user || open) return;
    try {
      const res = await fetch(`${API_LIST}?limit=1`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        if (typeof data.unreadCount === "number") {
          setPolledUnreadCount(data.unreadCount);
        }
      }
    } catch {
      /* best-effort */
    }
  }, [user, open]);

  useEffect(() => {
    if (!user) return undefined;
    pollUnreadCount();
    const interval = setInterval(pollUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [user, pollUnreadCount]);

  useNotificationStream({
    enabled: Boolean(user),
    onEvent: (payload) => {
      if (payload?.kind === "created") {
        setPolledUnreadCount((c) => c + (payload.unreadDelta || 1));
        if (!open) toast.info(t.newNotification);
      }
      if (payload?.kind === "read" || payload?.kind === "read_all") {
        pollUnreadCount();
      }
    },
  });

  useEffect(() => {
    if (open && isMobile) document.body.style.overflow = "hidden";

    if (open && !isMobile) {
      const updatePosition = () => {
        if (!btnRef.current) return;
        const rect = btnRef.current.getBoundingClientRect();
        setPanelStyle({
          position: "fixed",
          top: rect.bottom + 24,
          left: "auto",
          right: window.innerWidth - rect.right,
          zIndex: 9999999,
          transform: "none",
        });
      };

      updatePosition();
      window.addEventListener("scroll", updatePosition, { passive: true });
      window.addEventListener("resize", updatePosition, { passive: true });

      return () => {
        document.body.style.overflow = "";
        window.removeEventListener("scroll", updatePosition);
        window.removeEventListener("resize", updatePosition);
      };
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [open, isMobile]);

  useEffect(() => {
    if (!open) return undefined;
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

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (!user) return null;

  const displayUnreadCount = polledUnreadCount;

  return (
    <div className="spx-notif">
      <button
        ref={btnRef}
        type="button"
        className={`spx-notif__btn${open ? " is-open" : ""}`}
        aria-label={t.title}
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

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <>
            <div
              className="spx-notif__backdrop"
              onClick={() => setOpen(false)}
            />
            <NotificationsPanel
              locale={locale}
              variant="popover"
              open={open}
              onClose={() => {
                setOpen(false);
                pollUnreadCount();
              }}
              onUnreadChange={setPolledUnreadCount}
              panelRef={panelRef}
              panelStyle={
                !isMobile ? panelStyle : { zIndex: 9999999 }
              }
              className={isMobile ? "is-sheet" : ""}
            />
          </>,
          document.body
        )}
    </div>
  );
}
