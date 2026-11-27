"use client";

// "Your units": the learner's lessons grouped into curriculum units, with the
// current unit first.
import Link from "next/link";
import { ArrowRight, BookOpen, RotateCw } from "lucide-react";
import useLessonUnits from "./useLessonUnits";
import { unitCopy } from "./unitCopy";
import { LessonRow, StatusPill, UnitLevel, UnitName, UnitProgress, unitHref } from "./UnitParts";
import "@/styles/session-feedback.scss";
import "@/styles/units.scss";

function UnitCard({ group, c, prefix, learnerId, featured = false }) {
  return (
    <li className={`unit-card unit-card--${group.status} ${featured ? "unit-card--featured" : ""}`}>
      <Link href={unitHref(prefix, group.id, learnerId)} className="unit-card__link">
        <span className="unit-card__top">
          <StatusPill status={group.status} c={c} />
          <span className="unit-card__count">{c.lessons(group.lessons.length)}</span>
        </span>
        <UnitName group={group} c={c} />
        {featured && <UnitLevel level={group.level} />}
        {featured && group.unit.summary && (
          <p className="unit-card__summary" dir="auto">
            {group.unit.summary}
          </p>
        )}
        <UnitProgress group={group} c={c} />
        <span className="unit-card__open">
          {c.openUnit}
          <ArrowRight size={15} aria-hidden="true" className="unit-flip" />
        </span>
      </Link>
    </li>
  );
}

export default function UnitsOverview({ locale = "en", prefix = "", learnerId = null }) {
  const c = unitCopy(locale);
  const { status, groups, learner, reload } = useLessonUnits({ learnerId });
  const title = learnerId && learner?.name ? c.titleFor(learner.name) : c.title;

  return (
    <main className="container page-dashboard units-page fb-theme" dir={locale === "ar" ? "rtl" : undefined}>
      <header className="units-page__head">
        <p className="units-page__kicker">{c.kicker}</p>
        <h1>{title}</h1>
        <p className="units-page__hint">{learnerId ? c.hintTeacher : c.hint}</p>
      </header>

      {status === "loading" && (
        <p className="units-page__state" role="status">
          {c.loading}
        </p>
      )}

      {status === "error" && (
        <div className="units-page__state units-page__state--error" role="alert">
          <p>{c.error}</p>
          <button type="button" className="units-button" onClick={reload}>
            <RotateCw size={15} aria-hidden="true" />
            {c.retry}
          </button>
        </div>
      )}

      {status === "ready" && groups && (
        <>
          {!groups.units.length && !groups.other.length && (
            <div className="units-page__state">
              <BookOpen size={22} aria-hidden="true" />
              <p>{c.empty}</p>
            </div>
          )}

          {groups.current && (
            <section className="units-section" aria-labelledby="units-current">
              <h2 id="units-current">{c.currentUnit}</h2>
              <ul className="unit-cards unit-cards--single">
                <UnitCard group={groups.current} c={c} prefix={prefix} learnerId={learnerId} featured />
              </ul>
            </section>
          )}

          {groups.levels.map((level) => (
            <section key={level.key} className="units-section" aria-label={[level.course, level.band].filter(Boolean).join(" · ")}>
              <h2 dir="auto">{[level.course, level.band].filter(Boolean).join(" · ") || c.title}</h2>
              <ul className="unit-cards">
                {level.units.map((group) => (
                  <UnitCard key={group.id} group={group} c={c} prefix={prefix} learnerId={learnerId} />
                ))}
              </ul>
            </section>
          ))}

          {groups.other.length > 0 && (
            <section className="units-section" aria-labelledby="units-other">
              <h2 id="units-other">{c.otherLessons}</h2>
              <p className="units-section__hint">{c.otherHint}</p>
              <ul className="unit-lessons">
                {groups.other.map((lesson) => (
                  <LessonRow key={lesson.id} lesson={lesson} c={c} locale={locale} prefix={prefix} />
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </main>
  );
}
