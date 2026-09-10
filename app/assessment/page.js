"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import api from "@/lib/api";
import { trackEvent } from "@/lib/analytics";
import { useToast } from "@/components/ToastProvider";
import useAuth from "@/hooks/useAuth";
import { loadPlacementAudio, savePlacementAudio, clearPlacementAudio } from "@/lib/placementAudioDraft";

const PLACEMENT_VERSION = "speexify-placement-v1";
const DRAFT_KEY = "speexifyPlacementDraft_v1";
const WRITING_MIN = 140;
const WRITING_TARGET = "180-260";
const WRITING_MAX = 600;

const WRITING_TASKS = [
  {
    id: "workplace",
    label: "Workplace message",
    prompt:
      "Your company is considering whether to offer English coaching to employees. Write a message to a manager explaining why this could be useful, what problems it should solve, and how success should be measured after three months.",
  },
  {
    id: "decision",
    label: "Professional decision",
    prompt:
      "Write a short recommendation to a colleague about whether your team should change the way it runs meetings. Explain the problem, propose a change, and acknowledge one possible drawback.",
  },
  {
    id: "everyday",
    label: "Real-life explanation",
    prompt:
      "Describe a recent situation in which you had to explain a problem, make a request, or resolve a misunderstanding in English. Explain what happened and what you would do differently next time.",
  },
];

const CORE_ITEMS = [
  {
    id: "c1",
    level: "A1",
    prompt: "Maria ___ from Brazil.",
    options: ["are", "is", "be", "am"],

  },
  {
    id: "c2",
    level: "A1",
    prompt: "I usually have coffee ___ the morning.",
    options: ["in", "on", "at", "to"],

  },
  {
    id: "c3",
    level: "A1",
    prompt: "Choose the correct question.",
    options: [
      "Where you live?",
      "Where do you live?",
      "Where are live you?",
      "Where does you live?",
    ],

  },
  {
    id: "c4",
    level: "A1",
    prompt: "There ___ two emails in my inbox.",
    options: ["is", "are", "has", "be"],

  },
  {
    id: "c5",
    level: "A2",
    prompt: "We ___ the client yesterday afternoon.",
    options: ["meet", "met", "have met", "meeting"],

  },
  {
    id: "c6",
    level: "A2",
    prompt: "This report is ___ than the first version.",
    options: ["clear", "clearest", "clearer", "more clear than"],

  },
  {
    id: "c7",
    level: "A2",
    prompt: "You ___ bring your passport to the interview. It is required.",
    options: ["must", "may", "can", "could"],

  },
  {
    id: "c8",
    level: "A2",
    prompt: "I have ___ time before the meeting, so I can help.",
    options: ["a few", "a little", "many", "any"],

  },
  {
    id: "c9",
    level: "B1",
    prompt: "I ___ in this role for three years.",
    options: ["work", "worked", "have worked", "am working"],

  },
  {
    id: "c10",
    level: "B1",
    prompt: "If the supplier lowers the price, we ___ the contract.",
    options: ["signed", "would sign", "will sign", "signing"],

  },
  {
    id: "c11",
    level: "B1",
    prompt: "The training materials ___ by the end of the week.",
    options: [
      "will send",
      "will be sent",
      "will have send",
      "will be sending",
    ],

  },
  {
    id: "c12",
    level: "B1",
    prompt: "Choose the best synonym for 'delay' in a business context.",
    options: ["postpone", "increase", "approve", "compare"],

  },
  {
    id: "c13",
    level: "B2",
    prompt: "She ___ have misunderstood the brief; her proposal answers a different problem.",
    options: ["must", "should", "would", "can"],

  },
  {
    id: "c14",
    level: "B2",
    prompt: "The presentation was effective, ___ it could have used stronger evidence.",
    options: ["despite", "although", "however", "therefore"],

  },
  {
    id: "c15",
    level: "B2",
    prompt: "If we had tested the feature earlier, we ___ the launch.",
    options: [
      "would not delay",
      "will not have delayed",
      "would not have delayed",
      "had not delayed",
    ],

  },
  {
    id: "c16",
    level: "B2",
    prompt: "Choose the most natural collocation.",
    options: [
      "make a decision",
      "do a decision",
      "take a decisioning",
      "build a decision",
    ],

  },
  {
    id: "c17",
    level: "C1",
    prompt: "No sooner ___ the figures than the finance director questioned the forecast.",
    options: [
      "we presented",
      "had we presented",
      "we had presented",
      "did we presented",
    ],

  },
  {
    id: "c18",
    level: "C1",
    prompt: "The proposal is sound, but its assumptions require further ___.",
    options: ["scrutiny", "glance", "sight", "notice"],

  },
  {
    id: "c19",
    level: "C1",
    prompt: "Choose the sentence with the clearest emphasis.",
    options: [
      "What concerns me is the timeline, not the budget.",
      "The timeline concerns me is what, not the budget.",
      "It concerns me what the timeline is not the budget.",
      "The budget not the timeline what concerns me.",
    ],

  },
  {
    id: "c20",
    level: "C1",
    prompt: "The manager's feedback was constructive, if somewhat ___.",
    options: ["blunt", "blunted", "bluntly", "bluntness"],

  },
  {
    id: "c21",
    level: "C2",
    prompt: "The report avoids sensationalism and gives a ___ account of the incident.",
    options: ["measured", "measurable", "measuring", "measurement"],

  },
  {
    id: "c22",
    level: "C2",
    prompt: "Choose the most precise completion: The CEO's remarks were not wrong, but they were politically ___.",
    options: ["naive", "naively", "naivety", "naiver"],

  },
  {
    id: "c23",
    level: "C2",
    prompt: "Which phrase best means 'to reduce the intensity of criticism'?",
    options: ["temper criticism", "template criticism", "tamper criticism", "tender criticism"],

  },
  {
    id: "c24",
    level: "C2",
    prompt: "The board approved the strategy, ___ reservations about execution risk.",
    options: ["notwithstanding", "whereas", "inasmuch", "lest"],

  },
];

