const MAX_VISIBLE_UNREAD_COUNT = 99;

export function normalizeUnreadCount(value) {
  const count = Number(value);
  if (!Number.isFinite(count) || count <= 0) return 0;
  return Math.floor(count);
}

export function formatUnreadCount(value) {
  const count = normalizeUnreadCount(value);
  return count > MAX_VISIBLE_UNREAD_COUNT
    ? `${MAX_VISIBLE_UNREAD_COUNT}+`
    : String(count);
}

export function getUnreadChatLabel(value, locale = "en") {
  const count = normalizeUnreadCount(value);
  if (locale === "ar") {
    if (count === 1) return "رسالة واحدة غير مقروءة";
    if (count === 2) return "رسالتان غير مقروءتين";
    if (count >= 3 && count <= 10) return `${count} رسائل غير مقروءة`;
    return `${count} رسالة غير مقروءة`;
  }
  return `${count} unread chat ${count === 1 ? "message" : "messages"}`;
}

export { MAX_VISIBLE_UNREAD_COUNT };
