export const TRIAL_STATUSES = ["RESERVED", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"];
export function dayKey(value, timezone) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
}
export function groupSlots(slots, timezone) {
  const days = new Map();
  for (const slot of slots) {
    const key = dayKey(slot.startAt, timezone);
    if (!days.has(key)) days.set(key, []);
    days.get(key).push(slot);
  }
  return [...days.entries()].sort(([a], [b]) => a.localeCompare(b));
}
export function formatTrial(value, locale, timezone, options = {}) {
  // Clock times read as "1:30 pm" in both languages, the way learners in Egypt say them.
  const clock = options.hour ? { hour12: true } : {};
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-GB", { timeZone: timezone, ...clock, ...options }).format(new Date(value));
}
export function period(value, timezone) {
  const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: timezone, hour: "2-digit", hourCycle: "h23" }).format(new Date(value)));
  return hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
}
export function makeToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) => b.toString(16).padStart(2, "0")).join("");
}
export function calendarFile(booking) {
  const stamp = (date) => new Date(date).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Speexify//Trial Booking//EN", "CALSCALE:GREGORIAN", "BEGIN:VEVENT", `UID:trial-${booking.id}@speexify.com`, `DTSTAMP:${stamp(new Date())}`, `DTSTART:${stamp(booking.slot.startAt)}`, `DTEND:${stamp(booking.slot.endAt)}`, "SUMMARY:Speexify trial session", "DESCRIPTION:Time reserved. Speexify will contact you with session details.", "END:VEVENT", "END:VCALENDAR", ""].join("\r\n");
}
export function downloadFile(content, name, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a"); link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function normalizeTrialPhone(value) {
  const digits = value.replace(/[٠-٩۰-۹]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".includes(digit) ? "٠١٢٣٤٥٦٧٨٩".indexOf(digit) : "۰۱۲۳۴۵۶۷۸۹".indexOf(digit))).replace(/[\s().\u200e\u200f-]/g, "").replace(/^00/, "+");
  // Most learners are in Egypt and write their mobile the local way:
  // 01001234567 → +201001234567, and +2001001234567 (extra trunk 0) → +201001234567.
  if (/^01[0125]\d{8}$/.test(digits)) return `+2${digits}`;
  if (/^\+?2001[0125]\d{8}$/.test(digits)) return `+20${digits.replace(/^\+?200/, "")}`;
  if (/^201[0125]\d{8}$/.test(digits)) return `+${digits}`;
  return digits;
}

// Find actual day boundaries rather than assuming every local day is 24 hours.
export function zonedDayBounds(date, timezone) {
  const wall = Date.parse(`${date}T00:00:00Z`);
  if (!Number.isFinite(wall)) throw new Error("Invalid date");
  const next = new Date(wall + 86400000).toISOString().slice(0, 10);
  const boundary = (key, center) => {
    let low = center - 36 * 3600000, high = center + 36 * 3600000;
    while (high - low > 1) {
      const middle = Math.floor((low + high) / 2);
      if (dayKey(middle, timezone) < key) low = middle; else high = middle;
    }
    return new Date(high).toISOString();
  };
  return { from: boundary(date, wall), to: boundary(next, wall + 86400000) };
}
