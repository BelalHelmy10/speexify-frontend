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

function ListenButton({ text }) {
  return (
    <button
      type="button"
      className="fb-listen"
      onClick={() => speakText(text)}
      aria-label={`Listen to ${stripMarks(text)}`}
      title="Listen"
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

function ReportRow({ item, index }) {
  let entry;
  let comment;

  if (item.type === "grammar") {
    const { correction, explanation } = getMistakeParts(item);
    const segments = getMistakeSegments(item.prompt, correction);
    entry = <MarkedText segments={segments.before} tone="wrong" />;
    comment = (
      <>
        <MarkedText segments={segments.after} tone="right" />
        {explanation && <span className="fb-report__note" dir="auto">{explanation}</span>}
      </>
    );
  } else {
    const speakable = item.type === "vocabulary" || item.type === "pronunciation";
    entry = (
      <span className="fb-report__word">
        <MarkedText segments={parseMarkedText(item.prompt)} className="fb-report__strong" />
        {speakable && <ListenButton text={item.prompt} />}
      </span>
    );
    comment = (
      <>
        {isLink(item.response) ? (
          <a className="fb-report__link" href={item.response.trim()} target="_blank" rel="noopener noreferrer">
            Hear it spoken
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
      <span className="fb-report__type" role="cell"><FeedbackTypeBadge type={item.type} /></span>
      <span className="fb-report__entry" role="cell">{entry}</span>
      <span className="fb-report__comment" role="cell">{comment}</span>
    </div>
  );
}

export default function FeedbackReportTable({ items }) {
  return (
    <section className="session-report-learner-section fb-report">
      <div className="session-report-section-title">
        <div>
          <ListChecks size={18} />
          <h2>Session report</h2>
        </div>
        {items.some((item) => item.type === "grammar") && (
          <p className="fb-report__legend">
            <span className="fb-mark fb-mark--wrong">What you said</span>
            <span aria-hidden="true">→</span>
            <span className="fb-mark fb-mark--right">Better</span>
          </p>
        )}
      </div>

      {items.length ? (
        <div className="fb-report__table" role="table" aria-label="Session report entries">
          <div className="fb-report__head" role="row">
            <span role="columnheader">#</span>
            <span role="columnheader">Type</span>
            <span role="columnheader">Entry</span>
            <span role="columnheader">Comment</span>
          </div>
          {items.map((item, index) => (
            <ReportRow key={item.id} item={item} index={index} />
          ))}
        </div>
      ) : (
        <div className="session-report-empty session-report-empty--learner">
          <p>Your coach has not added entries to this report yet.</p>
        </div>
      )}
    </section>
  );
}
