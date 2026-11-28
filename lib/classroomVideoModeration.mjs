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

function normalizedName(name) {
  return String(name || "").trim().toLowerCase();
}

/**
 * Leftover video tiles. When someone reloads, loses their connection or
 * comes back from another tab, the video server keeps their old connection
 * for about a minute, so they show up twice. When a person announces their
 * new tile, returns the old tiles of the same person that the teacher should
 * remove now:
 *  - tiles the teacher already knew belonged to that person, and
 *  - the tile the person says they had before (`replaces`), only when the
 *    teacher doesn't know it as someone else's and it shows the same name.
 * Never the teacher's own tile, and only tiles still in the call.
 */
export function leftoverParticipantIds({ identity, replaces, identities, participants, ownParticipantId }) {
  if (!identity?.participantId || identity.userId == null) return [];
  const current = String(identity.participantId);
  const present = new Map((participants || []).map((participant) => [String(participant.id), participant]));
  const leftovers = new Set();

  for (const [participantId, userId] of identities || []) {
    if (String(participantId) !== current && sameUser(userId, identity.userId)) {
      leftovers.add(String(participantId));
    }
  }

  const claimed = typeof replaces === "string" ? replaces.trim() : "";
  if (claimed && claimed !== current) {
    const owner = identities?.get?.(claimed);
    if (owner != null) {
      if (sameUser(owner, identity.userId)) leftovers.add(claimed);
    } else {
      const old = present.get(claimed);
      const now = present.get(current);
      if (old && now && normalizedName(old.displayName) && normalizedName(old.displayName) === normalizedName(now.displayName)) {
        leftovers.add(claimed);
      }
    }
  }

  if (ownParticipantId) leftovers.delete(String(ownParticipantId));
  return [...leftovers].filter((participantId) => present.has(participantId));
}
