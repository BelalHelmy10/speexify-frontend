// web/src/utils/date.js
export const fmtInTz = (iso, tz) =>
  new Date(iso).toLocaleString([], {
    timeZone: tz || undefined, // user tz or browser default
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
