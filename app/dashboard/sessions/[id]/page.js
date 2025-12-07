// app/dashboard/sessions/[id]/page.js
"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams, usePathname } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import "@/styles/session-detail.scss";
import { getDictionary, t } from "@/app/i18n";

export default function SessionDetailPage() {
  const router = useRouter();
  const { id } = useParams();
  const pathname = usePathname();
  const locale = pathname?.startsWith("/ar") ? "ar" : "en";
  const dict = getDictionary(locale, "session");

  const [session, setSession] = useState(null);
  const [status, setStatus] = useState("loading"); // "loading" | "ok" | "error"
  const [error, setError] = useState("");

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
    title,
    startAt,
    endAt,
    meetingUrl,
    notes,
    user,
    teacher,
    status: s,
    teacherFeedback,
  } = session;

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
              <h3 className="session-detail-section__title">
                {t(dict, "section_learner_title")}
              </h3>
              {user ? (
                <p className="session-detail-section__body">
                  {user.name || user.email}
                  <br />
                  <span className="session-detail-muted">{user.email}</span>
                </p>
              ) : (
                <p className="session-detail-section__body">
                  {t(dict, "section_learner_not_found")}
                </p>
              )}
            </section>
          </div>

          {/* UPDATED JOIN SECTION */}
          <section className="session-detail-section session-detail-section--wide">
            <div className="session-detail-section__header">
              <h3 className="session-detail-section__title">
                {t(dict, "join_title")}
              </h3>
            </div>

            <div className="session-detail-join-actions">
              {/* Classroom is always available for this session */}
              <Link
                href={`/classroom/${session.id}`}
                className="btn btn--primary session-detail-join-btn"
              >
                {t(dict, "join_open_classroom")}
              </Link>

              {meetingUrl && (
                <a
                  href={meetingUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn--ghost session-detail-join-btn"
                >
                  {t(dict, "join_external_link")}
                </a>
              )}

              {!meetingUrl && (
                <p className="session-detail-section__body">
                  {t(dict, "join_no_meeting")}
                </p>
              )}
            </div>
          </section>

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
