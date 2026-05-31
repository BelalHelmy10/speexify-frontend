"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { fmtInTz } from "@/utils/date";

function FeedbackIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a4 4 0 0 1-4 4H7l-4 4V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
      <path d="M8 10h.01" />
      <path d="M12 10h.01" />
      <path d="M16 10h.01" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      <path d="M5 3v4" />
      <path d="M19 17v4" />
      <path d="M3 5h4" />
      <path d="M17 19h4" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

export default function LearnerFeedbackPanel({ dict, prefix, timezone }) {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const { data } = await api.get("/me/feedback", { params: { limit: 3, t: Date.now() } });
        if (!cancelled) setFeedbacks(data?.feedbacks || []);
      } catch (e) {
        if (!cancelled) setFeedbacks([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const count = feedbacks.length;
  const latest = feedbacks[0] || null;

  if (loading) {
    return (
      <div className="panel panel--feedback panel--feedback-loading">
        <div className="panel__head">
          <div>
            <h3>{dict?.feedback_title || "Teacher feedback"}</h3>
          </div>
        </div>
        <div className="feedback-empty-state feedback-empty-state--compact">
          <div className="feedback-skeleton" />
          <div className="feedback-skeleton" style={{ width: "70%" }} />
        </div>
      </div>
    );
  }

  if (count === 0) {
    return (
      <div className="panel panel--feedback panel--feedback-empty">
        <div className="panel__head">
          <div>
            <h3>{dict?.feedback_title || "Teacher feedback"}</h3>
            <span className="session-count">0</span>
          </div>
          <Link href={`${prefix}/dashboard/feedback`} className="btn btn--ghost btn--sm">
            {dict?.view_all || "View all"}
          </Link>
        </div>
        <div className="feedback-empty-state feedback-empty-state--compact">
          <div className="feedback-empty-state__icon">
            <FeedbackIcon />
          </div>
          <p>{dict?.feedback_empty_title || "No feedback yet"}</p>
          <p className="feedback-empty-state__sub">{dict?.feedback_empty_body || "Once your teacher leaves feedback, it will appear here."}</p>
        </div>
      </div>
    );
  }

  const countLabel = count === 1
    ? (dict?.feedback_count_one || "1 note")
    : (dict?.feedback_count_other || `${count} notes`).replace("{count}", count);

  return (
    <div className="panel panel--feedback">
      <div className="panel__head">
        <div>
          <h3>{dict?.feedback_title || "Teacher feedback"}</h3>
          <span className="session-count">{countLabel}</span>
        </div>
        <Link href={`${prefix}/dashboard/feedback`} className="btn btn--ghost btn--sm">
          {dict?.view_all || "View all"}
          <ArrowRightIcon />
        </Link>
      </div>

      {/* New feedback highlight */}
      {latest && (
        <div className="feedback-highlight">
          <div className="feedback-highlight__badge">
            <SparkleIcon />
            {dict?.new_feedback_badge || "New"}
          </div>
          <div className="feedback-highlight__meta">
            <span className="feedback-highlight__teacher">
              {dict?.from_teacher?.replace("{name}", latest.teacher?.name || "Your teacher") || `From ${latest.teacher?.name || "Your teacher"}`}
            </span>
            <span className="feedback-highlight__date">
              {latest.startAt ? fmtInTz(latest.startAt, timezone) : ""}
            </span>
          </div>
          <h4 className="feedback-highlight__title">{latest.title}</h4>
          {latest.feedback?.messageToLearner && (
            <p className="feedback-highlight__preview">
              {latest.feedback.messageToLearner.length > 140
                ? latest.feedback.messageToLearner.slice(0, 140) + "…"
                : latest.feedback.messageToLearner}
            </p>
          )}
          <div className="feedback-highlight__actions">
            <Link
              href={`${prefix}/dashboard/sessions/${latest.id}/feedback`}
              className="btn btn--primary btn--sm"
            >
              {dict?.read_more || "Read more"}
            </Link>
          </div>
        </div>
      )}

      {/* Mini list of older feedback */}
      {feedbacks.length > 1 && (
        <div className="feedback-mini-list">
          {feedbacks.slice(1).map((fb) => (
            <Link
              key={fb.id}
              href={`${prefix}/dashboard/sessions/${fb.id}/feedback`}
              className="feedback-mini-item"
            >
              <div className="feedback-mini-item__dot" />
              <div className="feedback-mini-item__content">
                <span className="feedback-mini-item__title">{fb.title}</span>
                <span className="feedback-mini-item__date">
                  {fb.startAt ? fmtInTz(fb.startAt, timezone) : ""}
                </span>
              </div>
              <ArrowRightIcon />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
