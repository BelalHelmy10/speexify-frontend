/** Shared session detail helpers */

export function formatDuration(startAt, endAt) {
  if (!startAt || !endAt) return "";
  const diffMs = new Date(endAt).getTime() - new Date(startAt).getTime();
  if (diffMs <= 0) return "";
  const diffMins = Math.round(diffMs / 60000);
  if (diffMins >= 60) {
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
  return `${diffMins}m`;
}

export function getJoinWindow(session) {
  const now = new Date();
  const start = session?.startAt ? new Date(session.startAt) : null;
  const end = session?.endAt
    ? new Date(session.endAt)
    : start
      ? new Date(start.getTime() + 2 * 60 * 60 * 1000)
      : null;

  const opensAt = start
    ? new Date(start.getTime() - 15 * 60 * 1000)
    : null;

  const isScheduled = session?.status === "scheduled";
  const canJoin =
    isScheduled && opensAt && end && now >= opensAt && now <= end;
  const isBeforeWindow = isScheduled && opensAt && now < opensAt;
  const isAfterWindow = isScheduled && end && now > end;

  return { canJoin, isBeforeWindow, isAfterWindow, opensAt, start, end, now };
}

export function formatHeroDate(startAt, locale = "en") {
  if (!startAt) return "";
  try {
    return new Date(startAt).toLocaleDateString(
      locale === "ar" ? "ar-EG" : "en-US",
      { weekday: "short", month: "short", day: "numeric", year: "numeric" }
    );
  } catch {
    return "";
  }
}

export function buildGoogleCalendarUrl({ title, startAt, endAt, details }) {
  if (!startAt) return null;
  const start = new Date(startAt);
  const end = endAt
    ? new Date(endAt)
    : new Date(start.getTime() + 60 * 60 * 1000);
  const fmt = (d) =>
    d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title || "Speexify session",
    dates: `${fmt(start)}/${fmt(end)}`,
    details: details || "",
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
