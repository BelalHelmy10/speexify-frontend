// Feedback entries mark the important words with asterisks, the same way
// teachers already write them elsewhere: "I *am agree* with you." On a
// mistake row the marked words show in red on the learner's sentence and in
// green on the correction.

const MARK_PATTERN = /\*([^*\n]+?)\*/g;

// Splits text into plain and marked segments. A stray asterisk with no
// partner stays as ordinary text.
export function parseMarkedText(value = "") {
  const text = String(value ?? "");
  const segments = [];
  let lastIndex = 0;

  for (const match of text.matchAll(MARK_PATTERN)) {
    if (match.index > lastIndex) {
      segments.push({ text: text.slice(lastIndex, match.index), marked: false });
    }
    segments.push({ text: match[1], marked: true });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex), marked: false });
  }

  return segments;
}

export function hasMarks(value = "") {
  return parseMarkedText(value).some((segment) => segment.marked);
}

export function stripMarks(value = "") {
  return String(value ?? "").replace(MARK_PATTERN, "$1");
}

// True when an asterisk is left without a partner, so the teacher can be told
// before the learner sees a stray "*".
export function hasUnpairedMark(value = "") {
  return String(value ?? "").replace(MARK_PATTERN, "").includes("*");
}

// Word-level comparison used when a mistake row has no asterisks at all, so the
// learner still sees what changed.
export function diffWords(before = "", after = "") {
  const beforeTokens = String(before || "").trim().split(/\s+/).filter(Boolean);
  const afterTokens = String(after || "").trim().split(/\s+/).filter(Boolean);
  const same = (a, b) => a.toLowerCase() === b.toLowerCase();
  const matrix = Array.from({ length: beforeTokens.length + 1 }, () =>
    Array(afterTokens.length + 1).fill(0)
  );

  for (let i = beforeTokens.length - 1; i >= 0; i -= 1) {
    for (let j = afterTokens.length - 1; j >= 0; j -= 1) {
      matrix[i][j] = same(beforeTokens[i], afterTokens[j])
        ? matrix[i + 1][j + 1] + 1
        : Math.max(matrix[i + 1][j], matrix[i][j + 1]);
    }
  }

  const beforeParts = [];
  const afterParts = [];
  let i = 0;
  let j = 0;

  while (i < beforeTokens.length && j < afterTokens.length) {
    if (same(beforeTokens[i], afterTokens[j])) {
      beforeParts.push({ text: beforeTokens[i], marked: false });
      afterParts.push({ text: afterTokens[j], marked: false });
      i += 1;
      j += 1;
    } else if (matrix[i + 1][j] >= matrix[i][j + 1]) {
      beforeParts.push({ text: beforeTokens[i], marked: true });
      i += 1;
    } else {
      afterParts.push({ text: afterTokens[j], marked: true });
      j += 1;
    }
  }
  while (i < beforeTokens.length) beforeParts.push({ text: beforeTokens[i++], marked: true });
  while (j < afterTokens.length) afterParts.push({ text: afterTokens[j++], marked: true });

  return { before: joinWords(beforeParts), after: joinWords(afterParts) };
}

// Joins word parts back into segments, keeping neighbouring marked words in
// one highlight ("*to check*" rather than "*to* *check*").
function joinWords(parts) {
  const segments = [];
  parts.forEach((part, index) => {
    const separator = index === 0 ? "" : " ";
    const last = segments.at(-1);
    if (last && last.marked === part.marked) {
      last.text += `${separator}${part.text}`;
    } else if (last && separator) {
      // The space between a plain and a marked run belongs to the plain side.
      if (last.marked) segments.push({ text: ` ${part.text}`, marked: part.marked });
      else {
        last.text += separator;
        segments.push({ text: part.text, marked: part.marked });
      }
    } else {
      segments.push({ text: part.text, marked: part.marked });
    }
  });
  return segments;
}

// Segments for both sides of a mistake row. Asterisks win; with none on either
// side the changed words are found automatically.
export function getMistakeSegments(mistake = "", correction = "") {
  if (hasMarks(mistake) || hasMarks(correction)) {
    return {
      source: "marks",
      before: parseMarkedText(mistake),
      after: parseMarkedText(correction),
    };
  }
  if (!String(mistake).trim() || !String(correction).trim()) {
    return {
      source: "plain",
      before: parseMarkedText(mistake),
      after: parseMarkedText(correction),
    };
  }
  const { before, after } = diffWords(mistake, correction);
  const changed = before.some((s) => s.marked) || after.some((s) => s.marked);
  return { source: changed ? "auto" : "plain", before, after };
}

// Wraps the selected text in asterisks, or removes them when the selection is
// already marked. Spaces at the edges of the selection stay outside the marks.
export function toggleMarkAroundSelection(value = "", start = 0, end = 0) {
  const text = String(value ?? "");
  let from = Math.max(0, Math.min(start, end));
  let to = Math.min(text.length, Math.max(start, end));

  if (from === to) {
    // No selection: mark the word under the cursor.
    while (from > 0 && /[^\s*]/.test(text[from - 1])) from -= 1;
    while (to < text.length && /[^\s*]/.test(text[to])) to += 1;
    if (from === to) {
      return { value: `${text.slice(0, from)}**${text.slice(to)}`, start: from + 1, end: from + 1 };
    }
  }

  while (from < to && /\s/.test(text[from])) from += 1;
  while (to > from && /\s/.test(text[to - 1])) to -= 1;

  const selected = text.slice(from, to);
  if (selected.length > 1 && selected.startsWith("*") && selected.endsWith("*")) {
    const inner = selected.slice(1, -1);
    return { value: `${text.slice(0, from)}${inner}${text.slice(to)}`, start: from, end: from + inner.length };
  }
  if (text[from - 1] === "*" && text[to] === "*") {
    return { value: `${text.slice(0, from - 1)}${selected}${text.slice(to + 1)}`, start: from - 1, end: to - 1 };
  }
  return {
    value: `${text.slice(0, from)}*${selected}*${text.slice(to)}`,
    start: from,
    end: to + 2,
  };
}

// Older grammar entries kept the explanation after " | " in the correction.
export function splitCorrectionAndExplanation(value = "") {
  const text = String(value || "").trim();
  if (!text) return { correction: "", explanation: "" };

  const lines = text.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  if (lines.length > 1) return { correction: lines[0], explanation: lines.slice(1).join(" ") };

  const separatorMatch = text.match(/^(.+?)\s+\|\s+(.+)$/);
  if (separatorMatch) {
    return { correction: separatorMatch[1].trim(), explanation: separatorMatch[2].trim() };
  }
  return { correction: text, explanation: "" };
}

export function isLink(value = "") {
  return /^https?:\/\/\S+$/i.test(String(value || "").trim());
}