const READING_PASSAGES = [
  {
    id: "r1",
    title: "A new meeting policy",
    text: "A software company noticed that employees were spending more than half of their working week in meetings. Managers believed the meetings improved alignment, but engineers said they had too little uninterrupted time for complex work. The company introduced a policy: no internal meetings before 11 a.m., all recurring meetings must have an owner, and every meeting invitation must include a decision or outcome. After six weeks, employees reported fewer interruptions, but some cross-team decisions took longer because informal conversations had also decreased.",
    questions: [
      {
        id: "r1q1",
        prompt: "What problem did the company want to solve?",
        options: [
          "Too many customer calls",
          "Too much meeting time",
          "Too few managers",
          "Too much remote work",
        ],

      },
      {
        id: "r1q2",
        prompt: "What was required for every meeting invitation?",
        options: [
          "A recording link",
          "A list of all engineers",
          "A decision or outcome",
          "A customer quote",
        ],

      },
      {
        id: "r1q3",
        prompt: "Which result was negative?",
        options: [
          "Employees felt more interrupted",
          "Some decisions became slower",
          "Meetings became longer",
          "Engineers stopped attending meetings",
        ],

      },
      {
        id: "r1q4",
        prompt: "The best title for this passage is:",
        options: [
          "How to remove all meetings",
          "A policy with benefits and trade-offs",
          "Why engineers dislike managers",
          "The end of teamwork",
        ],

      },
    ],
  },
  {
    id: "r2",
    title: "Learning under pressure",
    text: "Adults often judge their language progress by how they perform in high-pressure situations: a negotiation, an interview, or a presentation. This can be misleading. A learner may communicate effectively in class but freeze in front of senior colleagues. The problem is not always language knowledge. It may be cognitive load: the speaker is managing ideas, audience reactions, time, confidence, and grammar at the same time. Effective coaching therefore combines language work with rehearsal, feedback, and realistic constraints.",
    questions: [
      {
        id: "r2q1",
        prompt: "Why can high-pressure situations be misleading?",
        options: [
          "They test only vocabulary",
          "They may hide what learners can do in calmer settings",
          "They are always easier than class",
          "They remove audience reactions",
        ],

      },
      {
        id: "r2q2",
        prompt: "What does 'cognitive load' refer to here?",
        options: [
          "The number of books a learner reads",
          "The mental effort of managing many demands at once",
          "A grammar rule for conditionals",
          "A learner's accent",
        ],

      },
      {
        id: "r2q3",
        prompt: "What does the passage imply about good coaching?",
        options: [
          "It should focus only on grammar drills",
          "It should avoid difficult situations",
          "It should include realistic practice",
          "It should replace feedback with tests",
        ],

      },
      {
        id: "r2q4",
        prompt: "The writer's tone is best described as:",
        options: ["practical and analytical", "angry and dismissive", "comic", "uncertain"],

      },
    ],
  },
  {
    id: "r3",
    title: "The limits of fluency",
    text: "Fluency is often treated as speed, but speed alone is a shallow measure. A speaker who talks quickly may still be vague, repetitive, or difficult to follow. In professional communication, fluency also includes control: the ability to organize a message, signal transitions, respond to objections, and choose an appropriate level of directness. At advanced levels, the strongest speakers are not always the fastest; they are the ones who make complex ideas easy for others to process.",
    questions: [
      {
        id: "r3q1",
        prompt: "What is the main argument?",
        options: [
          "Fast speech is always best",
          "Fluency is more than speed",
          "Advanced speakers should use complex words",
          "Professional communication avoids objections",
        ],

      },
      {
        id: "r3q2",
        prompt: "Which skill is included in professional fluency?",
        options: [
          "Speaking without pauses at any cost",
          "Choosing appropriate directness",
          "Memorizing scripts",
          "Using the longest possible words",
        ],

      },
      {
        id: "r3q3",
        prompt: "The word 'shallow' is closest in meaning to:",
        options: ["incomplete", "deep", "accurate", "formal"],

      },
      {
        id: "r3q4",
        prompt: "According to the passage, the strongest advanced speakers:",
        options: [
          "never simplify ideas",
          "make complex ideas easier to process",
          "avoid transitions",
          "speak as quickly as possible",
        ],

      },
    ],
  },
];

const LISTENING_ITEMS = [
  {
    id: "l1",
    title: "Card replacement call",
    audioSrc: "/audio/placement/card-replacement.wav",
    duration: "45 sec",
    sourceNote: "Real two-person call recording",
    questions: [
      {
        id: "l1q1",
        prompt: "What did the caller lose?",
        options: [
          "A debit card",
          "A credit card",
          "A checkbook",
          "An account password",
        ],

      },
      {
        id: "l1q2",
        prompt: "When should the replacement arrive?",
        options: ["Today", "Tomorrow morning", "In three to five business days", "Next month"],

      },
      {
        id: "l1q3",
        prompt: "What does the agent ask near the end?",
        options: [
          "Whether the caller wants anything else",
          "Whether the caller wants to open a loan",
          "Whether the caller can visit a branch",
          "Whether the caller knows the account balance",
        ],

      },
    ],
  },
  {
    id: "l2",
    title: "Balance check call",
    audioSrc: "/audio/placement/balance-check.wav",
    duration: "35 sec",
    sourceNote: "Real two-person call recording",
    questions: [
      {
        id: "l2q1",
        prompt: "Why does the caller contact the bank?",
        options: [
          "To replace a card",
          "To check an account balance",
          "To pay a bill",
          "To schedule an appointment",
        ],

      },
      {
        id: "l2q2",
        prompt: "Which account does the caller ask about?",
        options: ["Checking", "Savings", "Credit card", "Mortgage"],

      },
      {
        id: "l2q3",
        prompt: "What balance does the agent give?",
        options: ["$60", "$106", "$160", "$600"],

      },
    ],
  },
  {
    id: "l3",
    title: "Bill payment call",
    audioSrc: "/audio/placement/bill-payment.wav",
    duration: "1 min 32 sec",
    sourceNote: "Real two-person call recording with natural phone-line noise",
    questions: [
      {
        id: "l3q1",
        prompt: "What does the caller want to do?",
        options: ["Pay a bill", "Transfer money", "Reset a password", "Order checks"],

      },
      {
        id: "l3q2",
        prompt: "What street address is given for the company?",
        options: [
          "627 First Street",
          "672 First Street",
          "762 Main Street",
          "276 Main Street",
        ],

      },
      {
        id: "l3q3",
        prompt: "How much is the bill?",
        options: ["$117", "$127", "$147", "$174"],

      },
    ],
  },
];

