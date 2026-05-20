"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  MessageSquareText,
  Search,
  UsersRound,
  XCircle,
} from "lucide-react";
import useAuth from "@/hooks/useAuth";
import api from "@/lib/api";
import { getDictionary, t } from "@/app/i18n";

const PAGE_SIZE = 60;

function text(dict, key, fallback, vars) {
  const value = t(dict, key, vars);
  if (value === `__${key}__`) {
    if (!vars) return fallback;
    return Object.entries(vars).reduce(
      (acc, [name, replacement]) =>
        acc.split(`{${name}}`).join(String(replacement)),
      fallback
    );
  }
  return value;
}

function pickList(payload, preferredKey = "past") {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.[preferredKey])) return payload[preferredKey];
  if (Array.isArray(payload?.sessions)) return payload.sessions;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

function normalizeStatus(status) {
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

  return value || "past";
}

function getSessionTimestamp(session) {
  const timestamp = session?.startAt ? new Date(session.startAt).getTime() : 0;
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function getDurationMinutes(session) {
  const start = session?.startAt ? new Date(session.startAt).getTime() : null;
  const end = session?.endAt ? new Date(session.endAt).getTime() : null;

  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return null;
  }

  return Math.round((end - start) / 60000);
}

function hasTeacherFeedback(session) {
  return Boolean(
    session?.hasFeedback ||
    session?.teacherFeedback ||
    session?.feedback ||
    session?.teacherFeedbackMessageToLearner ||
    session?.teacherFeedbackComments ||
    session?.teacherFeedbackFutureSteps
  );
}

function isGroupSession(session) {
  return String(session?.type || "").toUpperCase() === "GROUP";
}

function getTypeLabel(dict, session) {
  return isGroupSession(session)
    ? text(dict, "past_archive_group", "Group")
    : text(dict, "past_archive_one_on_one", "1:1");
}

function formatMonthLabel(iso, locale, timezone) {
  const date = iso ? new Date(iso) : null;
  if (!date || Number.isNaN(date.getTime())) {
    return "Unscheduled";
  }

  return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", {
    month: "long",
    year: "numeric",
    timeZone: timezone || undefined,
  }).format(date);
}

function formatDateLabel(iso, locale, timezone) {
  const date = iso ? new Date(iso) : null;
  if (!date || Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: timezone || undefined,
  }).format(date);
}

function formatTimeRange(session, locale, timezone) {
  const start = session?.startAt ? new Date(session.startAt) : null;
  if (!start || Number.isNaN(start.getTime())) return "";

  const formatter = new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone || undefined,
  });

  const startLabel = formatter.format(start);
  const end = session?.endAt ? new Date(session.endAt) : null;

  if (!end || Number.isNaN(end.getTime())) return startLabel;
  return `${startLabel} - ${formatter.format(end)}`;
}

function getPeopleSummary(session, isTeacher, dict) {
  const isGroup = isGroupSession(session);

  if (isTeacher) {
    const learners = Array.isArray(session?.learners) ? session.learners : [];
    const fallbackUser = session?.user ? [session.user] : [];
    const people = isGroup ? learners : fallbackUser;
    const names = people
      .map((person) => person?.name || person?.email)
      .filter(Boolean);

    if (names.length === 0) {
      return text(dict, "past_archive_no_learners", "Learner details pending");
    }

    const visibleNames = names.slice(0, 3).join(", ");
    const remaining = names.length - 3;
    return remaining > 0 ? `${visibleNames} +${remaining}` : visibleNames;
  }

  const teacherName = session?.teacher?.name || session?.teacher?.email;
  return teacherName || text(dict, "past_archive_no_teacher", "Teacher details pending");
}

