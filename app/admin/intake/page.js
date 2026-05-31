"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  BookOpenText,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Eye,
  FileText,
  Filter,
  Inbox,
  Loader2,
  RefreshCw,
  Save,
  Search,
  UserRound,
  X,
} from "lucide-react";
import api from "@/lib/api";
import { buildPlacementReview } from "@/lib/placementReview";
import useAuth from "@/hooks/useAuth";
import { useToast } from "@/components/ToastProvider";
import "@/styles/admin.scss";
import "@/styles/admin-intake.scss";
import AdminAccessFallback from "../components/AdminAccessFallback";

const PAGE_SIZE = 25;
const CEFR_LEVELS = [
  "",
  "A1",
  "A1.1",
  "A1.2",
  "A2",
  "A2.1",
  "A2.2",
  "B1",
  "B1.1",
  "B1.2",
  "B2",
  "B2.1",
  "B2.2",
  "C1",
  "C1.1",
  "C1.2",
  "C2",
  "C2.1",
  "C2.2",
];

const FILTERS = [
  { value: "all", label: "All learners", icon: Inbox },
  { value: "needs_review", label: "Needs review", icon: AlertTriangle },
  { value: "missing_onboarding", label: "Missing onboarding", icon: ClipboardCheck },
  { value: "missing_assessment", label: "Missing assessment", icon: FileText },
  { value: "reviewed", label: "Reviewed", icon: CheckCircle2 },
];

const ONBOARDING_SECTIONS = [
  {
    title: "Profile and logistics",
    icon: UserRound,
    fields: [
      ["timezone", "Timezone"],
      ["availability", "Availability"],
      ["preferredFormat", "Preferred format"],
      ["usageFrequency", "Practice frequency"],
      ["usageContexts", "Usage contexts"],
      ["notes", "Admin notes"],
    ],
  },
  {
    title: "Goals and context",
    icon: ClipboardCheck,
    fields: [
      ["goals", "Goals"],
      ["context", "Context"],
      ["levelSelfEval", "Self-rated level"],
      ["motivations", "Motivations"],
      ["motivationOther", "Other motivation"],
      ["examDetails", "Exam details"],
    ],
  },
  {
    title: "Needs analysis",
    icon: BookOpenText,
    fields: [
      ["skillPriority", "Skill priority"],
      ["challenges", "Challenges"],
      ["learningStyles", "Learning style"],
      ["confidence", "Confidence"],
      ["writingSample", "Writing sample"],
      ["consentRecording", "Recording consent"],
    ],
  },
];

const ONBOARDING_FIELD_KEYS = new Set(
  ONBOARDING_SECTIONS.flatMap((section) => section.fields.map(([key]) => key))
);

function fmtDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getInitials(user) {
  const name = user?.name || "";
  if (name.trim()) {
    return name
      .trim()
      .split(/\s+/)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }
  return String(user?.email || "??").slice(0, 2).toUpperCase();
}

