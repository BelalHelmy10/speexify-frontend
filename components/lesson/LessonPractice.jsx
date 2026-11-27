"use client";

// Practice built from a lesson's feedback report: flashcards for the new
// words, pronunciation recording, and a short quiz. Shared by the lesson page
// and the teacher's learner preview.
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AudioWaveform,
  BookOpen,
  Brain,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  MessageSquareText,
  Mic,
  RotateCcw,
  Sparkles,
  Square,
  Target,
  Trophy,
  Volume2,
  X,
} from "lucide-react";
import { isLink, stripMarks } from "@/lib/feedbackMarks.mjs";
import { speakText } from "./feedbackShared";
import { getMistakeParts } from "./FeedbackReportTable";
import { lessonCopy } from "./lessonCopy";

const spring = { type: "spring", stiffness: 420, damping: 34 };

export function getCounts(items) {
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

export function buildQuizQuestions(items, c = lessonCopy("en")) {
  const vocabulary = items.filter((item) => item.type === "vocabulary" && item.response);
  const grammar = items.filter((item) => item.type === "grammar" && item.response);
  const questions = [];

  vocabulary.forEach((target, index) => {
    const answer = stripMarks(target.response).trim();
    const choices = uniqueChoices([
      answer,
      ...vocabulary.filter((item) => item.id !== target.id).map((item) => stripMarks(item.response)),
      ...c.fillers,
    ]);
    questions.push({
      id: `vocab-${target.id || index}`,
      type: "vocabulary",
      prompt: c.quizMeaning(stripMarks(target.prompt)),
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
      prompt: c.quizCorrect,
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

export function LearnerStats({ counts, locale = "en" }) {
  const c = lessonCopy(locale);
  const stats = [
    {
      key: "vocabulary",
      label: c.statsWords,
      value: counts.vocabulary,
      icon: BookOpen,
    },
    {
      key: "grammar",
      label: c.statsCorrections,
      value: counts.grammar,
      icon: Brain,
    },
    {
      key: "pronunciation",
      label: c.statsPronunciation,
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

export function GeneralCommentsCard({ futureSteps, summary, notes = [], locale = "en", headingLevel = 2 }) {
  const c = lessonCopy(locale);
  const Heading = `h${headingLevel}`;
  return (
    <section className="session-report-learner-section session-report-message">
      <div className="session-report-section-title">
        <div>
          <Sparkles size={18} />
          <Heading>{c.commentsTitle}</Heading>
        </div>
      </div>
      <div className="session-report-message__body">
        <GraduationCap size={24} />
        <p dir="auto">{summary || c.commentsEmpty}</p>
      </div>
      {(futureSteps || notes.length > 0) && (
        <div className="session-report-next-grid">
          {futureSteps && (
            <div className="session-report-next-focus">
              <Target size={18} />
              <div>
                <strong>{c.nextFocus}</strong>
                <p dir="auto">{futureSteps}</p>
              </div>
            </div>
          )}
          {notes.map((note) => (
            <div className="session-report-next-focus" key={note.id}>
              <MessageSquareText size={18} />
              <div>
                <strong dir="auto">{note.prompt}</strong>
                <p dir="auto">{note.response}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function VocabularyCarousel({ items, locale = "en", headingLevel = 2 }) {
  const c = lessonCopy(locale);
  const Heading = `h${headingLevel}`;
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
            <Heading>{c.flashcards}</Heading>
          </div>
        </div>
        <EmptyLearnerState label={c.flashcardsEmpty} />
      </section>
    );
  }

  return (
    <section className="session-report-learner-section">
      <div className="session-report-section-title">
        <div>
          <BookOpen size={18} />
          <Heading>{c.flashcards}</Heading>
        </div>
        <div className="session-report-carousel-actions">
          <button
            type="button"
            className="session-report-icon-button"
            onClick={() => {
              setFlippedId(null);
              setIndex((current) => (current === 0 ? items.length - 1 : current - 1));
            }}
            aria-label={c.prevCard}
            title={c.prevCard}
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
            aria-label={c.nextCard}
            title={c.nextCard}
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
            aria-label={c.reviewCard(stripMarks(active.prompt))}
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
                aria-label={c.listen(stripMarks(active.prompt))}
                onClick={speak}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") speak(event);
                }}
              >
                <Volume2 size={16} />
                {c.listenShort}
              </span>
            </span>
          </motion.button>
        </AnimatePresence>
      </div>
    </section>
  );
}

export function PronunciationHub({ items, locale = "en", headingLevel = 2, onRecorded }) {
  const c = lessonCopy(locale);
  const Heading = `h${headingLevel}`;
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
      setRecordingError(c.micUnsupported);
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
        onRecorded?.(itemId);
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
          ? c.micDenied
          : c.micFailed
      );
    }
  };

  return (
    <section className="session-report-learner-section">
      <div className="session-report-section-title">
        <div>
          <Mic size={18} />
          <Heading>{c.pronunciation}</Heading>
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
                  <span>{c.practiceLabel}</span>
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
                  aria-label={isRecording ? c.stopRecording : c.record(stripMarks(item.prompt))}
                  title={isRecording ? c.stopRecording : c.record(stripMarks(item.prompt))}
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
        <EmptyLearnerState label={c.pronunciationEmpty} />
      )}
      {recordingError && <p className="session-report-inline-error" role="alert">{recordingError}</p>}
    </section>
  );
}

export function QuickReviewQuiz({ questions, locale = "en", headingLevel = 2, onComplete }) {
  const c = lessonCopy(locale);
  const Heading = `h${headingLevel}`;
  const [answers, setAnswers] = useState({});
  const solved = questions.filter((question) => answers[question.id] === question.answer).length;
  const completeRef = useRef(false);

  useEffect(() => {
    if (questions.length && solved === questions.length && !completeRef.current) {
      completeRef.current = true;
      onComplete?.();
    }
  }, [onComplete, questions.length, solved]);

  if (!questions.length) {
    return (
      <section className="session-report-learner-section">
        <div className="session-report-section-title">
          <div>
            <Trophy size={18} />
            <Heading>{c.quiz}</Heading>
          </div>
        </div>
        <EmptyLearnerState label={c.quizEmpty} />
      </section>
    );
  }

  return (
    <section className="session-report-learner-section">
      <div className="session-report-section-title">
        <div>
          <Trophy size={18} />
          <Heading>{c.quiz}</Heading>
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
                    <span dir="auto">{choice}</span>
                    {isCorrect && <CheckCircle2 size={16} />}
                    {isWrong && <X size={16} />}
                  </button>
                );
              })}
            </div>
            {answers[question.id] && (
              <p className="session-report-quiz-result" role="status">
                {answers[question.id] === question.answer ? c.correct : c.tryAgain}
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
