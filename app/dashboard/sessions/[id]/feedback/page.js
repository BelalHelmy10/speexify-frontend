"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowLeftRight,
  AudioWaveform,
  BookOpen,
  Brain,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  ClipboardCheck,
  GraduationCap,
  Loader2,
  MessageSquareText,
  Mic,
  PenLine,
  Plus,
  RotateCcw,
  Save,
  Sparkles,
  Square,
  Target,
  Trash2,
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
  serializeRichFeedbackComments,
} from "@/lib/feedbackReport";
import "@/styles/session-feedback.scss";

const CATEGORY_CONFIG = [
  {
    key: "vocabulary",
    label: "New Word",
    listLabel: "Vocabulary",
    description: "Capture terms worth revisiting.",
    icon: BookOpen,
    primaryLabel: "Word or phrase",
    secondaryLabel: "Definition / context",
    primaryPlaceholder: "e.g. bandwidth",
    secondaryPlaceholder: "The time or capacity to handle extra work.",
  },
  {
    key: "grammar",
    label: "Grammar Mistake",
    listLabel: "Grammar",
    description: "Log before, after, and why.",
    icon: ClipboardCheck,
    primaryLabel: "Original sentence",
    secondaryLabel: "Corrected sentence + explanation",
    primaryPlaceholder: "e.g. I am agree with you.",
    secondaryPlaceholder: "I agree with you. | Agree is already a verb.",
  },
  {
    key: "pronunciation",
    label: "Pronunciation",
    listLabel: "Pronunciation",
    description: "Mark sounds to rehearse.",
    icon: Mic,
    primaryLabel: "Word",
    secondaryLabel: "Phonetic spelling / audio note",
    primaryPlaceholder: "e.g. assistance",
    secondaryPlaceholder: "/uh-SIS-tuhns/ or /əˈsɪs.təns/",
  },
  {
    key: "note",
    label: "General Note",
    listLabel: "Note",
    description: "Record coaching observations.",
    icon: MessageSquareText,
    primaryLabel: "Focus area",
    secondaryLabel: "Coach note",
    primaryPlaceholder: "e.g. Confidence",
    secondaryPlaceholder: "Strong improvement when you paused before answering.",
  },
];

const EMPTY_DRAFTS = CATEGORY_CONFIG.reduce((acc, category) => {
  acc[category.key] = { prompt: "", response: "" };
  return acc;
}, {});

const spring = { type: "spring", stiffness: 420, damping: 34 };

function getCategoryConfig(type) {
  return CATEGORY_CONFIG.find((item) => item.key === type) || CATEGORY_CONFIG[0];
}

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

function splitCorrectionAndExplanation(value = "") {
  const text = String(value || "").trim();
  if (!text) return { correction: "", explanation: "" };

  const lines = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length > 1) {
    return { correction: lines[0], explanation: lines.slice(1).join(" ") };
  }

  const separatorMatch = text.match(/^(.+?)(?:\s+\|\s+|\s+-\s+|\s+--\s+)(.+)$/);
  if (separatorMatch) {
    return {
      correction: separatorMatch[1].trim(),
      explanation: separatorMatch[2].trim(),
    };
  }

  return { correction: text, explanation: "" };
}

function getDiffTokens(before = "", after = "") {
  const beforeTokens = String(before || "").trim().split(/\s+/).filter(Boolean);
  const afterTokens = String(after || "").trim().split(/\s+/).filter(Boolean);
  const matrix = Array.from({ length: beforeTokens.length + 1 }, () =>
    Array(afterTokens.length + 1).fill(0)
  );

  for (let i = beforeTokens.length - 1; i >= 0; i -= 1) {
    for (let j = afterTokens.length - 1; j >= 0; j -= 1) {
      if (beforeTokens[i].toLowerCase() === afterTokens[j].toLowerCase()) {
        matrix[i][j] = matrix[i + 1][j + 1] + 1;
      } else {
        matrix[i][j] = Math.max(matrix[i + 1][j], matrix[i][j + 1]);
      }
    }
  }

  const beforeParts = [];
  const afterParts = [];
  let i = 0;
  let j = 0;

  while (i < beforeTokens.length && j < afterTokens.length) {
    if (beforeTokens[i].toLowerCase() === afterTokens[j].toLowerCase()) {
      beforeParts.push({ value: beforeTokens[i], changed: false });
      afterParts.push({ value: afterTokens[j], changed: false });
      i += 1;
      j += 1;
    } else if (matrix[i + 1][j] >= matrix[i][j + 1]) {
      beforeParts.push({ value: beforeTokens[i], changed: true });
      i += 1;
    } else {
      afterParts.push({ value: afterTokens[j], changed: true });
      j += 1;
    }
  }

  while (i < beforeTokens.length) {
    beforeParts.push({ value: beforeTokens[i], changed: true });
    i += 1;
  }

  while (j < afterTokens.length) {
    afterParts.push({ value: afterTokens[j], changed: true });
    j += 1;
  }

  return { beforeParts, afterParts };
}

