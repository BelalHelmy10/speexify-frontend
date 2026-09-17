import { formatNumber } from "@/utils/locale";

export const SESSION_TIME_WARNING = {
  SOFT: "soft",
  HARD: "hard",
};

export function parseTimestampMs(value) {
  if (!value) return null;

  const timestamp =
    value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function formatSessionClock(totalSeconds, locale = "en") {
  const safeSeconds = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;
  const pad = (n) => formatNumber(n, locale).padStart(2, locale === "ar" ? "٠" : "0");

  return hours > 0
    ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(minutes)}:${pad(seconds)}`;
}

export function formatCompactDuration(totalSeconds, locale = "en") {
  const safeSeconds = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);

  if (hours > 0) {
    return minutes > 0 ? `${formatNumber(hours, locale)}h ${formatNumber(minutes, locale)}m` : `${formatNumber(hours, locale)}h`;
  }

  if (minutes > 0) return `${formatNumber(minutes, locale)}m`;
  return "<1m";
}

export function getSessionTiming({ startedAt, endAt, nowMs = Date.now(), locale = "en" } = {}) {
  const startMs = parseTimestampMs(startedAt);
  const endMs = parseTimestampMs(endAt);
  const elapsedSeconds = startMs
    ? Math.max(0, Math.floor((nowMs - startMs) / 1000))
    : 0;
  const remainingSeconds = endMs
    ? Math.max(0, Math.ceil((endMs - nowMs) / 1000))
    : null;
  const scheduledSeconds =
    startMs && endMs && endMs > startMs
      ? Math.floor((endMs - startMs) / 1000)
      : null;
  const hasStarted = startMs ? nowMs >= startMs : true;
  const hasEnded = Boolean(endMs && nowMs >= endMs);

  let warningLevel = null;
  if (hasStarted && endMs && !hasEnded) {
    if (remainingSeconds <= 60) {
      warningLevel = SESSION_TIME_WARNING.HARD;
    } else if (remainingSeconds <= 5 * 60) {
      warningLevel = SESSION_TIME_WARNING.SOFT;
    }
  }

  return {
    startMs,
    endMs,
    elapsedSeconds,
    elapsedLabel: formatSessionClock(elapsedSeconds, locale),
    remainingSeconds,
    remainingLabel:
      remainingSeconds === null ? "" : formatSessionClock(remainingSeconds, locale),
    scheduledSeconds,
    scheduledLabel:
      scheduledSeconds === null ? "" : formatCompactDuration(scheduledSeconds, locale),
    hasStarted,
    hasEnded,
    warningLevel,
  };
}
