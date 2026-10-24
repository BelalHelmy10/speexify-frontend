"use client";

import {
  formatUnreadCount,
  getUnreadChatLabel,
  normalizeUnreadCount,
} from "@/lib/classroomChatUnread.mjs";

export default function ClassroomUnreadBadge({ count, className = "" }) {
  const unreadCount = normalizeUnreadCount(count);

  return (
    <>
      {unreadCount > 0 && (
        <span
          key={unreadCount}
          className={["cr-chat-unread-badge", className].filter(Boolean).join(" ")}
          aria-hidden="true"
        >
          {formatUnreadCount(unreadCount)}
        </span>
      )}
      <span
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {unreadCount > 0 ? getUnreadChatLabel(unreadCount) : ""}
      </span>
    </>
  );
}
