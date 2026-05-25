"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  X,
  CheckCheck,
  Trash2,
  RefreshCw,
  Settings,
  ExternalLink,
  Check,
} from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import { useNotificationStream } from "@/hooks/useNotificationStream";
import {
  API_LIST,
  API_MARK_READ,
  API_MARK_ALL_READ,
  API_CLEAR_READ,
  API_DELETE,
  API_CSRF,
  copy,
  fmtTime,
  getNotificationHref,
  getNotificationIcon,
  getNotificationIconTone,
  getJoinUrl,
  groupByDateLabel,
  groupNotificationsForDisplay,
  isSessionRelated,
} from "@/lib/notifications";

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function useDelayedAction(delayMs = 5000) {
  const timers = useRef(new Map());

  const schedule = useCallback((key, action, onUndo) => {
    const existing = timers.current.get(key);
    if (existing) clearTimeout(existing.timer);

    const timer = setTimeout(() => {
      timers.current.delete(key);
      action();
    }, delayMs);

    timers.current.set(key, { timer, onUndo });
  }, [delayMs]);

  const cancel = useCallback((key) => {
    const entry = timers.current.get(key);
    if (!entry) return false;
    clearTimeout(entry.timer);
    entry.onUndo?.();
    timers.current.delete(key);
    return true;
  }, []);

  useEffect(
    () => () => {
      for (const { timer } of timers.current.values()) clearTimeout(timer);
      timers.current.clear();
    },
    []
  );

  return { schedule, cancel };
}

function NotificationRow({
  entry,
  locale,
  t,
  onOpen,
  onDismiss,
  onDelete,
  onMarkRead,
  showActions = true,
}) {
  const isUnread = !entry.readAt;
  const title = entry.title || "";
  const body = entry.body || "";
  const tone = getNotificationIconTone(entry.type);
  const joinUrl = getJoinUrl(entry);
  const stackItems = entry.isStack ? entry.items : null;

  return (
    <article
      className={`spx-notif__item${isUnread ? " is-unread" : ""}${entry.isStack ? " is-stack" : ""}`}
      aria-label={`${isUnread ? "Unread: " : ""}${title}`}
    >
      <div className={`spx-notif__itemIcon spx-notif__itemIcon--${tone}`}>
        {getNotificationIcon(entry.type)}
      </div>

      <div className="spx-notif__itemContent">
        <div className="spx-notif__itemTop">
          <h3 className="spx-notif__itemTitle" title={title}>
            {title}
          </h3>
          <time className="spx-notif__itemTime" dateTime={entry.createdAt}>
            {entry.createdAt ? fmtTime(entry.createdAt, locale) : ""}
          </time>
        </div>

        {body && <p className="spx-notif__itemBody">{body}</p>}

        {stackItems && stackItems.length > 1 && (
          <ul className="spx-notif__stackList">
            {stackItems.map((child) => (
              <li key={child.id}>
                <span>{child.title}</span>
                <span>{fmtTime(child.createdAt, locale)}</span>
              </li>
            ))}
          </ul>
        )}

        {showActions && (
          <div className="spx-notif__itemActions">
            {joinUrl && (
              <a
                href={joinUrl}
                className="spx-notif__cta spx-notif__cta--primary"
                onClick={(e) => e.stopPropagation()}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t.join}
              </a>
            )}
            {isSessionRelated(entry) && (
              <button
                type="button"
                className="spx-notif__cta"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpen(entry, e);
                }}
              >
                {t.open}
              </button>
            )}
            {isUnread && (
              <button
                type="button"
                className="spx-notif__cta spx-notif__cta--ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkRead(entry, e);
                }}
              >
                <Check size={14} />
                {t.dismiss}
              </button>
            )}
          </div>
        )}
      </div>

      {showActions && (
        <button
          type="button"
          className="spx-notif__itemDelete"
          onClick={(e) => onDelete(entry, e)}
          title={t.delete}
          aria-label={t.delete}
        >
          <Trash2 size={16} />
        </button>
      )}
    </article>
  );
}

