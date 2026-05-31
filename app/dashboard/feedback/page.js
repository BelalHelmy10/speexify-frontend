"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import api from "@/lib/api";
import { fmtInTz } from "@/utils/date";
import { getDictionary, t } from "@/app/i18n";
import useAuth from "@/hooks/useAuth";
import { stripRichFeedbackPayload } from "@/lib/feedbackReport";

function FeedbackIcon({ size = 24 }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: size, height: size }}>
      <path d="M21 15a4 4 0 0 1-4 4H7l-4 4V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
      <path d="M8 10h.01" />
      <path d="M12 10h.01" />
      <path d="M16 10h.01" />
    </svg>
  );
}

function MessageIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a4 4 0 0 1-4 4H7l-4 4V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
    </svg>
  );
}

function CommentsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

function StepsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20" />
    </svg>
  );
}

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
      <path d="M19 12H5" />
      <path d="M12 19l-7-7 7-7" />
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

function TeacherAvatar({ name, url }) {
  const initials = name
    ? name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "T";
  return (
    <div className="fb-teacher-avatar">
      {url ? (
        <img src={url} alt={name || "Teacher"} />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
}

function FeedbackCard({ item, timezone, prefix, dict }) {
  const fb = item.feedback;
  const commentsOnSession = stripRichFeedbackPayload(fb.commentsOnSession || "");
  const hasMessage = !!fb.messageToLearner?.trim();
  const hasComments = !!commentsOnSession;
  const hasSteps = !!fb.futureSteps?.trim();

  return (
    <article className="fb-card">
      <div className="fb-card__header">
        <TeacherAvatar name={item.teacher?.name} url={item.teacher?.avatarUrl} />
        <div className="fb-card__meta">
          <span className="fb-card__teacher">
            {t(dict, "from_teacher")?.replace("{name}", item.teacher?.name || "Your teacher")}
          </span>
          <span className="fb-card__date">
            {item.startAt ? fmtInTz(item.startAt, timezone) : ""}
          </span>
        </div>
        <Link
          href={`${prefix}/dashboard/sessions/${item.id}/feedback`}
          className="btn btn--ghost btn--sm fb-card__link"
        >
          {t(dict, "session_label") || "Session"}
          <ArrowRightIcon />
        </Link>
      </div>

      <h4 className="fb-card__title">{item.title}</h4>

      <div className="fb-card__body">
        {hasMessage && (
          <div className="fb-card__section">
            <div className="fb-card__section-icon fb-card__section-icon--message">
              <MessageIcon />
            </div>
            <div>
              <h5>{t(dict, "message_title") || "Message to you"}</h5>
              <p>{fb.messageToLearner}</p>
            </div>
          </div>
        )}
        {hasComments && (
          <div className="fb-card__section">
            <div className="fb-card__section-icon fb-card__section-icon--comments">
              <CommentsIcon />
            </div>
            <div>
              <h5>{t(dict, "comments_title") || "Comments on session"}</h5>
              <p>{commentsOnSession}</p>
            </div>
          </div>
        )}
        {hasSteps && (
          <div className="fb-card__section">
            <div className="fb-card__section-icon fb-card__section-icon--steps">
              <StepsIcon />
            </div>
            <div>
              <h5>{t(dict, "future_steps_title") || "Future steps"}</h5>
              <p>{fb.futureSteps}</p>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

export default function FeedbackHistoryPage() {
  const pathname = usePathname();
  const router = useRouter();
  const locale = pathname?.startsWith("/ar") ? "ar" : "en";
  const prefix = locale === "ar" ? "/ar" : "";
  const dict = getDictionary(locale, "feedback");

  const { user, checking } = useAuth();
  const timezone = user?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

  const [feedbacks, setFeedbacks] = useState([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  const limit = 10;

  const fetchFeedbacks = useCallback(async (currentOffset, append = false) => {
    try {
      const { data } = await api.get("/me/feedback", {
        params: { limit, offset: currentOffset, t: Date.now() },
      });
      const list = data?.feedbacks || [];
      setTotal(data?.total || 0);
      if (append) {
        setFeedbacks((prev) => [...prev, ...list]);
      } else {
        setFeedbacks(list);
      }
      setError("");
    } catch (e) {
      setError(e?.response?.data?.error || t(dict, "error_loading") || "Failed to load feedback");
    }
  }, [dict]);

  useEffect(() => {
    if (checking) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      await fetchFeedbacks(0, false);
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [checking, fetchFeedbacks]);

  const handleLoadMore = async () => {
    const nextOffset = offset + limit;
    setLoadingMore(true);
    await fetchFeedbacks(nextOffset, true);
    setOffset(nextOffset);
    setLoadingMore(false);
  };

  const handleBack = () => {
    router.push(`${prefix}/dashboard`);
  };

  const countLabel = total === 1
    ? t(dict, "count_one") || "1 feedback note"
    : (t(dict, "count_other") || "{count} feedback notes").replace("{count}", total);

  return (
    <div className="page-feedback">
      <div className="page-feedback__inner container-narrow">
        <button onClick={handleBack} className="btn btn--ghost page-feedback__back">
          <BackIcon />
          {t(dict, "back_to_dashboard") || "Back to dashboard"}
        </button>

        <header className="page-feedback__header">
          <div>
            <div className="page-feedback__badge">{t(dict, "badge") || "Feedback"}</div>
            <h1 className="page-feedback__title">{t(dict, "title") || "Teacher Feedback"}</h1>
            <p className="page-feedback__subtitle">{countLabel}</p>
          </div>
          <div className="page-feedback__header-icon">
            <FeedbackIcon size={40} />
          </div>
        </header>

        {error && <div className="page-feedback__alert">{error}</div>}

        {loading ? (
          <div className="page-feedback__loading">
            <div className="feedback-spinner" />
            <p>{t(dict, "loading") || "Loading feedback…"}</p>
          </div>
        ) : feedbacks.length === 0 ? (
          <div className="page-feedback__empty">
            <div className="page-feedback__empty-icon">
              <FeedbackIcon size={48} />
            </div>
            <h3>{t(dict, "empty_title") || "No feedback yet"}</h3>
            <p>{t(dict, "empty_body") || "Once your teacher leaves feedback on a session, it will appear here."}</p>
            <Link href={`${prefix}/dashboard`} className="btn btn--primary">
              {t(dict, "empty_action") || "Go to dashboard"}
            </Link>
          </div>
        ) : (
          <>
            <div className="fb-list">
              {feedbacks.map((item) => (
                <FeedbackCard
                  key={item.id}
                  item={item}
                  timezone={timezone}
                  prefix={prefix}
                  dict={dict}
                />
              ))}
            </div>

            {offset + limit < total && (
              <div className="fb-load-more">
                <button
                  className="btn btn--secondary btn--full"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? (
                    <>
                      <div className="feedback-spinner feedback-spinner--sm" />
                      {t(dict, "loading") || "Loading…"}
                    </>
                  ) : (
                    t(dict, "load_more") || "Load more"
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
