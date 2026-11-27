"use client";

import { ExternalLink, ListChecks, Volume2 } from "lucide-react";
import {
  getMistakeSegments,
  isLink,
  parseMarkedText,
  splitCorrectionAndExplanation,
  stripMarks,
} from "@/lib/feedbackMarks.mjs";
import { FeedbackTypeBadge, MarkedText, speakText } from "./feedbackShared";
import { lessonCopy } from "./lessonCopy";

function ListenButton({ text, c }) {
  return (
    <button
      type="button"
      className="fb-listen"
      onClick={() => speakText(text)}
      aria-label={c.listen(stripMarks(text))}
      title={c.listenShort}
    >
      <Volume2 size={14} aria-hidden="true" />
    </button>
  );
}

// Mistake rows may carry their explanation in `note`, or (older reports) after
// " | " in the correction.
export function getMistakeParts(item) {
  if (item.note) return { correction: item.response, explanation: item.note };
  return splitCorrectionAndExplanation(item.response);
}

function ReportRow({ item, index, c }) {
  const labels = { wrong: c.srMistake, right: c.srCorrection };
  let entry;
  let comment;

  if (item.type === "grammar") {
    const { correction, explanation } = getMistakeParts(item);
    const segments = getMistakeSegments(item.prompt, correction);
    entry = <MarkedText segments={segments.before} tone="wrong" labels={labels} />;
    comment = (
      <>
        <MarkedText segments={segments.after} tone="right" labels={labels} />
        {explanation && <span className="fb-report__note" dir="auto">{explanation}</span>}
      </>
    );
  } else {
    const speakable = item.type === "vocabulary" || item.type === "pronunciation";
    entry = (
      <span className="fb-report__word">
        <MarkedText segments={parseMarkedText(item.prompt)} className="fb-report__strong" />
        {speakable && <ListenButton text={item.prompt} c={c} />}
      </span>
    );
    comment = (
      <>
        {isLink(item.response) ? (
          <a className="fb-report__link" href={item.response.trim()} target="_blank" rel="noopener noreferrer">
            {c.hearIt}
            <ExternalLink size={13} aria-hidden="true" />
          </a>
        ) : (
          item.response && <MarkedText segments={parseMarkedText(item.response)} />
        )}
        {item.note && <span className="fb-report__note" dir="auto">{item.note}</span>}
      </>
    );
  }

  return (
    <div className={`fb-report__row fb-report__row--${item.type}`} role="row">
      <span className="fb-report__index" role="cell">{index + 1}</span>
      <span className="fb-report__type" role="cell">
        <FeedbackTypeBadge type={item.type} label={c.types[item.type]} />
      </span>
      <span className="fb-report__entry" role="cell">{entry}</span>
      <span className="fb-report__comment" role="cell">{comment}</span>
    </div>
  );
}

export default function FeedbackReportTable({ items, locale = "en", headingLevel = 2 }) {
  const c = lessonCopy(locale);
  const Heading = `h${headingLevel}`;
  return (
    <section className="session-report-learner-section fb-report">
      <div className="session-report-section-title">
        <div>
          <ListChecks size={18} />
          <Heading>{c.reportTitle}</Heading>
        </div>
        {items.some((item) => item.type === "grammar") && (
          <p className="fb-report__legend">
            <span className="fb-mark fb-mark--wrong">{c.legendWrong}</span>
            <span aria-hidden="true">{locale === "ar" ? "←" : "→"}</span>
            <span className="fb-mark fb-mark--right">{c.legendRight}</span>
          </p>
        )}
      </div>

      {items.length ? (
        <div className="fb-report__table" role="table" aria-label={c.reportTitle}>
          <div className="fb-report__head" role="row">
            <span role="columnheader">{c.columns.index}</span>
            <span role="columnheader">{c.columns.type}</span>
            <span role="columnheader">{c.columns.entry}</span>
            <span role="columnheader">{c.columns.comment}</span>
          </div>
          {items.map((item, index) => (
            <ReportRow key={item.id} item={item} index={index} c={c} />
          ))}
        </div>
      ) : (
        <div className="session-report-empty session-report-empty--learner">
          <p>{c.reportEmpty}</p>
        </div>
      )}
    </section>
  );
}
