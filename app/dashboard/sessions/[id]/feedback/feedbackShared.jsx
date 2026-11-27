"use client";

import { Fragment } from "react";
import { BookOpen, ClipboardCheck, MessageSquareText, Mic } from "lucide-react";
import { stripMarks } from "@/lib/feedbackMarks.mjs";

export const FEEDBACK_TYPES = [
  {
    key: "vocabulary",
    label: "New word",
    plural: "New words",
    icon: BookOpen,
    entryLabel: "Word or phrase",
    commentLabel: "Meaning",
    entryPlaceholder: "e.g. bandwidth",
    commentPlaceholder: "The time or energy to take on more work.",
  },
  {
    key: "grammar",
    label: "Mistake",
    plural: "Mistakes",
    icon: ClipboardCheck,
    entryLabel: "What the learner said",
    commentLabel: "Correction",
    entryPlaceholder: "e.g. I *am agree* with you.",
    commentPlaceholder: "I *agree* with you.",
  },
  {
    key: "pronunciation",
    label: "Pronunciation",
    plural: "Pronunciation",
    icon: Mic,
    entryLabel: "Word",
    commentLabel: "Sound note or link",
    entryPlaceholder: "e.g. assistance",
    commentPlaceholder: "/əˈsɪs.təns/ or a link (optional)",
  },
  {
    key: "note",
    label: "Other",
    plural: "Other notes",
    icon: MessageSquareText,
    entryLabel: "Topic",
    commentLabel: "Comment",
    entryPlaceholder: "e.g. Confidence",
    commentPlaceholder: "You paused less before answering today.",
  },
];

export function getFeedbackType(key) {
  return FEEDBACK_TYPES.find((type) => type.key === key) || FEEDBACK_TYPES[0];
}

export function FeedbackTypeBadge({ type }) {
  const config = getFeedbackType(type);
  const Icon = config.icon;
  return (
    <span className={`session-report-badge session-report-badge--${config.key}`}>
      <Icon size={14} aria-hidden="true" />
      {config.label}
    </span>
  );
}

// tone "wrong" = the learner's words (red), "right" = the correction (green),
// "key" = a highlighted word on any other row.
const TONE_LABEL = { wrong: "mistake", right: "correction" };

export function MarkedText({ segments, tone = "key", className = "" }) {
  return (
    <span dir="auto" className={`fb-text ${className}`.trim()}>
      {segments.map((segment, index) =>
        segment.marked ? (
          <mark key={index} className={`fb-mark fb-mark--${tone}`}>
            {TONE_LABEL[tone] && <span className="fb-sr-only">{TONE_LABEL[tone]}: </span>}
            {segment.text}
          </mark>
        ) : (
          <Fragment key={index}>{segment.text}</Fragment>
        )
      )}
    </span>
  );
}

const ARABIC_PATTERN = /[؀-ۿ]/;

export function speakText(value) {
  if (typeof window === "undefined" || !window.speechSynthesis) return false;
  const text = stripMarks(value).trim();
  if (!text) return false;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = ARABIC_PATTERN.test(text) ? "ar" : "en-US";
  utterance.rate = 0.9;
  window.speechSynthesis.speak(utterance);
  return true;
}