const SPEAKING_CHECKS = [
  {
    id: "s1",
    label: "Fluency under pressure",
    options: [
      "I can only answer with single words or memorized phrases.",
      "I can answer simple familiar questions with pauses.",
      "I can describe routine situations and recover from some pauses.",
      "I can explain opinions and keep going even when I need time.",
      "I can handle follow-up questions and adjust my answer clearly.",
      "I can speak naturally, precisely, and persuasively in complex situations.",
    ],
  },
  {
    id: "s2",
    label: "Interaction",
    options: [
      "I need the other person to speak very slowly and help a lot.",
      "I can manage predictable exchanges if the topic is familiar.",
      "I can participate in normal conversations about work and life.",
      "I can negotiate meaning, clarify, and repair misunderstandings.",
      "I can challenge, persuade, and respond diplomatically.",
      "I can adapt tone and strategy almost like a highly skilled professional speaker.",
    ],
  },
  {
    id: "s3",
    label: "Range of expression",
    options: [
      "I use isolated words and basic phrases.",
      "I use simple sentences about familiar topics.",
      "I can connect ideas with because, but, so, and when.",
      "I can explain causes, consequences, advantages, and risks.",
      "I can use nuanced language for uncertainty, emphasis, and diplomacy.",
      "I can express subtle distinctions with precision and flexibility.",
    ],
  },
  {
    id: "s4",
    label: "Pronunciation and clarity",
    options: [
      "Listeners often cannot understand me.",
      "Listeners understand me when I repeat or slow down.",
      "Listeners usually understand me, though some sounds cause difficulty.",
      "My pronunciation is clear enough for professional conversations.",
      "I can use stress, pausing, and intonation to guide the listener.",
      "My delivery supports meaning, emphasis, and relationship-building.",
    ],
  },
];

