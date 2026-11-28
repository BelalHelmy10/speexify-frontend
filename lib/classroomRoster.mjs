// lib/classroomRoster.mjs
//
// Who on the classroom roster is in the video call. Tiles are matched to
// people by account (each client announces its tile, stamped by the server),
// not by display name: when a teacher and a learner, or two learners, shared
// a name, the wrong row showed "In call" and the person who was there showed
// "Not joined". Names are only a fallback, and only when unambiguous.

export function normalizeRosterName(value) {
  return String(value || "").trim().replace(/\s+/g, " ").toLowerCase();
}

function sameUser(a, b) {
  return a != null && b != null && String(a) === String(b);
}

/**
 * @param {object} input
 * @param {string} input.teacherName
 * @param {number|string|null} input.teacherUserId
 * @param {Array<{id?, userId?}>} input.learners  roster seats
 * @param {(learner) => string} input.learnerName
 * @param {Array<{id, displayName}>} input.liveParticipants  other people's tiles
 * @param {Map<string, number>} input.identities  tile id -> account id
 * @param {boolean} input.selfInCall  this browser has joined the call
 * @param {boolean} input.viewerIsTeacher
 * @param {number|string|null} input.viewerUserId
 */
export function buildClassroomRoster({
  teacherName,
  teacherUserId = null,
  learners = [],
  learnerName = () => "",
  liveParticipants = [],
  identities = new Map(),
  selfInCall = false,
  viewerIsTeacher = false,
  viewerUserId = null,
}) {
  const live = liveParticipants.filter((participant) => participant?.id != null);
  const used = new Set();
  const ownerOf = (participant) => identities.get(String(participant.id)) ?? null;

  // A name is a safe fallback only if no one else on the roster shares it.
  const nameCounts = new Map();
  const countName = (name) => {
    const key = normalizeRosterName(name);
    if (key) nameCounts.set(key, (nameCounts.get(key) || 0) + 1);
  };
  countName(teacherName);
  const names = learners.map((learner) => learnerName(learner));
  names.forEach(countName);

  const take = (participant) => {
    if (participant) used.add(String(participant.id));
    return participant || null;
  };
  const byAccount = (userId) => live.find((participant) =>
    !used.has(String(participant.id)) && sameUser(ownerOf(participant), userId)) || null;
  const byUniqueName = (name) => {
    const key = normalizeRosterName(name);
    if (!key || nameCounts.get(key) !== 1) return null;
    return live.find((participant) =>
      !used.has(String(participant.id)) &&
      ownerOf(participant) == null &&
      normalizeRosterName(participant.displayName) === key) || null;
  };

  // The viewer's own row comes from their own call, never from someone's tile.
  const teacherLive = viewerIsTeacher
    ? selfInCall
    : Boolean(take(byAccount(teacherUserId)) || take(byUniqueName(teacherName)));

  const learnerRows = learners.map((learner, index) => {
    const userId = learner?.id ?? learner?.userId ?? null;
    const name = names[index];
    const isViewer = !viewerIsTeacher && sameUser(userId, viewerUserId);
    const liveParticipant = isViewer ? null : take(byAccount(userId)) || take(byUniqueName(name));
    return {
      learner,
      learnerName: name,
      userId,
      liveParticipant,
      inCall: isViewer ? selfInCall : Boolean(liveParticipant),
    };
  });

  const unmatched = live.filter((participant) => !used.has(String(participant.id)));
  return {
    teacherLive,
    learnerRows,
    unmatched,
    inCallCount: live.length + (selfInCall ? 1 : 0),
  };
}
