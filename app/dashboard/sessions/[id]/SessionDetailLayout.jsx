"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import AttendancePanel from "./AttendancePanel";
import SessionSummary from "./SessionSummary";
import {
  AsideCard,
  Breadcrumbs,
  EmptyState,
  HeroChip,
  InfoTile,
  Panel,
  PersonRow,
} from "./SessionDetailUI";
import { getSafeExternalUrl } from "@/utils/url";

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

  return (
    <>
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

      <header
        className={`sd-hero sd-hero--${sessionStatus === "canceled" ? "canceled" : sessionStatus}`}
      >
        <div className="sd-hero__inner">
          <div>
            <div className="sd-hero__eyebrow">
              <span className="sd-hero__type">
                {isGroup
                  ? txt("type_group", "Group lesson")
                  : txt("type_one_on_one", "1:1 Lesson")}
              </span>
            </div>
            <h1 className="sd-hero__title">{sessionTitle}</h1>
            <p className="sd-hero__subtitle">
              {txt(
                "normal_subtitle",
                "Overview of this lesson, participants, and feedback."
              )}
            </p>
            <div className="sd-hero__chips">
              {heroDate && <HeroChip icon="calendar">{heroDate}</HeroChip>}
              {durationStr && (
                <HeroChip icon="clock">{durationStr}</HeroChip>
              )}
              <HeroChip icon="clock">{timezone}</HeroChip>
            </div>
          </div>
          <div className="sd-hero__status-wrap">
            <StatusPill
              label={statusConfig.label}
              statusKey={
                sessionStatus === "canceled" ? "canceled" : sessionStatus
              }
            />
          </div>
        </div>
      </header>

      <div className="sd-layout">
        <div className="sd-main">
          <div className="sd-tiles">
            <InfoTile icon="calendar" label={txt("section_time_title", "Time")}>
              <div className="sd-time-list">
                <div className="sd-time-row">
                  <span>{txt("time_start_label", "Start:").replace(":", "")}</span>
                  <strong>{formatDateTime(startAt)}</strong>
                </div>
                <div className="sd-time-row">
                  <span>{txt("time_end_label", "End:").replace(":", "")}</span>
                  <strong>{formatDateTime(endAt)}</strong>
                </div>
              </div>
              {durationStr && (
                <span className="sd-tile__meta">
                  {txt("time_duration_label", "Duration:")} {durationStr}
                </span>
              )}
            </InfoTile>

            <InfoTile
              icon="teacher"
              label={txt("section_teacher_title", "Teacher")}
            >
              {teacher ? (
                <PersonRow
                  name={teacher.name || teacher.email}
                  email={teacher.email}
                  role="Teacher"
                />
              ) : (
                <span className="session-detail-muted">
                  {txt("section_teacher_not_assigned", "No teacher assigned")}
                </span>
              )}
            </InfoTile>

            <InfoTile icon="learners" label={learnerLabel}>
              {!isGroup ? (
                legacyLearner ? (
                  <PersonRow
                    name={legacyLearner.name || legacyLearner.email}
                    email={legacyLearner.email}
                    role="Learner"
                  />
                ) : activeParticipants.length > 0 ? (
                  <PersonRow
                    name={
                      activeParticipants[0].name ||
                      activeParticipants[0].email
                    }
                    email={activeParticipants[0].email}
                    role="Learner"
                  />
                ) : (
                  <span className="session-detail-muted">
                    {txt("section_learner_not_found", "No learner assigned")}
                  </span>
                )
              ) : (
                <>
                  <span className="sd-tile__meta">
                    {txt("session_participants", "Participants")}:{" "}
                    {typeof participantCount === "number"
                      ? participantCount
                      : activeParticipants.length}
                    {typeof capacity === "number" ? ` / ${capacity}` : ""}
                  </span>
                  {activeParticipants.length > 0 ? (
                    <ul className="sd-learners-list">
                      {activeParticipants.map((learner, idx) => (
                        <li key={learner.id || idx}>
                          {learner.name || learner.email}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="session-detail-muted">
                      {txt("session_no_participants", "No participants yet.")}
                    </span>
                  )}
                </>
              )}
            </InfoTile>
          </div>

          {(sessionIsTeacher || sessionIsAdmin) &&
            sessionStatus !== "canceled" && (
              <Panel
                icon="learners"
                title="Attendance"
                variant="subtle"
              >
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

          {teacherFeedback ? (
            <Panel
              icon="feedback"
              title={txt("feedback_title", "Teacher feedback")}
              hint={txt(
                "feedback_hint",
                "Reflections from your teacher to help guide your next steps."
              )}
            >
              <div className="sd-feedback-grid">
                <article className="sd-feedback-card">
                  <h4>{txt("feedback_msg_title", "Message to the learner")}</h4>
                  <p>
                    {teacherFeedback.messageToLearner?.trim() ||
                      txt("feedback_msg_empty", "No message provided.")}
                  </p>
                </article>
                <article className="sd-feedback-card">
                  <h4>
                    {txt("feedback_comments_title", "Comments on the session")}
                  </h4>
                  <p>
                    {teacherFeedback.commentsOnSession?.trim() ||
                      txt("feedback_comments_empty", "No comments provided.")}
                  </p>
                </article>
                <article className="sd-feedback-card">
                  <h4>{txt("feedback_future_title", "Future steps")}</h4>
                  <p>
                    {teacherFeedback.futureSteps?.trim() ||
                      txt("feedback_future_empty", "No future steps added yet.")}
                  </p>
                </article>
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
                  title={txt("feedback_empty_title", "No teacher feedback yet")}
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