function getSearchText(session) {
  const learners = Array.isArray(session?.learners) ? session.learners : [];
  const participants = Array.isArray(session?.participants)
    ? session.participants.map((p) => p?.user).filter(Boolean)
    : [];

  return [
    session?.title,
    session?.status,
    session?.type,
    session?.teacher?.name,
    session?.teacher?.email,
    session?.user?.name,
    session?.user?.email,
    ...learners.flatMap((learner) => [learner?.name, learner?.email]),
    ...participants.flatMap((participant) => [
      participant?.name,
      participant?.email,
    ]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function groupByMonth(sessions, locale, timezone) {
  return sessions.reduce((groups, session) => {
    const label = formatMonthLabel(session.startAt, locale, timezone);
    const existing = groups.find((group) => group.label === label);

    if (existing) {
      existing.sessions.push(session);
      return groups;
    }

    groups.push({ label, sessions: [session] });
    return groups;
  }, []);
}

function StatCard({ icon, label, value, tone }) {
  return (
    <div className={`past-archive-stat past-archive-stat--${tone}`}>
      <div className="past-archive-stat__icon" aria-hidden="true">
        {icon}
      </div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function FilterButton({ active, children, onClick }) {
  return (
    <button
      type="button"
      className={active ? "is-active" : ""}
      aria-pressed={active}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function PastSessionCard({ session, dict, prefix, locale, timezone, isTeacher }) {
  const status = normalizeStatus(session.status);
  const isCanceled = status === "canceled";
  const isCompleted = status === "completed";
  const isGroup = isGroupSession(session);
  const feedbackReady = hasTeacherFeedback(session);
  const duration = getDurationMinutes(session);
  const participants =
    typeof session.participantCount === "number" ? session.participantCount : null;
  const dateLabel = formatDateLabel(session.startAt, locale, timezone);
  const timeLabel = formatTimeRange(session, locale, timezone);
  const peopleLabel = isTeacher
    ? isGroup
      ? text(dict, "past_archive_learners", "Learners")
      : text(dict, "past_archive_learner", "Learner")
    : text(dict, "past_archive_teacher", "Teacher");

  return (
    <article className={`past-session-card past-session-card--${status}`}>
      <div className="past-session-card__rail" aria-hidden="true" />

      <div className="past-session-card__content">
        <div className="past-session-card__main">
          <div className="past-session-card__topline">
            <span className={`past-session-card__status past-session-card__status--${status}`}>
              {isCompleted ? <CheckCircle2 /> : isCanceled ? <XCircle /> : <Clock3 />}
              {session.status || status}
            </span>
            <span className="past-session-card__type">{getTypeLabel(dict, session)}</span>
            {participants !== null && (
              <span className="past-session-card__meta-chip">
                <UsersRound />
                {participants}
                {isGroup && typeof session.capacity === "number"
                  ? ` / ${session.capacity}`
                  : ""}
              </span>
            )}
          </div>

          <h2>{session.title || text(dict, "session_title_default", "Session")}</h2>

          <div className="past-session-card__details">
            <span>
              <CalendarDays />
              {dateLabel}
            </span>
            <span>
              <Clock3 />
              {timeLabel}
              {duration ? ` - ${text(dict, "past_archive_duration", "{minutes} min", { minutes: duration })}` : ""}
            </span>
          </div>

          <div className="past-session-card__people">
            <span>{peopleLabel}</span>
            <strong>{getPeopleSummary(session, isTeacher, dict)}</strong>
          </div>
        </div>

        <div className="past-session-card__side">
          <div
            className={
              feedbackReady
                ? "past-session-card__feedback is-ready"
                : "past-session-card__feedback"
            }
          >
            <MessageSquareText />
            {feedbackReady
              ? text(dict, "past_archive_feedback_ready", "Feedback ready")
              : text(dict, "past_archive_feedback_missing", "No feedback yet")}
          </div>

          <div className="past-session-card__actions">
            <Link
              href={`${prefix}/dashboard/sessions/${session.id}`}
              className="past-session-card__action past-session-card__action--ghost"
            >
              {text(dict, "session_view_details", "View details")}
              <ChevronRight />
            </Link>

            {isTeacher && isCompleted && (
              <Link
                href={`${prefix}/dashboard/sessions/${session.id}/feedback`}
                className="past-session-card__action past-session-card__action--primary"
              >
                {feedbackReady
                  ? text(dict, "session_edit_feedback", "Edit feedback")
                  : text(dict, "session_give_feedback", "Give feedback")}
              </Link>
            )}

            {!isTeacher && feedbackReady && (
              <Link
                href={`${prefix}/dashboard/sessions/${session.id}/feedback`}
                className="past-session-card__action past-session-card__action--primary"
              >
                {text(dict, "session_view_feedback", "View feedback")}
              </Link>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

export default function PastSessionsPage() {
  const pathname = usePathname();
  const locale = pathname?.startsWith("/ar") ? "ar" : "en";
  const prefix = locale === "ar" ? "/ar" : "";
  const dict = getDictionary(locale, "dashboard");
  const { user, checking } = useAuth();

  const [sessions, setSessions] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("newest");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [hasMore, setHasMore] = useState(false);

  const isTeacher = user?.role === "teacher";
  const isAdmin = user?.role === "admin" && !user?._impersonating;
  const timezone = user?.timezone;

  const fetchPastSessions = useCallback(
    async ({ offset = 0, append = false } = {}) => {
      if (!user || isAdmin) return;

      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError("");

      try {
        const { data } = await api.get("/me/sessions", {
          params: {
            range: "past",
            limit: PAGE_SIZE,
            offset,
            t: Date.now(),
          },
        });
        const nextSessions = pickList(data, "past");

        setSessions((prev) => {
          if (!append) return nextSessions;
          const seen = new Set(prev.map((session) => session.id));
          return [
            ...prev,
            ...nextSessions.filter((session) => !seen.has(session.id)),
          ];
        });
        setHasMore(nextSessions.length === PAGE_SIZE);
      } catch (err) {
        setError(
          err?.response?.data?.error ||
          text(dict, "past_archive_error", "Failed to load past sessions")
        );
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [dict, isAdmin, user]
  );

  useEffect(() => {
    if (checking) return;
    if (!user || isAdmin) {
      setLoading(false);
      return;
    }

    fetchPastSessions({ offset: 0, append: false });
  }, [checking, fetchPastSessions, isAdmin, user]);

  const stats = useMemo(() => {
    const completed = sessions.filter(
      (session) => normalizeStatus(session.status) === "completed"
    ).length;
    const canceled = sessions.filter(
      (session) => normalizeStatus(session.status) === "canceled"
    ).length;
    const withFeedback = sessions.filter(hasTeacherFeedback).length;
    const needsFeedback = sessions.filter(
      (session) =>
        isTeacher &&
        normalizeStatus(session.status) === "completed" &&
        !hasTeacherFeedback(session)
    ).length;

    return {
      total: sessions.length,
      completed,
      canceled,
      withFeedback,
      needsFeedback,
    };
  }, [isTeacher, sessions]);

  const filteredSessions = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return sessions
      .filter((session) => {
        const status = normalizeStatus(session.status);

        if (statusFilter === "completed" && status !== "completed") return false;
        if (statusFilter === "canceled" && status !== "canceled") return false;
        if (statusFilter === "with-feedback" && !hasTeacherFeedback(session)) {
          return false;
        }
        if (
          statusFilter === "needs-feedback" &&
          (!isTeacher || status !== "completed" || hasTeacherFeedback(session))
        ) {
          return false;
        }

        if (typeFilter !== "all" && String(session.type || "").toUpperCase() !== typeFilter) {
          return false;
        }

        if (needle && !getSearchText(session).includes(needle)) return false;

        return true;
      })
      .sort((a, b) => {
        const diff = getSessionTimestamp(b) - getSessionTimestamp(a);
        return sortOrder === "oldest" ? -diff : diff;
      });
  }, [isTeacher, query, sessions, sortOrder, statusFilter, typeFilter]);

  const monthGroups = useMemo(
    () => groupByMonth(filteredSessions, locale, timezone),
    [filteredSessions, locale, timezone]
  );

  const resetFilters = () => {
    setQuery("");
    setStatusFilter("all");
    setTypeFilter("all");
    setSortOrder("newest");
  };

  if (checking || loading) {
    return (
      <main className="dashboard past-archive">
        <div className="past-archive__loading">
          <span />
          {text(dict, "status_loading", "Loading...")}
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="dashboard past-archive">
        <section className="past-archive__empty">
          <h1>{text(dict, "status_not_auth", "Not authenticated")}</h1>
          <Link href={`${prefix}/login`} className="btn btn--primary">
            {text(dict, "past_archive_login", "Log in")}
          </Link>
        </section>
      </main>
    );
  }

  if (isAdmin) {
    return (
      <main className="dashboard past-archive">
        <section className="past-archive__empty">
          <h1>{text(dict, "past_archive_admin_title", "Session archive")}</h1>
          <p>
            {text(
              dict,
              "past_archive_admin_body",
              "This archive is available from learner and teacher dashboards."
            )}
          </p>
          <Link href="/admin" className="btn btn--primary">
            {text(dict, "next_action_cta_admin", "Open admin")}
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="dashboard past-archive">
      <section className="past-archive__hero">
        <div className="past-archive__hero-copy">
          <Link href={`${prefix}/dashboard`} className="past-archive__back">
            {locale === "ar" ? <ArrowRight /> : <ArrowLeft />}
            {text(dict, "past_archive_back", "Back to dashboard")}
          </Link>
          <span className="past-archive__eyebrow">
            {text(dict, "past_archive_eyebrow", "Session archive")}
          </span>
          <h1>{text(dict, "past_archive_title", "Past sessions, clearly organized")}</h1>
          <p>
            {text(
              dict,
              "past_archive_subtitle",
              "Review completed and canceled classes, feedback status, participants, and details without leaving the dashboard."
            )}
          </p>
        </div>

        <div className="past-archive__hero-actions">
          <Link href={`${prefix}/calendar`} className="btn btn--ghost">
            <CalendarDays />
            {text(dict, "past_archive_calendar", "Open calendar")}
          </Link>
          <Link href={`${prefix}/resources`} className="btn btn--primary">
            <BookOpenCheck />
            {text(dict, "next_action_secondary_resources", "Resources")}
          </Link>
        </div>
      </section>

      <section className="past-archive__stats" aria-label="Past session summary">
        <StatCard
          tone="total"
          icon={<CalendarDays />}
          label={text(dict, "past_archive_total_loaded", "Loaded sessions")}
          value={stats.total}
        />
        <StatCard
          tone="completed"
          icon={<CheckCircle2 />}
          label={text(dict, "past_archive_completed", "Completed")}
          value={stats.completed}
        />
        <StatCard
          tone="canceled"
          icon={<XCircle />}
          label={text(dict, "past_archive_canceled", "Canceled")}
          value={stats.canceled}
        />
        <StatCard
          tone={isTeacher ? "needs" : "feedback"}
          icon={<MessageSquareText />}
          label={
            isTeacher
              ? text(dict, "past_archive_needs_feedback", "Needs feedback")
              : text(dict, "past_archive_feedback", "With feedback")
          }
          value={isTeacher ? stats.needsFeedback : stats.withFeedback}
        />
      </section>

      <section className="past-archive__controls" aria-label="Past session filters">
        <label className="past-archive__search">
          <Search aria-hidden="true" />
          <span>{text(dict, "past_archive_search_label", "Search sessions")}</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={text(
              dict,
              "past_archive_search_placeholder",
              "Search title, teacher, learner..."
            )}
          />
        </label>

        <div className="past-archive__filter-row">
          <div className="past-archive__segment" role="group" aria-label="Status">
            <FilterButton active={statusFilter === "all"} onClick={() => setStatusFilter("all")}>
              {text(dict, "past_archive_status_all", "All")}
            </FilterButton>
            <FilterButton
              active={statusFilter === "completed"}
              onClick={() => setStatusFilter("completed")}
            >
              {text(dict, "past_archive_completed", "Completed")}
            </FilterButton>
            <FilterButton
              active={statusFilter === "canceled"}
              onClick={() => setStatusFilter("canceled")}
            >
              {text(dict, "past_archive_canceled", "Canceled")}
            </FilterButton>
            <FilterButton
              active={statusFilter === "with-feedback"}
              onClick={() => setStatusFilter("with-feedback")}
            >
              {text(dict, "past_archive_feedback", "With feedback")}
            </FilterButton>
            {isTeacher && (
              <FilterButton
                active={statusFilter === "needs-feedback"}
                onClick={() => setStatusFilter("needs-feedback")}
              >
                {text(dict, "past_archive_needs_feedback", "Needs feedback")}
              </FilterButton>
            )}
          </div>

          <div className="past-archive__segment past-archive__segment--compact" role="group" aria-label="Type">
            <FilterButton active={typeFilter === "all"} onClick={() => setTypeFilter("all")}>
              {text(dict, "past_archive_type_all", "All types")}
            </FilterButton>
            <FilterButton
              active={typeFilter === "ONE_ON_ONE"}
              onClick={() => setTypeFilter("ONE_ON_ONE")}
            >
              {text(dict, "past_archive_one_on_one", "1:1")}
            </FilterButton>
            <FilterButton active={typeFilter === "GROUP"} onClick={() => setTypeFilter("GROUP")}>
              {text(dict, "past_archive_group", "Group")}
            </FilterButton>
          </div>

          <label className="past-archive__sort">
            <span>{text(dict, "past_archive_sort_label", "Sort")}</span>
            <select value={sortOrder} onChange={(event) => setSortOrder(event.target.value)}>
              <option value="newest">{text(dict, "past_archive_sort_newest", "Newest first")}</option>
              <option value="oldest">{text(dict, "past_archive_sort_oldest", "Oldest first")}</option>
            </select>
          </label>
        </div>
      </section>

      <section className="past-archive__results" aria-live="polite">
        <div className="past-archive__results-head">
          <div>
            <span>{text(dict, "past_archive_results_label", "Archive")}</span>
            <strong>
              {text(dict, "past_archive_results", "{count} shown", {
                count: filteredSessions.length,
              })}
            </strong>
          </div>
          {(query || statusFilter !== "all" || typeFilter !== "all" || sortOrder !== "newest") && (
            <button type="button" onClick={resetFilters}>
              {text(dict, "past_archive_clear_filters", "Clear filters")}
            </button>
          )}
        </div>

        {error && (
          <div className="past-archive__error">
            <p>{error}</p>
            <button type="button" onClick={() => fetchPastSessions({ offset: sessions.length, append: sessions.length > 0 })}>
              {text(dict, "past_archive_retry", "Try again")}
            </button>
          </div>
        )}

        {!error && filteredSessions.length === 0 ? (
          <div className="past-archive__empty">
            <CalendarDays />
            <h2>{text(dict, "past_archive_empty_title", "No past sessions match")}</h2>
            <p>
              {sessions.length === 0
                ? text(dict, "past_none", "No past sessions.")
                : text(
                  dict,
                  "past_archive_empty_body",
                  "Adjust the filters or search to find the session you need."
                )}
            </p>
            {sessions.length > 0 && (
              <button type="button" onClick={resetFilters}>
                {text(dict, "past_archive_clear_filters", "Clear filters")}
              </button>
            )}
          </div>
        ) : (
          <div className="past-archive__timeline">
            {monthGroups.map((group) => (
              <section key={group.label} className="past-archive__month">
                <div className="past-archive__month-label">
                  <span>{group.label}</span>
                  <strong>{group.sessions.length}</strong>
                </div>
                <div className="past-archive__list">
                  {group.sessions.map((session) => (
                    <PastSessionCard
                      key={session.id}
                      session={session}
                      dict={dict}
                      prefix={prefix}
                      locale={locale}
                      timezone={timezone}
                      isTeacher={isTeacher}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        {!error && hasMore && (
          <div className="past-archive__load-more">
            <button
              type="button"
              className="btn btn--secondary"
              disabled={loadingMore}
              onClick={() => fetchPastSessions({ offset: sessions.length, append: true })}
            >
              {loadingMore
                ? text(dict, "past_archive_loading_more", "Loading...")
                : text(dict, "past_archive_load_more", "Load earlier sessions")}
            </button>
          </div>
        )}

        {!error && !hasMore && sessions.length > 0 && (
          <p className="past-archive__end">
            {text(dict, "past_archive_end", "You have reached the beginning of this archive.")}
          </p>
        )}
      </section>
    </main>
  );
}
