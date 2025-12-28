// app/dashboard/sessions/[id]/LearnerFeedbackForm.jsx
"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { useToast } from "@/components/ToastProvider";

/**
 * LearnerFeedbackForm - Post-session feedback form for learners
 *
 * Features:
 * - 5-star rating
 * - Optional text feedback fields
 * - Shows existing feedback if already submitted
 * - Can update existing feedback
 *
 * Props:
 * - sessionId: number
 * - sessionTitle: string
 * - teacherName: string
 * - sessionDate: string (ISO date)
 * - onSubmit: () => void - callback after successful submission
 * - onClose: () => void - callback to close modal
 */
export default function LearnerFeedbackForm({
  sessionId,
  sessionTitle,
  teacherName,
  sessionDate,
  onSubmit,
  onClose,
}) {
  const toast = useToast();

  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [highlights, setHighlights] = useState("");
  const [improvements, setImprovements] = useState("");
  const [otherFeedback, setOtherFeedback] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [existingFeedback, setExistingFeedback] = useState(null);

  // Load existing feedback
  useEffect(() => {
    if (!sessionId) return;

    async function loadFeedback() {
      try {
        setLoading(true);
        const { data } = await api.get(
          `/sessions/${sessionId}/learner-feedback`
        );

        if (data?.feedback) {
          setExistingFeedback(data.feedback);
          setRating(data.feedback.rating || 0);
          setHighlights(data.feedback.highlights || "");
          setImprovements(data.feedback.improvements || "");
          setOtherFeedback(data.feedback.otherFeedback || "");
        }
      } catch (err) {
        console.warn("Failed to load existing feedback:", err);
      } finally {
        setLoading(false);
      }
    }

    loadFeedback();
  }, [sessionId]);

  // Handle submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (rating === 0) {
      toast?.error?.("Please select a rating");
      return;
    }

    try {
      setSubmitting(true);

      await api.post(`/sessions/${sessionId}/learner-feedback`, {
        rating,
        highlights: highlights.trim() || null,
        improvements: improvements.trim() || null,
        otherFeedback: otherFeedback.trim() || null,
      });

      toast?.success?.(
        existingFeedback ? "Feedback updated!" : "Thank you for your feedback!"
      );

      if (typeof onSubmit === "function") {
        onSubmit();
      }
    } catch (err) {
      console.error("Failed to submit feedback:", err);
      toast?.error?.(err?.response?.data?.error || "Failed to submit feedback");
    } finally {
      setSubmitting(false);
    }
  };

  // Star rating component
  const StarRating = () => {
    const stars = [1, 2, 3, 4, 5];
    const displayRating = hoverRating || rating;

    const getRatingLabel = (value) => {
      switch (value) {
        case 1:
          return "Poor";
        case 2:
          return "Fair";
        case 3:
          return "Good";
        case 4:
          return "Very Good";
        case 5:
          return "Excellent";
        default:
          return "Select rating";
      }
    };

    return (
      <div className="learner-feedback__rating">
        <label className="learner-feedback__label">
          How was your session? <span className="required">*</span>
        </label>
        <div className="learner-feedback__stars">
          {stars.map((star) => (
            <button
              key={star}
              type="button"
              className={`learner-feedback__star ${
                star <= displayRating ? "learner-feedback__star--active" : ""
              }`}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              aria-label={`${star} star${star > 1 ? "s" : ""}`}
            >
              {star <= displayRating ? "★" : "☆"}
            </button>
          ))}
          <span className="learner-feedback__rating-label">
            {getRatingLabel(displayRating)}
          </span>
        </div>
      </div>
    );
  };

  // Format session date
  const formattedDate = sessionDate
    ? new Date(sessionDate).toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  if (loading) {
    return (
      <div className="learner-feedback learner-feedback--loading">
        <div className="learner-feedback__spinner" />
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="learner-feedback">
      <div className="learner-feedback__header">
        <h2 className="learner-feedback__title">
          {existingFeedback ? "Update Your Feedback" : "How was your session?"}
        </h2>
        <p className="learner-feedback__subtitle">
          {sessionTitle && <strong>{sessionTitle}</strong>}
          {teacherName && <span> with {teacherName}</span>}
          {formattedDate && (
            <span className="learner-feedback__date">{formattedDate}</span>
          )}
        </p>
        {onClose && (
          <button
            type="button"
            className="learner-feedback__close"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        )}
      </div>

      <form className="learner-feedback__form" onSubmit={handleSubmit}>
        <StarRating />

        <div className="learner-feedback__field">
          <label className="learner-feedback__label" htmlFor="highlights">
            What went well?
            <span className="learner-feedback__optional">(Optional)</span>
          </label>
          <textarea
            id="highlights"
            className="learner-feedback__textarea"
            value={highlights}
            onChange={(e) => setHighlights(e.target.value)}
            placeholder="Share what you enjoyed or found helpful..."
            maxLength={2000}
            rows={3}
          />
        </div>

        <div className="learner-feedback__field">
          <label className="learner-feedback__label" htmlFor="improvements">
            What could be improved?
            <span className="learner-feedback__optional">(Optional)</span>
          </label>
          <textarea
            id="improvements"
            className="learner-feedback__textarea"
            value={improvements}
            onChange={(e) => setImprovements(e.target.value)}
            placeholder="Let us know how we can make your experience better..."
            maxLength={2000}
            rows={3}
          />
        </div>

        <div className="learner-feedback__field">
          <label className="learner-feedback__label" htmlFor="otherFeedback">
            Any other comments?
            <span className="learner-feedback__optional">(Optional)</span>
          </label>
          <textarea
            id="otherFeedback"
            className="learner-feedback__textarea"
            value={otherFeedback}
            onChange={(e) => setOtherFeedback(e.target.value)}
            placeholder="Anything else you'd like to share..."
            maxLength={2000}
            rows={3}
          />
        </div>

        <div className="learner-feedback__actions">
          {onClose && (
            <button
              type="button"
              className="learner-feedback__btn learner-feedback__btn--secondary"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            className="learner-feedback__btn learner-feedback__btn--primary"
            disabled={submitting || rating === 0}
          >
            {submitting
              ? "Submitting..."
              : existingFeedback
              ? "Update Feedback"
              : "Submit Feedback"}
          </button>
        </div>

        {existingFeedback && (
          <p className="learner-feedback__update-note">
            ℹ️ You submitted feedback on{" "}
            {new Date(existingFeedback.createdAt).toLocaleDateString()}. You can
            update it anytime.
          </p>
        )}
      </form>
    </div>
  );
}

/**
 * LearnerFeedbackModal - Wrapper to show feedback form in a modal
 */
export function LearnerFeedbackModal({
  isOpen,
  sessionId,
  sessionTitle,
  teacherName,
  sessionDate,
  onSubmit,
  onClose,
}) {
  if (!isOpen) return null;

  return (
    <div className="learner-feedback-modal-overlay" onClick={onClose}>
      <div
        className="learner-feedback-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <LearnerFeedbackForm
          sessionId={sessionId}
          sessionTitle={sessionTitle}
          teacherName={teacherName}
          sessionDate={sessionDate}
          onSubmit={() => {
            if (typeof onSubmit === "function") onSubmit();
            if (typeof onClose === "function") onClose();
          }}
          onClose={onClose}
        />
      </div>
    </div>
  );
}
