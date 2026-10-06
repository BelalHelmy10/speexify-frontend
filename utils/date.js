import { getIntlLocale } from "@/utils/locale";

const getTimeParts = (date, locale, timezone) => {
  const parts = new Intl.DateTimeFormat(getIntlLocale(locale), {
    timeZone: timezone || undefined,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(date);

  return {
    hour: parts.find((part) => part.type === "hour")?.value || "",
    minute: parts.find((part) => part.type === "minute")?.value || "",
    period: parts.find((part) => part.type === "dayPeriod")?.value || "",
  };
};

export const fmtSessionSchedule = (startAt, endAt, tz, locale = "en-US") => {
  const start = startAt ? new Date(startAt) : null;
  const end = endAt ? new Date(endAt) : null;

  if (!start || Number.isNaN(start.getTime())) {
    return { dateLabel: "", timeLabel: "", timezoneLabel: "", label: "" };
  }

  const dateLabel = new Intl.DateTimeFormat(getIntlLocale(locale), {
    timeZone: tz || undefined,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(start);

  const startTime = getTimeParts(start, locale, tz);
  const endTime = end && !Number.isNaN(end.getTime())
    ? getTimeParts(end, locale, tz)
    : null;
  const startClock = `${startTime.hour}:${startTime.minute}`;
  const endClock = endTime ? `${endTime.hour}:${endTime.minute}` : "";
  const samePeriod = endTime && startTime.period === endTime.period;
  const timeLabel = endTime
    ? samePeriod && endTime.period
      ? `${startClock}–${endClock} ${endTime.period}`
      : `${startClock}${startTime.period ? ` ${startTime.period}` : ""}–${endClock}${endTime.period ? ` ${endTime.period}` : ""}`
    : `${startClock}${startTime.period ? ` ${startTime.period}` : ""}`;

  const timezoneLabel = new Intl.DateTimeFormat(getIntlLocale(locale), {
    timeZone: tz || undefined,
    timeZoneName: "short",
  }).formatToParts(start).find((part) => part.type === "timeZoneName")?.value || "";

  return {
    dateLabel,
    timeLabel,
    timezoneLabel,
    label: [dateLabel, timeLabel].filter(Boolean).join(" · "),
  };
};

export const fmtInTz = (iso, tz, locale = "en") =>
  new Date(iso).toLocaleString(getIntlLocale(locale), {
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
