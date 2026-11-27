"use client";

// One unit: its lessons with their steps, a review of everything taught in
// it, its homework and its course materials.
import { useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, ClipboardList, FolderOpen, PartyPopper, RotateCw } from "lucide-react";
import { stripMarks } from "@/lib/feedbackMarks.mjs";
import FeedbackReportTable from "@/components/lesson/FeedbackReportTable";
import { PronunciationHub, QuickReviewQuiz, VocabularyCarousel, buildQuizQuestions } from "@/components/lesson/LessonPractice";
import { lessonCopy } from "@/components/lesson/lessonCopy";
import useLessonUnits from "./useLessonUnits";
import { unitCopy } from "./unitCopy";
import { LessonRow, StatusPill, UnitLevel, UnitName, UnitProgress, formatLessonDate } from "./UnitParts";
import "@/styles/session-feedback.scss";
import "@/styles/lesson-recap.scss";
import "@/styles/units.scss";

const MAX_QUIZ_QUESTIONS = 15;

// The same word taught in two lessons shows once, from the latest lesson.
function latestPerPrompt(items) {
  const seen = new Map();
  for (const item of items) seen.set(`${item.type}:${stripMarks(item.prompt).trim().toLowerCase()}`, item);
  return [...seen.values()];
}

function UnitHomework({ homework, c, locale, prefix }) {
  return (
    <section className="units-block" aria-labelledby="unit-homework">
      <h2 id="unit-homework">
        <ClipboardList size={18} aria-hidden="true" />
        {c.homeworkTitle}
      </h2>
      {homework.length ? (
        <ul className="unit-homework">
          {homework.map((assignment) => (
            <li key={assignment.id}>
              <Link href={`${prefix}/dashboard/homework/${assignment.id}`} className="unit-homework__link">
                <span className="unit-homework__main">
                  <strong dir="auto">{assignment.title}</strong>
                  {assignment.dueAt && <small>{c.due(formatLessonDate(assignment.dueAt, locale))}</small>}
                </span>
                <span className={`unit-homework__status unit-homework__status--${String(assignment.status).toLowerCase()}`}>
                  {c.homeworkStatus[assignment.status] || assignment.status}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="units-block__empty">{c.homeworkEmpty}</p>
      )}
    </section>
  );
}

function UnitMaterials({ group, used, c, prefix }) {
  const materials = group.unit.materials || [];
  if (!materials.length) return null;
  return (
    <section className="units-block" aria-labelledby="unit-materials">
      <h2 id="unit-materials">
        <FolderOpen size={18} aria-hidden="true" />
        {c.materialsTitle}
      </h2>
      <p className="units-block__hint">{c.materialsHint}</p>
      <ul className="unit-materials">
        {materials.map((material) => (
          <li key={material._id}>
            <span className="unit-materials__kind">{c.kinds[material.kind] || c.kinds.other}</span>
            <span className="unit-materials__title" dir="auto">{material.title}</span>
            {used.has(material._id) && <span className="unit-materials__used">{c.usedInClass}</span>}
          </li>
        ))}
      </ul>
      {group.unit.slug && (
        <Link href={`${prefix}/resources/units/${group.unit.slug}`} className="units-button">
          {c.openMaterials}
        </Link>
      )}
    </section>
  );
}

export default function UnitDetail({ unitId, locale = "en", prefix = "", learnerId = null }) {
  const c = unitCopy(locale);
  const lc = lessonCopy(locale);
  const { status, groups, reload } = useLessonUnits({ learnerId });
  const group = groups?.units.find((unit) => unit.id === unitId) || null;

  const review = useMemo(() => {
    const items = group?.items || [];
    const vocabulary = latestPerPrompt(items.filter((item) => item.type === "vocabulary"));
    const pronunciation = latestPerPrompt(items.filter((item) => item.type === "pronunciation"));
    const reportItems = items.filter((item) => item.type !== "note");
    const questions = buildQuizQuestions([...vocabulary, ...items.filter((item) => item.type === "grammar")], lc).slice(
      0,
      MAX_QUIZ_QUESTIONS
    );
    return { vocabulary, pronunciation, reportItems, questions };
  }, [group, lc]);

  const used = useMemo(
    () => new Set((group?.lessons || []).flatMap((lesson) => (lesson.materials || []).map((m) => m.id))),
    [group]
  );
  const backHref = `${prefix}/dashboard/units${learnerId ? `?learner=${encodeURIComponent(learnerId)}` : ""}`;

  return (
    <main className="container page-dashboard units-page fb-theme" dir={locale === "ar" ? "rtl" : undefined}>
      <Link href={backHref} className="units-back">
        <ArrowLeft size={16} aria-hidden="true" className="unit-flip" />
        {c.allUnits}
      </Link>

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

      {status === "ready" && !group && (
        <div className="units-page__state">
          <p>{c.notFound}</p>
        </div>
      )}

      {status === "ready" && group && (
        <>
          <header className="unit-hero">
            <div className="unit-hero__top">
              <UnitLevel level={group.level} />
              <StatusPill status={group.status} c={c} />
            </div>
            <UnitName group={group} c={c} as="h1" />
            {group.unit.summary && (
              <p className="unit-hero__summary" dir="auto">
                {group.unit.summary}
              </p>
            )}
            <UnitProgress group={group} c={c} />
            {learnerId && <p className="unit-hero__note">{c.teacherNote}</p>}
          </header>

          {group.status === "finished" && (
            <div className="unit-finished" role="status">
              <PartyPopper size={22} aria-hidden="true" />
              <div>
                <strong>{c.finishedTitle}</strong>
                <p>{c.finishedBody}</p>
              </div>
            </div>
          )}

          <section className="units-block" aria-labelledby="unit-lessons">
            <h2 id="unit-lessons">{c.lessonsTitle}</h2>
            <ul className="unit-lessons">
              {group.lessons.map((lesson) => (
                <LessonRow key={lesson.id} lesson={lesson} c={c} locale={locale} prefix={prefix} />
              ))}
            </ul>
          </section>

          <section className="units-block units-block--review" aria-labelledby="unit-review">
            <header className="units-block__head">
              <h2 id="unit-review">{c.reviewTitle}</h2>
              <p className="units-block__hint">{c.reviewHint}</p>
            </header>
            {review.reportItems.length ? (
              <>
                {(review.vocabulary.length > 0 || review.pronunciation.length > 0) && (
                  <div className="lesson-practice-grid unit-review-grid">
                    {review.vocabulary.length > 0 && (
                      <VocabularyCarousel items={review.vocabulary} locale={locale} headingLevel={3} />
                    )}
                    {review.pronunciation.length > 0 && (
                      <PronunciationHub items={review.pronunciation} locale={locale} headingLevel={3} />
                    )}
                  </div>
                )}
                {review.questions.length > 0 && (
                  <QuickReviewQuiz questions={review.questions} locale={locale} headingLevel={3} />
                )}
                <FeedbackReportTable items={review.reportItems} locale={locale} headingLevel={3} title={c.reportTitle} />
              </>
            ) : (
              <p className="units-block__empty">{c.reviewEmpty}</p>
            )}
          </section>

          <UnitHomework homework={group.homework} c={c} locale={locale} prefix={prefix} />
          <UnitMaterials group={group} used={used} c={c} prefix={prefix} />
        </>
      )}
    </main>
  );
}
