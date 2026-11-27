"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  AudioWaveform,
  BookOpen,
  Brain,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  GraduationCap,
  Loader2,
  MessageSquareText,
  Mic,
  PenLine,
  RotateCcw,
  Save,
  Sparkles,
  Square,
  Target,
  Trophy,
  Volume2,
  X,
} from "lucide-react";
import api from "@/lib/api";
import useAuth from "@/hooks/useAuth";
import { useToast } from "@/components/ToastProvider";
import { trackEvent } from "@/lib/analytics";
import { getDictionary, t } from "@/app/i18n";
import {
  getReportFromFeedback,
  normalizeFeedbackItems,
  serializeRichFeedbackComments,
} from "@/lib/feedbackReport";
import { isLink, stripMarks } from "@/lib/feedbackMarks.mjs";
import { getIntlLocale } from "@/utils/locale";
import FeedbackReportEditor, { createFeedbackRow } from "./FeedbackReportEditor";
import FeedbackReportTable, { getMistakeParts } from "./FeedbackReportTable";
import { FEEDBACK_TYPES, speakText } from "./feedbackShared";
import "@/styles/session-feedback.scss";

const spring = { type: "spring", stiffness: 420, damping: 34 };

function pluralize(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function getCounts(items) {
  return items.reduce(
    (acc, item) => {
      acc[item.type] = (acc[item.type] || 0) + 1;
      return acc;
    },
    { vocabulary: 0, grammar: 0, pronunciation: 0, note: 0 }
  );
}

function uniqueChoices(values) {
  const seen = new Set();
  return values
    .map((value) => String(value || "").trim())
    .filter((value) => {
      if (!value || seen.has(value.toLowerCase())) return false;
      seen.add(value.toLowerCase());
      return true;
    })
    .slice(0, 4);
}

function buildQuizQuestions(items) {
  const vocabulary = items.filter((item) => item.type === "vocabulary" && item.response);
  const grammar = items.filter((item) => item.type === "grammar" && item.response);
  const questions = [];

  vocabulary.forEach((target, index) => {
    const answer = stripMarks(target.response).trim();
    const choices = uniqueChoices([
      answer,
      ...vocabulary.filter((item) => item.id !== target.id).map((item) => stripMarks(item.response)),
      "A filler word used when you need more time.",
      "A phrase for ending a conversation politely.",
      "A word used only in formal writing.",
    ]);
    questions.push({
      id: `vocab-${target.id || index}`,
      type: "vocabulary",
      prompt: `What does "${stripMarks(target.prompt)}" mean in this session?`,
      answer,
      choices: rotateChoices(choices, index),
    });
  });

  grammar.forEach((target, index) => {
    const answer = stripMarks(getMistakeParts(target).correction).trim();
    const choices = uniqueChoices([answer, stripMarks(target.prompt)]);
    if (choices.length < 2) return;

    questions.push({
      id: `grammar-${target.id || index}`,
      type: "grammar",
      prompt: "Which sentence is correct?",
      answer,
      choices: rotateChoices(choices, index + vocabulary.length),
    });
  });

  return questions;
}

function rotateChoices(choices, offset) {
  if (choices.length < 2) return choices;
  const index = Math.abs(Number(offset) || 0) % choices.length;
  return [...choices.slice(index), ...choices.slice(0, index)];
}

function SessionMeta({ session, sessionDateLabel }) {
  return (
    <div className="session-report-meta">
      <span>{session?.title || "Session feedback"}</span>
      {sessionDateLabel && <span>{sessionDateLabel}</span>}
    </div>
  );
}

function LoadingState({ onBack }) {
  return (
    <div className="page-session-feedback">
      <div className="page-session-feedback__inner">
        <button onClick={onBack} className="session-report-back">
          <ArrowLeft size={16} />
          Back to session
        </button>
        <div className="session-report-state">
          <Loader2 className="session-report-spin" size={28} />
          <div>
            <h1>Loading feedback</h1>
            <p>Preparing the session report workspace.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ErrorState({ error, onBack }) {
  return (
    <div className="page-session-feedback">
      <div className="page-session-feedback__inner">
        <button onClick={onBack} className="session-report-back">
          <ArrowLeft size={16} />
          Back to session
        </button>
        <div className="session-report-state session-report-state--error">
          <CircleAlert size={28} />
          <div>
            <h1>Session not found</h1>
            <p>{error || "We could not find this session or load its feedback."}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function CoachView({
  canEdit,
  dirty,
  futureSteps,
  items,
  onChangeItems,
  onDiscardDraft,
  onSave,
  onSetFutureSteps,
  onSetSummary,
  publishState,
  published,
  restoredDraft,
  saving,
  summary,
}) {
  const filled = normalizeFeedbackItems(items);
  const counts = getCounts(filled);

  return (
    <motion.div
      key="coach-view"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -18 }}
      transition={spring}
      className="session-report-view session-report-view--coach"
    >
      <div className="fb-coach-main">
        {restoredDraft && (
          <div className="fb-draft-notice" role="status">
            <RotateCcw size={16} aria-hidden="true" />
            <span>We brought back the changes you had not published yet.</span>
            <button type="button" onClick={onDiscardDraft}>Discard them</button>
          </div>
        )}

        <FeedbackReportEditor items={items} onChangeItems={onChangeItems} canEdit={canEdit} />

        <section className="fb-comments">
          <label className="session-report-field">
            <span>General comments</span>
            <textarea
              rows={7}
              dir="auto"
              value={summary}
              onChange={(event) => onSetSummary(event.target.value)}
              disabled={!canEdit}
              placeholder="A personal message for the learner: what went well, what to practise, and one thing to try before next time."
            />
          </label>
        </section>
      </div>

      <aside className="session-report-summary-panel">
        <div className="session-report-publish-card">
          <div>
            <p className="session-report-kicker">Learner report</p>
            <h3>Ready to publish</h3>
          </div>
          <div className="session-report-publish-meter">
            <strong>{filled.length}</strong>
            <span>{filled.length === 1 ? "entry" : "entries"}</span>
          </div>
        </div>

        <ul className="fb-type-counts">
          {FEEDBACK_TYPES.map((type) => {
            const Icon = type.icon;
            return (
              <li key={type.key} className={`fb-type-counts__item fb-type-counts__item--${type.key}`}>
                <Icon size={15} aria-hidden="true" />
                <span>{type.plural}</span>
                <strong>{counts[type.key] || 0}</strong>
              </li>
            );
          })}
        </ul>

        <label className="session-report-field">
          <span>Next practice focus</span>
          <textarea
            rows={4}
            dir="auto"
            value={futureSteps}
            onChange={(event) => onSetFutureSteps(event.target.value)}
            disabled={!canEdit}
            placeholder="One focused action for the learner before the next session."
          />
        </label>

        {canEdit && (
          <>
            <motion.button
              type="button"
              className={`session-report-publish ${published ? "is-complete" : ""}`}
              onClick={onSave}
              disabled={saving}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <AnimatePresence mode="wait" initial={false}>
                {saving ? (
                  <motion.span key="saving" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
                    <Loader2 className="session-report-spin" size={18} />
                    Publishing
                  </motion.span>
                ) : published ? (
                  <motion.span key="published" initial={{ opacity: 0, scale: 0.86 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.92 }}>
                    <CheckCircle2 size={18} />
                    Published
                  </motion.span>
                ) : (
                  <motion.span key="publish" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
                    <Save size={18} />
                    Publish feedback
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
            <p className={`fb-save-state is-${publishState}`} role="status">
              {{
                dirty: "Changes not published yet. They are kept on this device until you publish.",
                published: "The learner sees the latest version.",
                draft: dirty
                  ? "Not published yet. Your work is kept on this device until you publish."
                  : "The learner sees nothing until you publish.",
              }[publishState]}
            </p>
          </>
        )}
      </aside>
    </motion.div>
  );
}

function LearnerStats({ counts }) {
  const stats = [
    {
      key: "vocabulary",
      label: "New Words",
      value: counts.vocabulary,
      icon: BookOpen,
    },
    {
      key: "grammar",
      label: "Corrections",
      value: counts.grammar,
      icon: Brain,
    },
    {
      key: "pronunciation",
      label: "Pronunciation Practices",
      value: counts.pronunciation,
      icon: AudioWaveform,
    },
  ];

  return (
    <div className="session-report-stats">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <motion.article
            key={stat.key}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: index * 0.05 }}
            className={`session-report-stat session-report-stat--${stat.key}`}
          >
            <Icon size={20} />
            <strong>{stat.value}</strong>
            <span>{stat.label}</span>
          </motion.article>
        );
      })}
    </div>
  );
}

