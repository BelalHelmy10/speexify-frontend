"use client";

// Small pieces shared by the units overview and the unit page.
import Link from "next/link";
import { Check } from "lucide-react";
import { getIntlLocale } from "@/utils/locale";

export function formatLessonDate(value, locale = "en") {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat(getIntlLocale(locale), { day: "numeric", month: "short", year: "numeric" }).format(
      new Date(value)
    );
  } catch {
    return "";
  }
}

export function unitHref(prefix, unitId, learnerId) {
  const query = learnerId ? `?learner=${encodeURIComponent(learnerId)}` : "";
  return `${prefix}/dashboard/units/${encodeURIComponent(unitId)}${query}`;
}

export function UnitName({ group, c, as: Tag = "h3", className = "" }) {
  return (
    <Tag className={`unit-name ${className}`}>
      {group.number != null && <span className="unit-name__number">{c.unitNumber(group.number)}</span>}
      <span className="unit-name__topic" dir="auto">{group.topic}</span>
    </Tag>
  );
}

export function UnitLevel({ level }) {
  const parts = [level.course, level.band].filter(Boolean);
  if (!parts.length) return null;
  return (
    <p className="unit-level" dir="auto">
      {parts.join(" · ")}
    </p>
  );
}

export function StatusPill({ status, c }) {
  return <span className={`unit-status unit-status--${status}`}>{c.status[status]}</span>;
}

export function UnitProgress({ group, c }) {
  const percent = group.tracked ? Math.round((group.completed / group.tracked) * 100) : 0;
  return (
    <div className="unit-progress">
      <div
        className="unit-progress__bar"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={group.tracked || 0}
        aria-valuenow={group.completed}
        aria-label={c.progress(group.completed, group.tracked)}
      >
        <span style={{ width: `${percent}%` }} />
      </div>
      <p className="unit-progress__text">
        {group.tracked ? c.progress(group.completed, group.tracked) : c.lessons(group.lessons.length)}
      </p>
    </div>
  );
}

// Three dots for a lesson's review, practice and homework steps.
export function LessonStepDots({ steps, c }) {
  const keys = ["review", "practise", "homework"].filter((key) => steps?.[key]);
  if (!keys.length) return null;
  const label = keys.map((key) => `${c.stepNames[key]}: ${steps[key].done ? c.stepState.done : c.stepState.todo}`).join(", ");
  return (
    <span className="unit-dots" role="img" aria-label={`${c.lessonSteps}: ${label}`}>
      {keys.map((key) => (
        <span key={key} className={`unit-dots__dot ${steps[key].done ? "is-done" : ""}`} title={c.stepNames[key]}>
          {steps[key].done && <Check size={10} strokeWidth={3.5} aria-hidden="true" />}
        </span>
      ))}
    </span>
  );
}

export function LessonRow({ lesson, c, locale, prefix }) {
  const hasSteps = Boolean(lesson.steps?.review || lesson.steps?.practise || lesson.steps?.homework);
  return (
    <li className={`unit-lesson ${lesson.steps?.done ? "is-done" : ""}`}>
      <Link href={`${prefix}/dashboard/sessions/${lesson.id}#lesson`} className="unit-lesson__link">
        <span className="unit-lesson__main">
          <strong dir="auto">{lesson.title || c.openRecap}</strong>
          <small>
            {formatLessonDate(lesson.startAt, locale)}
            {lesson.teacherName ? ` · ${lesson.teacherName}` : ""}
          </small>
        </span>
        <span className="unit-lesson__state">
          {hasSteps ? (
            <>
              <LessonStepDots steps={lesson.steps} c={c} />
              {lesson.steps.done && <span className="unit-lesson__done">{c.lessonDone}</span>}
            </>
          ) : (
            <span className="unit-lesson__waiting">{c.awaitingFeedback}</span>
          )}
        </span>
      </Link>
    </li>
  );
}
