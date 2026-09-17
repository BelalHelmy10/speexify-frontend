"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getSafeExternalUrl } from "@/utils/url";
import { fmtSessionSchedule } from "@/utils/date";
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

const interpolate = (template, values) =>
  Object.entries(values).reduce(
    (result, [key, value]) => result.split(`{${key}}`).join(String(value)),
    template
  );

const getDateKey = (date, timezone) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone || undefined,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(date);
  const get = (type) => Number(parts.find((part) => part.type === type)?.value);
  return Date.UTC(get("year"), get("month") - 1, get("day"));
};

const useCountdown = (startAt, endAt, labels = {}, timezone, locale = "en-US") => {
  const {
    startsToday = "Starts today at {time}",
    startsTomorrow = "Starts tomorrow at {time}",
    startsOn = "Starts {date} at {time}",
    live = "Live",
    ended = "Ended",
  } = labels;

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
    const startDate = new Date(start);
    const nowDate = new Date(now);
    const dayOffset = Math.round(
      (getDateKey(startDate, timezone) - getDateKey(nowDate, timezone)) / 86400000
    );
    const time = new Intl.DateTimeFormat(locale, {
      timeZone: timezone || undefined,
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(startDate);
    const date = new Intl.DateTimeFormat(locale, {
      timeZone: timezone || undefined,
      weekday: "short",
      month: "short",
      day: "numeric",
    }).format(startDate);

    if (dayOffset === 0) return interpolate(startsToday, { time });
    if (dayOffset === 1) return interpolate(startsTomorrow, { time });
    return interpolate(startsOn, { date, time });
  }

  if (now >= start && now <= end) return live;

  return ended;
};

const getSessionTone = (status, isUpcoming) => {
  const value = String(status || "").trim().toLowerCase();

  if (["completed", "complete", "done", "attended"].includes(value)) {
    return "completed";
  }

  if (
    [
      "canceled",
      "cancelled",
      "cancelled_by_admin",
      "cancelled_by_teacher",
      "no_show",
    ].includes(value)
  ) {
    return "canceled";
  }

  if (
    isUpcoming ||
    ["scheduled", "confirmed", "upcoming", "booked", "pending"].includes(value)
  ) {
    return "scheduled";
  }

  return "neutral";
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
  const dateLocale = prefix === "/ar" ? "ar" : "en-US";
  const countdown = useCountdown(s.startAt, s.endAt, {
    startsToday: t(dict, "countdown_starts_today"),
    startsTomorrow: t(dict, "countdown_starts_tomorrow"),
    startsOn: t(dict, "countdown_starts_on"),
    live: t(dict, "countdown_live"),
    ended: t(dict, "countdown_ended"),
  }, timezone, dateLocale);

  const joinable = canJoin(s.startAt, s.endAt);

  const isGroup = String(s.type || "").toUpperCase() === "GROUP";
  const participantCount =
    typeof s.participantCount === "number" ? s.participantCount : null;

  const canReschedule = isTeacher || isAdmin || isImpersonating;
  const normalizedStatus = String(s.status || "").trim().toLowerCase();
  const sessionTone = getSessionTone(normalizedStatus, isUpcoming);
  const badgeTone = sessionTone === "neutral" ? normalizedStatus : sessionTone;

  const cancelLabel =
    isGroup && !isTeacher && !isAdmin && !isImpersonating
      ? t(dict, "session_leave") || "Leave session"
      : t(dict, "session_cancel") || "Cancel";

  const cancelTitle =
    isGroup && !isTeacher && !isAdmin && !isImpersonating
      ? t(dict, "session_leave_title") || "Leave this group session"
      : t(dict, "session_cancel_title") || "Cancel session";

  const sessionDate = s.startAt ? new Date(s.startAt) : null;
  const schedule = fmtSessionSchedule(s.startAt, s.endAt, timezone, dateLocale);
  const dateMonth = sessionDate && !Number.isNaN(sessionDate.getTime())
    ? sessionDate.toLocaleDateString(dateLocale, { month: "short", timeZone: timezone || undefined })
    : "";
  const dateDay = sessionDate && !Number.isNaN(sessionDate.getTime())
    ? sessionDate.toLocaleDateString(dateLocale, { day: "numeric", timeZone: timezone || undefined })
    : "";

  return (
    <div className={`session-item session-item--${sessionTone}`}>
      <div className="session-item__indicator"></div>
      {dateMonth && (
        <div className="session-item__date" aria-label={`${dateMonth} ${dateDay}`}>
          <span>{dateMonth}</span>
          <strong>{dateDay}</strong>
        </div>
      )}
      <div className="session-item__content">
        <div className="session-item__main">
          <div className="session-item__title">
            {s.title || t(dict, "session_title_default")}
          </div>

          <div className="session-item__meta">
            <span
              className="session-item__time"
              aria-label={[schedule.dateLabel, schedule.timeLabel, schedule.timezoneLabel].filter(Boolean).join(", ")}
            >
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
              <span>{schedule.dateLabel} · {schedule.timeLabel}</span>
              {schedule.timezoneLabel && (
                <span className="session-item__timezone">{schedule.timezoneLabel}</span>
              )}
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

            {normalizedStatus && (
              <span className={`badge badge--${badgeTone}`}>{s.status}</span>
            )}
          </div>
        </div>

        <div className="session-item__actions">
          {isUpcoming ? (
            <>
              <Link
                href={`${prefix}/dashboard/sessions/${s.id}`}
                className={`btn btn--ghost session-item__details${
                  isUpcoming && sessionTone === "scheduled" && countdown
                    ? " session-item__details--schedule"
                    : ""
                }`}
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
                  className="btn btn--ghost session-item__reschedule"
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
                className="btn btn--ghost session-item__details"
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
