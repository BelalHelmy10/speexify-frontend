// Groups a learner's finished lessons into the curriculum units they covered.
// A lesson belongs to the unit most of its class materials came from; on a
// tie, the unit of the material opened first wins. Lessons that used no
// curriculum material go under "other lessons".

const time = (value) => {
  const ms = new Date(value || 0).getTime();
  return Number.isFinite(ms) ? ms : 0;
};

export function unitTopic(title) {
  return String(title || "").replace(/^unit\s+\d+\s*[·:—–-]\s*/i, "").trim();
}

export function unitLevel(unit) {
  const book = unit?.bookLevel?.book || null;
  const band = unit?.bookLevel || null;
  const subLevel = unit?.subLevel || null;
  const level = subLevel?.level || null;
  return {
    key: band?._id || subLevel?._id || "none",
    course: book?.title || level?.name || null,
    band: band?.title || subLevel?.title || null,
    order: [book?.order ?? level?.order ?? 999, band?.order ?? subLevel?.order ?? 999],
  };
}

// The unit a lesson belongs to, or null.
export function mainUnitOf(lesson, resourceUnits = {}) {
  const materials = [...(lesson?.materials || [])]
    .map((material, index) => ({ ...material, index }))
    .sort((a, b) => {
      const at = a.firstOpenedAt ? time(a.firstOpenedAt) : Infinity;
      const bt = b.firstOpenedAt ? time(b.firstOpenedAt) : Infinity;
      return at - bt || a.index - b.index;
    });
  const counts = new Map();
  for (const material of materials) {
    const unitId = resourceUnits[material.id];
    if (!unitId) continue;
    counts.set(unitId, (counts.get(unitId) || 0) + 1);
  }
  let best = null;
  // Map keeps insertion order, which is the order the materials were opened.
  for (const [unitId, count] of counts) {
    if (!best || count > best.count) best = { unitId, count };
  }
  return best?.unitId || null;
}

// A lesson "has steps" once the teacher shared feedback or set homework.
export const lessonHasSteps = (lesson) =>
  Boolean(lesson?.steps && (lesson.steps.review || lesson.steps.practise || lesson.steps.homework));

export function groupLessonsIntoUnits(lessons = [], lookup = {}) {
  const resourceUnits = lookup.resources || {};
  const unitInfo = lookup.units || {};
  const byUnit = new Map();
  const other = [];
  const lessonUnit = {};

  const ordered = [...lessons].sort((a, b) => time(a.startAt) - time(b.startAt));
  for (const lesson of ordered) {
    const unitId = mainUnitOf(lesson, resourceUnits);
    if (!unitId || !unitInfo[unitId]) {
      other.push(lesson);
      continue;
    }
    lessonUnit[lesson.id] = unitId;
    if (!byUnit.has(unitId)) byUnit.set(unitId, []);
    byUnit.get(unitId).push(lesson);
  }

  const latest = ordered.filter((lesson) => lessonUnit[lesson.id]).at(-1) || null;
  const currentId = latest ? lessonUnit[latest.id] : null;

  const units = [...byUnit].map(([unitId, unitLessons]) => {
    const unit = unitInfo[unitId];
    const tracked = unitLessons.filter(lessonHasSteps);
    const completed = tracked.filter((lesson) => lesson.steps.done).length;
    const lastAt = time(unitLessons.at(-1).startAt);
    const movedOn = ordered.some(
      (lesson) => lessonUnit[lesson.id] && lessonUnit[lesson.id] !== unitId && time(lesson.startAt) > lastAt
    );
    const allDone = tracked.length > 0 && completed === tracked.length;
    const status = allDone && movedOn ? "finished" : unitId === currentId ? "current" : "in_progress";

    const items = [];
    const homework = [];
    for (const lesson of unitLessons) {
      for (const item of lesson.items || []) {
        items.push({ ...item, id: `${lesson.id}:${item.id}`, lessonId: lesson.id });
      }
      for (const assignment of lesson.homework || []) homework.push({ ...assignment, lessonId: lesson.id });
    }

    return {
      id: unitId,
      unit,
      topic: unitTopic(unit.title) || unit.title,
      number: typeof unit.order === "number" ? unit.order : null,
      level: unitLevel(unit),
      lessons: unitLessons,
      tracked: tracked.length,
      completed,
      status,
      lastLessonAt: unitLessons.at(-1).startAt,
      items,
      homework,
    };
  });

  units.sort((a, b) => {
    const [ab, al] = a.level.order;
    const [bb, bl] = b.level.order;
    return ab - bb || al - bl || (a.number ?? 999) - (b.number ?? 999) || time(a.lastLessonAt) - time(b.lastLessonAt);
  });

  const levels = [];
  for (const unit of units) {
    let level = levels.find((entry) => entry.key === unit.level.key);
    if (!level) {
      level = { ...unit.level, units: [] };
      levels.push(level);
    }
    level.units.push(unit);
  }

  return {
    units,
    levels,
    current: units.find((unit) => unit.id === currentId) || null,
    other: other.reverse(),
    lessonUnit,
  };
}

// Every material id the lessons used, for one lookup request.
export function materialIds(lessons = []) {
  return [...new Set(lessons.flatMap((lesson) => (lesson.materials || []).map((m) => m.id)))];
}
