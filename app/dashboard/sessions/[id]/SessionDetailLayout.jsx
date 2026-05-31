"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import AttendancePanel from "./AttendancePanel";
import SessionSummary from "./SessionSummary";
import {
  AsideCard,
  Breadcrumbs,
  EmptyState,
  Panel,
} from "./SessionDetailUI";
import { getSafeExternalUrl } from "@/utils/url";
import { stripRichFeedbackPayload } from "@/lib/feedbackReport";

function getInitials(value = "") {
  const s = String(value || "?").trim();
  if (!s || s === "?") return "?";
  if (s.includes("@")) return s[0].toUpperCase();
  return s
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function StatusPill({ label, statusKey }) {
  return (
    <span className={`sd-status sd-status--${statusKey}`}>
      <span className="sd-status__dot" aria-hidden />
      {label}
    </span>
  );
}

function cleanBackLabel(value) {
  return String(value || "Back")
    .replace(/^[\s←→‹›-]+/, "")
    .trim() || "Back";
}

export default function SessionDetailLayout({
  txt,
  locale,
  prefix,
  dashboardHref,
  progressHref,
  classroomHref,
  sessionTitle,
  sessionStatus,
  statusConfig,
  isGroup,
  durationStr,
  timezone,
  startAt,
  endAt,
  teacher,
  learnerLabel,
  legacyLearner,
  activeParticipants,
  participantCount,
  capacity,
  attendanceParticipants,
  sessionId,
  sessionIsTeacher,
  sessionIsAdmin,
  isLearner,
  notes,
  teacherFeedback,
  showSummary,
  showActions,
  canComplete,
  canReschedule,
  busy,
  cancelLabel,
  cancelTitle,
  hasExternal,
  meetingUrl,
  joinUrl,
  calendarUrl,
  joinWindow,
  renderJoinAside,
  onComplete,
  onCancelOrLeave,
  onOpenFeedback,
  hasLearnerFeedback,
  formatDateTime,
  formatHeroDate,
  formatOpensTime,
  loadSession,
}) {
  const heroDate = formatHeroDate(startAt, locale);
  const backLabel = cleanBackLabel(txt("back_btn", "Back"));
  const statusKey = sessionStatus === "canceled" ? "canceled" : sessionStatus;
  const feedbackComments = stripRichFeedbackPayload(
    teacherFeedback?.commentsOnSession || ""
  );

  const fmtTime = (iso) => {
    if (!iso) return "";
    return new Date(iso).toLocaleTimeString(
      locale === "ar" ? "ar-EG" : "en-US",
      { hour: "numeric", minute: "2-digit" }
    );
  };

  const startTime = fmtTime(startAt);
  const endTime = fmtTime(endAt);

  const primaryLearner =
    legacyLearner ||
    (activeParticipants.length > 0 ? activeParticipants[0] : null);

  return (
    <>
      {/* ── Top bar ───────────────────────────────────────────── */}
      <div className="page-session-detail__topbar">
        <Breadcrumbs
          dashboardHref={dashboardHref}
          dashboardLabel={txt("back_dashboard", "Dashboard")}
          current={sessionTitle}
        />
        <Link href={dashboardHref} className="page-session-detail__back">
          <ArrowLeft size={16} aria-hidden />
          <span>{backLabel}</span>
        </Link>
      </div>

      {/* ── Hero ──────────────────────────────────────────────── */}
      <header className={`sd-hero sd-hero--${statusKey}`}>
        <div className="sd-hero__inner">
          {/* Meta row: type chip + status pill */}
          <div className="sd-hero__meta-row">
            <span className="sd-hero__type">
              {isGroup
                ? txt("type_group", "Group lesson")
                : txt("type_one_on_one", "1:1 Lesson")}
            </span>
            <StatusPill label={statusConfig.label} statusKey={statusKey} />
          </div>

          {/* Title */}
          <h1 className="sd-hero__title">{sessionTitle}</h1>

          {/* Time strip */}
          <div className="sd-hero__time-strip">
            {heroDate && (
              <span className="sd-hero__time-item">{heroDate}</span>
            )}
            {(startTime || endTime) && (
              <>
                <span className="sd-hero__time-sep" aria-hidden>·</span>
                <span className="sd-hero__time-item sd-hero__time-item--range">
                  {startTime}
                  {endTime && (
                    <>
                      {" "}
                      <span className="sd-hero__arrow" aria-hidden>→</span>
                      {" "}
                      {endTime}
                    </>
                  )}
                </span>
              </>
            )}
            {durationStr && (
              <>
                <span className="sd-hero__time-sep" aria-hidden>·</span>
                <span className="sd-hero__time-item">{durationStr}</span>
              </>
            )}
            {timezone && (
              <>
                <span className="sd-hero__time-sep" aria-hidden>·</span>
                <span className="sd-hero__time-item sd-hero__time-item--tz">
                  {timezone}
                </span>
              </>
            )}
          </div>

          {/* Participants */}
          <div className="sd-hero__people">
            {teacher && (
              <div className="sd-hero__person-card">
                <div className="sd-hero__person-avatar">
                  {getInitials(teacher.name || teacher.email)}
                </div>
                <div className="sd-hero__person-info">
                  <span className="sd-hero__person-name">
                    {teacher.name || teacher.email}
                  </span>
                  <span className="sd-hero__person-role">
                    {txt("section_teacher_title", "Teacher")}
                  </span>
                </div>
              </div>
            )}

            {!isGroup && primaryLearner && teacher && (
              <div className="sd-hero__people-sep" aria-hidden>×</div>
            )}

            {!isGroup && primaryLearner && (
              <div className="sd-hero__person-card">
                <div className="sd-hero__person-avatar sd-hero__person-avatar--learner">
                  {getInitials(
                    primaryLearner.name || primaryLearner.email
                  )}
                </div>
                <div className="sd-hero__person-info">
                  <span className="sd-hero__person-name">
                    {primaryLearner.name || primaryLearner.email}
                  </span>
                  <span className="sd-hero__person-role">
                    {txt("section_learner_title", "Learner")}
                  </span>
                </div>
              </div>
            )}

            {isGroup && (
              <div className="sd-hero__person-card">
                <div className="sd-hero__person-avatar sd-hero__person-avatar--group">
                  {typeof participantCount === "number"
                    ? participantCount
                    : activeParticipants.length}
                </div>
                <div className="sd-hero__person-info">
                  <span className="sd-hero__person-name">
                    {typeof participantCount === "number"
                      ? participantCount
                      : activeParticipants.length}
                    {" "}
                    {txt("session_participants", "Participants")}
                    {typeof capacity === "number" ? ` / ${capacity}` : ""}
                  </span>
                  <span className="sd-hero__person-role">
                    {txt("type_group", "Group session")}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Main layout ───────────────────────────────────────── */}
      <div className="sd-layout">
        <div className="sd-main">

          {/* Attendance — teacher/admin only */}
          {(sessionIsTeacher || sessionIsAdmin) &&
            sessionStatus !== "canceled" && (
              <Panel icon="learners" title="Attendance" variant="subtle">
                <AttendancePanel
                  sessionId={Number(sessionId)}
                  participants={attendanceParticipants}
                  isTeacher={sessionIsTeacher || sessionIsAdmin}
                  sessionStatus={sessionStatus}
                  sessionStartAt={startAt}
                  onUpdate={loadSession}
                />
              </Panel>
            )}

          {/* Notes / Homework */}
          <Panel
            icon="notes"
            title={txt("notes_title", "Notes / Homework")}
            hint={
              !notes?.trim()
                ? txt(
                    "notes_empty",
                    "No notes or homework have been added for this session yet."
                  )
                : undefined
            }
          >
            {notes?.trim() ? (
              <p className="session-detail-notes">{notes}</p>
            ) : (
              <EmptyState
                icon="notes"
                title={txt("notes_title", "Notes / Homework")}
                body={
                  isLearner
                    ? txt(
                        "notes_empty_learner_hint",
                        "Check back later or message your teacher if you expected homework here."
                      )
                    : undefined
                }
              />
            )}
          </Panel>

          {/* Teacher Feedback */}
          {teacherFeedback ? (
            <Panel
              icon="feedback"
              title={txt("feedback_title", "Teacher feedback")}
              hint={txt(
                "feedback_hint",
                "Reflections from your teacher to help guide your next steps."
              )}
            >
              <div className="sd-feedback-layout">
                <article className="sd-feedback-card sd-feedback-card--featured">
                  <h4>{txt("feedback_msg_title", "Message to the learner")}</h4>
                  <p>
                    {teacherFeedback.messageToLearner?.trim() ||
                      txt("feedback_msg_empty", "No message provided.")}
                  </p>
                </article>
                <div className="sd-feedback-sub">
                  <article className="sd-feedback-card">
                    <h4>
                      {txt(
                        "feedback_comments_title",
                        "Comments on the session"
                      )}
                    </h4>
                    <p>
                      {feedbackComments ||
                        txt(
                          "feedback_comments_empty",
                          "No comments provided."
                        )}
                    </p>
                  </article>
                  <article className="sd-feedback-card">
                    <h4>{txt("feedback_future_title", "Future steps")}</h4>
                    <p>
                      {teacherFeedback.futureSteps?.trim() ||
                        txt(
                          "feedback_future_empty",
                          "No future steps added yet."
                        )}
                    </p>
                  </article>
                </div>
              </div>
              {(sessionIsTeacher || sessionIsAdmin) && (
                <Link
                  href={`${prefix}/dashboard/sessions/${sessionId}/feedback`}
                  className="btn btn--ghost"
                  style={{ marginTop: 16 }}
                >
                  {txt("feedback_edit_teacher", "Edit feedback")}
                </Link>
              )}
            </Panel>
          ) : (
            sessionStatus !== "canceled" && (
              <Panel
                icon="feedback"
                title={txt("feedback_empty_title", "No teacher feedback yet")}
              >
                <EmptyState
                  icon="feedback"
                  title={txt(
                    "feedback_empty_title",
                    "No teacher feedback yet"
                  )}
                  body={
                    isLearner
                      ? txt(
                          "feedback_empty_body",
                          "Your teacher hasn't shared feedback for this session yet."
                        )
                      : txt(
                          "feedback_empty_body",
                          "Add feedback to help your learner reflect on this session."
                        )
                  }
                  action={
                    (sessionIsTeacher || sessionIsAdmin) && (
                      <Link
                        href={`${prefix}/dashboard/sessions/${sessionId}/feedback`}
                        className="btn btn--primary"
                      >
                        {txt("feedback_add_teacher", "Add feedback")}
                      </Link>
                    )
                  }
                />
              </Panel>
            )
          )}

          {/* Session Summary */}
          {showSummary && (
            <Panel
              icon="sparkles"
              title={txt("summary_title", "Session summary")}
              hint={txt(
                "summary_subtitle",
                "Attendance, materials, and feedback from this lesson."
              )}
            >
              <SessionSummary
                sessionId={Number(sessionId)}
                isTeacher={sessionIsTeacher || sessionIsAdmin}
                locale={locale}
                prefix={prefix}
                embedded
              />
            </Panel>
          )}
        </div>

        {/* ── Sidebar ─────────────────────────────────────────── */}
        <aside className="sd-aside">
          <AsideCard
            variant="join"
            title={
              sessionStatus === "completed"
                ? txt("join_title_completed", "Classroom")
                : txt("join_title", "Join")
            }
            description={
              sessionStatus === "completed"
                ? txt(
                    "join_session_ended",
                    "This session has ended. You can review the summary below."
                  )
                : joinWindow.canJoin
                  ? undefined
                  : joinWindow.isBeforeWindow
                    ? txt(
                        "join_opens_at",
                        "Join opens {time} before the session starts."
                      ).replace("{time}", "15 min") +
                      (joinWindow.opensAt
                        ? ` (${formatOpensTime(joinWindow.opensAt)})`
                        : "")
                    : undefined
            }
          >
            {renderJoinAside()}
          </AsideCard>

          {showActions && (
            <AsideCard title={txt("actions_title", "Actions")}>
              <div className="sd-actions-stack">
                {canComplete && (
                  <button
                    type="button"
                    className="btn btn--primary"
                    onClick={onComplete}
                    disabled={busy}
                  >
                    {busy
                      ? txt("loading_badge", "Loading...")
                      : txt("session_complete", "Mark as completed")}
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn--ghost btn--danger"
                  onClick={onCancelOrLeave}
                  disabled={busy}
                  title={cancelTitle}
                >
                  {busy ? txt("loading_badge", "Loading...") : cancelLabel}
                </button>
                {canReschedule && (
                  <Link href={`${prefix}/calendar`} className="btn btn--ghost">
                    {txt("session_reschedule", "Reschedule")}
                  </Link>
                )}
              </div>
            </AsideCard>
          )}

          {isLearner && sessionStatus === "completed" && (
            <AsideCard
              highlight
              title={txt("learner_rate_title", "Rate your session")}
              description={txt(
                "learner_rate_body",
                "Share how your learning experience went."
              )}
            >
              <button
                type="button"
                className="btn btn--primary"
                onClick={onOpenFeedback}
              >
                {hasLearnerFeedback
                  ? txt("learner_rate_edit", "Update your rating")
                  : txt("learner_rate_btn", "Rate this session")}
              </button>
            </AsideCard>
          )}

          {isLearner && sessionStatus === "completed" && (
            <AsideCard
              title={txt("progress_link", "View your progress")}
              description={txt(
                "progress_link_hint",
                "See how this session fits into your learning journey."
              )}
            >
              <Link href={progressHref} className="btn btn--ghost">
                {txt("progress_link", "View your progress")}
              </Link>
            </AsideCard>
          )}
        </aside>
      </div>
    </>
  );
}
