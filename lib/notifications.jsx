import {
  Bell,
  Calendar,
  CalendarCheck,
  CalendarX,
  Clock,
  CreditCard,
  MessageSquare,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";

export const API_LIST = "/api/notifications";
export const API_STREAM = "/api/notifications/stream";
export const API_MARK_READ = (id) => `/api/notifications/${id}/read`;
export const API_MARK_ALL_READ = "/api/notifications/read-all";
export const API_CLEAR_READ = "/api/notifications/clear-read";
export const API_DELETE = (id) => `/api/notifications/${id}/delete`;
export const API_CSRF = "/api/csrf-token";

const REMINDER_TYPES = new Set(["reminder_24h", "reminder_6h", "reminder_1h"]);

export function getNotificationIcon(type) {
  const size = 18;
  const props = { size, strokeWidth: 2, "aria-hidden": true };

  switch (type) {
    case "booking_confirmed":
      return <CalendarCheck {...props} />;
    case "new_booking":
      return <Calendar {...props} />;
    case "session_canceled":
      return <CalendarX {...props} />;
    case "reminder_24h":
    case "reminder_6h":
    case "reminder_1h":
      return <Clock {...props} />;
    case "session_completed":
      return <CheckCircle2 {...props} />;
    case "feedback_received":
      return <MessageSquare {...props} />;
    case "payment_receipt":
      return <CreditCard {...props} />;
    default:
      return <Bell {...props} />;
  }
}

export function getNotificationIconTone(type) {
  if (type === "session_canceled") return "danger";
  if (REMINDER_TYPES.has(type)) return "warning";
  if (type === "session_completed") return "success";
  return "default";
}

export function getNotificationHref(notification) {
  const data = notification?.data || {};

  switch (notification?.type) {
    case "booking_confirmed":
    case "new_booking":
    case "session_canceled":
    case "reminder_24h":
    case "reminder_6h":
    case "reminder_1h":
    case "session_completed":
    case "feedback_received":
      if (data.sessionId) return `/dashboard/sessions/${data.sessionId}`;
      return "/dashboard";
    case "payment_receipt":
      return "/dashboard/packages";
    default:
      return "/dashboard";
  }
}

export function getJoinUrl(notification) {
  const url = notification?.data?.joinUrl;
  return typeof url === "string" && url.length > 0 ? url : null;
}

export function isSessionRelated(notification) {
  return Boolean(notification?.data?.sessionId);
}

export function fmtTime(ts, locale = "en") {
  try {
    const d = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return locale === "ar" ? "الآن" : "Just now";
    if (diffMins < 60)
      return locale === "ar" ? `منذ ${diffMins} دقيقة` : `${diffMins}m ago`;
    if (diffHours < 24)
      return locale === "ar" ? `منذ ${diffHours} ساعة` : `${diffHours}h ago`;
    if (diffDays < 7)
      return locale === "ar" ? `منذ ${diffDays} يوم` : `${diffDays}d ago`;

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

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getDateGroupLabel(dateInput, locale = "en") {
  const date = new Date(dateInput);
  const today = startOfDay(new Date());
  const target = startOfDay(date);
  const diffDays = Math.round((today - target) / 86400000);

  if (diffDays === 0) return locale === "ar" ? "اليوم" : "Today";
  if (diffDays === 1) return locale === "ar" ? "أمس" : "Yesterday";
  if (diffDays < 7) return locale === "ar" ? "هذا الأسبوع" : "This week";
  return locale === "ar" ? "سابقاً" : "Earlier";
}

/**
 * Collapse multiple session reminders for the same session into one stack card.
 */
export function groupNotificationsForDisplay(items = []) {
  const result = [];
  const reminderStacks = new Map();

  for (const item of items) {
    const sessionId = item?.data?.sessionId;
    const isReminder = REMINDER_TYPES.has(item?.type);

    if (isReminder && sessionId) {
      const key = `reminder:${sessionId}`;
      if (!reminderStacks.has(key)) {
        const stack = {
          id: `stack-${key}`,
          isStack: true,
          stackKey: key,
          sessionId,
          items: [],
          createdAt: item.createdAt,
          readAt: item.readAt,
          type: item.type,
        };
        reminderStacks.set(key, stack);
        result.push(stack);
      }
      const stack = reminderStacks.get(key);
      stack.items.push(item);
      if (new Date(item.createdAt) > new Date(stack.createdAt)) {
        stack.createdAt = item.createdAt;
        stack.type = item.type;
      }
      if (!item.readAt) stack.readAt = null;
      continue;
    }

    result.push(item);
  }

  return result.map((entry) => {
    if (!entry.isStack) return entry;
    const unreadInStack = entry.items.filter((n) => !n.readAt).length;
    const latest = [...entry.items].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    )[0];
    return {
      ...entry,
      readAt: unreadInStack > 0 ? null : latest?.readAt,
      title:
        entry.items.length > 1
          ? `Session reminders (${entry.items.length})`
          : latest?.title,
      body: latest?.body,
      type: latest?.type,
      stackCount: entry.items.length,
    };
  });
}

export function groupByDateLabel(entries, locale = "en") {
  const groups = [];
  let currentLabel = null;

  for (const entry of entries) {
    const label = getDateGroupLabel(entry.createdAt, locale);
    if (label !== currentLabel) {
      currentLabel = label;
      groups.push({ kind: "label", id: `label-${label}`, label });
    }
    groups.push({ kind: "item", id: String(entry.id), entry });
  }

  return groups;
}

export function copy(locale) {
  const en = {
    title: "Notifications",
    all: "All",
    unread: "Unread",
    markAllRead: "Mark all read",
    close: "Close",
    settings: "Settings",
    loading: "Loading...",
    empty: "No notifications yet",
    emptyUnread: "You're all caught up",
    refresh: "Refresh",
    clearRead: "Clear read",
    loadMore: "Load more",
    viewAll: "View all",
    delete: "Delete",
    dismiss: "Dismiss",
    join: "Join session",
    open: "Open",
    retry: "Retry",
    confirmClear: "Remove all read notifications? This cannot be undone.",
    undo: "Undo",
    deleted: "Notification removed",
    cleared: "Read notifications cleared",
    newNotification: "New notification",
    channelInApp: "In-app",
    channelEmail: "Email",
  };

  const ar = {
    title: "الإشعارات",
    all: "الكل",
    unread: "غير المقروء",
    markAllRead: "تحديد الكل كمقروء",
    close: "إغلاق",
    settings: "الإعدادات",
    loading: "جار التحميل...",
    empty: "لا توجد إشعارات",
    emptyUnread: "لا توجد إشعارات جديدة",
    refresh: "تحديث",
    clearRead: "حذف المقروء",
    loadMore: "تحميل المزيد",
    viewAll: "عرض الكل",
    delete: "حذف",
    dismiss: "تجاهل",
    join: "انضم للحصة",
    open: "فتح",
    retry: "إعادة المحاولة",
    confirmClear: "حذف جميع الإشعارات المقروءة؟ لا يمكن التراجع لاحقاً.",
    undo: "تراجع",
    deleted: "تم حذف الإشعار",
    cleared: "تم حذف الإشعارات المقروءة",
    newNotification: "إشعار جديد",
    channelInApp: "داخل التطبيق",
    channelEmail: "بريد",
  };

  return locale === "ar" ? ar : en;
}
