// lib/calendarSessionStatus.mjs
//
// Where a calendar session stands. Color always encodes this status; the
// session's kind (group, one-to-one) is shown with an icon instead.
//   canceled        gray
//   live            deep coral (joinable now)
//   scheduled       coral (upcoming)
//   needs-feedback  amber (it happened, no feedback yet)
//   done            green (feedback written, or a finished training)

// A session opens for joining this many minutes before it starts.
export const JOIN_WINDOW_MINUTES = 15;

export function canJoin(startAt, endAt, { now = Date.now(), windowMins = JOIN_WINDOW_MINUTES } = {}) {
  const start = new Date(startAt).getTime();
  const end = endAt ? new Date(endAt).getTime() : start + 60 * 60 * 1000;
  return now >= start - windowMins * 60 * 1000 && now <= end;
}

function finishedTone(event) {
  // Training sessions have no learner feedback to wait for.
  return event.isTraining || event.hasFeedback ? "done" : "needs-feedback";
}

export function getEventTone(event, now = Date.now()) {
  if (event.status === "canceled") return "canceled";
  // Marked complete (even while its time slot runs): never invite joining.
  if (event.status === "completed") return finishedTone(event);
  if (event.status === "live" || canJoin(event.start, event.end, { now })) return "live";
  if (Number.isFinite(event.endsAtMs) && event.endsAtMs < now) return finishedTone(event);
  return "scheduled";
}

/** Dictionary key for the status label; teachers and learners read amber differently. */
export function getEventToneLabelKey(event, tone) {
  if (tone === "live") return "event_live";
  if (tone === "canceled") return "event_canceled";
  if (tone === "needs-feedback") return event.viewerTeaches ? "event_needs_feedback" : "event_feedback_coming";
  if (tone === "done") return event.isTraining ? "event_completed" : "event_feedback_written";
  return "event_scheduled";
}