function statusLabel(value) {
  if (!value) return "Missing";
  return String(value)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function assessmentTone(status) {
  if (!status) return "missing";
  if (status === "reviewed") return "reviewed";
  if (status === "auto_scored") return "auto";
  return "pending";
}

function scoreLabel(score) {
  return typeof score === "number" ? `${score}/100` : "-";
}

function isEmpty(value) {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") return Object.keys(value).length === 0;
  return false;
}

function renderAnswerValue(value) {
  if (isEmpty(value)) return <span className="adm-intake-muted">Not provided</span>;

  if (Array.isArray(value)) {
    return (
      <div className="adm-intake-chips">
        {value.map((item) => (
          <span className="adm-intake-chip" key={String(item)}>
            {String(item)}
          </span>
        ))}
      </div>
    );
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (typeof value === "object") {
    return (
      <div className="adm-intake-object-grid">
        {Object.entries(value).map(([key, item]) => (
          <div className="adm-intake-object-row" key={key}>
            <span>{key}</span>
            <strong>{String(item)}</strong>
          </div>
        ))}
      </div>
    );
  }

  return String(value);
}

function IntakeField({ label, value }) {
  return (
    <div className="adm-intake-field">
      <span className="adm-intake-field__label">{label}</span>
      <div className="adm-intake-field__value">{renderAnswerValue(value)}</div>
    </div>
  );
}

function OnboardingSection({ section, answers }) {
  const Icon = section.icon;
  return (
    <section className="adm-intake-answer-section">
      <div className="adm-intake-answer-section__header">
        <Icon size={18} aria-hidden="true" />
        <h3>{section.title}</h3>
      </div>
      <div className="adm-intake-fields">
        {section.fields.map(([key, label]) => (
          <IntakeField key={key} label={label} value={answers?.[key]} />
        ))}
      </div>
    </section>
  );
}

function AdditionalOnboardingFields({ answers }) {
  const entries = Object.entries(answers || {}).filter(
    ([key]) => !ONBOARDING_FIELD_KEYS.has(key)
  );

  if (entries.length === 0) return null;

  return (
    <section className="adm-intake-answer-section">
      <div className="adm-intake-answer-section__header">
        <ClipboardCheck size={18} aria-hidden="true" />
        <h3>Additional captured fields</h3>
      </div>
      <div className="adm-intake-fields">
        {entries.map(([key, value]) => (
          <IntakeField key={key} label={key} value={value} />
        ))}
      </div>
    </section>
  );
}

function StatCard({ icon: Icon, label, value, tone = "neutral" }) {
  return (
    <div className={`adm-intake-stat adm-intake-stat--${tone}`}>
      <div className="adm-intake-stat__icon">
        <Icon size={20} aria-hidden="true" />
      </div>
      <div>
        <strong>{value ?? 0}</strong>
        <span>{label}</span>
      </div>
    </div>
  );
}

function formatPercent(value) {
  return typeof value === "number" ? `${value}%` : "-";
}

function formatSeconds(value) {
  const seconds = Number(value || 0);
  const mins = Math.floor(seconds / 60);
  const secs = String(seconds % 60).padStart(2, "0");
  return `${mins}:${secs}`;
}

function PlacementQuestion({ question, index }) {
  return (
    <article className="adm-placement-question">
      <div className="adm-placement-question__header">
        <span>{index + 1}</span>
        <div>
          {question.level && <small>{question.level}</small>}
          <h4>{question.prompt}</h4>
        </div>
        <strong className={question.isCorrect ? "is-correct" : "is-wrong"}>
          {question.wasAnswered
            ? question.isCorrect
              ? "Correct"
              : "Incorrect"
            : "Missing"}
        </strong>
      </div>
      <div className="adm-placement-options">
        {question.options.map((option, optionIndex) => {
          const selected = optionIndex === question.selectedIndex;
          const correct = optionIndex === question.answer;
          return (
            <div
              className={`adm-placement-option ${selected ? "is-selected" : ""} ${
                correct ? "is-correct" : ""
              }`}
              key={`${question.id}-${option}`}
            >
              <span>{String.fromCharCode(65 + optionIndex)}</span>
              <p>{option}</p>
              {selected && <em>Learner</em>}
              {correct && <em>Correct</em>}
            </div>
          );
        })}
      </div>
    </article>
  );
}

function PlacementQuestionGroup({ title, subtitle, summary, questions, text, audioSrc }) {
  return (
    <section className="adm-placement-group">
      <div className="adm-placement-group__header">
        <div>
          <h3>{title}</h3>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {summary && (
          <span>
            {summary.correct}/{summary.total} correct
          </span>
        )}
      </div>
      {text && <p className="adm-placement-passage">{text}</p>}
      {audioSrc && (
        <audio className="adm-placement-audio" controls preload="metadata" src={audioSrc}>
          Your browser does not support embedded audio.
        </audio>
      )}
      <div className="adm-placement-question-stack">
        {questions.map((question, index) => (
          <PlacementQuestion question={question} index={index} key={question.id} />
        ))}
      </div>
    </section>
  );
}

function PlacementSectionScores({ result }) {
  const sectionScores = result?.sectionScores || {};
  const raw = result?.raw || {};

  return (
    <div className="adm-placement-score-grid">
      {Object.entries(sectionScores).map(([name, value]) => (
        <div key={name}>
          <span>{name}</span>
          <strong>{formatPercent(value)}</strong>
        </div>
      ))}
      {raw?.writing?.metrics &&
        Object.entries(raw.writing.metrics).map(([name, value]) => (
          <div key={`metric-${name}`}>
            <span>{name.replace(/([A-Z])/g, " $1")}</span>
            <strong>{String(value)}</strong>
          </div>
        ))}
    </div>
  );
}

function PlacementFullAttempt({ assessment, review }) {
  if (!review?.hasFullAttempt) {
    return (
      <div className="adm-intake-alert">
        <AlertTriangle size={18} aria-hidden="true" />
        This legacy assessment does not include the saved MCQ, reading,
        listening, or speaking answer payload. Only stored result fields and
        writing text are available.
      </div>
    );
  }

  return (
    <div className="adm-placement-full">
      <section className="adm-placement-group adm-placement-group--result">
        <div className="adm-placement-group__header">
          <div>
            <h3>Complete placement result</h3>
            <p>
              Version {review.placementVersion || "unknown"} - Completed{" "}
              {fmtDate(review.completedAt)}
            </p>
          </div>
          <span>{assessment.cefr || review.placementResult?.band?.level || "No CEFR"}</span>
        </div>
        <PlacementSectionScores result={review.placementResult} />
      </section>

      <PlacementQuestionGroup
        title="Section 1: Language use"
        subtitle="Grammar, vocabulary, structure, and precision from A1 to C2."
        summary={review.languageUse.summary}
        questions={review.languageUse.questions}
      />

      <section className="adm-placement-section-set">
        <div className="adm-placement-section-set__title">
          <h3>Section 2: Reading</h3>
          <p>Every passage, question, learner answer, and correct answer.</p>
        </div>
        {review.readingGroups.map((group) => (
          <PlacementQuestionGroup
            key={group.id}
            title={group.title}
            text={group.text}
            summary={group.summary}
            questions={group.questions}
          />
        ))}
      </section>

      <section className="adm-placement-section-set">
        <div className="adm-placement-section-set__title">
          <h3>Section 3: Listening</h3>
          <p>Audio task, source note, learner answer, and correct answer.</p>
        </div>
        {review.listeningGroups.map((group) => (
          <PlacementQuestionGroup
            key={group.id}
            title={group.title}
            subtitle={`${group.sourceNote} - ${group.duration}`}
            audioSrc={group.audioSrc}
            summary={group.summary}
            questions={group.questions}
          />
        ))}
      </section>

      <section className="adm-placement-group">
        <div className="adm-placement-group__header">
          <div>
            <h3>Section 4: Speaking self-check</h3>
            <p>{review.speaking.prompt}</p>
          </div>
          <span>{formatSeconds(review.speaking.seconds)}</span>
        </div>
        <div className="adm-placement-speaking-list">
          {review.speaking.checks.map((check) => (
            <div key={check.id}>
              <span>{check.label}</span>
              <strong>{check.selectedOption || "Not answered"}</strong>
              {check.selectedIndex !== null && <em>Level {check.selectedIndex + 1}/6</em>}
            </div>
          ))}
        </div>
      </section>

      <section className="adm-placement-group">
        <div className="adm-placement-group__header">
          <div>
            <h3>Section 5: Writing</h3>
            <p>{review.writing.prompt}</p>
          </div>
          <span>{assessment.wordCount || 0} words</span>
        </div>
        <pre className="adm-intake-writing-sample">
          {assessment.text || "No assessment text saved."}
        </pre>
      </section>
    </div>
  );
}

export default function AdminIntakePage() {
  const { user, checking } = useAuth();
  const isAdmin = user?.role === "admin";
  const { toast } = useToast();
  const pathname = usePathname();
  const prefix = pathname?.startsWith("/ar") ? "/ar" : "";

  const [q, setQ] = useState("");
  const [qDebounced, setQDebounced] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(0);
  const [focusedUserId, setFocusedUserId] = useState(null);

  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({});
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [activeUserId, setActiveUserId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeOnboardingId, setActiveOnboardingId] = useState(null);
  const [activeAssessmentId, setActiveAssessmentId] = useState(null);
  const [reviewDraft, setReviewDraft] = useState({
    score: "",
    cefr: "",
    feedback: "",
  });
  const [savingReview, setSavingReview] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setQDebounced(q.trim()), 250);
    return () => clearTimeout(timer);
  }, [q]);

  useEffect(() => {
    setPage(0);
  }, [qDebounced, status, focusedUserId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const userId = Number(params.get("userId"));
    if (Number.isInteger(userId) && userId > 0) {
      setFocusedUserId(userId);
      setActiveUserId(userId);
    }
  }, []);

  const listParams = useMemo(() => {
    const params = {
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
      status,
    };
    if (qDebounced) params.q = qDebounced;
    if (focusedUserId) params.userId = focusedUserId;
    return params;
  }, [focusedUserId, page, qDebounced, status]);

  const loadList = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/admin/intake", {
        params: { ...listParams, t: Date.now() },
      });
      setItems(Array.isArray(data?.items) ? data.items : []);
      setSummary(data?.summary || {});
      setTotal(Number(data?.total) || 0);
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to load learner intake");
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, listParams]);

  const loadDetail = useCallback(async (userId) => {
    if (!userId) return;
    setDetailLoading(true);
    setActiveUserId(userId);
    try {
      const { data } = await api.get(`/admin/users/${userId}/intake`, {
        params: { t: Date.now() },
      });
      setDetail(data || null);
      const latestOnboarding = data?.latestOnboarding || null;
      const latestAssessment = data?.latestAssessment || null;
      setActiveOnboardingId(latestOnboarding?.id || null);
      setActiveAssessmentId(latestAssessment?.id || null);
      setReviewDraft({
        score:
          typeof latestAssessment?.score === "number"
            ? String(latestAssessment.score)
            : "",
        cefr: latestAssessment?.cefr || "",
        feedback: latestAssessment?.feedback || "",
      });
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to load learner intake");
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  useEffect(() => {
    if (activeUserId && isAdmin) {
      loadDetail(activeUserId);
    }
  }, [activeUserId, isAdmin, loadDetail]);

  function openLearner(userId) {
    if (activeUserId === userId) {
      loadDetail(userId);
      return;
    }
    setActiveUserId(userId);
  }

  const activeAssessment = useMemo(() => {
    const assessments = Array.isArray(detail?.assessments) ? detail.assessments : [];
    return assessments.find((item) => item.id === activeAssessmentId) || assessments[0] || null;
  }, [activeAssessmentId, detail]);

  const activeOnboarding = useMemo(() => {
    const forms = Array.isArray(detail?.onboardingForms) ? detail.onboardingForms : [];
    return forms.find((item) => item.id === activeOnboardingId) || forms[0] || null;
  }, [activeOnboardingId, detail]);

  const placementReview = useMemo(() => {
    if (!activeAssessment) return null;
    return buildPlacementReview(activeAssessment.reviewMeta);
  }, [activeAssessment]);

  useEffect(() => {
    setReviewDraft({
      score:
        typeof activeAssessment?.score === "number"
          ? String(activeAssessment.score)
          : "",
      cefr: activeAssessment?.cefr || "",
      feedback: activeAssessment?.feedback || "",
    });
  }, [activeAssessment]);

  async function saveReview(event) {
    event.preventDefault();
    if (!activeAssessment?.id) return;

    const score =
      reviewDraft.score === "" || reviewDraft.score === null
        ? null
        : Number(reviewDraft.score);

    if (score !== null && (!Number.isInteger(score) || score < 0 || score > 100)) {
      toast.error("Score must be a whole number from 0 to 100");
      return;
    }

    setSavingReview(true);
    try {
      await api.post(`/admin/assessments/${activeAssessment.id}/review`, {
        score,
        cefr: reviewDraft.cefr || null,
        feedback: reviewDraft.feedback.trim() || null,
        meta: {
          ...(activeAssessment.reviewMeta &&
          typeof activeAssessment.reviewMeta === "object" &&
          !Array.isArray(activeAssessment.reviewMeta)
            ? activeAssessment.reviewMeta
            : {}),
          adminReview: {
            source: "admin_intake",
            reviewedAt: new Date().toISOString(),
          },
        },
      });
      toast.success("Assessment review saved");
      await Promise.all([loadList(), loadDetail(detail.user.id)]);
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to save review");
    } finally {
      setSavingReview(false);
    }
  }

  function clearFocusedLearner() {
    setFocusedUserId(null);
    if (typeof window !== "undefined") {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const activeOnboardingAnswers = activeOnboarding?.answers || {};

  if (checking || !isAdmin) {
    return <AdminAccessFallback checking={checking} isAdmin={isAdmin} />;
  }

  return (
    <main className="adm-admin-modern adm-intake-page">
      <header className="adm-intake-hero">
        <div className="adm-intake-hero__nav">
          <Link href={`${prefix}/admin`} className="adm-btn-secondary adm-btn-secondary--compact">
            <ArrowLeft size={16} aria-hidden="true" />
            Admin
          </Link>
        </div>
        <div className="adm-intake-hero__content">
          <div>
            <span className="adm-intake-kicker">Learner operations</span>
            <h1>Intake and Assessments</h1>
            <p>
              Review onboarding briefs, assess writing samples, and keep learner
              readiness visible before sessions are scheduled.
            </p>
          </div>
          <button
            type="button"
            className="adm-btn-primary"
            onClick={loadList}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="adm-spin" size={16} aria-hidden="true" />
            ) : (
              <RefreshCw size={16} aria-hidden="true" />
            )}
            Refresh
          </button>
        </div>
      </header>

      <section className="adm-intake-stats" aria-label="Intake summary">
        <StatCard icon={UserRound} label="Learners" value={summary.learnersTotal} />
        <StatCard
          icon={ClipboardCheck}
          label="Onboarding forms"
          value={summary.onboardingFormsTotal}
          tone="teal"
        />
        <StatCard
          icon={FileText}
          label="Assessments"
          value={summary.assessmentsTotal}
          tone="amber"
        />
        <StatCard
          icon={AlertTriangle}
          label="Need review"
          value={summary.needsReviewTotal}
          tone="danger"
        />
        <StatCard
          icon={CheckCircle2}
          label="Reviewed"
          value={summary.reviewedAssessmentsTotal}
          tone="success"
        />
      </section>

      <section className="adm-intake-workspace">
        <div className="adm-intake-list">
          <div className="adm-intake-toolbar">
            <div className="adm-search-box adm-intake-search">
              <Search size={16} aria-hidden="true" />
              <input
                type="search"
                value={q}
                onChange={(event) => setQ(event.target.value)}
                placeholder="Search learner or email..."
              />
            </div>

            <div className="adm-intake-filter-strip" aria-label="Intake filters">
              {FILTERS.map((filter) => {
                const Icon = filter.icon;
                return (
                  <button
                    type="button"
                    key={filter.value}
                    className={`adm-intake-filter ${status === filter.value ? "is-active" : ""}`}
                    onClick={() => setStatus(filter.value)}
                  >
                    <Icon size={15} aria-hidden="true" />
                    {filter.label}
                  </button>
                );
              })}
            </div>

            {focusedUserId && (
              <button
                type="button"
                className="adm-intake-focused"
                onClick={clearFocusedLearner}
              >
                <Filter size={15} aria-hidden="true" />
                Learner #{focusedUserId}
                <X size={14} aria-hidden="true" />
              </button>
            )}
          </div>

          {error && (
            <div className="adm-intake-alert" role="alert">
              <AlertTriangle size={18} aria-hidden="true" />
              {error}
            </div>
          )}

          <div className="adm-data-table adm-intake-table" data-lenis-prevent>
            {loading ? (
              <div className="adm-table-skeleton">
                {Array.from({ length: 6 }).map((_, index) => (
                  <span className="skeleton skeleton--row" key={index} />
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="adm-empty">No matching learner intake records.</div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Learner</th>
                    <th>Onboarding</th>
                    <th>Assessment</th>
                    <th>CEFR</th>
                    <th>Score</th>
                    <th>Submitted</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const learner = item.user;
                    const onboarding = item.latestOnboarding;
                    const assessment = item.latestAssessment;
                    const tone = assessmentTone(assessment?.status);
                    return (
                      <tr
                        key={learner.id}
                        className={activeUserId === learner.id ? "is-selected" : ""}
                      >
                        <td>
                          <button
                            type="button"
                            className="adm-intake-user-button"
                            onClick={() => openLearner(learner.id)}
                          >
                            <span className="adm-user-avatar">{getInitials(learner)}</span>
                            <span className="adm-user-info">
                              <span className="adm-user-name">{learner.name || "Unnamed learner"}</span>
                              <span className="adm-user-email">{learner.email}</span>
                            </span>
                          </button>
                        </td>
                        <td>
                          <span
                            className={`adm-intake-pill ${
                              onboarding ? "adm-intake-pill--success" : "adm-intake-pill--muted"
                            }`}
                          >
                            {onboarding ? "Submitted" : "Missing"}
                          </span>
                        </td>
                        <td>
                          <span className={`adm-intake-pill adm-intake-pill--${tone}`}>
                            {statusLabel(assessment?.status)}
                          </span>
                        </td>
                        <td>{assessment?.cefr || "-"}</td>
                        <td>{scoreLabel(assessment?.score)}</td>
                        <td>{fmtDate(assessment?.createdAt || onboarding?.createdAt)}</td>
                        <td>
                          <button
                            type="button"
                            className="adm-btn-secondary adm-btn-secondary--compact"
                            onClick={() => openLearner(learner.id)}
                          >
                            <Eye size={15} aria-hidden="true" />
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          <div className="adm-intake-pagination">
            <span>
              Page {page + 1} of {totalPages} - {total} learner{total === 1 ? "" : "s"}
            </span>
            <div>
              <button
                type="button"
                className="adm-btn-secondary adm-btn-secondary--compact"
                disabled={page === 0}
                onClick={() => setPage((current) => Math.max(0, current - 1))}
              >
                Previous
              </button>
              <button
                type="button"
                className="adm-btn-secondary adm-btn-secondary--compact"
                disabled={page + 1 >= totalPages}
                onClick={() => setPage((current) => Math.min(totalPages - 1, current + 1))}
              >
                Next
              </button>
            </div>
          </div>
        </div>

        <aside className="adm-intake-detail" aria-label="Learner intake detail">
          {detailLoading ? (
            <div className="adm-intake-detail__loading">
              <Loader2 className="adm-spin" size={24} aria-hidden="true" />
              Loading learner intake...
            </div>
          ) : !detail ? (
            <div className="adm-intake-detail__empty">
              <ClipboardCheck size={32} aria-hidden="true" />
              <h2>Select a learner</h2>
              <p>Open a row to see onboarding answers and assessment review tools.</p>
            </div>
          ) : (
            <>
              <div className="adm-intake-detail__header">
                <div className="adm-intake-detail__identity">
                  <span className="adm-user-avatar adm-user-avatar--large">
                    {getInitials(detail.user)}
                  </span>
                  <div>
                    <h2>{detail.user.name || "Unnamed learner"}</h2>
                    <p>{detail.user.email}</p>
                    <span>{detail.user.timezone || "No timezone saved"}</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="adm-btn-close"
                  onClick={() => {
                    setDetail(null);
                    setActiveUserId(null);
                    setActiveOnboardingId(null);
                    setActiveAssessmentId(null);
                  }}
                  aria-label="Close detail"
                >
                  <X size={16} aria-hidden="true" />
                </button>
              </div>

              <div className="adm-intake-detail__meta">
                <span>
                  <Clock3 size={14} aria-hidden="true" />
                  Joined {fmtDate(detail.user.createdAt)}
                </span>
                <span>
                  <ClipboardCheck size={14} aria-hidden="true" />
                  {detail.onboardingForms?.length || 0} onboarding
                </span>
                <span>
                  <FileText size={14} aria-hidden="true" />
                  {detail.assessments?.length || 0} assessment
                </span>
              </div>

              <div className="adm-intake-detail__grid">
                <section className="adm-intake-panel">
                  <div className="adm-intake-panel__header">
                    <div>
                      <span className="adm-intake-kicker">Onboarding brief</span>
                      <h2>Complete needs profile</h2>
                    </div>
                    <span
                      className={`adm-intake-pill ${
                        activeOnboarding
                          ? "adm-intake-pill--success"
                          : "adm-intake-pill--muted"
                      }`}
                    >
                      {activeOnboarding ? "Submitted" : "Missing"}
                    </span>
                  </div>

                  {activeOnboarding ? (
                    <div className="adm-intake-answer-stack">
                      {detail.onboardingForms?.length > 1 && (
                        <div className="adm-intake-history" aria-label="Onboarding history">
                          {detail.onboardingForms.map((form) => (
                            <button
                              type="button"
                              key={form.id}
                              className={form.id === activeOnboarding.id ? "is-active" : ""}
                              onClick={() => setActiveOnboardingId(form.id)}
                            >
                              Form #{form.id}
                              <span>{fmtDate(form.createdAt)}</span>
                            </button>
                          ))}
                        </div>
                      )}

                      {ONBOARDING_SECTIONS.map((section) => (
                        <OnboardingSection
                          key={section.title}
                          section={section}
                          answers={activeOnboardingAnswers}
                        />
                      ))}
                      <AdditionalOnboardingFields answers={activeOnboardingAnswers} />
                    </div>
                  ) : (
                    <div className="adm-empty">No onboarding form has been submitted.</div>
                  )}
                </section>

                <section className="adm-intake-panel">
                  <div className="adm-intake-panel__header">
                    <div>
                      <span className="adm-intake-kicker">Assessment</span>
                      <h2>Full assessment review</h2>
                    </div>
                    <span className={`adm-intake-pill adm-intake-pill--${assessmentTone(activeAssessment?.status)}`}>
                      {statusLabel(activeAssessment?.status)}
                    </span>
                  </div>

                  {activeAssessment ? (
                    <>
                      {detail.assessments?.length > 1 && (
                        <div className="adm-intake-history" aria-label="Assessment history">
                          {detail.assessments.map((assessment) => (
                            <button
                              type="button"
                              key={assessment.id}
                              className={assessment.id === activeAssessment.id ? "is-active" : ""}
                              onClick={() => setActiveAssessmentId(assessment.id)}
                            >
                              #{assessment.id}
                              <span>{fmtDate(assessment.createdAt)}</span>
                            </button>
                          ))}
                        </div>
                      )}

                      <div className="adm-intake-assessment-summary">
                        <span>{activeAssessment.wordCount || 0} words</span>
                        <span>{activeAssessment.cefr || "No CEFR"}</span>
                        <span>{scoreLabel(activeAssessment.score)}</span>
                      </div>

                      <PlacementFullAttempt
                        assessment={activeAssessment}
                        review={placementReview}
                      />

                      <form className="adm-intake-review-form" onSubmit={saveReview}>
                        <div className="adm-form-grid adm-form-grid--compact">
                          <label className="adm-form-field">
                            <span className="adm-form-label">CEFR</span>
                            <select
                              className="adm-filter-select"
                              value={reviewDraft.cefr}
                              onChange={(event) =>
                                setReviewDraft((draft) => ({
                                  ...draft,
                                  cefr: event.target.value,
                                }))
                              }
                            >
                              {CEFR_LEVELS.map((level) => (
                                <option key={level || "none"} value={level}>
                                  {level || "No level"}
                                </option>
                              ))}
                            </select>
                          </label>

                          <label className="adm-form-field">
                            <span className="adm-form-label">Score</span>
                            <input
                              className="adm-form-input"
                              type="number"
                              min="0"
                              max="100"
                              step="1"
                              value={reviewDraft.score}
                              onChange={(event) =>
                                setReviewDraft((draft) => ({
                                  ...draft,
                                  score: event.target.value,
                                }))
                              }
                              placeholder="0-100"
                            />
                          </label>

                          <label className="adm-form-field adm-form-field--full">
                            <span className="adm-form-label">Feedback</span>
                            <textarea
                              className="adm-form-textarea"
                              value={reviewDraft.feedback}
                              onChange={(event) =>
                                setReviewDraft((draft) => ({
                                  ...draft,
                                  feedback: event.target.value,
                                }))
                              }
                              placeholder="Feedback for the learner or internal placement notes"
                            />
                          </label>
                        </div>

                        <button
                          type="submit"
                          className="adm-btn-primary"
                          disabled={savingReview}
                        >
                          {savingReview ? (
                            <Loader2 className="adm-spin" size={16} aria-hidden="true" />
                          ) : (
                            <Save size={16} aria-hidden="true" />
                          )}
                          Save review
                        </button>
                      </form>
                    </>
                  ) : (
                    <div className="adm-empty">No assessment has been submitted.</div>
                  )}
                </section>
              </div>
            </>
          )}
        </aside>
      </section>
    </main>
  );
}
