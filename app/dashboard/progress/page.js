// app/dashboard/progress/page.js
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import api from "@/lib/api";
import useAuth from "@/hooks/useAuth";
import "@/styles/progress-page.scss";
import { getDictionary, t } from "@/app/i18n";

function copy(dict, key, fallback, vars) {
  const value = t(dict, key, vars);
  return value === `__${key}__` ? fallback : value;
}

function clampPercent(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(100, Math.round(numeric)));
}

function formatDuration(minutes, dict) {
  const total = Math.max(0, Math.round(Number(minutes || 0)));
  const minLabel = copy(dict, "unit_minutes", "min");
  const hLabel = copy(dict, "unit_hours", "h");
  if (total < 60) return `${total} ${minLabel}`;
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  if (mins > 0) {
    const hmTemplate = copy(dict, "unit_hours_minutes", "{hours}h {mins}m");
    return hmTemplate.replace("{hours}", hours).replace("{mins}", mins);
  }
  return `${hours} ${hLabel}`;
}

function formatDate(value, locale, options) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US", options);
}

function formatMonthLabel(month, locale) {
  if (!month || !month.includes("-")) return month || "";
  const [year, monthIndex] = month.split("-").map(Number);
  if (!year || !monthIndex) return month;
  return new Date(year, monthIndex - 1, 1).toLocaleDateString(
    locale === "ar" ? "ar-EG" : "en-US",
    { month: "short" }
  );
}

