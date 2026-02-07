"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { fmtInTz } from "@/utils/date";
import { getSafeExternalUrl } from "@/utils/url";
import { t } from "@/app/i18n";

const canJoin = (startAt, endAt, windowMins = 15) => {
  const now = new Date();
  const start = new Date(startAt);
  const end = endAt
    ? new Date(endAt)
    : new Date(start.getTime() + 60 * 60 * 1000);
  const early = new Date(start.getTime() - windowMins * 60 * 1000);
  return now >= early && now <= end;
};

const useCountdown = (startAt, endAt, labels = {}) => {
  const { startsIn = "Starts in", live = "Live", ended = "Ended" } = labels;

  const [now, setNow] = useState(Date.now());
  const timer = useRef(null);

  useEffect(() => {
    timer.current = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer.current);
  }, []);

  if (!startAt) return "";

  const start = new Date(startAt).getTime();
  const end = endAt ? new Date(endAt).getTime() : start + 60 * 60 * 1000;

  if (now < start) {
    let remaining = Math.max(0, Math.floor((start - now) / 1000));
    const days = Math.floor(remaining / 86400);
    remaining %= 86400;
    const hours = Math.floor(remaining / 3600);
    remaining %= 3600;
    const mins = Math.floor(remaining / 60);
    const secs = remaining % 60;

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0 || days > 0) parts.push(`${hours}h`);
    if (mins > 0 || hours > 0 || days > 0) parts.push(`${mins}m`);
    parts.push(`${String(secs).padStart(2, "0")}s`);

    return `${startsIn} ${parts.join(" ")}`;
  }

  if (now >= start && now <= end) return live;

  return ended;
};

export default function SessionRow({
  s,
  timezone,
  onCancel,
  onRescheduleClick,
  isUpcoming = true,
  isTeacher = false,
  isAdmin = false,
  isImpersonating = false,
  dict,
  prefix,
}) {
  const countdown = useCountdown(s.startAt, s.endAt, {
    startsIn: t(dict, "countdown_starts_in"),
    live: t(dict, "countdown_live"),
    ended: t(dict, "countdown_ended"),
  });

  const joinable = canJoin(s.startAt, s.endAt);

  const isGroup = String(s.type || "").toUpperCase() === "GROUP";
  const participantCount =
    typeof s.participantCount === "number" ? s.participantCount : null;

  const canReschedule = isTeacher || isAdmin || isImpersonating;

  const cancelLabel =
    isGroup && !isTeacher && !isAdmin && !isImpersonating
      ? t(dict, "session_leave") || "Leave session"
      : t(dict, "session_cancel") || "Cancel";

  const cancelTitle =
    isGroup && !isTeacher && !isAdmin && !isImpersonating
      ? t(dict, "session_leave_title") || "Leave this group session"
      : t(dict, "session_cancel_title") || "Cancel session";

  return (
    <div className="session-item">
      <div className="session-item__indicator"></div>
      <div className="session-item__content">
        <div className="session-item__main">
          <div className="session-item__title">
            {s.title || t(dict, "session_title_default")}
          </div>

          <div className="session-item__meta">
            <span className="session-item__time">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              {fmtInTz(s.startAt, timezone)}
              {s.endAt ? ` — ${fmtInTz(s.endAt, timezone)}` : ""}
            </span>

            {isGroup && (
              <span className="badge badge--info">
                {t(dict, "session_group") || "Group"}
              </span>
            )}

            {(participantCount !== null || (isGroup && s.capacity)) && (
              <span className="badge badge--neutral">
                {t(dict, "session_participants") || "Participants"}: {" "}
                {participantCount !== null ? participantCount : 0}
                {isGroup && typeof s.capacity === "number"
                  ? ` / ${s.capacity}`
                  : ""}
              </span>
            )}

            {s.status && (
              <span className={`badge badge--${s.status}`}>{s.status}</span>
            )}
          </div>
        </div>

        <div className="session-item__actions">
          {isUpcoming ? (
            <>
              <Link
                href={`${prefix}/dashboard/sessions/${s.id}`}
                className="btn btn--ghost"
                title={t(dict, "session_view_details") || "View session details"}
              >
                {countdown || t(dict, "session_view_details") || "View session"}
              </Link>

              {joinable && (
                <Link
                  href={`/classroom/${s.id}`}
                  className="btn btn--primary btn--glow"
                  title={t(dict, "session_join_classroom") || "Join classroom"}
                >
                  {t(dict, "session_join_classroom") || "Join"}
                </Link>
              )}

              {s.meetingUrl && (
                <a
                  href={getSafeExternalUrl(s.meetingUrl)}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn--ghost"
                  title={t(dict, "session_external_link")}
                >
                  {t(dict, "session_external_link")}
                </a>
              )}

              {canReschedule && (
                <button
                  className="btn btn--ghost"
                  onClick={() => onRescheduleClick(s)}
                >
                  {t(dict, "session_reschedule")}
                </button>
              )}

              <button
                className="btn btn--ghost btn--danger"
                onClick={() => onCancel(s)}
                title={cancelTitle}
              >
                {cancelLabel}
              </button>
            </>
          ) : (
            <>
              <Link
                href={`${prefix}/dashboard/sessions/${s.id}`}
                className="btn btn--ghost"
              >
                {t(dict, "session_view_details")}
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </Link>

              {isTeacher && s.status === "completed" && (
                <Link
                  href={`${prefix}/dashboard/sessions/${s.id}/feedback`}
                  className="btn btn--primary"
                >
                  {s.teacherFeedback
                    ? t(dict, "session_edit_feedback")
                    : t(dict, "session_give_feedback")}
                </Link>
              )}

              {!isTeacher && s.teacherFeedback && (
                <Link
                  href={`${prefix}/dashboard/sessions/${s.id}/feedback`}
                  className="btn btn--primary"
                >
                  {t(dict, "session_view_feedback")}
                </Link>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