export default function NotificationsPanel({
  locale = "en",
  variant = "popover",
  open = true,
  onClose,
  onUnreadChange,
  panelStyle = {},
  panelRef,
  className = "",
}) {
  const router = useRouter();
  const t = useMemo(() => copy(locale), [locale]);
  const liveId = useId();
  const { toast, confirmModal } = useToast();
  const { schedule, cancel } = useDelayedAction(5000);

  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [csrfToken, setCsrfToken] = useState("");
  const [nextCursor, setNextCursor] = useState(null);
  const [polledUnreadCount, setPolledUnreadCount] = useState(0);

  const internalPanelRef = useRef(null);
  const mergedPanelRef = panelRef || internalPanelRef;

  const unreadCount = useMemo(
    () => items.filter((n) => !n.readAt).length,
    [items]
  );
  const readCount = useMemo(
    () => items.filter((n) => n.readAt).length,
    [items]
  );

  const displayUnreadCount =
    items.length > 0 ? unreadCount : polledUnreadCount;

  useEffect(() => {
    onUnreadChange?.(displayUnreadCount);
  }, [displayUnreadCount, onUnreadChange]);

  const filteredItems = useMemo(() => {
    const base =
      filter === "unread" ? items.filter((n) => !n.readAt) : items;
    return groupNotificationsForDisplay(base);
  }, [items, filter]);

  const groupedRows = useMemo(
    () => groupByDateLabel(filteredItems, locale),
    [filteredItems, locale]
  );

  useEffect(() => {
    const fetchCsrf = async () => {
      try {
        const res = await fetch(API_CSRF, { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          setCsrfToken(data.csrfToken || "");
        }
      } catch {
        /* optional */
      }
    };
    fetchCsrf();
  }, []);

  const postWithCsrf = useCallback(
    async (url) => {
      const headers = { "Content-Type": "application/json" };
      if (csrfToken) headers["x-csrf-token"] = csrfToken;
      return fetch(url, { method: "POST", credentials: "include", headers });
    },
    [csrfToken]
  );

  const applyListResponse = useCallback((data, append = false) => {
    const loadedItems = Array.isArray(data) ? data : data?.items || [];
    setItems((prev) => (append ? [...prev, ...loadedItems] : loadedItems));
    if (typeof data?.unreadCount === "number") {
      setPolledUnreadCount(data.unreadCount);
    } else if (!append) {
      setPolledUnreadCount(loadedItems.filter((n) => !n.readAt).length);
    }
    setNextCursor(data?.nextCursor ?? null);
  }, []);

  const fetchNotifications = useCallback(
    async ({ append = false, cursor = null } = {}) => {
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({ limit: "20" });
        if (cursor) params.set("cursor", String(cursor));
        const res = await fetch(`${API_LIST}?${params}`, {
          credentials: "include",
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Failed to load notifications");
        applyListResponse(data, append);
      } catch (e) {
        setError(e.message || "Failed to load");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [applyListResponse]
  );

  useEffect(() => {
    if (open || variant === "page") fetchNotifications();
  }, [open, variant, fetchNotifications]);

  useNotificationStream({
    enabled: open || variant === "page",
    onEvent: (payload) => {
      if (payload?.kind === "created" && payload.notification) {
        setItems((prev) => [payload.notification, ...prev]);
        setPolledUnreadCount((c) => c + (payload.unreadDelta || 1));
        if (variant === "popover" && !open) {
          toast.info(t.newNotification);
        }
        return;
      }
      if (payload?.kind === "read" || payload?.kind === "read_all") {
        fetchNotifications();
        return;
      }
      if (
        payload?.kind === "deleted" ||
        payload?.kind === "cleared_read"
      ) {
        fetchNotifications();
      }
    },
  });

  useEffect(() => {
    if (!open || variant === "page") return undefined;
    const panel = mergedPanelRef.current;
    if (!panel) return undefined;

    const focusables = () =>
      Array.from(panel.querySelectorAll(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null
      );

    const first = focusables()[0];
    first?.focus({ preventScroll: true });

    const onKeyDown = (e) => {
      if (e.key !== "Tab") return;
      const list = focusables();
      if (!list.length) return;
      const firstEl = list[0];
      const lastEl = list[list.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };

    panel.addEventListener("keydown", onKeyDown);
    return () => panel.removeEventListener("keydown", onKeyDown);
  }, [open, variant, mergedPanelRef]);

  const resolveEntryIds = useCallback((entry) => {
    if (entry.isStack) return entry.items.map((n) => n.id);
    return [entry.id];
  }, []);

  const markRead = useCallback(
    async (entry) => {
      const ids = resolveEntryIds(entry);
      await Promise.all(
        ids.map(async (id) => {
          const res = await postWithCsrf(API_MARK_READ(id));
          if (res.ok) {
            setItems((prev) =>
              prev.map((n) =>
                ids.includes(n.id)
                  ? { ...n, readAt: n.readAt || new Date().toISOString() }
                  : n
              )
            );
            setPolledUnreadCount((prev) => Math.max(0, prev - 1));
          }
        })
      );
    },
    [postWithCsrf, resolveEntryIds]
  );

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
        setPolledUnreadCount(0);
      }
    } finally {
      setActionLoading(false);
    }
  }, [unreadCount, postWithCsrf]);

  const performDeleteIds = useCallback(
    async (ids) => {
      await Promise.all(ids.map((id) => postWithCsrf(API_DELETE(id))));
    },
    [postWithCsrf]
  );

  const handleDelete = useCallback(
    (entry, e) => {
      e?.stopPropagation?.();
      e?.preventDefault?.();

      const ids = resolveEntryIds(entry);
      const snapshot = items.filter((n) => ids.includes(n.id));
      const key = `delete-${ids.join("-")}`;

      setItems((prev) => prev.filter((n) => !ids.includes(n.id)));
      const unreadRemoved = snapshot.filter((n) => !n.readAt).length;
      if (unreadRemoved) {
        setPolledUnreadCount((c) => Math.max(0, c - unreadRemoved));
      }

      toast.undo(t.deleted, {
        actionLabel: t.undo,
        onUndo: () => {
          cancel(key);
          setItems((prev) => {
            const merged = [...prev, ...snapshot];
            return merged.sort(
              (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
            );
          });
          if (unreadRemoved) {
            setPolledUnreadCount((c) => c + unreadRemoved);
          }
        },
      });

      schedule(key, () => performDeleteIds(ids));
    },
    [items, resolveEntryIds, toast, t, schedule, cancel, performDeleteIds]
  );

  const clearRead = useCallback(async () => {
    if (readCount === 0) return;
    const ok = await confirmModal(t.confirmClear);
    if (!ok) return;

    const snapshot = items.filter((n) => n.readAt);
    const key = "clear-read";

    setItems((prev) => prev.filter((n) => !n.readAt));

    toast.undo(t.cleared, {
      actionLabel: t.undo,
      onUndo: () => {
        cancel(key);
        setItems((prev) => {
          const merged = [...prev, ...snapshot];
          return merged.sort(
            (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
          );
        });
      },
    });

    schedule(key, async () => {
      setActionLoading(true);
      try {
        await postWithCsrf(API_CLEAR_READ);
      } finally {
        setActionLoading(false);
      }
    });
  }, [
    readCount,
    items,
    confirmModal,
    t,
    toast,
    schedule,
    cancel,
    postWithCsrf,
  ]);

  const handleOpen = useCallback(
    async (entry, e) => {
      e?.preventDefault?.();
      e?.stopPropagation?.();

      if (!entry.readAt) await markRead(entry);
      onClose?.();

      if (entry.isStack && entry.items?.[0]) {
        router.push(getNotificationHref(entry.items[0]));
        return;
      }
      router.push(getNotificationHref(entry));
    },
    [markRead, onClose, router]
  );

  const settingsHref =
    locale === "ar" ? "/ar/settings#notifications" : "/settings#notifications";
  const viewAllHref =
    locale === "ar" ? "/ar/dashboard/notifications" : "/dashboard/notifications";

  const panelClass = [
    "spx-notif__panel",
    variant === "page" ? " is-page" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      ref={mergedPanelRef}
      className={panelClass}
      role={variant === "popover" ? "dialog" : "region"}
      aria-label={t.title}
      aria-modal={variant === "popover" ? "true" : undefined}
      data-lenis-prevent
      style={panelStyle}
    >
      <div className="spx-notif__header">
        <div className="spx-notif__title">
          {t.title}
          {displayUnreadCount > 0 && (
            <span className="spx-notif__count-badge">{displayUnreadCount}</span>
          )}
        </div>

        <div className="spx-notif__actions">
          <Link
            href={settingsHref}
            className="spx-notif__iconBtn"
            title={t.settings}
            aria-label={t.settings}
            onClick={() => onClose?.()}
          >
            <Settings size={18} />
          </Link>
          <button
            type="button"
            className="spx-notif__iconBtn"
            onClick={markAllRead}
            disabled={unreadCount === 0 || actionLoading}
            title={t.markAllRead}
            aria-label={t.markAllRead}
          >
            <CheckCheck size={18} />
          </button>
          {variant === "popover" && onClose && (
            <button
              type="button"
              className="spx-notif__iconBtn"
              onClick={onClose}
              title={t.close}
              aria-label={t.close}
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      <div className="spx-notif__tabs" role="tablist" aria-label={t.title}>
        <button
          type="button"
          role="tab"
          aria-selected={filter === "all"}
          className={`spx-notif__tab${filter === "all" ? " is-active" : ""}`}
          onClick={() => setFilter("all")}
        >
          {t.all}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={filter === "unread"}
          className={`spx-notif__tab${filter === "unread" ? " is-active" : ""}`}
          onClick={() => setFilter("unread")}
        >
          {t.unread}
          {displayUnreadCount > 0 && (
            <span className="spx-notif__tabBadge">{displayUnreadCount}</span>
          )}
        </button>
      </div>

      <div
        id={liveId}
        className="spx-notif__body"
        data-lenis-prevent
        aria-live="polite"
        aria-relevant="additions"
      >
        {loading && (
          <div className="spx-notif__state">
            <RefreshCw size={20} className="spx-notif__spinner" />
            {t.loading}
          </div>
        )}

        {!loading && error && (
          <div className="spx-notif__state spx-notif__state--error">
            {error}
            <button
              type="button"
              className="spx-notif__retryBtn"
              onClick={() => fetchNotifications()}
            >
              {t.retry}
            </button>
          </div>
        )}

        {!loading && !error && filteredItems.length === 0 && (
          <div className="spx-notif__state spx-notif__state--empty">
            <span className="spx-notif__emptyIcon" aria-hidden>
              <Bell size={32} strokeWidth={1.5} />
            </span>
            {filter === "unread" ? t.emptyUnread : t.empty}
          </div>
        )}

        {!loading &&
          !error &&
          groupedRows.map((row) =>
            row.kind === "label" ? (
              <div key={row.id} className="spx-notif__dateGroup">
                {row.label}
              </div>
            ) : (
              <div
                key={row.id}
                role="button"
                tabIndex={0}
                className="spx-notif__itemWrap"
                onClick={(e) => handleOpen(row.entry, e)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleOpen(row.entry, e);
                  }
                }}
              >
                <NotificationRow
                  entry={row.entry}
                  locale={locale}
                  t={t}
                  onOpen={handleOpen}
                  onDismiss={markRead}
                  onMarkRead={markRead}
                  onDelete={handleDelete}
                />
              </div>
            )
          )}

        {!loading && !error && nextCursor && (
          <div className="spx-notif__loadMoreWrap">
            <button
              type="button"
              className="spx-notif__loadMore"
              disabled={loadingMore}
              onClick={() =>
                fetchNotifications({ append: true, cursor: nextCursor })
              }
            >
              {loadingMore ? (
                <RefreshCw size={14} className="spx-notif__spinner" />
              ) : null}
              {t.loadMore}
            </button>
          </div>
        )}
      </div>

      <div className="spx-notif__footer">
        <button
          type="button"
          className="spx-notif__ghost"
          onClick={() => fetchNotifications()}
          disabled={loading}
        >
          <RefreshCw size={14} className={loading ? "spx-notif__spinner" : ""} />
          {t.refresh}
        </button>

        {variant === "popover" ? (
          <Link
            href={viewAllHref}
            className="spx-notif__ghost"
            onClick={() => onClose?.()}
          >
            <ExternalLink size={14} />
            {t.viewAll}
          </Link>
        ) : (
          <button
            type="button"
            className="spx-notif__ghost spx-notif__ghost--danger"
            onClick={clearRead}
            disabled={readCount === 0 || actionLoading}
          >
            <Trash2 size={14} />
            {t.clearRead}
            {readCount > 0 && <span>({readCount})</span>}
          </button>
        )}

        {variant === "popover" && (
          <button
            type="button"
            className="spx-notif__ghost spx-notif__ghost--danger"
            onClick={clearRead}
            disabled={readCount === 0 || actionLoading}
          >
            <Trash2 size={14} />
            {t.clearRead}
            {readCount > 0 && <span>({readCount})</span>}
          </button>
        )}
      </div>
    </div>
  );
}
