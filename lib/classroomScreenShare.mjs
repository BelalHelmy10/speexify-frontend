// lib/classroomScreenShare.mjs
//
// Pure helpers for classroom screen sharing. Jitsi is the source of truth for
// who is sharing: its `contentSharingParticipantsChanged` event lists the
// participant ids that are presenting. Classroom WebSocket broadcasts about
// sharing were self-described by the sender and could be spoofed.

/** Returns the sharing participant ids from a Jitsi event payload. */
export function normalizeContentSharingIds(payload) {
  const list = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload?.sharingParticipantIds)
        ? payload.sharingParticipantIds
        : [];
  const ids = [];
  for (const value of list) {
    const id = typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
    if (id && !ids.includes(id)) ids.push(id);
  }
  return ids;
}

/**
 * Derives what this client should show from the sharing ids.
 * `participants` maps Jitsi participant id -> display name.
 */
export function resolveScreenShareState({
  sharingIds = [],
  localId = null,
  participants = new Map(),
  localSharing = false,
} = {}) {
  const local = localId == null ? null : String(localId);
  const isLocalSharer = Boolean(localSharing) || (local != null && sharingIds.includes(local));
  const remoteId = sharingIds.find((id) => id !== local) || null;
  const remoteName = remoteId
    ? String(participants?.get?.(remoteId) || "").trim() || "Someone"
    : "";
  return {
    isLocalSharer,
    remoteSharer: remoteId ? { id: remoteId, name: remoteName } : null,
  };
}

/** True when this browser can start a screen share at all. */
export function canShareScreen(environment = globalThis) {
  const navigatorLike = environment?.navigator;
  if (!navigatorLike?.mediaDevices) return false;
  if (typeof navigatorLike.mediaDevices.getDisplayMedia !== "function") return false;
  // Mobile browsers expose the function on some versions but always reject.
  const ua = String(navigatorLike.userAgent || "");
  if (/Android|iPhone|iPad|iPod|Mobile/i.test(ua)) return false;
  // iPadOS reports a desktop Safari UA; detect it by touch support.
  if (/Macintosh/.test(ua) && Number(navigatorLike.maxTouchPoints) > 1) return false;
  return true;
}
