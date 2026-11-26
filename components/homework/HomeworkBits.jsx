"use client";

import { homeworkCopy } from "./homeworkCopy";

export function HomeworkStatusPill({ status, overdue, locale = "en" }) {
  const c = homeworkCopy(locale);
  const key = overdue ? "overdue" : String(status || "").toLowerCase();
  return <span className={`hw-pill hw-pill--${key}`}>{overdue ? c.overdue : c.status[status] || status}</span>;
}

export function ProgressBar({ done = 0, total = 0 }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <span className="hw-progress" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done}>
      <span className="hw-progress__fill" style={{ width: `${pct}%` }} />
    </span>
  );
}
