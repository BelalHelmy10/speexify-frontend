// app/dashboard/sessions/[id]/page.js
"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams, usePathname } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import "@/styles/session-detail.scss";
import { getDictionary, t } from "@/app/i18n";
import { useToast } from "@/components/ToastProvider";
import { getSafeExternalUrl } from "@/utils/url";

export default function SessionDetailPage() {
  const router = useRouter();
  const { id } = useParams();
  const pathname = usePathname();

  const locale = pathname?.startsWith("/ar") ? "ar" : "en";
  const prefix = locale === "ar" ? "/ar" : "";
  const dict = getDictionary(locale, "session");

  const { toast, confirmModal } = useToast();

  const [session, setSession] = useState(null);
  const [status, setStatus] = useState("loading"); // "loading" | "ok" | "error"
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;

    let cancelled = false;

    async function load() {
      try {
        setStatus("loading");
        const { data } = await api.get(`/sessions/${id}`);
        if (cancelled) return;

        setSession(data?.session || null);
        setStatus("ok");
      } catch (err) {
        console.error("Failed to load session", err);
        if (cancelled) return;
        setError(err?.response?.data?.error || t(dict, "generic_error"));
        setStatus("error");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id, dict]);

  const handleBack = () => {
    router.back();
  };

  const formatDateTime = (value) => {
    if (!value) return t(dict, "datetime_na");
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString(locale === "ar" ? "ar" : undefined, {
      dateStyle: "full",
      timeStyle: "short",
    });
  };

  // ─────────────────────────────────────
  // LOADING STATE
  // ─────────────────────────────────────
  if (status === "loading") {
    return (
      <div className="page-session-detail">
        <div className="page-session-detail__inner container-narrow">
          <button
            onClick={handleBack}
            className="btn btn--ghost page-session-detail__back"
          >
            {t(dict, "back_btn")}
          </button>

          <div className="session-detail-card session-detail-card--state">
            <header className="session-detail-header">
              <div>
                <h1 className="session-detail-title">
                  {t(dict, "loading_title")}
                </h1>
                <p className="session-detail-subtitle">
                  {t(dict, "loading_subtitle")}
                </p>
              </div>
              <span className="session-detail-status session-detail-status--loading">
                {t(dict, "loading_badge")}
              </span>
            </header>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────
  // ERROR / NOT FOUND STATE
  // ─────────────────────────────────────
  if (status === "error" || !session) {
    return (
      <div className="page-session-detail">
        <div className="page-session-detail__inner container-narrow">
          <button
            onClick={handleBack}
            className="btn btn--ghost page-session-detail__back"
          >
            {t(dict, "back_btn")}
          </button>

          <div className="session-detail-card session-detail-card--state">
            <header className="session-detail-header">
              <div>
                <h1 className="session-detail-title">
                  {t(dict, "error_title")}
                </h1>
                <p className="session-detail-subtitle">
                  {t(dict, "error_subtitle")}
                </p>
              </div>
              <span className="session-detail-status session-detail-status--error">
                {t(dict, "error_badge")}
              </span>
            </header>

            <p className="session-detail-error">
              {error || t(dict, "error_fallback")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────
  // NORMAL STATE
  // ─────────────────────────────────────
  const {
    id: sessionId,
    title,
    startAt,
    endAt,
    meetingUrl,
    joinUrl,
    notes,
    user: legacyLearner,
    teacher,
    status: s,
    type,
    capacity,
    participantCount,
    participants,
    isLearner,
    isTeacher: sessionIsTeacher,
    isAdmin: sessionIsAdmin,
    teacherFeedback,
  } = session;

  const isGroup = String(type || "").toUpperCase() === "GROUP";

  const list = Array.isArray(participants) ? participants : [];
  const activeParticipants = list.filter((p) => p.status !== "canceled");

  const learnerLabel = isGroup
    ? t(dict, "section_learners_title") || "Learners"
    : t(dict, "section_learner_title") || "Learner";

  const canCancelOrLeave = !!(sessionIsAdmin || sessionIsTeacher || isLearner);
  const canReschedule = !!(sessionIsAdmin || sessionIsTeacher);

  const cancelLabel =
    isGroup && !sessionIsTeacher && !sessionIsAdmin
      ? t(dict, "session_leave") || "Leave session"
      : t(dict, "session_cancel") || "Cancel";

  const cancelTitle =
    isGroup && !sessionIsTeacher && !sessionIsAdmin
      ? t(dict, "session_leave_title") || "Leave this group session?"
      : t(dict, "session_cancel_title") || "Cancel session?";

  const handleCancelOrLeave = async () => {
    if (!canCancelOrLeave || busy) return;

    const ok = await confirmModal(cancelTitle);
    if (!ok) return;

    try {
      setBusy(true);

      const res = await api.post(`/sessions/${sessionId}/cancel`);
      const scope = res?.data?.scope;

      if (scope === "participant") {
        toast.success(
          t(dict, "session_left_success") || "You left the session."
        );
      } else if (scope === "session") {
        toast.success(
          t(dict, "session_canceled_success") || "Session canceled."
        );
      } else {
        toast.success(t(dict, "success_saved") || "Done.");
      }

      const { data } = await api.get(`/sessions/${sessionId}`, {
        params: { t: Date.now() },
      });
      setSession(data?.session || null);
    } catch (e) {
      toast.error(e?.response?.data?.error || t(dict, "generic_error"));
    } finally {
      setBusy(false);
    }
  };

  const hasExternal = !!(meetingUrl || joinUrl);

  return (
    <div className="page-session-detail">
      <div className="page-session-detail__inner container-narrow">
        <button
          onClick={handleBack}
          className="btn btn--ghost page-session-detail__back"
        >
          {t(dict, "back_btn")}
        </button>

        <div className="session-detail-card">
          <header className="session-detail-header">
            <div>
              <h1 className="session-detail-title">
                {title || t(dict, "normal_title_fallback")}
              </h1>
              <p className="session-detail-subtitle">
                {t(dict, "normal_subtitle")}
              </p>
            </div>

            {s && (
              <span
                className={`session-detail-status session-detail-status--${s}`}
              >
                {s}
              </span>
            )}
          </header>

          <div className="session-detail-grid">
            <section className="session-detail-section">
              <h3 className="session-detail-section__title">
                {t(dict, "section_time_title")}
              </h3>
              <p className="session-detail-section__body">
                <strong>{t(dict, "time_start_label")}</strong>{" "}
                {formatDateTime(startAt)}
                <br />
                <strong>{t(dict, "time_end_label")}</strong>{" "}
                {formatDateTime(endAt)}
              </p>
            </section>

            <section className="session-detail-section">
              <h3 className="session-detail-section__title">
                {t(dict, "section_teacher_title")}
              </h3>
              {teacher ? (
                <p className="session-detail-section__body">
                  {teacher.name || teacher.email}
                  <br />
                  <span className="session-detail-muted">{teacher.email}</span>
                </p>
              ) : (
                <p className="session-detail-section__body">
                  {t(dict, "section_teacher_not_assigned")}
                </p>
              )}
            </section>

            <section className="session-detail-section">
              <h3 className="session-detail-section__title">{learnerLabel}</h3>

              {!isGroup ? (
                legacyLearner ? (
                  <p className="session-detail-section__body">
                    {legacyLearner.name || legacyLearner.email}
                    <br />
                    <span className="session-detail-muted">
                      {legacyLearner.email}
                    </span>
                  </p>
                ) : (
                  <p className="session-detail-section__body">
                    {t(dict, "section_learner_not_found")}
                  </p>
                )
              ) : activeParticipants.length ? (
                <div className="session-detail-section__body">
                  <div
                    className="session-detail-muted"
                    style={{ marginBottom: 8 }}
                  >
                    {t(dict, "session_participants") || "Participants"}:{" "}
                    {typeof participantCount === "number"
                      ? participantCount
                      : activeParticipants.length}
                    {capacity ? ` / ${capacity}` : ""}
                  </div>

                  <ul style={{ margin: 0, paddingInlineStart: 18 }}>
                    {activeParticipants.map((p) => {
                      const u = p.user || {};
                      const name = u.name || u.email || `#${p.userId}`;
                      const email = u.email || "";
                      return (
                        <li key={p.userId} style={{ marginBottom: 6 }}>
                          <span>{name}</span>
                          {email ? (
                            <span className="session-detail-muted">
                              {" "}
                              — {email}
                            </span>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : (
                <p className="session-detail-section__body">
                  {t(dict, "session_no_participants") || "No participants yet."}
                </p>
              )}
            </section>
          </div>

          {/* JOIN SECTION */}
          <section className="session-detail-section session-detail-section--wide">
            <div className="session-detail-section__header">
              <h3 className="session-detail-section__title">
                {t(dict, "join_title")}
              </h3>
            </div>

            <div className="session-detail-join-actions">
              <Link
                href={`${prefix}/classroom/${sessionId}`}
                className="btn btn--primary session-detail-join-btn"
              >
                {t(dict, "join_open_classroom")}
              </Link>

              {hasExternal && (
                <a
                  href={getSafeExternalUrl(meetingUrl || joinUrl)}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn--ghost session-detail-join-btn"
                >
                  {t(dict, "join_external_link")}
                </a>
              )}

              {!hasExternal && (
                <p className="session-detail-section__body">
                  {t(dict, "join_no_meeting")}
                </p>
              )}
            </div>
          </section>

          {canCancelOrLeave && (
            <section className="session-detail-section session-detail-section--wide">
              <div className="session-detail-section__header">
                <h3 className="session-detail-section__title">
                  {t(dict, "actions_title") || "Actions"}
                </h3>
              </div>

              <div className="session-detail-join-actions">
                <button
                  className="btn btn--ghost btn--danger"
                  onClick={handleCancelOrLeave}
                  disabled={busy}
                  title={cancelTitle}
                >
                  {busy
                    ? t(dict, "loading_badge") || "Loading..."
                    : cancelLabel}
                </button>

                {canReschedule && (
                  <Link href={`${prefix}/calendar`} className="btn btn--ghost">
                    {t(dict, "session_reschedule") || "Reschedule"}
                  </Link>
                )}
              </div>
            </section>
          )}

          <section className="session-detail-section session-detail-section--wide">
            <div className="session-detail-section__header">
              <h3 className="session-detail-section__title">
                {t(dict, "notes_title")}
              </h3>
            </div>
            <p className="session-detail-section__body">
              {notes && notes.trim() ? notes : t(dict, "notes_empty")}
            </p>
          </section>

          {teacherFeedback && (
            <section className="session-detail-section session-detail-section--wide">
              <div className="session-detail-section__header">
                <h3 className="session-detail-section__title">
                  {t(dict, "feedback_title")}
                </h3>
                <p className="session-detail-section__hint">
                  {t(dict, "feedback_hint")}
                </p>
              </div>

              <div className="session-detail-feedback-grid">
                <div className="session-detail-feedback">
                  <h4 className="session-detail-feedback__title">
                    {t(dict, "feedback_msg_title")}
                  </h4>
                  <p className="session-detail-feedback__body">
                    {teacherFeedback.messageToLearner?.trim()
                      ? teacherFeedback.messageToLearner
                      : t(dict, "feedback_msg_empty")}
                  </p>
                </div>

                <div className="session-detail-feedback">
                  <h4 className="session-detail-feedback__title">
                    {t(dict, "feedback_comments_title")}
                  </h4>
                  <p className="session-detail-feedback__body">
                    {teacherFeedback.commentsOnSession?.trim()
                      ? teacherFeedback.commentsOnSession
                      : t(dict, "feedback_comments_empty")}
                  </p>
                </div>

                <div className="session-detail-feedback">
                  <h4 className="session-detail-feedback__title">
                    {t(dict, "feedback_future_title")}
                  </h4>
                  <p className="session-detail-feedback__body">
                    {teacherFeedback.futureSteps?.trim()
                      ? teacherFeedback.futureSteps
                      : t(dict, "feedback_future_empty")}
                  </p>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