function localizeHref(href, prefix) {
  if (!href || href === "#") return "#";
  if (/^https?:\/\//i.test(href)) return href;
  if (!prefix || href.startsWith(prefix)) return href;
  return `${prefix}${href.startsWith("/") ? href : `/${href}`}`;
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
    "Consistency": "skill_consistency",
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

  const missionTitleMap = {
    "Start your progress timeline": "mission_start_timeline",
    "Choose your next learning package": "next_action_choose_package",
  };

  const missionDescMap = {
    "Complete your first coaching session to unlock milestones, streaks, and feedback history.": "mission_start_timeline_desc",
    "Add session credits to keep your learning path active.": "next_action_add_credits",
  };

  const courseTitleMap = {
    "Learning package": "course_default",
  };

  const milestoneLabelMap = {
    "First session completed": "first_milestone",
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

  function localizeAchievementDescription(desc) {
    const key = achievementDescMap[desc];
    if (!key) return desc;
    const translated = t(dict, key);
    return translated === `__${key}__` ? desc : translated;
  }

  function localizeMissionTitle(title) {
    const key = missionTitleMap[title];
    if (!key) return title;
    const translated = t(dict, key);
    return translated === `__${key}__` ? title : translated;
  }

  function localizeMissionDescription(desc) {
    const key = missionDescMap[desc];
    if (!key) return desc;
    const translated = t(dict, key);
    return translated === `__${key}__` ? desc : translated;
  }

  function localizeCourseTitle(title) {
    const key = courseTitleMap[title];
    if (!key) return title;
    const translated = t(dict, key);
    return translated === `__${key}__` ? title : translated;
  }

  function localizeMilestoneLabel(label) {
    const key = milestoneLabelMap[label];
    if (!key) return label;
    const translated = t(dict, key);
    return translated === `__${key}__` ? label : translated;
  }

  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState("");

  const numberFormat = useMemo(
    () => new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US", { numberingSystem: "latn" }),
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
        title={copy(dict, "page_title", "Learning progress")}
        text={copy(dict, "subtitle_loading", "Loading your progress...")}
        dict={dict}
      />
    );
  }

  if (!user) {
    return (
      <ProgressState
        title={copy(dict, "page_title", "Learning progress")}
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
        title={copy(dict, "page_title", "Learning progress")}
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
  const missions = progress?.missions || [];
  const skills = progress?.skillGrowth || [];
  const achievements = progress?.achievements || [];
  const learningPath = progress?.learningPath || [];
  const timeline = progress?.timeline || [];
  const nextMilestone = summary.nextMilestone || {};

  const coursePercent = clampPercent(course.completionPercent);
  const milestonePercent = nextMilestone.target
    ? clampPercent((Number(nextMilestone.progress || 0) / nextMilestone.target) * 100)
    : 0;

  const metricCards = [
    {
      label: copy(dict, "summary_completed_label", "Completed sessions"),
      value: numberFormat.format(summary.totalCompletedSessions || 0),
      meta: copy(
        dict,
        "metric_completed_meta",
        "{count} this month",
        { count: numberFormat.format(summary.sessionsThisMonth || 0) }
      ),
      tone: "coral",
    },
    {
      label: copy(dict, "summary_total_time_label", "Speaking time"),
      value: formatDuration(summary.totalMinutes || 0, dict),
      meta: copy(
        dict,
        "metric_minutes_meta",
        "{duration} this month",
        { duration: formatDuration(summary.minutesThisMonth || 0, dict) }
      ),
      tone: "sage",
    },
    {
      label: copy(dict, "metric_streak_label", "Learning streak"),
      value: `${numberFormat.format(summary.currentStreak || 0)}${copy(dict, "unit_weeks", "w")}`,
      meta: copy(
        dict,
        "metric_streak_meta",
        "Best streak: {count} weeks",
        { count: numberFormat.format(summary.longestStreak || 0) }
      ),
      tone: "amber",
    },
    {
      label: copy(dict, "metric_feedback_label", "Feedback loop"),
      value: numberFormat.format(summary.feedbackReceivedCount || 0),
      meta: copy(
        dict,
        "metric_feedback_meta",
        "{count} materials covered",
        { count: numberFormat.format(summary.resourcesCoveredCount || 0) }
      ),
      tone: "navy",
    },
  ];

  const maxTimelineCount = Math.max(1, ...timeline.map((item) => item.count || 0));

  return (
    <main className="container page-dashboard learning-progress">
      <section className="learning-progress__hero">
        <div className="learning-progress__hero-copy">
          <p className="learning-progress__eyebrow">
            {copy(dict, "hero_eyebrow", "Momentum dashboard")}
          </p>
          <h1>{copy(dict, "page_title", "Learning progress")}</h1>
          <p>
            {copy(
              dict,
              "subtitle_main",
              "A clear view of your learning momentum, completed sessions, feedback, and next best step."
            )}
          </p>
          {nextAction?.label && (
            <div className="learning-progress__hero-action">
              <Link
                href={localizeHref(nextAction.href, prefix)}
                className="learning-progress__primary-link"
              >
                {localizeMissionTitle(nextAction.label)}
              </Link>
              <span>{localizeMissionDescription(nextAction.description)}</span>
            </div>
          )}
        </div>

        <div
          className="learning-progress__score"
          style={{ "--ring-progress": `${coursePercent}%` }}
          aria-label={`${copy(dict, "course_progress_label", "course progress")} ${coursePercent}%`}
        >
          <div className="learning-progress__score-ring">
            <strong>{coursePercent}%</strong>
            <span>{copy(dict, "course_progress_label", "course progress")}</span>
          </div>
          <div className="learning-progress__score-meta">
            <strong>{localizeCourseTitle(course.title) || copy(dict, "course_default", "Learning package")}</strong>
            <span>
              {numberFormat.format(course.usedSessions || 0)} /{" "}
              {numberFormat.format(course.totalSessions || 0)}{" "}
              {copy(dict, "sessions_used", "sessions used")}
            </span>
          </div>
        </div>
      </section>

      <section className="learning-progress__metrics" aria-label={copy(dict, "progress_label", "Progress")}>
        {metricCards.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
      </section>

      <section className="learning-progress__course">
        <div>
          <p className="learning-progress__section-kicker">
            {copy(dict, "course_section_kicker", "Current path")}
          </p>
          <h2>{localizeCourseTitle(course.title) || copy(dict, "course_default", "Learning package")}</h2>
          <p>
            {course.hasActivePackage
              ? copy(
                  dict,
                  "course_active_meta",
                  "{remaining} sessions remaining in this learning path.",
                  { remaining: numberFormat.format(course.remainingSessions || 0) }
                )
              : copy(
                  dict,
                  "course_empty_meta",
                  "Choose a package to activate course progress."
                )}
          </p>
        </div>
        <div className="learning-progress__course-track">
          <div className="learning-progress__course-bar">
            <span style={{ width: `${coursePercent}%` }} />
          </div>
          <div className="learning-progress__milestone">
            <span>{copy(dict, "next_milestone", "Next milestone")}</span>
            <strong>{localizeMilestoneLabel(nextMilestone.label) || copy(dict, "first_milestone", "First session")}</strong>
            <div className="learning-progress__mini-bar">
              <span style={{ width: `${milestonePercent}%` }} />
            </div>
          </div>
        </div>
      </section>

      <div className="learning-progress__layout">
        <section className="learning-progress__panel learning-progress__panel--path">
          <PanelHeader
            kicker={copy(dict, "path_kicker", "Learning path")}
            title={copy(dict, "path_title", "Recent session journey")}
            subtitle={copy(
              dict,
              "path_subtitle",
              "Completed sessions become checkpoints with feedback, materials, and practice time."
            )}
          />

          {learningPath.length === 0 ? (
            <EmptyPanel
              title={copy(dict, "path_empty_title", "No completed sessions yet")}
              text={copy(
                dict,
                "path_empty_text",
                "Once your first course session is completed, this area becomes a journey timeline."
              )}
            />
          ) : (
            <div className="learning-progress__path-list">
              {learningPath.map((item, index) => (
                <JourneyItem
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

        <aside className="learning-progress__side">
          <section className="learning-progress__panel learning-progress__panel--mission">
            <PanelHeader
              kicker={copy(dict, "mission_kicker", "Next mission")}
              title={localizeMissionTitle(missions[0]?.title) || localizeMissionTitle(nextAction.label) || copy(dict, "mission_title", "Keep moving")}
              subtitle={
                localizeMissionDescription(missions[0]?.description) ||
                localizeMissionDescription(nextAction.description) ||
                copy(dict, "mission_subtitle", "Your next best action will appear here.")
              }
            />
            {nextAction?.href && (
              <Link
                href={localizeHref(nextAction.href, prefix)}
                className="learning-progress__secondary-link"
              >
                {copy(dict, "mission_cta", "Open action")}
              </Link>
            )}
            {missions.length > 1 && (
              <div className="learning-progress__mission-queue">
                {missions.slice(1).map((mission) => (
                  <Link
                    key={mission.key}
                    href={localizeHref(mission.href, prefix)}
                    className="learning-progress__queue-item"
                  >
                    <span>{mission.title}</span>
                    <small>{mission.description}</small>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="learning-progress__panel">
            <PanelHeader
              kicker={copy(dict, "skills_kicker", "Growth signals")}
              title={copy(dict, "skills_title", "Skill momentum")}
              subtitle={copy(
                dict,
                "skills_subtitle",
                "These scores use real activity now; teacher skill scoring can make them more precise later."
              )}
            />
            <div className="learning-progress__skills">
              {skills.map((skill) => (
                <SkillBar
                  key={skill.key}
                  skill={{
                    ...skill,
                    label: localizeSkillLabel(skill.label),
                    source: localizeSkillSource(skill.source),
                  }}
                />
              ))}
            </div>
          </section>

          <section className="learning-progress__panel">
            <PanelHeader
              kicker={copy(dict, "achievements_kicker", "Achievements")}
              title={copy(dict, "achievements_title", "Progress badges")}
            />
            <div className="learning-progress__badges">
              {achievements.map((achievement) => (
                <AchievementCard
                  key={achievement.key}
                  achievement={{
                    ...achievement,
                    title: localizeAchievementTitle(achievement.title),
                    description: localizeAchievementDescription(achievement.description),
                  }}
                  numberFormat={numberFormat}
                  dict={dict}
                />
              ))}
            </div>
          </section>
        </aside>
      </div>

      <section className="learning-progress__panel learning-progress__timeline-panel">
        <PanelHeader
          kicker={copy(dict, "timeline_kicker", "Activity")}
          title={copy(dict, "timeline_title", "Sessions per month")}
          subtitle={copy(
            dict,
            "timeline_subtitle_new",
            "A simple rhythm check so learners can see consistency building over time."
          )}
        />
        {timeline.length === 0 ? (
          <EmptyPanel
            title={copy(dict, "timeline_empty_title", "No activity yet")}
            text={copy(dict, "timeline_empty", "Your monthly activity will appear here.")}
          />
        ) : (
          <div className="learning-progress__chart">
            {timeline.map((item) => {
              const height = Math.max(10, Math.round((item.count / maxTimelineCount) * 100));
              return (
                <div className="learning-progress__chart-item" key={item.month}>
                  <div className="learning-progress__chart-bar">
                    <span style={{ height: `${height}%` }} />
                  </div>
                  <strong>{numberFormat.format(item.count)}</strong>
                  <small>{formatMonthLabel(item.month, locale)}</small>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <footer className="learning-progress__footer">
        <Link href={localizeHref("/dashboard", prefix)} className="btn btn--ghost">
          {copy(dict, "back_to_dashboard", "Back to dashboard")}
        </Link>
      </footer>
    </main>
  );
}

function ProgressState({ title, text, error, actionHref, actionLabel, dict }) {
  return (
    <main className="container page-dashboard learning-progress learning-progress--state">
      <section className="learning-progress__state-card">
        <p className="learning-progress__eyebrow">{copy(dict, "progress_label", "Progress")}</p>
        <h1>{title}</h1>
        <p>{text}</p>
        {error && <div className="learning-progress__error">{error}</div>}
        {actionHref && (
          <Link href={actionHref} className="learning-progress__secondary-link">
            {actionLabel}
          </Link>
        )}
      </section>
    </main>
  );
}

function PanelHeader({ kicker, title, subtitle }) {
  return (
    <header className="learning-progress__panel-header">
      {kicker && <p className="learning-progress__section-kicker">{kicker}</p>}
      <h2>{title}</h2>
      {subtitle && <p>{subtitle}</p>}
    </header>
  );
}

function MetricCard({ metric }) {
  return (
    <article className={`learning-progress__metric learning-progress__metric--${metric.tone}`}>
      <span className="learning-progress__metric-dot" />
      <p>{metric.label}</p>
      <strong>{metric.value}</strong>
      <small>{metric.meta}</small>
    </article>
  );
}

function JourneyItem({ item, index, locale, prefix, dict }) {
  const dateLabel = formatDate(item.startAt, locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <article className="learning-progress__journey-item">
      <div className="learning-progress__journey-marker">
        <span>{index + 1}</span>
      </div>
      <div className="learning-progress__journey-body">
        <div className="learning-progress__journey-top">
          <div>
            <h3>{item.title}</h3>
            <p>
              {dateLabel}
              {item.teacherName ? ` ${copy(dict, "with_coach", "with")} ${item.teacherName}` : ""}
            </p>
          </div>
          <Link href={localizeHref(item.href, prefix)}>
            {copy(dict, "path_view_session", "View")}
          </Link>
        </div>
        <div className="learning-progress__chips">
          <span>{formatDuration(item.durationMinutes, dict)}</span>
          <span>
            {item.materialsCount || 0} {copy(dict, "materials_label", "materials")}
          </span>
          <span className={item.hasTeacherFeedback ? "is-positive" : ""}>
            {item.hasTeacherFeedback
              ? copy(dict, "feedback_received", "Feedback received")
              : copy(dict, "feedback_pending", "Feedback pending")}
          </span>
          {item.learnerRating && (
            <span>
              {copy(dict, "rating_label", "Rating")} {item.learnerRating}/5
            </span>
          )}
        </div>
        {item.teacherFeedback?.futureSteps && (
          <p className="learning-progress__future-step">
            {item.teacherFeedback.futureSteps}
          </p>
        )}
      </div>
    </article>
  );
}

function SkillBar({ skill }) {
  const score = clampPercent(skill.score);
  return (
    <article className="learning-progress__skill">
      <div>
        <strong>{skill.label}</strong>
        <span>{score}%</span>
      </div>
      <div className="learning-progress__skill-track">
        <span style={{ width: `${score}%` }} />
      </div>
      <p>{skill.source}</p>
    </article>
  );
}

function AchievementCard({ achievement, numberFormat, dict }) {
  const progress = Number(achievement.progress || 0);
  const target = Number(achievement.target || 1);
  const percent = target > 0 ? clampPercent((progress / target) * 100) : 0;

  return (
    <article
      className={`learning-progress__badge ${
        achievement.earned ? "learning-progress__badge--earned" : ""
      }`}
    >
      <span className="learning-progress__badge-status">
        {achievement.earned ? copy(dict, "achievement_done", "Done") : `${percent}%`}
      </span>
      <h3>{achievement.title}</h3>
      <p>{achievement.description}</p>
      <small>
        {numberFormat.format(Math.min(progress, target))} /{" "}
        {numberFormat.format(target)}
      </small>
    </article>
  );
}

function EmptyPanel({ title, text }) {
  return (
    <div className="learning-progress__empty">
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
