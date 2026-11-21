// lib/classroomEventTrust.mjs
//
// Defense in depth for the classroom socket. The backend stamps every relayed
// event with the authenticated sender (`_from`) and drops teacher-only events
// from learners. Clients additionally refuse teacher-only events that a
// stamped non-teacher sent. Unstamped events are accepted so a frontend
// release can ship before the backend; the backend overwrites any `_from`
// a client sends, so it cannot be forged once the backend is deployed.

export const TEACHER_ONLY_CLASSROOM_EVENTS = new Set([
  "CLASSROOM_LOCK",
  "SET_RESOURCE",
  "LAYOUT_STATE",
  "CONTENT_SCROLL",
  "TEACHER_POINTER_MOVE",
  "TEACHER_POINTER_HIDE",
  "SCREEN_SHARE_ALLOW",
  "PDF_SET_PAGE",
  "PDF_SCROLL",
  "PDF_FIT_TO_PAGE",
  "AUDIO_STATE",
  "AUDIO_PLAY",
  "AUDIO_PAUSE",
  "AUDIO_SEEK",
  "AUDIO_TRACK",
  "LOBBY_ADMITTED",
  "LOBBY_DENIED",
  "LOBBY_ADMIT_ALL",
  "SESSION_NOTES_UPDATE",
]);

const PRIVILEGED_ROLES = new Set(["teacher", "admin"]);

export function isTrustedClassroomEvent(event) {
  if (!event || typeof event !== "object" || typeof event.type !== "string") {
    return false;
  }
  if (!TEACHER_ONLY_CLASSROOM_EVENTS.has(event.type)) return true;
  const from = event._from;
  if (!from) return true;
  return PRIVILEGED_ROLES.has(String(from.role || ""));
}
