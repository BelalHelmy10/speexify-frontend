// lib/classroomAnnotationSync.mjs
//
// Pure helpers for live annotation sync.
//
// Previously every pen stroke re-broadcast the whole annotation state as one
// message, only when the pen lifted. Points were full-precision floats, one
// per pointer event, so after roughly 30-60 strokes the state passed the
// server's 256 KB message limit and was silently dropped: learners stopped
// seeing new ink. Now:
//   - points are quantised and de-duplicated,
//   - ink streams live as small ANNOTATION_STROKE_PROGRESS deltas,
//   - a finished stroke is one ANNOTATION_STROKE_ADD,
//   - full ANNOTATION_STATE snapshots are split into parts when large.

export const POINT_PRECISION = 10000; // 4 decimals of the normalised page
export const MIN_POINT_DISTANCE = 0.0008; // ~1px on a 1200px-wide page
export const ANNOTATION_PART_MAX_CHARS = 150 * 1024;

export function quantizeValue(value) {
  return Math.round(Number(value) * POINT_PRECISION) / POINT_PRECISION;
}

export function quantizePoint(point) {
  if (!point || typeof point !== "object") return point;
  return { ...point, x: quantizeValue(point.x), y: quantizeValue(point.y) };
}

/** False when `next` is too close to `previous` to be worth storing. */
export function shouldAppendPoint(previous, next, minDistance = MIN_POINT_DISTANCE) {
  if (!next) return false;
  if (!previous) return true;
  return Math.hypot(next.x - previous.x, next.y - previous.y) >= minDistance;
}

/** A delta carrying the points of `stroke` from `fromIndex` on. */
export function buildStrokeProgressMessage({ resourceId, stroke, fromIndex = 0 }) {
  const start = Math.max(0, Math.min(fromIndex, stroke.points.length));
  return {
    type: "ANNOTATION_STROKE_PROGRESS",
    resourceId,
    strokeId: stroke.id,
    fromIndex: start,
    points: stroke.points.slice(start),
    ...(start === 0
      ? {
        meta: {
          tool: stroke.tool,
          color: stroke.color,
          page: stroke.page,
          strokeWidth: stroke.strokeWidth,
        },
      }
      : {}),
  };
}

export function buildStrokeAddMessage({ resourceId, stroke }) {
  return { type: "ANNOTATION_STROKE_ADD", resourceId, stroke };
}

function isValidPoint(point) {
  return point && Number.isFinite(Number(point.x)) && Number.isFinite(Number(point.y));
}

/**
 * Applies a PROGRESS or ADD message to a strokes array and returns the new
 * array (or the same array when nothing changed).
 */
export function applyStrokeEvent(strokes, message) {
  const list = Array.isArray(strokes) ? strokes : [];
  if (!message || typeof message !== "object") return list;

  if (message.type === "ANNOTATION_STROKE_ADD") {
    const stroke = message.stroke;
    if (!stroke || typeof stroke.id !== "string" || !Array.isArray(stroke.points)) return list;
    const points = stroke.points.filter(isValidPoint);
    const finished = { ...stroke, points };
    const index = list.findIndex((item) => item.id === stroke.id);
    if (index === -1) return [...list, finished];
    const next = [...list];
    next[index] = finished;
    return next;
  }

  if (message.type === "ANNOTATION_STROKE_PROGRESS") {
    if (typeof message.strokeId !== "string" || !Array.isArray(message.points)) return list;
    const incoming = message.points.filter(isValidPoint);
    const fromIndex = Math.max(0, Number(message.fromIndex) || 0);
    const index = list.findIndex((item) => item.id === message.strokeId);

    if (index === -1) {
      // A late joiner can only start a stroke from its beginning.
      if (fromIndex !== 0 || !message.meta) return list;
      return [...list, { id: message.strokeId, ...message.meta, points: incoming }];
    }

    const existing = list[index];
    // Missed deltas: keep what we have and wait for the final ADD.
    if (fromIndex > existing.points.length) return list;
    const next = [...list];
    next[index] = {
      ...existing,
      points: [...existing.points.slice(0, fromIndex), ...incoming],
    };
    return next;
  }

  return list;
}

/** Splits a full ANNOTATION_STATE into parts small enough for the server. */
export function splitAnnotationState(payload, maxChars = ANNOTATION_PART_MAX_CHARS, makeId = defaultId) {
  const json = JSON.stringify(payload);
  if (json.length <= maxChars) return [payload];
  const snapshotId = makeId();
  const total = Math.ceil(json.length / maxChars);
  const parts = [];
  for (let index = 0; index < total; index += 1) {
    parts.push({
      type: "ANNOTATION_STATE_PART",
      resourceId: payload.resourceId,
      snapshotId,
      index,
      total,
      chunk: json.slice(index * maxChars, (index + 1) * maxChars),
    });
  }
  return parts;
}

function defaultId() {
  return `snap_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Reassembles ANNOTATION_STATE_PART messages; `push` returns the state when complete. */
export function createAnnotationStateAssembler({ maxSnapshots = 4 } = {}) {
  const pending = new Map();
  return {
    push(part) {
      if (!part || part.type !== "ANNOTATION_STATE_PART") return null;
      const total = Number(part.total);
      const index = Number(part.index);
      if (!part.snapshotId || !Number.isInteger(total) || total < 1 || total > 200) return null;
      if (!Number.isInteger(index) || index < 0 || index >= total || typeof part.chunk !== "string") return null;

      let entry = pending.get(part.snapshotId);
      if (!entry) {
        entry = { total, chunks: new Array(total), received: 0 };
        pending.set(part.snapshotId, entry);
        // Only the newest few snapshots matter; drop abandoned ones.
        while (pending.size > maxSnapshots) pending.delete(pending.keys().next().value);
      }
      if (entry.chunks[index] === undefined) {
        entry.chunks[index] = part.chunk;
        entry.received += 1;
      }
      if (entry.received < entry.total) return null;

      pending.delete(part.snapshotId);
      try {
        const state = JSON.parse(entry.chunks.join(""));
        return state?.type === "ANNOTATION_STATE" ? state : null;
      } catch {
        return null;
      }
    },
  };
}
