// app/classroom/[sessionId]/classroomFuzzySearch.js
// Fuzzy matching + flat index + recent-resource memory for the
// classroom resource picker. No external dependencies.

const WORD_BOUNDARY = /[\s/_\-.,:·•]/;

/**
 * Fuzzy score of `query` against `haystack`.
 *
 * Returns:
 *   - a positive number on match (higher is better)
 *   - -1 when query is not a subsequence of haystack
 *   - 0 when query is empty
 *
 * The score combines:
 *   - direct substring + prefix bonuses
 *   - subsequence match with bonuses for consecutive matches
 *     and word-boundary matches
 *   - mild length penalty so short titles win ties
 */
export function fuzzyScore(query, haystack) {
  if (!query) return 0;
  if (!haystack) return -1;

  const q = String(query).toLowerCase().trim();
  if (!q) return 0;
  const h = String(haystack).toLowerCase();

  // Cheap wins: substring match is unambiguous.
  const directIdx = h.indexOf(q);
  if (directIdx === 0) return 1200 - h.length * 0.05;
  if (directIdx > 0) {
    const prevChar = h[directIdx - 1];
    const isWordStart = !prevChar || WORD_BOUNDARY.test(prevChar);
    return (isWordStart ? 900 : 650) - h.length * 0.05;
  }

  // Subsequence fallback.
  let qi = 0;
  let score = 0;
  let lastMatch = -2;

  for (let i = 0; i < h.length && qi < q.length; i++) {
    if (h[i] !== q[qi]) continue;

    if (i === lastMatch + 1) {
      score += 16; // consecutive bonus
    } else if (i === 0 || WORD_BOUNDARY.test(h[i - 1])) {
      score += 10; // word-start bonus
    } else {
      score += 1;
    }

    lastMatch = i;
    qi++;
  }

  if (qi < q.length) return -1;
  return score - h.length * 0.05;
}

/**
 * Build a flat array of resource entries with breadcrumb + search haystack,
 * ready to be scored against a query.
 *
 * Each entry: {
 *   _id, title, description, resource, kind,
 *   trackName, bookTitle, subLevelLabel, unitTitle,
 *   breadcrumb,        // "Course · Book · A1.1 · Unit 3"
 *   _haystack,         // lowercased concat for substring shortcut
 * }
 */
export function buildFlatResourceIndex(tracks = []) {
  const flat = [];

  (tracks || []).forEach((track) => {
    if (!track) return;
    const trackName = track.name || track.code || "";

    (track.levels || []).forEach((level) => {
      (level.subLevels || []).forEach((subLevel) => {
        (subLevel.units || []).forEach((unit) => {
          const unitTitle = unit.title || "";
          const bookLevel = unit.bookLevel || null;
          const book = bookLevel?.book || null;
          const bookTitle = book?.title || book?.code || "";
          const subLevelLabel = subLevel.code || subLevel.title || "";

          (unit.resources || []).forEach((resource) => {
            if (!resource?._id) return;

            const title = resource.title || "Untitled resource";
            const description = resource.description || "";

            const breadcrumbParts = [
              trackName,
              bookTitle,
              subLevelLabel,
              unitTitle,
            ].filter(Boolean);

            const breadcrumb = breadcrumbParts.join(" · ");

            flat.push({
              _id: resource._id,
              title,
              description,
              resource,
              kind: resource.kind || "",
              trackName,
              bookTitle,
              subLevelLabel,
              unitTitle,
              breadcrumb,
              _haystack: [title, description, breadcrumb, resource.kind || ""]
                .filter(Boolean)
                .join(" ")
                .toLowerCase(),
            });
          });
        });
      });
    });
  });

  return flat;
}

/**
 * Score a single entry against a query. Combines title, breadcrumb, and
 * description signals so a hit anywhere lifts the entry, but title wins.
 */
export function scoreEntry(entry, query) {
  if (!entry || !query) return 0;

  const titleScore = fuzzyScore(query, entry.title);
  const breadcrumbScore = fuzzyScore(query, entry.breadcrumb);
  const descScore = fuzzyScore(query, entry.description);

  const weightedTitle = titleScore > 0 ? titleScore * 3 : titleScore;
  const weightedDesc = descScore > 0 ? descScore * 0.4 : descScore;

  const positive = [weightedTitle, breadcrumbScore, weightedDesc].filter(
    (v) => v > 0
  );
  if (positive.length === 0) return -1;

  // Best signal dominates; small bonus for matching in multiple fields.
  const best = Math.max(...positive);
  const bonus = (positive.length - 1) * 12;
  return best + bonus;
}

/**
 * Filter + rank entries by a query string. Returns up to `limit` entries.
 */
export function searchEntries(entries, query, limit = 60) {
  if (!query || !entries?.length) return [];

  const scored = [];
  for (const entry of entries) {
    const score = scoreEntry(entry, query);
    if (score > 0) scored.push({ entry, score });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}

// ─── Recent resources (per-session memory) ─────────────────────────────
const RECENT_LIMIT = 6;
const recentStorageKey = (sessionId) =>
  `speexify_classroom_recent_${sessionId}`;

export function loadRecentResourceIds(sessionId) {
  if (typeof window === "undefined" || !sessionId) return [];
  try {
    const raw = sessionStorage.getItem(recentStorageKey(sessionId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, RECENT_LIMIT) : [];
  } catch {
    return [];
  }
}

export function pushRecentResourceId(sessionId, resourceId) {
  if (typeof window === "undefined" || !sessionId || !resourceId) return [];
  try {
    const current = loadRecentResourceIds(sessionId);
    const next = [resourceId, ...current.filter((id) => id !== resourceId)].slice(
      0,
      RECENT_LIMIT
    );
    sessionStorage.setItem(recentStorageKey(sessionId), JSON.stringify(next));
    return next;
  } catch {
    return [];
  }
}
