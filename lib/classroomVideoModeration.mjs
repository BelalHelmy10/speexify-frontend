// lib/classroomVideoModeration.mjs
//
// Pure decision logic for teacher video moderation over the classroom
// channel. Every decision relies on the server-stamped sender (`_from`), never
// on identity fields the sending client wrote itself.

const PRIVILEGED_ROLES = new Set(["teacher", "admin"]);

export function isPrivilegedSender(event) {
  return PRIVILEGED_ROLES.has(String(event?._from?.role || ""));
}

function sameUser(a, b) {
  return a != null && b != null && String(a) === String(b);
}

/** Returns "audio" | "video" when this client must mute itself, else null. */
export function moderationMuteFor(event, { localUserId, isTeacher }) {
  if (event?.type !== "MODERATION_MUTE" || isTeacher) return null;
  if (!isPrivilegedSender(event)) return null;
  if (event.media !== "audio" && event.media !== "video") return null;
  const applies = event.targetUserId === "all" || sameUser(event.targetUserId, localUserId);
  return applies ? event.media : null;
}

export function isRemovalFor(event, { localUserId, isTeacher }) {
  if (event?.type !== "MODERATION_REMOVE" || isTeacher) return false;
  if (!isPrivilegedSender(event)) return false;
  return sameUser(event.targetUserId, localUserId);
}

/** { participantId, userId } for a server-verified identity announcement. */
export function participantIdentityFrom(event) {
  if (event?.type !== "VIDEO_PARTICIPANT") return null;
  const userId = event._from?.userId;
  const participantId = typeof event.participantId === "string" ? event.participantId : "";
  if (userId == null || !participantId || !sameUser(event.userId, userId)) return null;
  return { participantId, userId: Number(userId) };
}

/**
 * Prefer the authenticated Jitsi-id mapping; fall back to the roster row's
 * user id (matched by display name) only when no mapping exists.
 */
export function resolveModerationTarget({ participantId, learnerUserId, identities }) {
  const mapped = participantId ? identities?.get?.(String(participantId)) : null;
  if (mapped != null) return Number(mapped);
  const fallback = Number(learnerUserId);
  return Number.isSafeInteger(fallback) && fallback > 0 ? fallback : null;
}
