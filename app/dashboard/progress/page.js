"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import api from "@/lib/api";
import useAuth from "@/hooks/useAuth";
import "@/styles/progress-page.scss";
import { getDictionary, t } from "@/app/i18n";
import { formatNumber, getIntlLocale } from "@/utils/locale";

function copy(dict, key, fallback, vars) {
  const value = t(dict, key, vars);
  return value === `__${key}__` ? fallback : value;
}

function clampPercent(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(100, Math.round(numeric)));
}

function formatDuration(minutes, dict, locale = "en") {
  const total = Math.max(0, Math.round(Number(minutes || 0)));
  const number = (value) => formatNumber(value, locale);
  const minLabel = copy(dict, "unit_minutes", "min");
  const hourLabel = copy(dict, "unit_hours", "h");

  if (total < 60) return `${number(total)} ${minLabel}`;

  const hours = Math.floor(total / 60);
  const mins = total % 60;
  if (mins > 0) {
    const template = copy(dict, "unit_hours_minutes", "{hours}h {mins}m");
    return template.replace("{hours}", number(hours)).replace("{mins}", number(mins));
  }

  return `${number(hours)} ${hourLabel}`;
}

function formatDate(value, locale, options) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(getIntlLocale(locale), options);
}

function localizeHref(href, prefix) {
  if (!href || href === "#") return "#";
  if (/^https?:\/\//i.test(href)) return href;
  if (!prefix || href.startsWith(prefix)) return href;
  return `${prefix}${href.startsWith("/") ? href : `/${href}`}`;
}

function getNextActionContent(action, nextSession, completedSessions, dict) {
  const type = action?.type;
  const nextTitle = nextSession?.title || copy(dict, "next_session_fallback", "your next session");

  if (type === "prepare") {
    return {
      label: copy(dict, "next_action_prepare", "Prepare for your next session"),
      description: copy(
        dict,
        "next_action_prepare_description",
        "Review your last notes before {title} so your next conversation starts with momentum.",
        { title: nextTitle }
      ),
    };
  }

  if (type === "review-feedback") {
    return {
      label: copy(dict, "next_action_review", "Review your latest coach feedback"),
      description: copy(
        dict,
        "next_action_review_description",
        "Turn one note from your coach into a concrete improvement before your next session."
      ),
    };
  }

  if (type === "schedule") {
    return {
      label: copy(dict, "next_action_schedule", "Schedule your next session"),
      description: copy(
        dict,
        completedSessions > 0
          ? "next_action_schedule_description"
          : "next_action_first_session_description",
        completedSessions > 0
          ? "You still have session credits ready. Book the next step while your rhythm is fresh."
          : "Start your first live session and unlock your progress journey."
      ),
    };
  }

  return {
    label: copy(dict, "next_action_package", "Choose your next learning package"),
    description: copy(
      dict,
      "next_action_package_description",
      "Add session credits to keep your learning path active."
    ),
  };
}

export default function ProgressPage() {
  const { user, checking } = useAuth();
  const pathname = usePathname();
  const locale = pathname?.startsWith("/ar") ? "ar" : "en";
  const prefix = locale === "ar" ? "/ar" : "";
  const dict = getDictionary(locale, "progress");
  const genericError = copy(dict, "error_generic", "Failed to load progress");

  const skillLabelMap = {
    "Fluency practice": "skill_fluency_practice",
    Consistency: "skill_consistency",
    "Feedback loop": "skill_feedback_loop",
    "Course progress": "skill_course_progress",
  };

  const skillSourceMap = {
    "Based on completed speaking time": "source_fluency_practice",
    "Based on attendance and completed sessions": "source_consistency",
    "Based on sessions with teacher feedback": "source_feedback_loop",
    "Based on active package usage": "source_course_progress",
  };

  const achievementTitleMap = {
    "Momentum builder": "achievement_momentum_builder",
    "First session": "achievement_first_session",
    "Feedback loop": "achievement_feedback_loop",
    "Five hours practiced": "achievement_five_hours_practiced",
    "Reliable learner": "achievement_reliable_learner",
    "Halfway there": "achievement_halfway_there",
  };

  const achievementDescMap = {
    "Complete sessions across 3 consecutive learning weeks": "desc_momentum_builder",
    "Complete your first live coaching session": "desc_first_session",
    "Receive teacher feedback on 3 completed sessions": "desc_feedback_loop",
    "Reach 300 minutes of guided speaking practice": "desc_five_hours_practiced",
    "Keep perfect attendance after at least 3 completed sessions": "desc_reliable_learner",
    "Use at least half of your active learning package": "desc_halfway_there",
  };

  const courseTitleMap = {
    "Learning package": "course_default",
  };

  function localizeSkillLabel(label) {
    const key = skillLabelMap[label];
    if (!key) return label;
    const translated = t(dict, key);
    return translated === `__${key}__` ? label : translated;
  }

  function localizeSkillSource(source) {
    const key = skillSourceMap[source];
    if (!key) return source;
    const translated = t(dict, key);
    return translated === `__${key}__` ? source : translated;
  }

  function localizeAchievementTitle(title) {
    const key = achievementTitleMap[title];
    if (!key) return title;
    const translated = t(dict, key);
    return translated === `__${key}__` ? title : translated;
  }

  function localizeAchievementDescription(description) {
    const normalized = description?.replace(/\.$/, "");
    const key = achievementDescMap[description] || achievementDescMap[normalized];
    if (!key) return description;
    const translated = t(dict, key);
    return translated === `__${key}__` ? description : translated;
  }

  function localizeCourseTitle(title) {
    const key = courseTitleMap[title];
    if (!key) return title;
    const translated = t(dict, key);
    return translated === `__${key}__` ? title : translated;
  }

  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState("");

  const numberFormat = useMemo(
    () => new Intl.NumberFormat(getIntlLocale(locale)),
    [locale]
  );

  useEffect(() => {
    if (checking) return;
    if (!user) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError("");
        const { data } = await api.get("/me/progress");
        if (!cancelled) setProgress(data);
      } catch (err) {
        if (cancelled) return;
        console.error("Failed to load progress", err);
        setError(err?.response?.data?.error || genericError);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [checking, user, genericError]);

  if (checking || loading) {
    return (
      <ProgressState
        title={copy(dict, "page_title", "Your speaking journey")}
        text={copy(dict, "subtitle_loading", "Loading your progress...")}
        dict={dict}
      />
    );
  }

  if (!user) {
    return (
      <ProgressState
        title={copy(dict, "page_title", "Your speaking journey")}
        text={copy(
          dict,
          "subtitle_not_logged_in",
          "You need to be logged in to view this page."
        )}
        dict={dict}
      />
    );
  }

  if (error) {
    return (
      <ProgressState
        title={copy(dict, "page_title", "Your speaking journey")}
        text={copy(dict, "subtitle_error", "We could not load your progress.")}
        error={error}
        actionHref={localizeHref("/dashboard", prefix)}
        actionLabel={copy(dict, "back_to_dashboard", "Back to dashboard")}
        dict={dict}
      />
    );
  }

  const summary = progress?.summary || {};
  const course = progress?.course || {};
  const nextAction = progress?.nextAction || {};
  const nextSession = progress?.nextSession || null;
  const skills = progress?.skillGrowth || [];
  const achievements = progress?.achievements || [];
  const learningPath = progress?.learningPath || [];
  const latestSession = learningPath[0] || null;
  const completedSessions = Number(summary.totalCompletedSessions || 0);
  const coursePercent = clampPercent(course.completionPercent);
  const nextActionContent = getNextActionContent(
    nextAction,
    nextSession,
    completedSessions,
    dict
  );
  const firstName = user?.name?.trim()?.split(/\s+/)[0] || "";
  const nextAchievement = achievements.find((achievement) => !achievement.earned) || achievements[0];
  const earnedAchievement = achievements.find((achievement) => achievement.earned);

  const focusItems = [];
  if (latestSession?.teacherFeedback?.futureSteps) {
    focusItems.push({
      type: "coach",
      title: latestSession.teacherFeedback.futureSteps,
      source: copy(dict, "focus_from_coach", "From your latest coach feedback"),
      href: latestSession.href,
    });
  }

  skills
    .filter((skill) => skill.key !== "course-progress")
    .slice(0, 3)
    .forEach((skill) => {
      focusItems.push({
        type: "signal",
        title: localizeSkillLabel(skill.label),
        source: localizeSkillSource(skill.source),
      });
    });

  const momentumCards = [
    {
      key: "sessions",
      value: numberFormat.format(completedSessions),
      label: copy(dict, "momentum_sessions", "Sessions completed"),
    },
    {
      key: "time",
      value: formatDuration(summary.totalMinutes || 0, dict, locale),
      label: copy(dict, "momentum_time", "Speaking time"),
    },
    {
      key: "streak",
      value: `${numberFormat.format(summary.currentStreak || 0)}${copy(dict, "unit_weeks", "w")}`,
      label: copy(dict, "momentum_streak", "Current streak"),
    },
    {
      key: "feedback",
      value: numberFormat.format(summary.feedbackReceivedCount || 0),
      label: copy(dict, "momentum_feedback", "Feedback received"),
    },
  ];

  return (
    <main className="container page-dashboard learning-journey">
      <section className="learning-journey__hero">
        <div className="learning-journey__hero-copy">
          <p className="learning-journey__eyebrow">
            {copy(dict, "journey_eyebrow", "Your next conversation")}
          </p>
          <h1>
            {firstName
              ? copy(dict, "journey_greeting_title", "{name}, this is your speaking journey", {
                  name: firstName,
                })
              : copy(dict, "page_title", "Your speaking journey")}
          </h1>
          <p className="learning-journey__hero-subtitle">
            {copy(
              dict,
              "journey_subtitle",
              "See what changed, what your coach noticed, and what to practice next."
            )}
          </p>
          <div className="learning-journey__hero-stat" aria-label={copy(dict, "momentum_sessions", "Sessions completed")}>
            <strong>{numberFormat.format(completedSessions)}</strong>
            <span>{copy(dict, "hero_sessions_label", "real conversations completed")}</span>
          </div>
        </div>

        <div className="learning-journey__hero-path">
          <div className="learning-journey__hero-path-top">
            <p>{copy(dict, "journey_path_label", "Current path")}</p>
            <span>{course.hasActivePackage ? `${coursePercent}%` : "—"}</span>
          </div>
          <h2>{localizeCourseTitle(course.title) || copy(dict, "course_default", "Learning package")}</h2>
          <p>
            {course.hasActivePackage
              ? copy(
                  dict,
                  "course_active_meta",
                  "{remaining} sessions remaining in this learning path.",
                  { remaining: numberFormat.format(course.remainingSessions || 0) }
                )
              : copy(dict, "course_empty_meta", "Choose a package to activate course progress.")}
          </p>
          <div className="learning-journey__hero-track" aria-hidden="true">
            <span style={{ width: `${course.hasActivePackage ? coursePercent : 0}%` }} />
          </div>
          <div className="learning-journey__hero-path-meta">
            <span>
              {numberFormat.format(course.usedSessions || 0)} / {numberFormat.format(course.totalSessions || 0)} {copy(dict, "sessions_used", "sessions used")}
            </span>
            {nextSession?.startAt && (
              <span>
                {copy(dict, "next_session_label", "Next")}: {formatDate(nextSession.startAt, locale, { month: "short", day: "numeric" })}
              </span>
            )}
          </div>
        </div>
      </section>

      <section className="learning-journey__next" aria-labelledby="learning-journey-next-title">
        <div className="learning-journey__next-index" aria-hidden="true">01</div>
        <div className="learning-journey__next-copy">
          <p className="learning-journey__section-kicker">
            {copy(dict, "next_step_kicker", "Next best step")}
          </p>
          <h2 id="learning-journey-next-title">{nextActionContent.label}</h2>
          <p>{nextActionContent.description}</p>
        </div>
        <Link
          href={localizeHref(nextAction.href, prefix)}
          className="learning-journey__primary-link"
        >
          {copy(dict, "next_step_cta", "Open next step")}
          <span aria-hidden="true">↗</span>
        </Link>
      </section>

      <section className="learning-journey__momentum" aria-labelledby="learning-journey-momentum-title">
        <div className="learning-journey__section-heading">
          <p className="learning-journey__section-kicker">
            {copy(dict, "momentum_kicker", "Momentum")}
          </p>
          <h2 id="learning-journey-momentum-title">
            {copy(dict, "momentum_title", "The work is adding up")}
          </h2>
        </div>
        <div className="learning-journey__momentum-grid">
          {momentumCards.map((card, index) => (
            <article className={`learning-journey__momentum-card learning-journey__momentum-card--${index + 1}`} key={card.key}>
              <strong>{card.value}</strong>
              <span>{card.label}</span>
            </article>
          ))}
        </div>
      </section>

      <div className="learning-journey__content-grid">
        <section className="learning-journey__panel learning-journey__panel--recent">
          <PanelHeader
            kicker={copy(dict, "recent_kicker", "What changed")}
            title={copy(dict, "recent_title", "Your recent coaching")}
            subtitle={copy(
              dict,
              "recent_subtitle",
              "Every completed session leaves you with something practical to carry forward."
            )}
          />
          {learningPath.length === 0 ? (
            <EmptyPanel
              title={copy(dict, "recent_empty_title", "Your first checkpoint is waiting")}
              text={copy(
                dict,
                "recent_empty_text",
                "Complete your first coaching session and this space will become your personal record of progress."
              )}
              actionHref={localizeHref(nextAction.href || "/calendar", prefix)}
              actionLabel={nextActionContent.label}
            />
          ) : (
            <div className="learning-journey__recent-list">
              {learningPath.map((item, index) => (
                <RecentSessionCard
                  key={item.id}
                  item={item}
                  index={index}
                  locale={locale}
                  prefix={prefix}
                  dict={dict}
                />
              ))}
            </div>
          )}
        </section>

        <aside className="learning-journey__sidebar">
          <section className="learning-journey__panel learning-journey__panel--focus">
            <PanelHeader
              kicker={copy(dict, "focus_kicker", "Practice focus")}
              title={copy(dict, "focus_title", "What to work on next")}
              subtitle={copy(
                dict,
                "focus_subtitle",
                "Small, specific focus beats trying to improve everything at once."
              )}
            />
            {focusItems.length === 0 ? (
              <EmptyPanel
                title={copy(dict, "focus_empty_title", "Your focus will appear here")}
                text={copy(
                  dict,
                  "focus_empty_text",
                  "Complete a session to reveal your first practice signal."
                )}
              />
            ) : (
              <div className="learning-journey__focus-list">
                {focusItems.slice(0, 4).map((item, index) => (
                  <FocusCard key={`${item.type}-${item.title}-${index}`} item={item} index={index} prefix={prefix} />
                ))}
              </div>
            )}
          </section>

          <section className="learning-journey__panel learning-journey__panel--milestones">
            <PanelHeader
              kicker={copy(dict, "milestones_kicker", "Milestones")}
              title={copy(dict, "milestones_title", "Moments worth noticing")}
            />
            <div className="learning-journey__milestone-list">
              {nextAchievement && (
                <MilestoneCard
                  achievement={nextAchievement}
                  title={localizeAchievementTitle(nextAchievement.title)}
                  description={localizeAchievementDescription(nextAchievement.description)}
                  numberFormat={numberFormat}
                  dict={dict}
                  isNext={!nextAchievement.earned}
                />
              )}
              {earnedAchievement && earnedAchievement.key !== nextAchievement?.key && (
                <MilestoneCard
                  achievement={earnedAchievement}
                  title={localizeAchievementTitle(earnedAchievement.title)}
                  description={localizeAchievementDescription(earnedAchievement.description)}
                  numberFormat={numberFormat}
                  dict={dict}
                  isNext={false}
                />
              )}
            </div>
          </section>
        </aside>
      </div>

      <footer className="learning-journey__footer">
        <Link href={localizeHref("/dashboard", prefix)} className="learning-journey__back-link">
          <span aria-hidden="true">←</span>
          {copy(dict, "back_to_dashboard", "Back to dashboard")}
        </Link>
      </footer>
    </main>
  );
}

function ProgressState({ title, text, error, actionHref, actionLabel, dict }) {
  return (
    <main className="container page-dashboard learning-journey learning-journey--state">
      <section className="learning-journey__state-card">
        <p className="learning-journey__eyebrow">{copy(dict, "progress_label", "Progress")}</p>
        <h1>{title}</h1>
        <p>{text}</p>
        {error && <div className="learning-journey__error">{error}</div>}
        {actionHref && (
          <Link href={actionHref} className="learning-journey__secondary-link">
            {actionLabel}
          </Link>
        )}
      </section>
    </main>
  );
}

function PanelHeader({ kicker, title, subtitle }) {
  return (
    <header className="learning-journey__panel-header">
      {kicker && <p className="learning-journey__section-kicker">{kicker}</p>}
      <h2>{title}</h2>
      {subtitle && <p>{subtitle}</p>}
    </header>
  );
}

function RecentSessionCard({ item, index, locale, prefix, dict }) {
  const dateLabel = formatDate(item.startAt, locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const note =
    item.teacherFeedback?.futureSteps ||
    item.teacherFeedback?.messageToLearner ||
    item.teacherFeedback?.commentsOnSession;

  return (
    <article className="learning-journey__session-card">
      <div className="learning-journey__session-index" aria-hidden="true">
        <span>{String(index + 1).padStart(2, "0")}</span>
      </div>
      <div className="learning-journey__session-main">
        <div className="learning-journey__session-heading">
          <div>
            <p className="learning-journey__session-date">{dateLabel}</p>
            <h3>{item.title}</h3>
            <p className="learning-journey__session-meta">
              {item.teacherName
                ? `${copy(dict, "with_coach", "with")} ${item.teacherName} · `
                : ""}
              {formatDuration(item.durationMinutes, dict, locale)}
            </p>
          </div>
          <Link href={localizeHref(item.href, prefix)} className="learning-journey__text-link">
            {copy(dict, "view_session", "Open session")}
            <span aria-hidden="true">↗</span>
          </Link>
        </div>

        <div className="learning-journey__session-tags">
          <span className={item.hasTeacherFeedback ? "is-positive" : ""}>
            {item.hasTeacherFeedback
              ? copy(dict, "feedback_received", "Feedback received")
              : copy(dict, "feedback_pending", "Feedback pending")}
          </span>
          <span>{numberLabel(item.materialsCount || 0, dict, "materials_label", locale)}</span>
          {item.learnerRating && (
            <span>
              {copy(dict, "rating_label", "Rating")} {item.learnerRating}/5
            </span>
          )}
        </div>

        {note && (
          <div className="learning-journey__coach-note">
            <span>{copy(dict, "coach_note_label", "Coach note")}</span>
            <p>{note}</p>
          </div>
        )}
      </div>
    </article>
  );
}

function numberLabel(value, dict, key, locale) {
  return `${formatNumber(value, locale)} ${copy(dict, key, "materials")}`;
}

function FocusCard({ item, index, prefix }) {
  const content = (
    <>
      <span className="learning-journey__focus-number">{String(index + 1).padStart(2, "0")}</span>
      <span className="learning-journey__focus-copy">
        <strong>{item.title}</strong>
        <small>{item.source}</small>
      </span>
      {item.href && <span className="learning-journey__focus-arrow" aria-hidden="true">↗</span>}
    </>
  );

  if (item.href) {
    return (
      <Link href={localizeHref(item.href, prefix)} className="learning-journey__focus-card">
        {content}
      </Link>
    );
  }

  return <div className="learning-journey__focus-card">{content}</div>;
}

function MilestoneCard({ achievement, title, description, numberFormat, dict, isNext }) {
  const progress = Number(achievement.progress || 0);
  const target = Number(achievement.target || 1);
  const percent = target > 0 ? clampPercent((progress / target) * 100) : 0;

  return (
    <article className={`learning-journey__milestone-card ${achievement.earned ? "is-earned" : ""}`}>
      <div className="learning-journey__milestone-top">
        <span className="learning-journey__milestone-status">
          {achievement.earned
            ? copy(dict, "achievement_done", "Done")
            : isNext
              ? copy(dict, "milestone_next", "Up next")
              : `${percent}%`}
        </span>
        <span className="learning-journey__milestone-count">
          {numberFormat.format(Math.min(progress, target))}/{numberFormat.format(target)}
        </span>
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      <div className="learning-journey__milestone-track" aria-hidden="true">
        <span style={{ width: `${percent}%` }} />
      </div>
    </article>
  );
}

function EmptyPanel({ title, text, actionHref, actionLabel }) {
  return (
    <div className="learning-journey__empty">
      <h3>{title}</h3>
      <p>{text}</p>
      {actionHref && (
        <Link href={actionHref} className="learning-journey__secondary-link">
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
