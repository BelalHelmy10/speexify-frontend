export const FEEDBACK_REPORT_START = "[[SPEEXIFY_FEEDBACK_REPORT_V1]]";
export const FEEDBACK_REPORT_END = "[[/SPEEXIFY_FEEDBACK_REPORT_V1]]";

const VALID_TYPES = new Set(["vocabulary", "grammar", "pronunciation", "note"]);

export function splitRichFeedbackComments(value = "") {
  const raw = String(value || "");
  const start = raw.indexOf(FEEDBACK_REPORT_START);
  const end = raw.indexOf(FEEDBACK_REPORT_END);

  if (start === -1 || end === -1 || end <= start) {
    return { plain: raw.trim(), payload: null };
  }

  const plain = `${raw.slice(0, start)}${raw.slice(end + FEEDBACK_REPORT_END.length)}`.trim();
  const json = raw.slice(start + FEEDBACK_REPORT_START.length, end).trim();

  try {
    return { plain, payload: JSON.parse(json) };
  } catch {
    return { plain, payload: null };
  }
}

export function stripRichFeedbackPayload(value = "") {
  return splitRichFeedbackComments(value).plain;
}

export function normalizeFeedbackItems(items = []) {
  if (!Array.isArray(items)) return [];

  return items
    .map((item, index) => {
      const type = VALID_TYPES.has(item?.type) ? item.type : "note";
      const prompt = String(item?.prompt || "").trim();
      const response = String(item?.response || "").trim();

      if (!prompt && !response) return null;

      return {
        id: String(item?.id || `${type}-${index}`),
        type,
        prompt,
        response,
        createdAt: item?.createdAt || null,
      };
    })
    .filter(Boolean);
}

export function getReportFromFeedback(feedback = {}) {
  const { plain, payload } = splitRichFeedbackComments(feedback?.commentsOnSession || "");
  const hasRichReport = Boolean(payload && typeof payload === "object");

  return {
    version: 1,
    hasRichReport,
    summary: String(
      payload?.summary ||
        feedback?.messageToLearner ||
        plain ||
        ""
    ).trim(),
    futureSteps: String(payload?.futureSteps || feedback?.futureSteps || "").trim(),
    items: normalizeFeedbackItems(payload?.items || []),
    plainComments: plain,
    updatedAt: payload?.updatedAt || null,
  };
}

export function buildLegacyFeedbackSummary(report = {}) {
  const items = normalizeFeedbackItems(report.items);
  const counts = items.reduce(
    (acc, item) => {
      acc[item.type] = (acc[item.type] || 0) + 1;
      return acc;
    },
    { vocabulary: 0, grammar: 0, pronunciation: 0, note: 0 }
  );

  const lines = ["Structured session recap"];

  if (report.summary) {
    lines.push(`Summary: ${String(report.summary).trim()}`);
  }

  lines.push(`Vocabulary: ${counts.vocabulary}`);
  lines.push(`Grammar fixes: ${counts.grammar}`);
  lines.push(`Pronunciation practice: ${counts.pronunciation}`);
  lines.push(`General notes: ${counts.note}`);

  if (report.futureSteps) {
    lines.push(`Next focus: ${String(report.futureSteps).trim()}`);
  }

  return lines.join("\n");
}

export function serializeRichFeedbackComments(report = {}) {
  const payload = {
    version: 1,
    summary: String(report.summary || "").trim(),
    futureSteps: String(report.futureSteps || "").trim(),
    items: normalizeFeedbackItems(report.items),
    updatedAt: report.updatedAt || new Date().toISOString(),
  };

  return [
    buildLegacyFeedbackSummary(payload),
    FEEDBACK_REPORT_START,
    JSON.stringify(payload),
    FEEDBACK_REPORT_END,
  ].join("\n");
}
