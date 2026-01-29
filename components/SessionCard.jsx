// components/SessionCard.jsx
"use client";

import { useMemo } from "react";
import Link from "next/link";

/**
 * SessionCard - Displays a session with support for both ONE_ON_ONE and GROUP types
 *
 * Props:
 * - session: Session object from API
 * - userRole: "learner" | "teacher" | "admin"
 * - onCancel: Optional callback for cancel action
 * - onJoin: Optional callback for join action
 * - locale: "en" | "ar"
 * - compact: boolean - Show compact version
 */
export default function SessionCard({
  session,
  userRole = "learner",
  onCancel,
  onJoin,
  locale = "en",
  timezone,
  compact = false,
}) {
  const prefix = locale === "ar" ? "/ar" : "";

  // Parse session data
  const {
    id,
    title,
    startAt,
    endAt,
    status,
    type = "ONE_ON_ONE",
    capacity,
    participantCount = 0,
    learners = [],
    teacher,
    joinUrl,
    hasFeedback,
  } = session || {};

  const isGroup = type === "GROUP";
  const isTeacher = userRole === "teacher";
  const isAdmin = userRole === "admin";

  // Format dates
  const { dateStr, timeStr, endTimeStr, isToday, isPast, isUpcoming, canJoin } =
    useMemo(() => {
      const start = startAt ? new Date(startAt) : null;
      const end = endAt ? new Date(endAt) : null;
      const now = new Date();

      if (!start || isNaN(start.getTime())) {
        return {
          dateStr: "",
          timeStr: "",
          endTimeStr: "",
          isToday: false,
          isPast: false,
          isUpcoming: false,
          canJoin: false,
        };
      }

      const dateStr = start.toLocaleDateString(
        locale === "ar" ? "ar-EG" : "en-US",
        {
          timeZone: timezone,
          weekday: "short",
          month: "short",
          day: "numeric",
        }
      );

      const timeStr = start.toLocaleTimeString(
        locale === "ar" ? "ar-EG" : "en-US",
        {
          timeZone: timezone,
          hour: "2-digit",
          minute: "2-digit",
        }
      );

      const endTimeStr = end
        ? end.toLocaleTimeString(locale === "ar" ? "ar-EG" : "en-US", {
          timeZone: timezone,
          hour: "2-digit",
          minute: "2-digit",
        })
        : null;

      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(now);
      todayEnd.setHours(23, 59, 59, 999);

      const isToday = start >= todayStart && start <= todayEnd;
      const isPast = end ? end < now : start < now;
      const isUpcoming = start > now;

      // Can join: 15 min before start until end (or 2 hours after start if no end)
      const joinWindowStart = new Date(start.getTime() - 15 * 60 * 1000);
      const joinWindowEnd =
        end || new Date(start.getTime() + 2 * 60 * 60 * 1000);
      const canJoin = now >= joinWindowStart && now <= joinWindowEnd;

      return {
        dateStr,
        timeStr,
        endTimeStr,
        isToday,
        isPast,
        isUpcoming,
        canJoin,
      };
    }, [startAt, endAt, locale]);

  // Status badge
  const statusConfig = useMemo(() => {
    if (status === "canceled") {
      return { label: "Canceled", className: "session-card__status--canceled" };
    }
    if (status === "completed") {
      return {
        label: "Completed",
        className: "session-card__status--completed",
      };
    }
    if (canJoin) {
      return { label: "Live Now", className: "session-card__status--live" };
    }
    if (isToday) {
      return { label: "Today", className: "session-card__status--today" };
    }
    if (isUpcoming) {
      return { label: "Upcoming", className: "session-card__status--upcoming" };
    }
    return { label: "Scheduled", className: "session-card__status--scheduled" };
  }, [status, canJoin, isToday, isUpcoming]);

  // Participant display
  const participantDisplay = useMemo(() => {
    if (!isGroup) return null;

    const count = participantCount || learners?.length || 0;
    const cap = capacity || "∞";

    return `${count}/${cap} participants`;
  }, [isGroup, participantCount, learners, capacity]);

  // Learner names for teacher view
  const learnerNames = useMemo(() => {
    if (!learners || learners.length === 0) return "";

    const names = learners
      .slice(0, 3)
      .map((l) => l.name || l.email?.split("@")[0] || "Learner")
      .join(", ");

    if (learners.length > 3) {
      return `${names} +${learners.length - 3} more`;
    }
    return names;
  }, [learners]);

  // Render compact version
  if (compact) {
    return (
      <div
        className={`session-card session-card--compact ${status === "canceled" ? "session-card--canceled" : ""
          }`}
      >
        <div className="session-card__compact-main">
          <div className="session-card__compact-time">
            <span className="session-card__time">{timeStr}</span>
            {endTimeStr && <span className="session-card__time-sep">–</span>}
            {endTimeStr && (
              <span className="session-card__time">{endTimeStr}</span>
            )}
          </div>

          <div className="session-card__compact-info">
            <span className="session-card__title">{title || "Session"}</span>
            {isGroup && (
              <span className="session-card__type-badge session-card__type-badge--group">
                GROUP
              </span>
            )}
          </div>

          {canJoin && status === "scheduled" && joinUrl && (
            <a
              href={`${prefix}/classroom/${id}`}
              className="session-card__join-btn session-card__join-btn--compact"
            >
              Join
            </a>
          )}
        </div>
      </div>
    );
  }

  // Full card render
  return (
    <div
      className={`session-card ${status === "canceled" ? "session-card--canceled" : ""
        } ${canJoin ? "session-card--live" : ""}`}
    >
      {/* Header */}
      <div className="session-card__header">
        <div className="session-card__header-left">
          <h3 className="session-card__title">{title || "Session"}</h3>
          <div className="session-card__badges">
            {isGroup ? (
              <span className="session-card__type-badge session-card__type-badge--group">
                👥 GROUP
              </span>
            ) : (
              <span className="session-card__type-badge session-card__type-badge--one-on-one">
                👤 1:1
              </span>
            )}
            <span className={`session-card__status ${statusConfig.className}`}>
              {statusConfig.label}
            </span>
          </div>
        </div>

        {hasFeedback && (
          <Link
            href={`${prefix}/dashboard/sessions/${id}/feedback`}
            className="session-card__feedback-link"
            title="View feedback"
          >
            📝
          </Link>
        )}
      </div>

      {/* Date & Time */}
      <div className="session-card__datetime">
        <div className="session-card__date">
          <span className="session-card__icon">📅</span>
          <span>{dateStr}</span>
        </div>
        <div className="session-card__time-range">
          <span className="session-card__icon">🕐</span>
          <span>
            {timeStr}
            {endTimeStr && ` – ${endTimeStr}`}
          </span>
        </div>
      </div>

      {/* Participants section */}
      <div className="session-card__participants">
        {/* Teacher info (for learner view) */}
        {!isTeacher && teacher && (
          <div className="session-card__person">
            <span className="session-card__person-icon">👨‍🏫</span>
            <span className="session-card__person-label">Teacher:</span>
            <span className="session-card__person-name">
              {teacher.name || teacher.email}
            </span>
          </div>
        )}

        {/* Learner info (for teacher view) */}
        {isTeacher && (
          <div className="session-card__person">
            <span className="session-card__person-icon">👨‍🎓</span>
            <span className="session-card__person-label">
              {isGroup ? "Learners:" : "Learner:"}
            </span>
            <span className="session-card__person-name">
              {learnerNames || "No learners assigned"}
            </span>
          </div>
        )}

        {/* Participant count for GROUP */}
        {isGroup && (
          <div className="session-card__capacity">
            <span className="session-card__capacity-icon">👥</span>
            <span className="session-card__capacity-text">
              {participantDisplay}
            </span>
            {capacity && participantCount >= capacity && (
              <span className="session-card__capacity-full">FULL</span>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="session-card__actions">
        {/* Join button */}
        {canJoin && status === "scheduled" && (
          <a
            href={`${prefix}/classroom/${id}`}
            className="session-card__btn session-card__btn--primary"
            onClick={onJoin}
          >
            🎥 Join Classroom
          </a>
        )}

        {/* View details */}
        <Link
          href={`${prefix}/dashboard/sessions/${id}`}
          className="session-card__btn session-card__btn--secondary"
        >
          View Details
        </Link>

        {/* Cancel button (if upcoming and not canceled) */}
        {status === "scheduled" && isUpcoming && onCancel && (
          <button
            type="button"
            className="session-card__btn session-card__btn--danger"
            onClick={() => onCancel(session)}
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