function GeneralCommentsCard({ futureSteps, summary, notes = [] }) {
  return (
    <section className="session-report-learner-section session-report-message">
      <div className="session-report-section-title">
        <div>
          <Sparkles size={18} />
          <h2>General comments</h2>
        </div>
      </div>
      <div className="session-report-message__body">
        <GraduationCap size={24} />
        <p>{summary || "Your coach has not added a general summary yet."}</p>
      </div>
      {(futureSteps || notes.length > 0) && (
        <div className="session-report-next-grid">
          {futureSteps && (
            <div className="session-report-next-focus">
              <Target size={18} />
              <div>
                <strong>Next focus</strong>
                <p>{futureSteps}</p>
              </div>
            </div>
          )}
          {notes.map((note) => (
            <div className="session-report-next-focus" key={note.id}>
              <MessageSquareText size={18} />
              <div>
                <strong>{note.prompt}</strong>
                <p>{note.response}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function VocabularyCarousel({ items }) {
  const [index, setIndex] = useState(0);
  const [flippedId, setFlippedId] = useState(null);
  const active = items[index] || null;

  const speak = (event) => {
    event.stopPropagation();
    if (!active) return;
    speakText(`${active.prompt}. ${active.response}`);
  };

  useEffect(() => {
    setIndex((current) => Math.min(current, Math.max(items.length - 1, 0)));
  }, [items.length]);

  if (!items.length) {
    return (
      <section className="session-report-learner-section">
        <div className="session-report-section-title">
          <div>
            <BookOpen size={18} />
            <h2>Vocabulary flashcards</h2>
          </div>
        </div>
        <EmptyLearnerState label="No vocabulary entries for this report." />
      </section>
    );
  }

  return (
    <section className="session-report-learner-section">
      <div className="session-report-section-title">
        <div>
          <BookOpen size={18} />
          <h2>Vocabulary flashcards</h2>
        </div>
        <div className="session-report-carousel-actions">
          <button
            type="button"
            className="session-report-icon-button"
            onClick={() => {
              setFlippedId(null);
              setIndex((current) => (current === 0 ? items.length - 1 : current - 1));
            }}
            aria-label="Previous vocabulary card"
            title="Previous"
          >
            <ChevronLeft size={16} />
          </button>
          <span>{index + 1} / {items.length}</span>
          <button
            type="button"
            className="session-report-icon-button"
            onClick={() => {
              setFlippedId(null);
              setIndex((current) => (current + 1) % items.length);
            }}
            aria-label="Next vocabulary card"
            title="Next"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="session-report-flashcard-scene">
        <AnimatePresence mode="wait">
          <motion.button
            key={active.id}
            type="button"
            className={`session-report-flashcard ${flippedId === active.id ? "is-flipped" : ""}`}
            onClick={() => setFlippedId((current) => (current === active.id ? null : active.id))}
            initial={{ opacity: 0, x: 40, rotateY: -8 }}
            animate={{ opacity: 1, x: 0, rotateY: flippedId === active.id ? 180 : 0 }}
            exit={{ opacity: 0, x: -40, rotateY: 8 }}
            transition={spring}
            aria-label={`Review ${stripMarks(active.prompt)}`}
          >
            <span className="session-report-flashcard__face session-report-flashcard__front">
              <BookOpen size={24} />
              <strong dir="auto">{stripMarks(active.prompt)}</strong>
              <span><RotateCcw size={15} /></span>
            </span>
            <span className="session-report-flashcard__face session-report-flashcard__back">
              <p dir="auto">{stripMarks(active.response)}</p>
              <span
                className="session-report-listen"
                role="button"
                tabIndex={0}
                aria-label={`Listen to ${stripMarks(active.prompt)}`}
                onClick={speak}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") speak(event);
                }}
              >
                <Volume2 size={16} />
                Listen
              </span>
            </span>
          </motion.button>
        </AnimatePresence>
      </div>
    </section>
  );
}

function PronunciationHub({ items }) {
  const [recordingId, setRecordingId] = useState(null);
  const [recordings, setRecordings] = useState({});
  const [recordingError, setRecordingError] = useState("");
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const recordingsRef = useRef(recordings);

  useEffect(() => {
    recordingsRef.current = recordings;
  }, [recordings]);

  useEffect(() => {
    return () => {
      recorderRef.current?.stop?.();
      streamRef.current?.getTracks?.().forEach((track) => track.stop());
      Object.values(recordingsRef.current).forEach((recording) => URL.revokeObjectURL(recording.url));
    };
  }, []);

  const stopRecording = () => {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  };

  const startRecording = async (itemId) => {
    if (recordingId) return;
    setRecordingError("");
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setRecordingError("Audio recording is not supported in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      streamRef.current = stream;
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        const url = URL.createObjectURL(blob);
        setRecordings((current) => {
          if (current[itemId]?.url) URL.revokeObjectURL(current[itemId].url);
          return { ...current, [itemId]: { url } };
        });
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        recorderRef.current = null;
        setRecordingId(null);
      };
      recorder.start();
      setRecordingId(itemId);
    } catch (err) {
      setRecordingError(
        err?.name === "NotAllowedError"
          ? "Microphone access is required to record your pronunciation."
          : "Could not start recording. Try again."
      );
    }
  };

  return (
    <section className="session-report-learner-section">
      <div className="session-report-section-title">
        <div>
          <Mic size={18} />
          <h2>Pronunciation practice hub</h2>
        </div>
      </div>

      {items.length ? (
        <div className="session-report-pronunciation-grid">
          {items.map((item) => {
            const isRecording = recordingId === item.id;
            const recording = recordings[item.id];

            return (
              <motion.article
                key={item.id}
                className={`session-report-pronunciation-card ${isRecording ? "is-recording" : ""}`}
                whileHover={{ y: -4 }}
                transition={spring}
              >
                <div>
                  <span>Practice</span>
                  <strong dir="auto">{stripMarks(item.prompt)}</strong>
                  {item.response && !isLink(item.response) && <p dir="auto">{stripMarks(item.response)}</p>}
                </div>
                <button
                  type="button"
                  className="session-report-recorder"
                  onClick={() => {
                    if (isRecording) {
                      stopRecording();
                    } else {
                      void startRecording(item.id);
                    }
                  }}
                  aria-label={isRecording ? "Stop recording" : `Record ${stripMarks(item.prompt)}`}
                  title={isRecording ? "Stop" : "Record"}
                >
                  {isRecording ? <Square size={18} /> : recording ? <Check size={18} /> : <Mic size={18} />}
                </button>
                {recording && (
                  <audio className="session-report-pronunciation-audio" controls src={recording.url} />
                )}
                <div className="session-report-wave" aria-hidden>
                  {[0, 1, 2, 3, 4].map((bar) => (
                    <span key={bar} />
                  ))}
                </div>
              </motion.article>
            );
          })}
        </div>
      ) : (
        <EmptyLearnerState label="No pronunciation items for this report." />
      )}
      {recordingError && <p className="session-report-inline-error" role="alert">{recordingError}</p>}
    </section>
  );
}

function QuickReviewQuiz({ questions }) {
  const [answers, setAnswers] = useState({});

  if (!questions.length) {
    return (
      <section className="session-report-learner-section">
        <div className="session-report-section-title">
          <div>
            <Trophy size={18} />
            <h2>Quick review quiz</h2>
          </div>
        </div>
        <EmptyLearnerState label="Add vocabulary or grammar items to unlock a review quiz." />
      </section>
    );
  }

  return (
    <section className="session-report-learner-section">
      <div className="session-report-section-title">
        <div>
          <Trophy size={18} />
          <h2>Quick review quiz</h2>
        </div>
      </div>

      <div className="session-report-quiz">
        {questions.map((question, index) => (
          <article className="session-report-quiz-card" key={question.id}>
            <div className="session-report-quiz-card__head">
              <span>{index + 1}</span>
              <p>{question.prompt}</p>
            </div>
            <div className="session-report-quiz-options">
              {question.choices.map((choice) => {
                const selected = answers[question.id] === choice;
                const isCorrect = selected && choice === question.answer;
                const isWrong = selected && choice !== question.answer;

                return (
                  <button
                    type="button"
                    key={choice}
                    className={`${selected ? "is-selected" : ""} ${isCorrect ? "is-correct" : ""} ${isWrong ? "is-wrong" : ""}`}
                    aria-pressed={selected}
                    onClick={() => setAnswers((current) => ({ ...current, [question.id]: choice }))}
                  >
                    <span>{choice}</span>
                    {isCorrect && <CheckCircle2 size={16} />}
                    {isWrong && <X size={16} />}
                  </button>
                );
              })}
            </div>
            {answers[question.id] && (
              <p className="session-report-quiz-result" role="status">
                {answers[question.id] === question.answer ? "Correct" : "Try again"}
              </p>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

function EmptyLearnerState({ label }) {
  return (
    <div className="session-report-empty session-report-empty--learner">
      <Sparkles size={22} />
      <p>{label}</p>
    </div>
  );
}

function LearnerView({ futureSteps, items, summary }) {
  const counts = getCounts(items);
  const vocabulary = items.filter((item) => item.type === "vocabulary");
  const pronunciation = items.filter((item) => item.type === "pronunciation");
  const questions = useMemo(() => buildQuizQuestions(items), [items]);

  return (
    <motion.div
      key="learner-view"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -18 }}
      transition={spring}
      className="session-report-view session-report-view--learner"
    >
      <div className="session-report-learner-topline">
        <div>
          <p className="session-report-kicker">Learner recap</p>
          <h2>Your lesson, entry by entry.</h2>
        </div>
        <LearnerStats counts={counts} />
      </div>

      <div className="session-report-learner-grid">
        <div className="session-report-learner-main">
          <FeedbackReportTable items={items} />
          <GeneralCommentsCard futureSteps={futureSteps} summary={summary} />
          <QuickReviewQuiz questions={questions} />
        </div>
        <div className="session-report-learner-side">
          <VocabularyCarousel items={vocabulary} />
          <PronunciationHub items={pronunciation} />
        </div>
      </div>
    </motion.div>
  );
}

const draftKey = (sessionId) => `speexify:feedback-draft:${sessionId}`;

function reportSnapshot({ items, summary, futureSteps }) {
  return JSON.stringify({
    items: normalizeFeedbackItems(items).map(({ id, type, prompt, response, note }) => ({ id, type, prompt, response, note: note || "" })),
    summary: String(summary || "").trim(),
    futureSteps: String(futureSteps || "").trim(),
  });
}

function readDraft(sessionId) {
  try {
    const raw = window.localStorage.getItem(draftKey(sessionId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function clearDraft(sessionId) {
  try {
    window.localStorage.removeItem(draftKey(sessionId));
  } catch {
    // Storage can be unavailable (private mode); nothing to clear then.
  }
}

export default function SessionFeedbackPage() {
  const params = useParams();
  const id = params?.id;
  const router = useRouter();
  const pathname = usePathname();
  const locale = pathname?.startsWith("/ar") ? "ar" : "en";
  const prefix = locale === "ar" ? "/ar" : "";
  const dict = getDictionary(locale, "session_feedback");
  const { user, checking } = useAuth();
  const isTeacher = user?.role === "teacher";
  const toastApi = useToast();
  const toast = toastApi?.toast || toastApi;

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [published, setPublished] = useState(false);
  const [error, setError] = useState("");
  const [viewMode, setViewMode] = useState("coach");
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState("");
  const [futureSteps, setFutureSteps] = useState("");
  const [savedSnapshot, setSavedSnapshot] = useState("");
  const [restoredDraft, setRestoredDraft] = useState(false);
  const serverReportRef = useRef(null);

  const canEdit = Boolean(session && isTeacher);
  const visibleView = canEdit ? viewMode : "learner";
  const currentSnapshot = reportSnapshot({ items, summary, futureSteps });
  const dirty = canEdit && Boolean(savedSnapshot) && currentSnapshot !== savedSnapshot;
  const learnerItems = useMemo(() => normalizeFeedbackItems(items), [items]);
  const everPublished = Boolean(
    session?.teacherFeedback?.commentsOnSession || session?.teacherFeedback?.messageToLearner
  );
  const publishState = !everPublished ? "draft" : dirty ? "dirty" : "published";

  useEffect(() => {
    if (!id || checking) return undefined;
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError("");
        const { data } = await api.get(`/sessions/${id}`);
        if (cancelled) return;

        const loadedSession = data?.session || null;
        const report = getReportFromFeedback(loadedSession?.teacherFeedback || {});
        serverReportRef.current = report;
        setSession(loadedSession);
        setSavedSnapshot(reportSnapshot(report));

        const draft = isTeacher ? readDraft(id) : null;
        const draftMatchesServer = draft && (draft.base || null) === (report.updatedAt || null);
        if (draftMatchesServer && reportSnapshot(draft) !== reportSnapshot(report)) {
          setItems(draft.items || []);
          setSummary(draft.summary || "");
          setFutureSteps(draft.futureSteps || "");
          setRestoredDraft(true);
        } else {
          if (draft) clearDraft(id);
          setItems(report.items.length || !isTeacher ? report.items : [createFeedbackRow("vocabulary")]);
          setSummary(report.summary);
          setFutureSteps(report.futureSteps);
        }
      } catch (err) {
        if (cancelled) return;
        console.error("Failed to load session feedback", err);
        setError(err?.response?.data?.error || "Failed to load session feedback");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id, checking, isTeacher]);

  // Keep unpublished work on this device so a closed tab loses nothing.
  useEffect(() => {
    if (!canEdit || !id) return undefined;
    const timer = window.setTimeout(() => {
      if (!dirty) {
        clearDraft(id);
        return;
      }
      try {
        window.localStorage.setItem(
          draftKey(id),
          JSON.stringify({ base: serverReportRef.current?.updatedAt || null, items, summary, futureSteps })
        );
      } catch {
        // Storage full or unavailable: the warning on leaving still protects the work.
      }
    }, 500);
    return () => window.clearTimeout(timer);
  }, [canEdit, dirty, futureSteps, id, items, summary]);

  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const handleBack = () => {
    router.push(id ? `${prefix}/dashboard/sessions/${id}` : `${prefix}/dashboard`);
  };

  const handleDiscardDraft = () => {
    const report = serverReportRef.current;
    if (!report) return;
    clearDraft(id);
    setItems(report.items.length ? report.items : [createFeedbackRow("vocabulary")]);
    setSummary(report.summary);
    setFutureSteps(report.futureSteps);
    setRestoredDraft(false);
  };

  const handleSave = async () => {
    if (!canEdit || !id) return;

    const report = {
      version: 1,
      summary: summary.trim(),
      futureSteps: futureSteps.trim(),
      items: normalizeFeedbackItems(items),
      updatedAt: new Date().toISOString(),
    };
    const commentsOnSession = serializeRichFeedbackComments(report);

    try {
      setSaving(true);
      setPublished(false);
      setError("");
      await api.post(`/sessions/${id}/feedback`, {
        messageToLearner: report.summary,
        commentsOnSession,
        futureSteps: report.futureSteps,
      });

      serverReportRef.current = { ...report, hasRichReport: true };
      setSavedSnapshot(reportSnapshot(report));
      setRestoredDraft(false);
      clearDraft(id);
      setSession((current) => ({
        ...current,
        teacherFeedback: {
          ...(current?.teacherFeedback || {}),
          messageToLearner: report.summary,
          commentsOnSession,
          futureSteps: report.futureSteps,
        },
      }));
      setPublished(true);
      window.setTimeout(() => setPublished(false), 1800);
      trackEvent("feedback_submitted", {
        role: "teacher",
        sessionId: id,
        richReport: true,
        itemCount: report.items.length,
      });
      toast?.success?.(t(dict, "saved_ok") || "Feedback saved.");
    } catch (err) {
      console.error("Failed to save feedback", err);
      const msg =
        err?.response?.data?.error ||
        t(dict, "save_failed") ||
        "Failed to save feedback";
      setError(msg);
      toast?.error?.(msg);
    } finally {
      setSaving(false);
    }
  };

  const formatSessionDate = () => {
    const start = session?.startAt;
    if (!start) return "";
    const d = new Date(start);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString(getIntlLocale(locale), {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  if (checking || loading) {
    return <LoadingState onBack={handleBack} />;
  }

  if (!session) {
    return <ErrorState error={error} onBack={handleBack} />;
  }

  const sessionDateLabel = formatSessionDate();

  return (
    <div className="page-session-feedback">
      <div className="page-session-feedback__inner">
        <button onClick={handleBack} className="session-report-back">
          <ArrowLeft size={16} />
          Back to session
        </button>

        <header className="session-report-hero">
          <div>
            <p className="session-report-kicker">Speexify session report</p>
            <h1>{canEdit ? "Feedback creator" : "Your lesson recap"}</h1>
            <SessionMeta session={session} sessionDateLabel={sessionDateLabel} />
          </div>
          <div className="session-report-hero__actions">
            {canEdit && (
              <div className="session-report-view-toggle" aria-label="Perspective switcher">
                <button
                  type="button"
                  className={visibleView === "coach" ? "is-active" : ""}
                  onClick={() => setViewMode("coach")}
                >
                  <PenLine size={16} />
                  Coach
                </button>
                <button
                  type="button"
                  className={visibleView === "learner" ? "is-active" : ""}
                  onClick={() => setViewMode("learner")}
                >
                  <GraduationCap size={16} />
                  Learner
                </button>
              </div>
            )}
            {canEdit && (
              <span className={`session-report-status is-${publishState}`}>
                {{ dirty: "Unpublished changes", published: "Published", draft: "Not published yet" }[publishState]}
              </span>
            )}
          </div>
        </header>

        {error && <div className="session-feedback-alert">{error}</div>}

        <AnimatePresence mode="wait">
          {visibleView === "coach" ? (
            <CoachView
              canEdit={canEdit}
              dirty={dirty}
              publishState={publishState}
              futureSteps={futureSteps}
              items={items}
              onChangeItems={setItems}
              onDiscardDraft={handleDiscardDraft}
              onSave={handleSave}
              onSetFutureSteps={setFutureSteps}
              onSetSummary={setSummary}
              published={published}
              restoredDraft={restoredDraft}
              saving={saving}
              summary={summary}
            />
          ) : (
            <LearnerView futureSteps={futureSteps} items={learnerItems} summary={summary} />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
