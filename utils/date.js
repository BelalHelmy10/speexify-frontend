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

/**
 * Creates a Date object that represents the time components of `date`
 * in the target `timezone`, but as if it were in the local system timezone.
 * This effectively "shifts" the time for visualization libraries that force local time.
 */
export const shiftDateToTimezone = (date, timezone) => {
  if (!timezone) return new Date(date);

  // Format the date in the target timezone to get the components
  const d = new Date(date);
  const format = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  });

  const parts = format.formatToParts(d);
  const getPart = (type) => parseInt(parts.find((p) => p.type === type).value, 10);

  // Create a new date using the components (interpreted as local by default constructor)
  return new Date(
    getPart("year"),
    getPart("month") - 1,
    getPart("day"),
    getPart("hour"),
    getPart("minute"),
    getPart("second")
  );
};