function buildQuizQuestions(items) {
  const vocabulary = items.filter((item) => item.type === "vocabulary");
  const grammar = items.filter((item) => item.type === "grammar");
  const questions = [];

  if (vocabulary.length) {
    const target = vocabulary[0];
    const choices = uniqueChoices([
      target.response,
      ...vocabulary.slice(1).map((item) => item.response),
      "A filler word used when you need more time.",
      "A phrase for ending a conversation politely.",
      "A word used only in formal writing.",
    ]);

    questions.push({
      id: "vocab",
      type: "vocabulary",
      prompt: `What does "${target.prompt}" mean in this session?`,
      answer: target.response,
      choices,
    });
  }

  if (grammar.length) {
    const target = grammar[0];
    const { correction } = splitCorrectionAndExplanation(target.response);
    const choices = uniqueChoices([
      correction,
      target.prompt,
      "I am agreed with you.",
      "I agreeing with you.",
    ]);

    questions.push({
      id: "grammar",
      type: "grammar",
      prompt: "Choose the stronger correction.",
      answer: correction,
      choices,
    });
  }

  return questions.slice(0, 2);
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

function CategoryBadge({ type }) {
  const config = getCategoryConfig(type);
  const Icon = config.icon;

  return (
    <span className={`session-report-badge session-report-badge--${type}`}>
      <Icon size={14} />
      {config.listLabel}
    </span>
  );
}

function CoachView({
  activeType,
  canEdit,
  draft,
  futureSteps,
  items,
  onAddItem,
  onChangeDraft,
  onDeleteItem,
  onSave,
  onSetActiveType,
  onSetFutureSteps,
  onSetSummary,
  published,
  saving,
  summary,
}) {
  const activeConfig = getCategoryConfig(activeType);
  const ActiveIcon = activeConfig.icon;
  const counts = getCounts(items);
  const canAdd = draft.prompt.trim() && draft.response.trim() && canEdit;
  const totalCoreItems = counts.vocabulary + counts.grammar + counts.pronunciation;

  return (
    <motion.div
      key="coach-view"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -18 }}
      transition={spring}
      className="session-report-view session-report-view--coach"
    >
      <aside className="session-report-category-rail">
        <div className="session-report-rail-head">
          <p className="session-report-kicker">Coach workspace</p>
          <h2>Feedback stack</h2>
          <span>{pluralize(items.length, "entry", "entries")} prepared</span>
        </div>

        <div className="session-report-segmented" role="tablist" aria-label="Feedback category">
          {CATEGORY_CONFIG.map((category) => {
            const Icon = category.icon;
            const isActive = activeType === category.key;
            const categoryCount = counts[category.key] || 0;
            return (
              <button
                key={category.key}
                type="button"
                className={`session-report-segment ${isActive ? "is-active" : ""}`}
                onClick={() => onSetActiveType(category.key)}
                role="tab"
                aria-selected={isActive}
              >
                <span className="session-report-segment__icon">
                  <Icon size={17} />
                </span>
                <span className="session-report-segment__copy">
                  <strong>{category.label}</strong>
                  <small>{category.description}</small>
                </span>
                <span className="session-report-segment__count">{categoryCount}</span>
              </button>
            );
          })}
        </div>

        <div className="session-report-rail-foot">
          <span>{totalCoreItems}/8</span>
          <div className="session-report-progress-track" aria-hidden>
            <span style={{ width: `${Math.min((totalCoreItems / 8) * 100, 100)}%` }} />
          </div>
          <p>Enough structure for a useful learner recap.</p>
        </div>
      </aside>

      <section className="session-report-editor">
        <div className="session-report-composer">
          <div className={`session-report-composer__mark session-report-composer__mark--${activeType}`}>
            <ActiveIcon size={22} />
          </div>
          <div className="session-report-composer__body">
            <div className="session-report-panel-head">
              <div>
                <p className="session-report-kicker">Quick capture</p>
                <h2>{activeConfig.label}</h2>
              </div>
              <div className="session-report-mini-stats">
                <span>{pluralize(counts.vocabulary, "word")}</span>
                <span>{pluralize(counts.grammar, "fix", "fixes")}</span>
                <span>{pluralize(counts.pronunciation, "sound")}</span>
              </div>
            </div>

            <form className="session-report-entry-form" onSubmit={onAddItem}>
              <label className="session-report-field">
                <span>{activeConfig.primaryLabel}</span>
                <input
                  value={draft.prompt}
                  onChange={(event) => onChangeDraft("prompt", event.target.value)}
                  disabled={!canEdit}
                  placeholder={activeConfig.primaryPlaceholder}
                />
              </label>

              <label className="session-report-field session-report-field--wide">
                <span>{activeConfig.secondaryLabel}</span>
                <textarea
                  rows={3}
                  value={draft.response}
                  onChange={(event) => onChangeDraft("response", event.target.value)}
                  disabled={!canEdit}
                  placeholder={activeConfig.secondaryPlaceholder}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      onAddItem(event);
                    }
                  }}
                />
              </label>

              <motion.button
                type="submit"
                className="session-report-add"
                disabled={!canAdd}
                whileHover={canAdd ? { scale: 1.02 } : undefined}
                whileTap={canAdd ? { scale: 0.98 } : undefined}
              >
                <Plus size={18} />
                Add
              </motion.button>
            </form>
          </div>
        </div>

        <div className="session-report-live-preview">
          <div className="session-report-list-head">
            <div>
              <ClipboardCheck size={18} />
              <h3>Session evidence</h3>
            </div>
            <span>{pluralize(items.length, "entry", "entries")}</span>
          </div>

          {items.length ? (
            <motion.div layout className="session-report-table" role="list">
              <AnimatePresence initial={false}>
                {items.map((item) => (
                  <motion.article
                    layout
                    key={item.id}
                    initial={{ opacity: 0, y: 12, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, x: -18, scale: 0.98 }}
                    transition={spring}
                    className="session-report-row"
                    role="listitem"
                  >
                    <CategoryBadge type={item.type} />
                    <div className="session-report-row__main">
                      <strong>{item.prompt}</strong>
                      <span>{item.response}</span>
                    </div>
                    {canEdit && (
                      <button
                        type="button"
                        className="session-report-icon-button session-report-icon-button--danger"
                        onClick={() => onDeleteItem(item.id)}
                        aria-label={`Delete ${item.prompt}`}
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </motion.article>
                ))}
              </AnimatePresence>
            </motion.div>
          ) : (
            <div className="session-report-empty">
              <Sparkles size={22} />
              <p>New feedback entries will appear here.</p>
            </div>
          )}
        </div>
      </section>

      <aside className="session-report-summary-panel">
        <div className="session-report-publish-card">
          <div>
            <p className="session-report-kicker">Learner report</p>
            <h3>Publish-ready brief</h3>
          </div>
          <div className="session-report-publish-meter">
            <strong>{items.length}</strong>
            <span>items</span>
          </div>
        </div>

        <label className="session-report-field">
          <span>General summary</span>
          <textarea
            rows={8}
            value={summary}
            onChange={(event) => onSetSummary(event.target.value)}
            disabled={!canEdit}
            placeholder="Personalized comments for the learner."
          />
        </label>

        <label className="session-report-field">
          <span>Next practice focus</span>
          <textarea
            rows={5}
            value={futureSteps}
            onChange={(event) => onSetFutureSteps(event.target.value)}
            disabled={!canEdit}
            placeholder="One focused action for the learner before the next session."
          />
        </label>

        {canEdit && (
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
                <motion.span
                  key="saving"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                >
                  <Loader2 className="session-report-spin" size={18} />
                  Publishing
                </motion.span>
              ) : published ? (
                <motion.span
                  key="published"
                  initial={{ opacity: 0, scale: 0.86 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.92 }}
                >
                  <CheckCircle2 size={18} />
                  Published
                </motion.span>
              ) : (
                <motion.span
                  key="publish"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                >
                  <Save size={18} />
                  Publish Feedback
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
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
      label: "Grammar Fixes",
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

function GeneralCommentsCard({ futureSteps, notes, summary }) {
  return (
    <section className="session-report-learner-section session-report-message">
      <div className="session-report-section-title">
        <div>
          <Sparkles size={18} />
          <h2>Coach comments</h2>
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
            aria-label={`Review ${active.prompt}`}
          >
            <span className="session-report-flashcard__face session-report-flashcard__front">
              <BookOpen size={24} />
              <strong>{active.prompt}</strong>
              <span><RotateCcw size={15} /></span>
            </span>
            <span className="session-report-flashcard__face session-report-flashcard__back">
              <p>{active.response}</p>
              <span className="session-report-listen">
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

function GrammarFixCards({ items }) {
  const [openId, setOpenId] = useState(null);

  return (
    <section className="session-report-learner-section">
      <div className="session-report-section-title">
        <div>
          <Brain size={18} />
          <h2>Grammar fix-it cards</h2>
        </div>
      </div>

      {items.length ? (
        <div className="session-report-fix-grid">
          {items.map((item) => {
            const { correction, explanation } = splitCorrectionAndExplanation(item.response);
            const diff = getDiffTokens(item.prompt, correction);
            const isOpen = openId === item.id;

            return (
              <motion.article
                key={item.id}
                className="session-report-fix-card"
                layout
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={spring}
              >
                <div className="session-report-fix-card__compare">
                  <div className="session-report-before">
                    <span>Before</span>
                    <p>
                      {diff.beforeParts.map((part, idx) => (
                        <mark key={`${part.value}-${idx}`} className={part.changed ? "is-removed" : ""}>
                          {part.value}
                        </mark>
                      ))}
                    </p>
                  </div>
                  <ArrowLeftRight size={18} />
                  <div className="session-report-after">
                    <span>After</span>
                    <p>
                      {diff.afterParts.map((part, idx) => (
                        <mark key={`${part.value}-${idx}`} className={part.changed ? "is-added" : ""}>
                          {part.value}
                        </mark>
                      ))}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="session-report-explain"
                  onClick={() => setOpenId((current) => (current === item.id ? null : item.id))}
                >
                  <span>Explanation</span>
                  <ChevronDown className={isOpen ? "is-open" : ""} size={16} />
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      className="session-report-explanation"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={spring}
                    >
                      <p>{explanation || "Use this version for a clearer and more natural sentence."}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.article>
            );
          })}
        </div>
      ) : (
        <EmptyLearnerState label="No grammar fixes for this report." />
      )}
    </section>
  );
}

function PronunciationHub({ items }) {
  const [recordingId, setRecordingId] = useState(null);
  const [recorded, setRecorded] = useState({});

  useEffect(() => {
    if (!recordingId) return undefined;

    const timer = window.setTimeout(() => {
      setRecorded((current) => ({ ...current, [recordingId]: true }));
      setRecordingId(null);
    }, 1800);

    return () => window.clearTimeout(timer);
  }, [recordingId]);

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
            const isDone = recorded[item.id];

            return (
              <motion.article
                key={item.id}
                className={`session-report-pronunciation-card ${isRecording ? "is-recording" : ""}`}
                whileHover={{ y: -4 }}
                transition={spring}
              >
                <div>
                  <span>Practice</span>
                  <strong>{item.prompt}</strong>
                  <p>{item.response}</p>
                </div>
                <button
                  type="button"
                  className="session-report-recorder"
                  onClick={() => {
                    if (isRecording) {
                      setRecorded((current) => ({ ...current, [item.id]: true }));
                      setRecordingId(null);
                    } else {
                      setRecordingId(item.id);
                    }
                  }}
                  aria-label={isRecording ? "Stop recording" : `Record ${item.prompt}`}
                  title={isRecording ? "Stop" : "Record"}
                >
                  {isRecording ? <Square size={18} /> : isDone ? <Check size={18} /> : <Mic size={18} />}
                </button>
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
                    onClick={() => setAnswers((current) => ({ ...current, [question.id]: choice }))}
                  >
                    <span>{choice}</span>
                    {isCorrect && <CheckCircle2 size={16} />}
                    {isWrong && <X size={16} />}
                  </button>
                );
              })}
            </div>
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
  const grammar = items.filter((item) => item.type === "grammar");
  const pronunciation = items.filter((item) => item.type === "pronunciation");
  const notes = items.filter((item) => item.type === "note");
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
          <h2>Turn the lesson into your next practice loop.</h2>
        </div>
        <LearnerStats counts={counts} />
      </div>

      <div className="session-report-learner-grid">
        <div className="session-report-learner-main">
          <GeneralCommentsCard futureSteps={futureSteps} notes={notes} summary={summary} />
          <GrammarFixCards items={grammar} />
        </div>
        <div className="session-report-learner-side">
          <VocabularyCarousel items={vocabulary} />
          <PronunciationHub items={pronunciation} />
          <QuickReviewQuiz questions={questions} />
        </div>
      </div>
    </motion.div>
  );
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
  const [activeType, setActiveType] = useState("vocabulary");
  const [drafts, setDrafts] = useState(EMPTY_DRAFTS);
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState("");
  const [futureSteps, setFutureSteps] = useState("");

  const canEdit = Boolean(session && isTeacher);
  const activeDraft = drafts[activeType] || EMPTY_DRAFTS[activeType];
  const visibleView = canEdit ? viewMode : "learner";

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
        const teacherFeedback = loadedSession?.teacherFeedback || {};
        const report = getReportFromFeedback(teacherFeedback);

        setSession(loadedSession);
        setItems(report.items);
        setSummary(report.summary);
        setFutureSteps(report.futureSteps);
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
  }, [id, checking]);

  const handleBack = () => {
    router.push(id ? `${prefix}/dashboard/sessions/${id}` : `${prefix}/dashboard`);
  };

  const handleChangeDraft = (field, value) => {
    setDrafts((current) => ({
      ...current,
      [activeType]: {
        ...current[activeType],
        [field]: value,
      },
    }));
  };

  const handleAddItem = (event) => {
    event.preventDefault();
    if (!canEdit) return;

    const prompt = activeDraft.prompt.trim();
    const response = activeDraft.response.trim();
    if (!prompt || !response) return;

    const newItem = {
      id: `${activeType}-${Date.now()}`,
      type: activeType,
      prompt,
      response,
      createdAt: new Date().toISOString(),
    };

    setItems((current) => [newItem, ...current]);
    setDrafts((current) => ({
      ...current,
      [activeType]: { prompt: "", response: "" },
    }));
  };

  const handleSave = async () => {
    if (!canEdit || !id) return;

    const report = {
      version: 1,
      summary: summary.trim(),
      futureSteps: futureSteps.trim(),
      items,
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
        itemCount: items.length,
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
    return d.toLocaleString(undefined, {
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
            <span className={`session-report-status ${canEdit ? "is-editable" : "is-readonly"}`}>
              {canEdit ? "Editable" : "Read-only"}
            </span>
          </div>
        </header>

        {error && <div className="session-feedback-alert">{error}</div>}

        <AnimatePresence mode="wait">
          {visibleView === "coach" ? (
            <CoachView
              activeType={activeType}
              canEdit={canEdit}
              draft={activeDraft}
              futureSteps={futureSteps}
              items={items}
              onAddItem={handleAddItem}
              onChangeDraft={handleChangeDraft}
              onDeleteItem={(itemId) => setItems((current) => current.filter((item) => item.id !== itemId))}
              onSave={handleSave}
              onSetActiveType={setActiveType}
              onSetFutureSteps={setFutureSteps}
              onSetSummary={setSummary}
              published={published}
              saving={saving}
              summary={summary}
            />
          ) : (
            <LearnerView futureSteps={futureSteps} items={items} summary={summary} />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
