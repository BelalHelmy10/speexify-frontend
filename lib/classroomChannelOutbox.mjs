// lib/classroomChannelOutbox.mjs
//
// Classroom events created while the live-sync socket is not joined (the
// first moments after connecting, or a reconnect) used to be dropped. The
// outbox keeps the ones that still matter and sends them once the server
// confirms the room join.

// Transient signals: stale by the time a connection comes back.
const EPHEMERAL_TYPES = new Set([
  "TEACHER_POINTER_MOVE",
  "TEACHER_POINTER_HIDE",
  "LEARNER_POINTER_MOVE",
  "LEARNER_POINTER_HIDE",
  "CHAT_TYPING",
  "CHAT_PRIVATE_TYPING",
  "CAPTION",
  "REACTION",
  "ANNOTATION_STROKE_PROGRESS",
  "MODERATION_MUTE",
  "MODERATION_REMOVE",
]);

// Only the newest event of these kinds is meaningful (per resource when the
// event carries one).
const LATEST_WINS_TYPES = new Set([
  "LAYOUT_STATE",
  "SET_RESOURCE",
  "CONTENT_SCROLL",
  "PDF_SCROLL",
  "PDF_SET_PAGE",
  "PDF_FIT_TO_PAGE",
  "AUDIO_STATE",
  "ANNOTATION_STATE",
  "SCREEN_SHARE_ALLOW",
  "CLASSROOM_LOCK",
  "SESSION_NOTES_UPDATE",
  "RAISE_HAND",
  "REQUEST_RESOURCE",
  "REQUEST_LAYOUT",
  "PDF_VIEW_REQUEST",
  "SCREEN_SHARE_ALLOW_REQUEST",
  "VIDEO_PARTICIPANT",
  "VIDEO_PARTICIPANT_REQUEST",
]);

export const OUTBOX_LIMIT = 100;

function latestKey(event) {
  const resource = event?.resourceId == null ? "" : String(event.resourceId);
  return `${event.type}|${resource}`;
}

/** Returns the new outbox after queueing `event` (pure; never mutates). */
export function enqueueOutboxEvent(outbox, event, limit = OUTBOX_LIMIT) {
  if (!event || typeof event.type !== "string") return outbox;
  if (EPHEMERAL_TYPES.has(event.type)) return outbox;

  let next = outbox;
  if (LATEST_WINS_TYPES.has(event.type)) {
    const key = latestKey(event);
    next = outbox.filter((queued) => !(LATEST_WINS_TYPES.has(queued.type) && latestKey(queued) === key));
  }
  next = [...next, event];
  return next.length > limit ? next.slice(next.length - limit) : next;
}

export function isEphemeralClassroomEvent(event) {
  return EPHEMERAL_TYPES.has(event?.type);
}

/**
 * Splits events into WebSocket frames whose JSON stays under `maxBytes`, so a
 * burst of events never exceeds the server's per-message limit.
 */
export function chunkEventsForSend(events, maxBytes = 200 * 1024) {
  const frames = [];
  let current = [];
  let size = 0;
  for (const event of events) {
    const length = JSON.stringify(event).length + 1;
    if (current.length && size + length > maxBytes) {
      frames.push(current);
      current = [];
      size = 0;
    }
    current.push(event);
    size += length;
  }
  if (current.length) frames.push(current);
  return frames;
}
