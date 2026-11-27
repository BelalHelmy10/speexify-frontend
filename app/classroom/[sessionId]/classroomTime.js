import { useEffect, useMemo, useState } from "react";
import { formatNumber } from "@/utils/locale";
import { classroomText } from "./classroomCopy";

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
    return minutes > 0
      ? classroomText(locale, "cr_unit_hm", { h: formatNumber(hours, locale), m: formatNumber(minutes, locale) })
      : classroomText(locale, "cr_unit_h", { n: formatNumber(hours, locale) });
  }

  if (minutes > 0) return classroomText(locale, "cr_unit_m", { n: formatNumber(minutes, locale) });
  return classroomText(locale, "cr_unit_lt1m");
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
  const displayElapsedSeconds =
    scheduledSeconds === null
      ? elapsedSeconds
      : Math.min(elapsedSeconds, scheduledSeconds);
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
    displayElapsedSeconds,
    displayElapsedLabel: formatSessionClock(displayElapsedSeconds, locale),
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

/**
 * Live session timing for the small components that display a clock.
 * Keeping the 1-second tick here (instead of in ClassroomShell) means only
 * the clock re-renders every second, not the whole classroom.
 */
export function useSessionTiming({ startedAt, endAt, locale = "en", enabled = true, intervalMs = 1000 } = {}) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!enabled) return undefined;
    setNowMs(Date.now());
    const id = setInterval(() => setNowMs(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [enabled, intervalMs]);

  return useMemo(
    () => getSessionTiming({ startedAt, endAt, nowMs, locale }),
    [startedAt, endAt, nowMs, locale]
  );
}