function countWords(value) {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function getReadingQuestions() {
  return READING_PASSAGES.flatMap((passage) => passage.questions);
}

function getListeningQuestions() {
  return LISTENING_ITEMS.flatMap((item) => item.questions);
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = String(seconds % 60).padStart(2, "0");
  return `${mins}:${secs}`;
}

function safeObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function hasDraftProgress(draft) {
  if (!draft || typeof draft !== "object") return false;
  return (
    Object.keys(safeObject(draft.coreAnswers)).length > 0 ||
    Object.keys(safeObject(draft.readingAnswers)).length > 0 ||
    Object.keys(safeObject(draft.listeningAnswers)).length > 0 ||
    Object.keys(safeObject(draft.speakingChecks)).length > 0 ||
    Number(draft.speakingSeconds || 0) > 0 ||
    draft.speakingMode === "live" ||
    Object.keys(safeObject(draft.listeningPlays)).length > 0 ||
    Boolean(String(draft.writing || "").trim())
  );
}

function formatSavedAt(value) {
  if (!value) return "Autosaves as you work";
  return `Autosaved ${value.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
}


const TEST_SECTIONS = [
  { id: "language", label: "Language in context", shortLabel: "Language", title: "How do you use English?", description: "A focused check of grammar, vocabulary, structure, and precision.", time: "8–12 min" },
  { id: "reading", label: "Reading for meaning", shortLabel: "Reading", title: "Read between the lines.", description: "Short texts that test detail, inference, tone, and meaning in context.", time: "8–10 min" },
  { id: "listening", label: "Listening in real situations", shortLabel: "Listening", title: "Listen for what matters.", description: "Natural conversations with detail, intent, and real-world texture.", time: "6–8 min" },
  { id: "speaking", label: "Speaking in your own voice", shortLabel: "Speaking", title: "Let your voice do the work.", description: "A private recording gives your coach evidence of real spoken English.", time: "4–6 min" },
  { id: "writing", label: "Writing with a real purpose", shortLabel: "Writing", title: "Show how you communicate.", description: "A writing task chosen for your life, reviewed by a coach.", time: "10–15 min" },
];
export default function AssessmentPage() {
  const { user } = useAuth();
  return <AssessmentExperience key={user?.id || "guest"} />;
}

function AssessmentExperience() {
  const { toast, confirmModal } = useToast();
  const { user, status: authStatus } = useAuth();
  const searchParams = useSearchParams();
  const packageId = useMemo(() => {
    const value = Number(searchParams.get("packageId"));
    return Number.isInteger(value) && value > 0 ? value : null;
  }, [searchParams]);
  const assessmentNextPath = packageId ? `/assessment?packageId=${packageId}` : "/assessment";

  const [coreAnswers, setCoreAnswers] = useState({});
  const [readingAnswers, setReadingAnswers] = useState({});
  const [listeningAnswers, setListeningAnswers] = useState({});
  const [speakingChecks, setSpeakingChecks] = useState({});
  const [speakingSeconds, setSpeakingSeconds] = useState(0);
  const [speakingActive, setSpeakingActive] = useState(false);
  const [writing, setWriting] = useState("");
  const [writingTaskId, setWritingTaskId] = useState(WRITING_TASKS[0].id);
  const [listeningPlays, setListeningPlays] = useState({});
  const [speakingRecording, setSpeakingRecording] = useState(null);
  const [recording, setRecording] = useState(false);
  const [recordingError, setRecordingError] = useState("");
  const [speakingMode, setSpeakingMode] = useState("recording");
  const [recordingBusy, setRecordingBusy] = useState(false);
  const [draftError, setDraftError] = useState("");
  const [audioError, setAudioError] = useState("");
  const [playingId, setPlayingId] = useState(null);
  const [audioPositions, setAudioPositions] = useState({});
  const [questionPage, setQuestionPage] = useState(0);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);
  const [draftReady, setDraftReady] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [draftFound, setDraftFound] = useState(false);
  const [started, setStarted] = useState(false);
  const [activeSection, setActiveSection] = useState(0);
  const [autosaveEnabled, setAutosaveEnabled] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const autosaveTimer = useRef(null);
  const recorderRef = useRef(null);
  const mountedRef = useRef(true);
  const recordingStartedAt = useRef(0);
  const discardRecordingRef = useRef(false);
  const attemptIdRef = useRef("");
  const stopPromiseRef = useRef(null);
  const streamRef = useRef(null);
  const recordingChunksRef = useRef([]);
  const listeningAudioRefs = useRef({});
  const sectionHeadingRef = useRef(null);
  const wordCount = useMemo(() => countWords(writing), [writing]);

  const draftStorageKey = useMemo(
    () => (user?.id ? `${DRAFT_KEY}:${user.id}` : DRAFT_KEY),
    [user?.id]
  );

  const getAttemptId = useCallback(() => {
    if (attemptIdRef.current) return attemptIdRef.current;
    const next =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `attempt-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    attemptIdRef.current = next;
    return next;
  }, []);

  const sectionComplete = useMemo(
    () => [
      Object.keys(coreAnswers).length === CORE_ITEMS.length,
      Object.keys(readingAnswers).length === getReadingQuestions().length,
      Object.keys(listeningAnswers).length === getListeningQuestions().length,
      speakingMode === "live" || Boolean(speakingRecording && speakingRecording.seconds >= 30),
      wordCount >= WRITING_MIN,
    ],
    [coreAnswers, listeningAnswers, readingAnswers, speakingRecording, speakingMode, wordCount]
  );

  const completion = useMemo(() => {
    const answered = Object.keys(coreAnswers).length + Object.keys(readingAnswers).length +
      Object.keys(listeningAnswers).length + (sectionComplete[3] ? 1 : 0) + (wordCount > 0 ? 1 : 0);
    return Math.min(100, Math.round(answered / 47 * 100));
  }, [coreAnswers, readingAnswers, listeningAnswers, sectionComplete, wordCount]);

  useEffect(() => {
    if (authStatus === "checking") return undefined;
    if (!user) {
      setInitialLoading(false);
      setDraftReady(true);
      return undefined;
    }
    let active = true;
    setDraftReady(false);
    setInitialLoading(true);

    (async () => {
      let serverData = null;
      try {
        const { data } = await api.get("/me/assessment");
        serverData = data || null;
      } catch {}

      let localDraft = null;
      try {
        const scoped = window.localStorage.getItem(draftStorageKey);
        // Unscoped legacy drafts have no reliable owner; never import another account's answers.
        if (scoped) localDraft = JSON.parse(scoped);
      } catch {}

      if (!active) return;
      if (serverData) {
        const serverResult = serverData.reviewMeta?.placementResult;
        if (serverResult || serverData.status === "reviewed") setResult({
          ...serverResult,
          status: serverData.status,
          band: serverData.status === "reviewed" ? { level: serverData.cefr, label: "Coach-confirmed placement" } : null,
          feedback: serverData.feedback,
        });
      }
      if (localDraft && hasDraftProgress(localDraft)) {
        setCoreAnswers(safeObject(localDraft.coreAnswers));
        setReadingAnswers(safeObject(localDraft.readingAnswers));
        setListeningAnswers(safeObject(localDraft.listeningAnswers));
        setSpeakingChecks(safeObject(localDraft.speakingChecks));
        setResult(null);
        setSpeakingSeconds(0);
        setListeningPlays(safeObject(localDraft.listeningPlays));
        setAudioPositions(safeObject(localDraft.audioPositions));
        setSpeakingMode(localDraft.speakingMode === "live" ? "live" : "recording");
        setQuestionPage(Math.max(0, Math.min(5, Number(localDraft.questionPage) || 0)));
        try {
          const audio = await loadPlacementAudio(draftStorageKey);
          if (!active) return;
          if (audio?.attemptId === localDraft.attemptId && audio.blob?.size) {
            setSpeakingRecording({ ...audio, url: URL.createObjectURL(audio.blob) });
            setSpeakingSeconds(audio.seconds);
          }
        } catch { setDraftError("Saved answers are available, but the recording could not be restored. Please record again or choose a live speaking check."); }
        setWriting(String(localDraft.writing || ""));
        setWritingTaskId(localDraft.writingTaskId || WRITING_TASKS[0].id);
        setActiveSection(Math.max(0, Math.min(TEST_SECTIONS.length - 1, Number(localDraft.activeSection) || 0)));
        attemptIdRef.current = localDraft.attemptId || "";
        setDraftFound(true);
        setAutosaveEnabled(true);
        if (localDraft.updatedAt) {
          const savedAt = new Date(localDraft.updatedAt);
          if (!Number.isNaN(savedAt.getTime())) setLastSavedAt(savedAt);
        }
      }
      setInitialLoading(false);
      setDraftReady(true);
    })();

    return () => {
      active = false;
    };
  }, [authStatus, draftStorageKey, user?.id]);

  useEffect(() => {
    if (started) {
      sectionHeadingRef.current?.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: "instant" });
    }
    setPlayingId(null);
  }, [activeSection, started, questionPage]);

  useEffect(() => {
    if (!speakingActive) return undefined;
    const timer = window.setInterval(() => {
      setSpeakingSeconds(Math.min(180, Math.floor((Date.now() - recordingStartedAt.current) / 1000)));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [speakingActive]);

  useEffect(() => {
    if (speakingSeconds >= 180) {
      setSpeakingActive(false);
      if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    }
  }, [speakingSeconds]);

  useEffect(() => () => {
    if (speakingRecording?.url) URL.revokeObjectURL(speakingRecording.url);
  }, [speakingRecording]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      discardRecordingRef.current = true;
      if (recorderRef.current?.state === "recording") recorderRef.current.stop();
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const saveDraftNow = useCallback(() => {
    if (!draftReady || !autosaveEnabled || !user || typeof window === "undefined") return;
    const savedAt = new Date();
    const draft = {
      placementVersion: PLACEMENT_VERSION,
      attemptId: getAttemptId(),
      activeSection,
      questionPage,
      listeningPlays,
      audioPositions,
      speakingMode,
      coreAnswers,
      readingAnswers,
      listeningAnswers,
      speakingChecks,
      speakingSeconds,
      writing,
      writingTaskId,
      updatedAt: savedAt.toISOString(),
    };
    try {
      if (!hasDraftProgress(draft)) {
        window.localStorage.removeItem(draftStorageKey);
        setLastSavedAt(null);
        return true;
      }
      window.localStorage.setItem(draftStorageKey, JSON.stringify(draft));
      setLastSavedAt(savedAt);
      setDraftError("");
      return true;
    } catch {
      setDraftError("This browser could not save your answers. Keep this page open and try again before leaving.");
      return false;
    }
  }, [activeSection, questionPage, listeningPlays, audioPositions, speakingMode, autosaveEnabled, coreAnswers, draftReady, draftStorageKey, getAttemptId, listeningAnswers, readingAnswers, speakingChecks, speakingSeconds, user, writing, writingTaskId]);

  useEffect(() => {
    if (!draftReady || !autosaveEnabled) return undefined;
    if (autosaveTimer.current) window.clearTimeout(autosaveTimer.current);
    autosaveTimer.current = window.setTimeout(saveDraftNow, 300);
    return () => {
      if (autosaveTimer.current) window.clearTimeout(autosaveTimer.current);
    };
  }, [autosaveEnabled, draftReady, saveDraftNow]);

  useEffect(() => {
    if (!draftReady || !autosaveEnabled) return undefined;
    const flush = () => saveDraftNow();
    const flushHidden = () => document.visibilityState === "hidden" && saveDraftNow();
    window.addEventListener("beforeunload", flush);
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", flushHidden);
    return () => {
      window.removeEventListener("beforeunload", flush);
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", flushHidden);
    };
  }, [autosaveEnabled, draftReady, saveDraftNow]);

  const setAnswer = (setter, id, value) => {
    setAutosaveEnabled(true);
    setter((current) => {
      const next = { ...current };
      if (value === "") delete next[id];
      else next[id] = Number(value);
      return next;
    });
  };

  const startListening = async (id) => {
    const audio = listeningAudioRefs.current[id];
    if (!audio) return;
    if (!audio.paused) { audio.pause(); setPlayingId(null); return; }
    const plays = Number(listeningPlays[id] || 0);
    const resumeAt = Number(audioPositions[id] || 0);
    if (plays >= 2 && !resumeAt) return;
    Object.values(listeningAudioRefs.current).forEach((other) => { if (other !== audio) other?.pause(); });
    audio.currentTime = resumeAt || 0;
    try {
      await audio.play();
      if (!resumeAt) setListeningPlays((current) => ({ ...current, [id]: plays + 1 }));
      setPlayingId(id);
      setAudioError("");
      setAutosaveEnabled(true);
    } catch {
      setAudioError("The clip could not play. Check your sound or connection, then try again. This has not used a play.");
    }
  };

  const startRecording = async () => {
    if (recording || recordingBusy) return;
    setRecordingError("");
    if (!navigator.mediaDevices?.getUserMedia || typeof window.MediaRecorder !== "function") {
      setRecordingError("Recording is unavailable in this browser. You can choose a live speaking check below.");
      return;
    }
    setRecordingBusy(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mountedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      const mimeType = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((type) => MediaRecorder.isTypeSupported(type)) || "";
      const recorder = new MediaRecorder(stream, { ...(mimeType ? { mimeType } : {}), audioBitsPerSecond: 64000 });
      recorderRef.current = recorder;
      discardRecordingRef.current = false;
      recordingChunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data?.size) recordingChunksRef.current.push(event.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        setSpeakingActive(false);
        setRecording(false);
        if (discardRecordingRef.current) { stopPromiseRef.current?.(); return; }
        const seconds = Math.min(180, Math.floor((Date.now() - recordingStartedAt.current) / 1000));
        const blob = new Blob(recordingChunksRef.current, { type: recorder.mimeType || "audio/webm" });
        const captured = { blob, mimeType: blob.type, seconds, attemptId: getAttemptId() };
        setSpeakingRecording({ ...captured, url: URL.createObjectURL(blob) });
        setSpeakingSeconds(seconds);
        setRecordingBusy(true);
        try { await savePlacementAudio(draftStorageKey, captured); }
        catch { setRecordingError("Your recording is available here, but could not be saved on this device. Submit before closing this page, or choose a live speaking check."); }
        finally { setRecordingBusy(false); stopPromiseRef.current?.(); stopPromiseRef.current = null; }
      };
      recorder.onerror = () => {
        stream.getTracks().forEach((track) => track.stop());
        setRecording(false);
        setSpeakingActive(false);
        setRecordingError("Recording was interrupted. Please try again or choose a live speaking check.");
      };
      recordingStartedAt.current = Date.now();
      recorder.start();
      setRecording(true);
      setSpeakingMode("recording");
      setSpeakingSeconds(0);
      setSpeakingActive(true);
      setAutosaveEnabled(true);
    } catch {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      setRecordingError("Microphone access was not granted. Try again or choose a live speaking check below.");
    } finally { setRecordingBusy(false); }
  };

  const stopRecording = () => {
    if (recorderRef.current?.state !== "recording") return Promise.resolve();
    return new Promise((resolve) => {
      stopPromiseRef.current = resolve;
      recorderRef.current.stop();
    });
  };

  const resetRecording = async () => {
    discardRecordingRef.current = true;
    await stopRecording();
    setRecording(false);
    setSpeakingActive(false);
    setSpeakingSeconds(0);
    setSpeakingRecording(null);
    setRecordingError("");
    await clearPlacementAudio(draftStorageKey).catch(() => {});
  };

  const blobToDataUrl = (blob) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

  const resetDraft = async () => {
    const ok = await confirmModal("Clear this placement attempt? Your saved answers will be removed.");
    if (!ok) return;
    await resetRecording();
    setCoreAnswers({});
    setReadingAnswers({});
    setListeningAnswers({});
    setListeningPlays({});
    setAudioPositions({});
    setSpeakingMode("recording");
    setQuestionPage(0);
    setSpeakingChecks({});
    setSpeakingSeconds(0);
    setSpeakingRecording(null);
    setSpeakingActive(false);
    setWriting("");
    setWritingTaskId(WRITING_TASKS[0].id);
    setResult(null);
    setDraftFound(false);
    setStarted(false);
    setActiveSection(0);
    attemptIdRef.current = "";
    try { window.localStorage.removeItem(draftStorageKey); } catch {}
    setLastSavedAt(null);
    setAutosaveEnabled(false);
  };

  const submit = async (event) => {
    event.preventDefault();
    if (saving || recording || recordingBusy) return;
    const missingObjective = !sectionComplete[0] || !sectionComplete[1] || !sectionComplete[2];
    if (missingObjective) {
      toast.error("Complete the language, reading, and listening sections before submitting.");
      setActiveSection(!sectionComplete[0] ? 0 : !sectionComplete[1] ? 1 : 2);
      return;
    }
    if (speakingMode !== "live" && (!speakingRecording || speakingRecording.seconds < 30)) {
      toast.error("Record at least 30 seconds for the speaking sample before submitting.");
      setActiveSection(3);
      return;
    }
    if (!wordCount) { toast.error("Write a short response before submitting."); return; }
    if (wordCount > WRITING_MAX) {
      toast.error(`Keep the writing sample under ${WRITING_MAX} words.`);
      setActiveSection(4);
      return;
    }
    if (wordCount < WRITING_MIN && !(await confirmModal(`Your response is ${wordCount} words. A response of at least ${WRITING_MIN} words gives your coach better evidence. Submit anyway?`))) return;

    setSaving(true);
    try {
      const audioDataUrl = speakingMode === "live" ? "" : await blobToDataUrl(speakingRecording.blob);
      if (audioDataUrl.length > 3_000_000) {
        toast.error("That recording is too large. Please record a shorter response.");
        setActiveSection(3);
        return;
      }
      const { data } = await api.post("/me/assessment", {
        attemptId: getAttemptId(),
        packageId,
        text: writing,
        reviewMeta: {
          placementVersion: PLACEMENT_VERSION,
          answers: { coreAnswers, readingAnswers, listeningAnswers, speakingChecks },
          speaking: {
            mode: speakingMode,
            seconds: speakingMode === "live" ? 0 : speakingRecording.seconds,
            mimeType: speakingMode === "live" ? "" : speakingRecording.mimeType,
            audioDataUrl,
          },
          writingTaskId,
          listeningPlays,
          completedAt: new Date().toISOString(),
        },
      });
      const authoritativeResult = data?.submission?.reviewMeta?.placementResult;
      if (!data?.submission?.id || !authoritativeResult) throw new Error("Invalid submission response");
      setResult(authoritativeResult);
      setStarted(false);
      setDraftFound(false);
      setAutosaveEnabled(false);
      try { window.localStorage.removeItem(draftStorageKey); } catch {}
      await clearPlacementAudio(draftStorageKey).catch(() => {});
      setLastSavedAt(null);
      trackEvent("placement_test_submitted", { score: authoritativeResult.score, cefr: authoritativeResult.band?.level, wordCount });
      toast.success("Your assessment is complete. A coach will confirm your placement.");
    } catch (error) {
      toast.error(error?.response?.data?.error || "We could not submit your assessment. Your draft is still saved.");
    } finally {
      setSaving(false);
    }
  };

  const activeWritingTask = WRITING_TASKS.find((task) => task.id === writingTaskId) || WRITING_TASKS[0];
  const startOrResume = () => {
    setStarted(true);
    setResult(null);
    setAutosaveEnabled(true);
    getAttemptId();
  };

  const saveAndExit = async () => {
    await stopRecording();
    if (!saveDraftNow()) return;
    if (completion > 0) setDraftFound(true);
    setStarted(false);
    toast.success("Your answers are saved on this device. Return using the same browser and account.");
  };

  const renderSection = () => {
    switch (activeSection) {
      case 0:
        return (
          <section className="placement-section" aria-labelledby="placement-section-language">
            <header><span>Stage 1 · 8–12 min</span><h2 id="placement-section-language">Language in context</h2><p>Choose the sentence that sounds right. The questions become more challenging. Choose “I’m not sure” when you don’t know; this helps us see where support will be useful.</p></header>
            <div className="placement-question-grid">
              {CORE_ITEMS.slice(questionPage * 4, questionPage * 4 + 4).map((item, index) => (
                <fieldset className="placement-question" key={item.id}>
                  <legend><span>{questionPage * 4 + index + 1}</span>{item.prompt}</legend>
                  {item.options.map((option, optionIndex) => (
                    <label key={option}><input type="radio" name={item.id} value={optionIndex} checked={coreAnswers[item.id] === optionIndex} onChange={() => setAnswer(setCoreAnswers, item.id, optionIndex)} /><span>{option}</span></label>
                  ))}
                  <label><input type="radio" name={item.id} value={-1} checked={coreAnswers[item.id] === -1} onChange={() => setAnswer(setCoreAnswers, item.id, -1)} /><span>I’m not sure</span></label>
                </fieldset>
              ))}
            </div>
            <div className="placement-question-pagination"><button type="button" className="placement-secondary-button" disabled={questionPage === 0} onClick={() => setQuestionPage((page) => page - 1)}>Previous questions</button><span>Set {questionPage + 1} of 6</span><button type="button" className="placement-primary-button" disabled={questionPage === 5} onClick={() => setQuestionPage((page) => page + 1)}>Next questions</button></div>
          </section>
        );
      case 1:
        return (
          <section className="placement-section" aria-labelledby="placement-section-reading">
            <header><span>Stage 2 · 8–10 min</span><h2 id="placement-section-reading">Reading for meaning</h2><p>Read each short text at your own pace. Look for the main idea, detail, inference, tone, and meaning in context.</p></header>
            {READING_PASSAGES.map((passage) => (
              <article className="placement-passage" key={passage.id}><h3>{passage.title}</h3><p>{passage.text}</p><div className="placement-question-grid">{passage.questions.map((question) => (<fieldset className="placement-question" key={question.id}><legend>{question.prompt}</legend>{question.options.map((option, optionIndex) => (<label key={option}><input type="radio" name={question.id} value={optionIndex} checked={readingAnswers[question.id] === optionIndex} onChange={() => setAnswer(setReadingAnswers, question.id, optionIndex)} /><span>{option}</span></label>))}</fieldset>))}</div></article>
            ))}
          </section>
        );
      case 2:
        return (
          <section className="placement-section" aria-labelledby="placement-section-listening">
            <header><span>Stage 3 · 6–8 min</span><h2 id="placement-section-listening">Listening in real situations</h2><p>Each clip can be played twice. Listen for gist, detail, numbers, and what the speaker means.</p></header>
            {audioError && <p role="alert" className="placement-recording-error">{audioError}</p>}
            {LISTENING_ITEMS.map((item) => (
              <article className="placement-listening" key={item.id}>
                <div className="placement-listening-header"><div><h3>{item.title}</h3><p>{item.sourceNote}</p></div><span>{item.duration} · {Math.max(0, 2 - Number(listeningPlays[item.id] || 0))} plays left</span></div>
                <audio ref={(node) => { listeningAudioRefs.current[item.id] = node; }} preload="metadata" src={item.audioSrc}
                  onTimeUpdate={(event) => { const time = Math.floor(event.currentTarget.currentTime); setAudioPositions((current) => current[item.id] === time ? current : { ...current, [item.id]: time }); }}
                  onEnded={() => { setPlayingId(null); setAudioPositions((current) => ({ ...current, [item.id]: 0 })); }}
                  onError={() => setAudioError("The audio could not load. Check your connection and try again.")}
                  aria-label={`${item.title} listening clip`} />
                <button type="button" className="placement-primary-button placement-audio-button" onClick={() => startListening(item.id)} disabled={Number(listeningPlays[item.id] || 0) >= 2 && !audioPositions[item.id] && playingId !== item.id}>
                  {playingId === item.id ? "Pause clip" : audioPositions[item.id] ? "Resume clip" : Number(listeningPlays[item.id] || 0) ? "Replay clip" : "Play clip"}
                </button>
                <div className="placement-question-grid">{item.questions.map((question) => (<fieldset className="placement-question" key={question.id}><legend>{question.prompt}</legend>{question.options.map((option, optionIndex) => (<label key={option}><input type="radio" name={question.id} value={optionIndex} checked={listeningAnswers[question.id] === optionIndex} onChange={() => setAnswer(setListeningAnswers, question.id, optionIndex)} /><span>{option}</span></label>))}</fieldset>))}</div>
              </article>
            ))}
            <p className="placement-privacy-note">Audio adapted from the <a href="https://github.com/cricketclub/gridspace-stanford-harper-valley" target="_blank" rel="noreferrer">Harper Valley speech dataset</a>, licensed under CC BY 4.0.</p>
          </section>
        );
      case 3:
        return (
          <section className="placement-section" aria-labelledby="placement-section-speaking">
            <header><span>Stage 4 · 4–6 min</span><h2 id="placement-section-speaking">Speaking in your own voice</h2><p>Record one natural response. Your coach will review it for fluency, range, pronunciation, and clarity. Interaction is checked in a live conversation.</p></header>
            <div className="placement-speaking-task"><div><h3>Speaking prompt</h3><p>Speak for 60–90 seconds about a situation where English matters to you. Explain the context, the challenge, what you wanted to achieve, and how the conversation ended.</p><p className="placement-speaking-note">You may retry before submitting. The recording is private to your coaching team.</p></div><div className="placement-timer"><strong aria-label="Recording duration">{formatTime(speakingSeconds)}</strong>{recording ? <button type="button" className="placement-primary-button" onClick={stopRecording}>Stop recording</button> : <button type="button" className="placement-primary-button" onClick={startRecording} disabled={recordingBusy}>{speakingRecording ? "Record again" : "Record response"}</button>}<button type="button" className="placement-secondary-button" onClick={resetRecording} disabled={recordingBusy}>Reset</button></div></div>
            <label className="placement-live-option"><input type="checkbox" checked={speakingMode === "live"} disabled={recording || recordingBusy} onChange={(event) => { setSpeakingMode(event.target.checked ? "live" : "recording"); setAutosaveEnabled(true); }} /><span>I need to complete speaking live with a coach. My placement will remain pending until that conversation.</span></label>
            {recordingError && <p className="placement-recording-error" role="alert">{recordingError}</p>}
            {speakingRecording?.url && <div className="placement-recording-preview"><span>Recording ready for coach review</span><audio controls src={speakingRecording.url} /></div>}
            <details className="placement-self-reflection"><summary>Optional: tell your coach how speaking feels for you</summary><div className="placement-speaking-grid">{SPEAKING_CHECKS.map((check) => (<fieldset className="placement-speaking-check" key={check.id}><legend>{check.label}</legend><select aria-label={check.label} value={speakingChecks[check.id] ?? ""} onChange={(event) => setAnswer(setSpeakingChecks, check.id, event.target.value)}><option value="">Optional self-check</option>{check.options.map((option, index) => <option value={index} key={option}>{option}</option>)}</select></fieldset>))}</div></details>
          </section>
        );
      case 4:
      default:
        return (
          <section className="placement-section" aria-labelledby="placement-section-writing">
            <header><span>Stage 5 · 10–15 min</span><h2 id="placement-section-writing">Writing with a real purpose</h2><p>Choose the situation that feels closest to your life. Write {WRITING_TARGET} words; your coach will review organization, control, range, and clarity.</p></header>
            <label className="placement-task-select" htmlFor="writing-task">Task type<select id="writing-task" value={writingTaskId} onChange={(event) => setWritingTaskId(event.target.value)}>{WRITING_TASKS.map((task) => <option value={task.id} key={task.id}>{task.label}</option>)}</select></label>
            <div className="placement-writing-prompt"><h3>{activeWritingTask.label}</h3><p>{activeWritingTask.prompt}</p></div>
            <label className="placement-writing-label" htmlFor="placement-writing"><span>Your written response</span><textarea id="placement-writing" rows={14} value={writing} onChange={(event) => { setAutosaveEnabled(true); setWriting(event.target.value); }} placeholder="Write naturally. There is no need to use words you would not normally use." /></label>
            <p className="placement-word-count">{wordCount} words · target {WRITING_TARGET} · suggested minimum {WRITING_MIN} · maximum {WRITING_MAX}</p>
          </section>
        );
    }
  };

  if (authStatus === "checking" || initialLoading) return <main className="placement-page"><section className="placement-gate" aria-live="polite"><div className="placement-gate__spinner" /><p>Preparing your private assessment…</p></section></main>;
  if (!user) return <main className="placement-page"><section className="placement-gate"><p className="placement-kicker">Speexify placement</p><h1>Find your real starting point.</h1><p>Sign in before you begin so your progress and responses stay attached to your account. Your speaking sample is attached when you submit.</p><div className="placement-gate__actions"><Link href={`/login?next=${encodeURIComponent(assessmentNextPath)}`} className="placement-primary-button">Sign in to begin</Link><Link href={`/register?next=${encodeURIComponent(assessmentNextPath)}`} className="placement-secondary-button">Create an account</Link></div></section></main>;
  if (result && !started) return <main className="placement-page"><section className="placement-result placement-result--final" aria-live="polite"><div><span>{result.status === "reviewed" ? "Your placement" : "Assessment received"}</span><strong>{result.status === "reviewed" ? result.band?.level || "Reviewed" : "Thank you."}</strong><p>{result.status === "reviewed" ? "Reviewed by your coach" : "Your coach will confirm your starting level."}</p><small>{result.feedback || "Your objective results are below. Speaking and writing need a coach’s review before we assign a CEFR level."}</small></div><dl>{Object.entries(result.sectionScores || {}).map(([name, score]) => <div key={name}><dt>{name}</dt><dd>{score}%</dd></div>)}</dl><div className="placement-result__actions"><button type="button" className="placement-secondary-button" onClick={resetDraft}>Start a new attempt</button><Link href="/dashboard" className="placement-primary-button">Go to dashboard</Link></div></section></main>;
  if (!started) return <main className="placement-page"><section className="placement-gate placement-gate--welcome"><p className="placement-kicker">Speexify placement</p><h1>Find your real starting point.</h1><p>A calm, multi-skill baseline for the English you use in real life. You will complete five short stages in about 35–50 minutes, with the option to pause and return on this device. You can visit the stages in any order.</p><div className="placement-roadmap">{TEST_SECTIONS.map((section, index) => <div key={section.id}><span>{String(index + 1).padStart(2, "0")}</span><div><strong>{section.label}</strong><small>{section.time}</small></div></div>)}</div><div className="placement-gate__actions"><button type="button" className="placement-primary-button" onClick={startOrResume}>{draftFound ? "Continue my assessment" : "Begin assessment"}</button>{draftFound && <button type="button" className="placement-secondary-button" onClick={resetDraft}>Start over</button>}</div><p className="placement-privacy-note">Your draft stays in this browser until you submit. Your submitted responses are private to your coaching team. Your objective questions are scored automatically; a coach confirms the final placement.</p></section></main>;

  return <main className="placement-page" aria-labelledby="placement-title"><section className="placement-hero"><div><p className="placement-kicker">Stage {activeSection + 1} of {TEST_SECTIONS.length}</p><h1 id="placement-title">{TEST_SECTIONS[activeSection].title}</h1><p>{TEST_SECTIONS[activeSection].description}</p></div><aside className="placement-status"><span>Assessment progress</span><strong>{completion}%</strong><div className="placement-progress" role="progressbar" aria-label={`${completion}% complete`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={completion}><span style={{ width: `${completion}%` }} /></div><small>{sectionComplete.filter(Boolean).length} of {TEST_SECTIONS.length} stages ready</small><small className="placement-autosave">{formatSavedAt(lastSavedAt)}</small></aside></section><nav className="placement-stepper" aria-label="Assessment stages">{TEST_SECTIONS.map((section, index) => <button type="button" key={section.id} className={`${index === activeSection ? "is-active" : ""} ${sectionComplete[index] ? "is-complete" : ""}`} aria-current={index === activeSection ? "step" : undefined} disabled={saving || recording || recordingBusy} onClick={() => setActiveSection(index)}><span>{sectionComplete[index] ? "✓" : String(index + 1).padStart(2, "0")}</span><strong>{section.shortLabel}</strong><small>{section.time}</small></button>)}</nav><form className="placement-form" onSubmit={submit}>{draftError && <p role="alert" className="placement-recording-error">{draftError}</p>}<div ref={sectionHeadingRef} tabIndex={-1}>{renderSection()}</div><footer className="placement-section placement-actions"><button type="button" className="placement-secondary-button" onClick={() => setActiveSection((current) => Math.max(0, current - 1))} disabled={activeSection === 0 || saving || recording || recordingBusy}>Back</button><button type="button" className="placement-secondary-button" onClick={saveAndExit} disabled={saving || recordingBusy}>Save and exit</button>{activeSection < TEST_SECTIONS.length - 1 ? <button type="button" className="placement-primary-button" disabled={recording || recordingBusy} onClick={() => activeSection === 0 && questionPage < 5 ? setQuestionPage((page) => page + 1) : setActiveSection((current) => Math.min(TEST_SECTIONS.length - 1, current + 1))}>Continue</button> : <button type="submit" className="placement-primary-button" disabled={saving || recording || recordingBusy}>{saving ? "Submitting…" : "Submit for coach review"}</button>}</footer></form></main>;
}
