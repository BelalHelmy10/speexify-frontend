"use client";

// The lesson recap on the session page: the learner reads the teacher's
// report, practises it, then does the homework, and each step is ticked off
// on the server so the dashboard knows what is left.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowDown, Check, PartyPopper, PenLine } from "lucide-react";
import api from "@/lib/api";
import { getReportFromFeedback, stripRichFeedbackPayload } from "@/lib/feedbackReport";
import FeedbackReportTable from "./FeedbackReportTable";
import {
  GeneralCommentsCard,
  PronunciationHub,
  QuickReviewQuiz,
  VocabularyCarousel,
  buildQuizQuestions,
} from "./LessonPractice";
import { lessonCopy } from "./lessonCopy";
import "@/styles/session-feedback.scss";
import "@/styles/lesson-recap.scss";

const PRACTICE_TYPES = new Set(["vocabulary", "grammar", "pronunciation"]);

function scrollToStep(id) {
  const element = typeof document !== "undefined" ? document.getElementById(id) : null;
  if (!element) return;
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  element.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
}

function StepStrip({ steps, c, interactive }) {
  const visible = ["review", "practise", "homework"].filter((key) => steps[key]);
  const target = { review: "lesson-review", practise: "lesson-practise", homework: "lesson-homework" };
  return (
    <ol className="lesson-steps" aria-label={c.recapKicker}>
      {visible.map((key, index) => {
        const step = steps[key];
        const state = step.done ? "done" : steps.next === key ? "next" : "todo";
        const content = (
          <>
            <span className="lesson-steps__marker" aria-hidden="true">
              {step.done ? <Check size={15} strokeWidth={3} /> : index + 1}
            </span>
            <span className="lesson-steps__text">
              <strong>{c.steps[key]}</strong>
              <small>
                {key === "homework" && step.total
                  ? c.homeworkCount(step.completed, step.total)
                  : c.stepState[state]}
              </small>
            </span>
          </>
        );
        return (
          <li key={key} className={`lesson-steps__item is-${state}`} aria-current={state === "next" ? "step" : undefined}>
            {interactive ? (
              <button type="button" onClick={() => scrollToStep(target[key])}>
                <span className="fb-sr-only">{c.stepOf(index + 1, visible.length)}: </span>
                {content}
              </button>
            ) : (
              <span className="lesson-steps__static">{content}</span>
            )}
          </li>
        );
      })}
      <li className={`lesson-steps__item lesson-steps__item--done is-${steps.done ? "done" : "todo"}`}>
        <span className="lesson-steps__static">
          <span className="lesson-steps__marker" aria-hidden="true">
            {steps.done ? <PartyPopper size={15} /> : <Check size={15} />}
          </span>
          <span className="lesson-steps__text">
            <strong>{c.steps.done}</strong>
          </span>
        </span>
      </li>
    </ol>
  );
}

function StepHeading({ number, title, hint, done }) {
  return (
    <header className="lesson-step__head">
      <span className={`lesson-step__number ${done ? "is-done" : ""}`} aria-hidden="true">
        {done ? <Check size={16} strokeWidth={3} /> : number}
      </span>
      <div>
        <h3>{title}</h3>
        {hint && <p>{hint}</p>}
      </div>
    </header>
  );
}

function LegacyFeedback({ teacherFeedback, c }) {
  const comments = stripRichFeedbackPayload(teacherFeedback?.commentsOnSession || "");
  return (
    <div className="lesson-legacy">
      {teacherFeedback?.messageToLearner?.trim() && (
        <article className="lesson-legacy__card lesson-legacy__card--featured">
          <p dir="auto">{teacherFeedback.messageToLearner}</p>
        </article>
      )}
      {comments && (
        <article className="lesson-legacy__card">
          <h4>{c.legacyComments}</h4>
          <p dir="auto">{comments}</p>
        </article>
      )}
      {teacherFeedback?.futureSteps?.trim() && (
        <article className="lesson-legacy__card">
          <h4>{c.nextFocus}</h4>
          <p dir="auto">{teacherFeedback.futureSteps}</p>
        </article>
      )}
    </div>
  );
}

