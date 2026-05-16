// app/dashboard/sessions/[id]/SessionSummary.jsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { SessionIcon } from "./SessionDetailUI";

/**
 * SessionSummary - Comprehensive view of everything that happened in a session
 *
 * Shows:
 * - Attendance summary
 * - Resources used
 * - Teacher notes (teacher only)
 * - Teacher feedback
 * - Learner ratings/feedback
 *
 * Props:
 * - sessionId: number
 * - isTeacher: boolean
 * - locale: string
 * - prefix: string (for i18n route prefix)
 */
export default function SessionSummary({
  sessionId,
  isTeacher,
  locale = "en",
  prefix = "",
  embedded = false,
}) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!sessionId) return;

    async function loadSummary() {
      try {
        setLoading(true);
        setError(null);
        const { data } = await api.get(`/sessions/${sessionId}/summary`);
        setSummary(data?.summary || null);
      } catch (err) {
        console.error("Failed to load session summary:", err);
        setError(err?.response?.data?.error || "Failed to load summary");
      } finally {
        setLoading(false);
      }
    }

    loadSummary();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="session-summary session-summary--loading">
        <div className="session-summary__spinner" />
        <p>Loading session summary...</p>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="session-summary session-summary--error">
        <span className="session-summary__error-icon">
          <SessionIcon name="alert" size={24} />
        </span>
        <p>{error || "Unable to load session summary"}</p>
      </div>
    );
  }

  const {
    session,
    attendance,
    participants,
    teacherNotes,
    resourcesUsed,
    teacherFeedback,
    learnerFeedback,
  } = summary;

  // Format date
  const sessionDate = session.startAt
    ? new Date(session.startAt).toLocaleDateString(
        locale === "ar" ? "ar-EG" : "en-US",
        {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        }
      )
    : "";

  const sessionTime = session.startAt
    ? new Date(session.startAt).toLocaleTimeString(
        locale === "ar" ? "ar-EG" : "en-US",
        {
          hour: "2-digit",
          minute: "2-digit",
        }
      )
    : "";

  // Status badge config
  const statusConfig = {
    scheduled: { label: "Scheduled", className: "scheduled", icon: "calendar" },
    completed: { label: "Completed", className: "completed", icon: "check" },
    canceled: { label: "Canceled", className: "canceled", icon: "x" },
  };

  const status = statusConfig[session.status] || statusConfig.scheduled;

  return (
    <div className={`session-summary${embedded ? " session-summary--embedded" : ""}`}>
      {/* Header */}
      {!embedded && (
      <div className="session-summary__header">
        <div className="session-summary__title-row">
          <h2 className="session-summary__title">
            {session.title || "Session"}
          </h2>
          <span
            className={`session-summary__status session-summary__status--${status.className}`}
          >
            <SessionIcon name={status.icon} size={14} />
            {status.label}
          </span>
        </div>
        <div className="session-summary__meta">
          <span className="session-summary__date">{sessionDate}</span>
          <span className="session-summary__time">{sessionTime}</span>
          {session.teacher && (
            <span className="session-summary__teacher">
              with {session.teacher.name || session.teacher.email}
            </span>
          )}
        </div>
      </div>
      )}

      {/* Attendance Section */}
      <section className="session-summary__section">
        <h3 className="session-summary__section-title">
          <span className="session-summary__section-icon">
            <SessionIcon name="attendance" size={18} />
          </span>
          Attendance
        </h3>
        <div className="session-summary__attendance">
          <div className="session-summary__attendance-stats">
            <div className="session-summary__stat session-summary__stat--attended">
              <span className="session-summary__stat-value">
                {attendance.attended}
              </span>
              <span className="session-summary__stat-label">Attended</span>
            </div>
            <div className="session-summary__stat session-summary__stat--noshow">
              <span className="session-summary__stat-value">
                {attendance.noShow}
              </span>
              <span className="session-summary__stat-label">No Show</span>
            </div>
            <div className="session-summary__stat session-summary__stat--excused">
              <span className="session-summary__stat-value">
                {attendance.excused}
              </span>
              <span className="session-summary__stat-label">Excused</span>
            </div>
            <div className="session-summary__stat session-summary__stat--total">
              <span className="session-summary__stat-value">
                {attendance.total}
              </span>
              <span className="session-summary__stat-label">Total</span>
            </div>
          </div>

          {participants && participants.length > 0 && (
            <div className="session-summary__participants">
              {participants.map((p) => {
                const statusMeta = participantStatusMeta(p.status);
                return (
                  <div
                    key={p.id}
                    className={`session-summary__participant session-summary__participant--${statusMeta.className}`}
                  >
                    <span className="session-summary__participant-name">
                      {p.name || p.email}
                    </span>
                    <span className="session-summary__participant-status">
                      <SessionIcon name={statusMeta.icon} size={14} />
                      {statusMeta.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Resources Used Section */}
      <section className="session-summary__section">
        <h3 className="session-summary__section-title">
          <span className="session-summary__section-icon">
            <SessionIcon name="notes" size={18} />
          </span>
          Materials Covered
        </h3>
        {resourcesUsed && resourcesUsed.length > 0 ? (
          <ul className="session-summary__resources">
            {resourcesUsed.map((resource, idx) => (
              <li
                key={resource.id || idx}
                className="session-summary__resource"
              >
                <span className="session-summary__resource-icon">
                  <SessionIcon name="file" size={16} />
                </span>
                <span className="session-summary__resource-title">
                  {resource.title || resource.id}
                </span>
                {resource.firstOpenedAt && (
                  <span className="session-summary__resource-time">
                    {new Date(resource.firstOpenedAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="session-summary__empty">
            No materials were tracked for this session.
          </p>
        )}
      </section>

      {/* Teacher Notes Section (Teacher Only) */}
      {isTeacher && (
        <section className="session-summary__section">
          <h3 className="session-summary__section-title">
            <span className="session-summary__section-icon">
              <SessionIcon name="notes" size={18} />
            </span>
            Session Notes
          </h3>
          {teacherNotes ? (
            <div className="session-summary__notes">
              <p>{teacherNotes}</p>
            </div>
          ) : (
            <p className="session-summary__empty">
              No notes were taken during this session.
            </p>
          )}
        </section>
      )}

      {/* Teacher Feedback Section */}
      {teacherFeedback && (
        <section className="session-summary__section">
          <h3 className="session-summary__section-title">
            <span className="session-summary__section-icon">
              <SessionIcon name="feedback" size={18} />
            </span>
            Teacher Feedback
          </h3>
          <div className="session-summary__feedback">
            {teacherFeedback.messageToLearner && (
              <div className="session-summary__feedback-item">
                <h4>Message to Learner</h4>
                <p>{teacherFeedback.messageToLearner}</p>
              </div>
            )}
            {teacherFeedback.commentsOnSession && (
              <div className="session-summary__feedback-item">
                <h4>Session Comments</h4>
                <p>{teacherFeedback.commentsOnSession}</p>
              </div>
            )}
            {teacherFeedback.futureSteps && (
              <div className="session-summary__feedback-item">
                <h4>Future Steps</h4>
                <p>{teacherFeedback.futureSteps}</p>
              </div>
            )}
          </div>
          {isTeacher && (
            <Link
              href={`${prefix}/dashboard/sessions/${sessionId}/feedback`}
              className="session-summary__link"
            >
              Edit Feedback →
            </Link>
          )}
        </section>
      )}

      {/* Learner Feedback Section */}
      <section className="session-summary__section">
        <h3 className="session-summary__section-title">
          <span className="session-summary__section-icon">
            <SessionIcon name="star" size={18} />
          </span>
          {isTeacher ? "Learner Ratings" : "Your Feedback"}
        </h3>

        {isTeacher && learnerFeedback ? (
          <>
            {learnerFeedback.count > 0 ? (
              <div className="session-summary__learner-feedback">
                <div className="session-summary__rating-summary">
                  <span className="session-summary__avg-rating">
                    {learnerFeedback.averageRating?.toFixed(1)}
                  </span>
                  <span className="session-summary__stars">
                    <RatingStars value={learnerFeedback.averageRating || 0} />
                  </span>
                  <span className="session-summary__rating-count">
                    ({learnerFeedback.count}{" "}
                    {learnerFeedback.count === 1 ? "rating" : "ratings"})
                  </span>
                </div>

                {learnerFeedback.feedbacks &&
                  learnerFeedback.feedbacks.length > 0 && (
                    <div className="session-summary__feedback-list">
                      {learnerFeedback.feedbacks.map((fb) => (
                        <div
                          key={fb.id}
                          className="session-summary__feedback-card"
                        >
                          <div className="session-summary__feedback-header">
                            <span className="session-summary__feedback-learner">
                              {fb.learner?.name || "Learner"}
                            </span>
                            <span className="session-summary__feedback-rating">
                              <RatingStars value={fb.rating} />
                            </span>
                          </div>
                          {fb.highlights && (
                            <p className="session-summary__feedback-text">
                              <strong>Highlights:</strong> {fb.highlights}
                            </p>
                          )}
                          {fb.improvements && (
                            <p className="session-summary__feedback-text">
                              <strong>Improvements:</strong> {fb.improvements}
                            </p>
                          )}
                          {fb.otherFeedback && (
                            <p className="session-summary__feedback-text">
                              <strong>Other:</strong> {fb.otherFeedback}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
              </div>
            ) : (
              <p className="session-summary__empty">No ratings received yet.</p>
            )}
          </>
        ) : (
          <>
            {learnerFeedback?.myFeedback ? (
              <div className="session-summary__my-feedback">
                <div className="session-summary__my-rating">
                  <span>Your rating: </span>
                  <span className="session-summary__stars">
                    <RatingStars value={learnerFeedback.myFeedback.rating} />
                  </span>
                </div>
                {learnerFeedback.myFeedback.highlights && (
                  <p>
                    <strong>What went well:</strong>{" "}
                    {learnerFeedback.myFeedback.highlights}
                  </p>
                )}
                {learnerFeedback.myFeedback.improvements && (
                  <p>
                    <strong>Improvements:</strong>{" "}
                    {learnerFeedback.myFeedback.improvements}
                  </p>
                )}
              </div>
            ) : (
              <p className="session-summary__empty">
                You have not submitted feedback for this session yet.
              </p>
            )}
          </>
        )}
      </section>
    </div>
  );
}

function participantStatusMeta(status) {
  if (status === "attended") {
    return { label: "Attended", className: "attended", icon: "check" };
  }
  if (status === "no_show") {
    return { label: "No show", className: "noshow", icon: "x" };
  }
  if (status === "excused") {
    return { label: "Excused", className: "excused", icon: "alert" };
  }
  if (status === "canceled") {
    return { label: "Canceled", className: "canceled", icon: "x" };
  }
  return { label: "Enrolled", className: "booked", icon: "user" };
}

function RatingStars({ value }) {
  const rounded = Math.max(0, Math.min(5, Math.round(Number(value) || 0)));
  return (
    <>
      {Array.from({ length: 5 }).map((_, index) => (
        <SessionIcon
          key={index}
          name="star"
          size={15}
          className={index < rounded ? "is-filled" : ""}
        />
      ))}
    </>
  );
}