export default function LessonRecap({
  sessionId,
  locale = "en",
  prefix = "",
  teacherFeedback,
  canTeach = false,
  isLearner = false,
  progressHref,
  homework,
}) {
  const c = lessonCopy(locale);
  const report = useMemo(() => getReportFromFeedback(teacherFeedback || {}), [teacherFeedback]);
  const items = report.items;
  const vocabulary = items.filter((item) => item.type === "vocabulary");
  const pronunciation = items.filter((item) => item.type === "pronunciation");
  const questions = useMemo(() => buildQuizQuestions(items, c), [items, c]);
  const practiceCount = items.filter((item) => PRACTICE_TYPES.has(item.type)).length;
  const tracksProgress = isLearner && !canTeach;

  const [data, setData] = useState(null);
  const [saving, setSaving] = useState(null);
  const reviewSentinel = useRef(null);
  const recorded = useRef(new Set());

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/sessions/${sessionId}/lesson-progress`);
      setData(res.data || null);
    } catch {
      // The recap still works without progress; the steps just stay unticked.
      setData(null);
    }
  }, [sessionId]);

  useEffect(() => {
    load();
  }, [load]);

  const fallbackSteps = {
    review: { done: false },
    practise: practiceCount ? { done: false } : null,
    homework: null,
    next: "review",
    done: false,
  };
  const steps = data?.progress?.steps || fallbackSteps;
  const showHomework = Boolean(homework) && (canTeach || Boolean(steps.homework));

  const markStep = useCallback(
    async (step) => {
      if (!tracksProgress || recorded.current.has(step)) return;
      const field = step === "reviewed" ? "review" : "practise";
      if (steps[field]?.done) return;
      recorded.current.add(step);
      setSaving(step);
      try {
        await api.post(`/sessions/${sessionId}/lesson-progress`, { step });
        await load();
      } catch {
        recorded.current.delete(step);
      } finally {
        setSaving(null);
      }
    },
    [load, sessionId, steps, tracksProgress]
  );

  // Reading to the end of the report counts as reviewing it.
  useEffect(() => {
    if (!tracksProgress || steps.review?.done || !reviewSentinel.current) return undefined;
    if (typeof IntersectionObserver === "undefined") return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) markStep("reviewed");
      },
      { threshold: 1 }
    );
    observer.observe(reviewSentinel.current);
    return () => observer.disconnect();
  }, [markStep, steps.review?.done, tracksProgress]);

  // Links such as the feedback email point at #lesson or a step inside it.
  useEffect(() => {
    const hash = typeof window !== "undefined" ? window.location.hash.slice(1) : "";
    if (hash.startsWith("lesson")) window.requestAnimationFrame(() => scrollToStep(hash));
  }, []);

  const goToPractice = () => {
    markStep("reviewed");
    scrollToStep(practiceCount ? "lesson-practise" : "lesson-homework");
  };

  const learners = data?.learners || [];
  let stepNumber = 0;

  return (
    <section id="lesson" className="lesson-recap fb-theme" aria-labelledby="lesson-recap-title">
      <header className="lesson-recap__head">
        <div className="lesson-recap__titles">
          <p className="lesson-recap__kicker">{c.recapKicker}</p>
          <h2 id="lesson-recap-title">{canTeach ? c.recapTitleTeacher : c.recapTitle}</h2>
          <p className="lesson-recap__hint">{canTeach ? c.recapHintTeacher : c.recapHintLearner}</p>
        </div>
        {canTeach && (
          <Link href={`${prefix}/dashboard/sessions/${sessionId}/feedback`} className="lesson-recap__edit">
            <PenLine size={16} aria-hidden="true" />
            {c.editFeedback}
          </Link>
        )}
        {tracksProgress ? (
          <StepStrip steps={steps} c={c} interactive />
        ) : (
          learners.length > 0 && (
            <div className="lesson-recap__learners">
              <h3>{c.learnersProgress}</h3>
              <ul>
                {learners.map((learner) => (
                  <li key={learner.id}>
                    <span className="lesson-recap__learner-name">{learner.name}</span>
                    <StepStrip steps={learner.steps} c={c} interactive={false} />
                  </li>
                ))}
              </ul>
            </div>
          )
        )}
      </header>

      {steps.done && tracksProgress && (
        <div className="lesson-recap__done" role="status">
          <PartyPopper size={22} aria-hidden="true" />
          <div>
            <strong>{c.doneTitle}</strong>
            <p>{c.doneBody}</p>
          </div>
          {progressHref && (
            <Link href={progressHref} className="lesson-recap__done-link">{c.viewProgress}</Link>
          )}
        </div>
      )}

      <div id="lesson-review" className="lesson-step">
        <StepHeading number={++stepNumber} title={c.reviewTitle} hint={report.hasRichReport ? c.reviewHint : null} done={tracksProgress && steps.review?.done} />
        {report.hasRichReport ? (
          <div className="lesson-step__body">
            <FeedbackReportTable items={items} locale={locale} headingLevel={4} />
            <GeneralCommentsCard summary={report.summary} futureSteps={report.futureSteps} locale={locale} headingLevel={4} />
          </div>
        ) : (
          <LegacyFeedback teacherFeedback={teacherFeedback} c={c} />
        )}
        <span ref={reviewSentinel} className="lesson-step__sentinel" aria-hidden="true" />
        {tracksProgress && (practiceCount > 0 || steps.homework) && (
          <button type="button" className="lesson-next" onClick={goToPractice} disabled={saving === "reviewed"}>
            {practiceCount ? c.nextPractise : c.nextHomework}
            <ArrowDown size={16} aria-hidden="true" />
          </button>
        )}
      </div>

      {practiceCount > 0 && (
        <div id="lesson-practise" className="lesson-step">
          <StepHeading number={++stepNumber} title={c.practiseTitle} hint={c.practiseHint} done={tracksProgress && steps.practise?.done} />
          <div className="lesson-step__body lesson-practice-grid">
            {vocabulary.length > 0 && <VocabularyCarousel items={vocabulary} locale={locale} headingLevel={4} />}
            {pronunciation.length > 0 && <PronunciationHub items={pronunciation} locale={locale} headingLevel={4} />}
          </div>
          {questions.length > 0 && (
            <div className="lesson-step__body">
              <QuickReviewQuiz
                questions={questions}
                locale={locale}
                headingLevel={4}
                onComplete={() => markStep("practised")}
              />
            </div>
          )}
          {tracksProgress && (
            <button
              type="button"
              className={`lesson-next ${steps.practise?.done ? "is-done" : ""}`}
              onClick={() => {
                markStep("practised");
                if (steps.homework) scrollToStep("lesson-homework");
              }}
              disabled={saving === "practised" || steps.practise?.done}
            >
              {steps.practise?.done ? (
                <>
                  <Check size={16} aria-hidden="true" /> {c.practisedDone}
                </>
              ) : (
                <>
                  {c.markPractised}
                  {steps.homework && <ArrowDown size={16} aria-hidden="true" />}
                </>
              )}
            </button>
          )}
        </div>
      )}

      {showHomework && (
        <div id="lesson-homework" className="lesson-step">
          <StepHeading number={++stepNumber} title={c.homeworkTitle} done={tracksProgress && steps.homework?.done} />
          <div className="lesson-step__body">{homework}</div>
        </div>
      )}
    </section>
  );
}
