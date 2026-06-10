"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { trackEvent } from "@/lib/analytics";
import { useToast } from "@/components/ToastProvider";
import useAuth from "@/hooks/useAuth";

const PLACEMENT_VERSION = "speexify-placement-v1";
const DRAFT_KEY = "speexifyPlacementDraft_v1";
const WRITING_MIN = 140;
const WRITING_TARGET = "180-260";
const WRITING_MAX = 620;

const CEFR_BANDS = [
  { level: "A1.1", min: 0, label: "Starter" },
  { level: "A1.2", min: 9, label: "Elementary foundation" },
  { level: "A2.1", min: 17, label: "Basic communicator" },
  { level: "A2.2", min: 26, label: "Developing communicator" },
  { level: "B1.1", min: 35, label: "Independent entry" },
  { level: "B1.2", min: 46, label: "Independent user" },
  { level: "B2.1", min: 57, label: "Upper-intermediate" },
  { level: "B2.2", min: 68, label: "Advanced operational" },
  { level: "C1.1", min: 79, label: "Advanced professional" },
  { level: "C1.2", min: 88, label: "Highly proficient" },
  { level: "C2.1", min: 95, label: "Near-native range" },
  { level: "C2.2", min: 99, label: "Mastery" },
];

const CORE_ITEMS = [
  {
    id: "c1",
    level: "A1",
    prompt: "Maria ___ from Brazil.",
    options: ["are", "is", "be", "am"],
    answer: 1,
  },
  {
    id: "c2",
    level: "A1",
    prompt: "I usually have coffee ___ the morning.",
    options: ["in", "on", "at", "to"],
    answer: 0,
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
    answer: 1,
  },
  {
    id: "c4",
    level: "A1",
    prompt: "There ___ two emails in my inbox.",
    options: ["is", "are", "has", "be"],
    answer: 1,
  },
  {
    id: "c5",
    level: "A2",
    prompt: "We ___ the client yesterday afternoon.",
    options: ["meet", "met", "have met", "meeting"],
    answer: 1,
  },
  {
    id: "c6",
    level: "A2",
    prompt: "This report is ___ than the first version.",
    options: ["clear", "clearest", "clearer", "more clear than"],
    answer: 2,
  },
  {
    id: "c7",
    level: "A2",
    prompt: "You ___ bring your passport to the interview. It is required.",
    options: ["should", "may", "can", "could"],
    answer: 0,
  },
  {
    id: "c8",
    level: "A2",
    prompt: "I have ___ time before the meeting, so I can help.",
    options: ["a few", "a little", "many", "any"],
    answer: 1,
  },
  {
    id: "c9",
    level: "B1",
    prompt: "I ___ in this role for three years.",
    options: ["work", "worked", "have worked", "am working"],
    answer: 2,
  },
  {
    id: "c10",
    level: "B1",
    prompt: "If the supplier lowers the price, we ___ the contract.",
    options: ["signed", "would sign", "will sign", "signing"],
    answer: 2,
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
    answer: 1,
  },
  {
    id: "c12",
    level: "B1",
    prompt: "Choose the best synonym for 'delay' in a business context.",
    options: ["postpone", "increase", "approve", "compare"],
    answer: 0,
  },
  {
    id: "c13",
    level: "B2",
    prompt: "She ___ have misunderstood the brief; her proposal answers a different problem.",
    options: ["must", "should", "would", "can"],
    answer: 0,
  },
  {
    id: "c14",
    level: "B2",
    prompt: "The presentation was effective, ___ it could have used stronger evidence.",
    options: ["despite", "although", "however", "therefore"],
    answer: 1,
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
    answer: 2,
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
    answer: 0,
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
    answer: 1,
  },
  {
    id: "c18",
    level: "C1",
    prompt: "The proposal is sound, but its assumptions require further ___.",
    options: ["scrutiny", "glance", "sight", "notice"],
    answer: 0,
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
    answer: 0,
  },
  {
    id: "c20",
    level: "C1",
    prompt: "The manager's feedback was constructive, if somewhat ___.",
    options: ["blunt", "blunted", "bluntly", "bluntness"],
    answer: 0,
  },
  {
    id: "c21",
    level: "C2",
    prompt: "The report avoids sensationalism and gives a ___ account of the incident.",
    options: ["measured", "measurable", "measuring", "measurement"],
    answer: 0,
  },
  {
    id: "c22",
    level: "C2",
    prompt: "Choose the most precise completion: The CEO's remarks were not wrong, but they were politically ___.",
    options: ["naive", "naively", "naivety", "naiver"],
    answer: 0,
  },
  {
    id: "c23",
    level: "C2",
    prompt: "Which phrase best means 'to reduce the intensity of criticism'?",
    options: ["temper criticism", "template criticism", "tamper criticism", "tender criticism"],
    answer: 0,
  },
  {
    id: "c24",
    level: "C2",
    prompt: "The board approved the strategy, ___ reservations about execution risk.",
    options: ["notwithstanding", "whereas", "inasmuch", "lest"],
    answer: 0,
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
        answer: 1,
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
        answer: 2,
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
        answer: 1,
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
        answer: 1,
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
        answer: 1,
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
        answer: 1,
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
        answer: 2,
      },
      {
        id: "r2q4",
        prompt: "The writer's tone is best described as:",
        options: ["practical and analytical", "angry and dismissive", "comic", "uncertain"],
        answer: 0,
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
        answer: 1,
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
        answer: 1,
      },
      {
        id: "r3q3",
        prompt: "The word 'shallow' is closest in meaning to:",
        options: ["incomplete", "deep", "accurate", "formal"],
        answer: 0,
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
        answer: 1,
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
        answer: 1,
      },
      {
        id: "l1q2",
        prompt: "When should the replacement arrive?",
        options: ["Today", "Tomorrow morning", "In three to five business days", "Next month"],
        answer: 2,
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
        answer: 0,
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
        answer: 1,
      },
      {
        id: "l2q2",
        prompt: "Which account does the caller ask about?",
        options: ["Checking", "Savings", "Credit card", "Mortgage"],
        answer: 1,
      },
      {
        id: "l2q3",
        prompt: "What balance does the agent give?",
        options: ["$60", "$106", "$160", "$600"],
        answer: 1,
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
        answer: 0,
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
        answer: 1,
      },
      {
        id: "l3q3",
        prompt: "How much is the bill?",
        options: ["$117", "$127", "$147", "$174"],
        answer: 2,
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

function percentage(correct, total) {
  if (!total) return 0;
  return Math.round((correct / total) * 100);
}

function getBand(score) {
  const bounded = Math.max(0, Math.min(100, Math.round(score)));
  return CEFR_BANDS.reduce((current, band) => {
    return bounded >= band.min ? band : current;
  }, CEFR_BANDS[0]);
}

function answerKey(items) {
  return items.reduce((map, item) => {
    map[item.id] = item.answer;
    return map;
  }, {});
}

function getReadingQuestions() {
  return READING_PASSAGES.flatMap((passage) => passage.questions);
}

function getListeningQuestions() {
  return LISTENING_ITEMS.flatMap((item) => item.questions);
}

function scoreItems(items, answers) {
  const keys = answerKey(items);
  const correct = items.reduce((total, item) => {
    return total + (Number(answers[item.id]) === keys[item.id] ? 1 : 0);
  }, 0);
  return { correct, total: items.length, score: percentage(correct, items.length) };
}

function scoreWriting(text) {
  const normalized = text.replace(/\s+/g, " ").trim();
  const words = normalized ? normalized.split(" ") : [];
  const wordCount = words.length;
  const sentences = normalized.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean);
  const paragraphs = text.split(/\n+/).map((s) => s.trim()).filter(Boolean);
  const unique = new Set(words.map((word) => word.toLowerCase().replace(/[^a-z'-]/g, ""))).size;
  const lexicalDiversity = wordCount ? unique / wordCount : 0;
  const connectors = [
    "however",
    "therefore",
    "although",
    "whereas",
    "moreover",
    "nevertheless",
    "consequently",
    "because",
    "despite",
    "in addition",
    "for example",
    "on the other hand",
  ].filter((phrase) => normalized.toLowerCase().includes(phrase)).length;
  const advancedWords = words.filter((word) => word.replace(/[^a-z]/gi, "").length >= 9).length;
  const avgSentenceLength = sentences.length ? wordCount / sentences.length : 0;
  const likelyErrors = [
    /\bi am agree\b/i,
    /\bhe go\b/i,
    /\bshe go\b/i,
    /\bit depend\b/i,
    /\bmore better\b/i,
    /\bpeople is\b/i,
    /\bi have \d+ years old\b/i,
  ].filter((pattern) => pattern.test(normalized)).length;

  const task =
    wordCount >= 180 ? 100 : wordCount >= WRITING_MIN ? 78 : Math.round((wordCount / WRITING_MIN) * 70);
  const coherence = Math.min(100, paragraphs.length * 18 + connectors * 12 + sentences.length * 3);
  const range = Math.min(100, lexicalDiversity * 120 + advancedWords * 3 + connectors * 5);
  const control = Math.max(20, 86 - likelyErrors * 12 + (avgSentenceLength >= 10 && avgSentenceLength <= 26 ? 10 : 0));
  const score = Math.round(task * 0.25 + coherence * 0.25 + range * 0.25 + control * 0.25);

  return {
    score: Math.max(0, Math.min(100, score)),
    wordCount,
    metrics: {
      paragraphs: paragraphs.length,
      sentences: sentences.length,
      lexicalDiversity: Number(lexicalDiversity.toFixed(2)),
      connectors,
      advancedWords,
      likelyErrors,
    },
  };
}

function scoreSpeaking(checks, seconds) {
  const values = Object.values(checks).map(Number).filter((value) => Number.isFinite(value));
  const descriptorScore = values.length
    ? Math.round((values.reduce((sum, value) => sum + value, 0) / values.length / 5) * 100)
    : 0;
  const durationScore = seconds >= 90 ? 100 : seconds >= 60 ? 82 : seconds >= 30 ? 55 : 25;
  return Math.round(descriptorScore * 0.8 + durationScore * 0.2);
}

function buildFeedback(result) {
  const { level, label } = result.band;
  const weakest = Object.entries(result.sectionScores)
    .sort((a, b) => a[1] - b[1])
    .slice(0, 2)
    .map(([name]) => name)
    .join(" and ");

  return `Provisional Speexify placement: ${level} (${label}). Strongest section: ${result.strongestSection}. Priority development area: ${weakest}. This automated result should be confirmed in a live speaking session before final placement.`;
}

function buildResult({ coreAnswers, readingAnswers, listeningAnswers, speakingChecks, speakingSeconds, writing }) {
  const core = scoreItems(CORE_ITEMS, coreAnswers);
  const reading = scoreItems(getReadingQuestions(), readingAnswers);
  const listening = scoreItems(getListeningQuestions(), listeningAnswers);
  const writingScore = scoreWriting(writing);
  const speaking = scoreSpeaking(speakingChecks, speakingSeconds);

  const sectionScores = {
    "language use": core.score,
    reading: reading.score,
    listening: listening.score,
    writing: writingScore.score,
    speaking,
  };
  const overall = Math.round(
    sectionScores["language use"] * 0.35 +
      sectionScores.reading * 0.2 +
      sectionScores.listening * 0.15 +
      sectionScores.writing * 0.2 +
      sectionScores.speaking * 0.1
  );
  const strongestSection = Object.entries(sectionScores).sort((a, b) => b[1] - a[1])[0][0];
  const band = getBand(overall);

  return {
    version: PLACEMENT_VERSION,
    score: overall,
    band,
    strongestSection,
    sectionScores,
    raw: {
      core,
      reading,
      listening,
      writing: writingScore,
      speaking: { score: speaking, seconds: speakingSeconds },
    },
  };
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
    Boolean(String(draft.writing || "").trim())
  );
}

function formatSavedAt(value) {
  if (!value) return "Autosaves as you work";
  return `Autosaved ${value.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
}

export default function AssessmentPage() {
  const { toast, confirmModal } = useToast();
  const { hasSessionCookie } = useAuth();
  const [coreAnswers, setCoreAnswers] = useState({});
  const [readingAnswers, setReadingAnswers] = useState({});
  const [listeningAnswers, setListeningAnswers] = useState({});
  const [speakingChecks, setSpeakingChecks] = useState({});
  const [speakingSeconds, setSpeakingSeconds] = useState(0);
  const [speakingActive, setSpeakingActive] = useState(false);
  const [writing, setWriting] = useState("");
  const [saving, setSaving] = useState(false);
  const [last, setLast] = useState(null);
  const [result, setResult] = useState(null);
  const [draftReady, setDraftReady] = useState(false);
  const [autosaveEnabled, setAutosaveEnabled] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const autosaveTimer = useRef(null);
  const wordCount = useMemo(() => countWords(writing), [writing]);

  useEffect(() => {
    let active = true;

    const applyDraft = (draft) => {
      setCoreAnswers(safeObject(draft.coreAnswers));
      setReadingAnswers(safeObject(draft.readingAnswers));
      setListeningAnswers(safeObject(draft.listeningAnswers));
      setSpeakingChecks(safeObject(draft.speakingChecks));
      setSpeakingSeconds(Number(draft.speakingSeconds || 0));
      setWriting(draft.writing || "");
      if (draft.updatedAt) {
        const savedAt = new Date(draft.updatedAt);
        if (!Number.isNaN(savedAt.getTime())) setLastSavedAt(savedAt);
      }
    };

    (async () => {
      let serverData = null;
      if (hasSessionCookie) {
        try {
          const { data } = await api.get("/me/assessment");
          serverData = data || null;
        } catch {}
      }

      let localDraft = null;
      try {
        const local = window.localStorage.getItem(DRAFT_KEY);
        if (local) {
          localDraft = JSON.parse(local);
        }
      } catch {}

      if (!active) return;

      if (localDraft && hasDraftProgress(localDraft)) {
        applyDraft(localDraft);
        if (serverData) setLast(serverData);
        setAutosaveEnabled(true);
      } else if (serverData) {
        setLast(serverData);
        if (serverData.text) setWriting(serverData.text);
        if (serverData.reviewMeta?.placementResult) {
          setResult(serverData.reviewMeta.placementResult);
        }
        setAutosaveEnabled(false);
      } else {
        setAutosaveEnabled(true);
      }

      setDraftReady(true);
    })();

    return () => {
      active = false;
    };
  }, [hasSessionCookie]);

  useEffect(() => {
    if (!speakingActive) return undefined;
    const timer = window.setInterval(() => {
      setSpeakingSeconds((seconds) => Math.min(180, seconds + 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [speakingActive]);

  useEffect(() => {
    if (speakingSeconds >= 180) setSpeakingActive(false);
  }, [speakingSeconds]);

  const saveDraftNow = useCallback(() => {
    if (!draftReady || !autosaveEnabled || typeof window === "undefined") return;

    const savedAt = new Date();
    const draft = {
      placementVersion: PLACEMENT_VERSION,
      coreAnswers,
      readingAnswers,
      listeningAnswers,
      speakingChecks,
      speakingSeconds,
      writing,
      updatedAt: savedAt.toISOString(),
    };

    try {
      if (!hasDraftProgress(draft)) {
        window.localStorage.removeItem(DRAFT_KEY);
        setLastSavedAt(null);
        return;
      }

      window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      setLastSavedAt(savedAt);
    } catch {}
  }, [
    autosaveEnabled,
    coreAnswers,
    draftReady,
    listeningAnswers,
    readingAnswers,
    speakingChecks,
    speakingSeconds,
    writing,
  ]);

  useEffect(() => {
    if (!draftReady || !autosaveEnabled) return undefined;
    if (autosaveTimer.current) window.clearTimeout(autosaveTimer.current);
    autosaveTimer.current = window.setTimeout(saveDraftNow, 250);

    return () => {
      if (autosaveTimer.current) window.clearTimeout(autosaveTimer.current);
    };
  }, [autosaveEnabled, draftReady, saveDraftNow]);

  useEffect(() => {
    if (!draftReady || !autosaveEnabled) return undefined;

    const flushDraft = () => saveDraftNow();
    const flushHiddenDraft = () => {
      if (document.visibilityState === "hidden") saveDraftNow();
    };

    window.addEventListener("beforeunload", flushDraft);
    window.addEventListener("pagehide", flushDraft);
    document.addEventListener("visibilitychange", flushHiddenDraft);

    return () => {
      window.removeEventListener("beforeunload", flushDraft);
      window.removeEventListener("pagehide", flushDraft);
      document.removeEventListener("visibilitychange", flushHiddenDraft);
    };
  }, [autosaveEnabled, draftReady, saveDraftNow]);

  const completion = useMemo(() => {
    const total =
      CORE_ITEMS.length +
      getReadingQuestions().length +
      getListeningQuestions().length +
      SPEAKING_CHECKS.length +
      1;
    const done =
      Object.keys(coreAnswers).length +
      Object.keys(readingAnswers).length +
      Object.keys(listeningAnswers).length +
      Object.keys(speakingChecks).length +
      (wordCount >= WRITING_MIN ? 1 : 0);
    return Math.min(100, Math.round((done / total) * 100));
  }, [coreAnswers, readingAnswers, listeningAnswers, speakingChecks, wordCount]);

  const setAnswer = (setter, id, value) => {
    setAutosaveEnabled(true);
    setter((current) => ({ ...current, [id]: Number(value) }));
  };

  const validate = async () => {
    const missingCore = CORE_ITEMS.length - Object.keys(coreAnswers).length;
    const missingReading = getReadingQuestions().length - Object.keys(readingAnswers).length;
    const missingListening = getListeningQuestions().length - Object.keys(listeningAnswers).length;
    const missingSpeaking = SPEAKING_CHECKS.length - Object.keys(speakingChecks).length;

    if (missingCore || missingReading || missingListening || missingSpeaking) {
      toast.error("Please complete all objective, reading, listening, and speaking check questions.");
      return false;
    }

    if (wordCount < WRITING_MIN) {
      const ok = await confirmModal(
        `Your writing sample is ${wordCount} words. For a reliable placement, write at least ${WRITING_MIN} words. Submit anyway?`
      );
      if (!ok) return false;
    }

    if (wordCount > WRITING_MAX) {
      toast.error(`Please keep the writing sample under ${WRITING_MAX} words.`);
      return false;
    }

    return true;
  };

  const submit = async (e) => {
    e.preventDefault();
    const valid = await validate();
    if (!valid) return;

    const placementResult = buildResult({
      coreAnswers,
      readingAnswers,
      listeningAnswers,
      speakingChecks,
      speakingSeconds,
      writing,
    });
    const feedback = buildFeedback(placementResult);

    setSaving(true);
    try {
      const { data } = await api.post("/me/assessment", {
        text: writing,
        score: placementResult.score,
        cefr: placementResult.band.level,
        feedback,
        reviewMeta: {
          placementVersion: PLACEMENT_VERSION,
          placementResult,
          answers: {
            coreAnswers,
            readingAnswers,
            listeningAnswers,
            speakingChecks,
          },
          speakingSeconds,
          completedAt: new Date().toISOString(),
        },
      });

      trackEvent("placement_test_submitted", {
        score: placementResult.score,
        cefr: placementResult.band.level,
        wordCount,
      });

      setResult(placementResult);
      setLast(data?.submission || { createdAt: new Date().toISOString() });
      try {
        window.localStorage.removeItem(DRAFT_KEY);
      } catch {}
      setLastSavedAt(null);
      setAutosaveEnabled(false);
      toast.success(`Placement complete: ${placementResult.band.level}`);
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to submit placement test");
    } finally {
      setSaving(false);
    }
  };

  const resetDraft = async () => {
    const ok = await confirmModal("Clear this placement draft? This cannot be undone.");
    if (!ok) return;
    setCoreAnswers({});
    setReadingAnswers({});
    setListeningAnswers({});
    setSpeakingChecks({});
    setSpeakingSeconds(0);
    setSpeakingActive(false);
    setWriting("");
    setResult(null);
    try {
      window.localStorage.removeItem(DRAFT_KEY);
    } catch {}
    setLastSavedAt(null);
    setAutosaveEnabled(true);
  };

  return (
    <main className="placement-page" aria-labelledby="placement-title">
      <section className="placement-hero">
        <div>
          <p className="placement-kicker">Speexify placement test</p>
          <h1 id="placement-title">Professional English placement</h1>
          <p>
            A longer multi-skill test for language use, reading, listening,
            speaking readiness, and writing. Your result is mapped from A1.1 to
            C2.2 and should be confirmed by a coach in your first live session.
          </p>
        </div>
        <aside className="placement-status">
          <span>Estimated time</span>
          <strong>45-60 min</strong>
          <div
            className="placement-progress"
            role="progressbar"
            aria-label={`${completion}% complete`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={completion}
          >
            <span style={{ width: `${completion}%` }} />
          </div>
          <small>{completion}% complete</small>
          <small className="placement-autosave">{formatSavedAt(lastSavedAt)}</small>
        </aside>
      </section>

      {result && (
        <section className="placement-result" aria-live="polite">
          <div>
            <span>Your provisional level</span>
            <strong>{result.band.level}</strong>
            <p>{result.band.label}</p>
          </div>
          <dl>
            {Object.entries(result.sectionScores).map(([name, score]) => (
              <div key={name}>
                <dt>{name}</dt>
                <dd>{score}%</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {last?.createdAt && (
        <p className="placement-last">
          Last submitted: {new Date(last.createdAt).toLocaleString()}
        </p>
      )}

      <form className="placement-form" onSubmit={submit}>
        <section className="placement-section">
          <header>
            <span>Section 1</span>
            <h2>Language use</h2>
            <p>Grammar, vocabulary, structure, and precision from A1 to C2.</p>
          </header>
          <div className="placement-question-grid">
            {CORE_ITEMS.map((item, index) => (
              <fieldset className="placement-question" key={item.id}>
                <legend>
                  <span>{index + 1}</span>
                  {item.prompt}
                </legend>
                {item.options.map((option, optionIndex) => (
                  <label key={option}>
                    <input
                      type="radio"
                      name={item.id}
                      value={optionIndex}
                      checked={coreAnswers[item.id] === optionIndex}
                      onChange={() => setAnswer(setCoreAnswers, item.id, optionIndex)}
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </fieldset>
            ))}
          </div>
        </section>

        <section className="placement-section">
          <header>
            <span>Section 2</span>
            <h2>Reading</h2>
            <p>Read for detail, inference, tone, and main argument.</p>
          </header>
          {READING_PASSAGES.map((passage) => (
            <article className="placement-passage" key={passage.id}>
              <h3>{passage.title}</h3>
              <p>{passage.text}</p>
              <div className="placement-question-grid">
                {passage.questions.map((question) => (
                  <fieldset className="placement-question" key={question.id}>
                    <legend>{question.prompt}</legend>
                    {question.options.map((option, optionIndex) => (
                      <label key={option}>
                        <input
                          type="radio"
                          name={question.id}
                          value={optionIndex}
                          checked={readingAnswers[question.id] === optionIndex}
                          onChange={() =>
                            setAnswer(setReadingAnswers, question.id, optionIndex)
                          }
                        />
                        <span>{option}</span>
                      </label>
                    ))}
                  </fieldset>
                ))}
              </div>
            </article>
          ))}
        </section>

        <section className="placement-section">
          <header>
            <span>Section 3</span>
            <h2>Listening</h2>
            <p>
              Play each real conversation once or twice, then answer from memory.
              Expect natural pauses, repairs, accents, and phone-line texture.
            </p>
          </header>
          {LISTENING_ITEMS.map((item) => (
            <article className="placement-listening" key={item.id}>
              <div className="placement-listening-header">
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.sourceNote}</p>
                </div>
                <span>{item.duration}</span>
              </div>
              <audio
                className="placement-audio-player"
                controls
                preload="none"
                src={item.audioSrc}
              >
                Your browser does not support embedded audio.
              </audio>
              <div className="placement-question-grid">
                {item.questions.map((question) => (
                  <fieldset className="placement-question" key={question.id}>
                    <legend>{question.prompt}</legend>
                    {question.options.map((option, optionIndex) => (
                      <label key={option}>
                        <input
                          type="radio"
                          name={question.id}
                          value={optionIndex}
                          checked={listeningAnswers[question.id] === optionIndex}
                          onChange={() =>
                            setAnswer(setListeningAnswers, question.id, optionIndex)
                          }
                        />
                        <span>{option}</span>
                      </label>
                    ))}
                  </fieldset>
                ))}
              </div>
            </article>
          ))}
        </section>

        <section className="placement-section">
          <header>
            <span>Section 4</span>
            <h2>Speaking</h2>
            <p>
              Use the timer to answer the prompt aloud. Then choose the
              descriptors that honestly match your performance.
            </p>
          </header>
          <div className="placement-speaking-task">
            <div>
              <h3>Speaking prompt</h3>
              <p>
                Speak for 60-90 seconds: Describe a professional situation
                where you need better English. Explain the context, the problem,
                and what successful communication would sound like.
              </p>
            </div>
            <div className="placement-timer">
              <strong>{formatTime(speakingSeconds)}</strong>
              <button
                type="button"
                className="placement-primary-button"
                onClick={() => {
                  setAutosaveEnabled(true);
                  setSpeakingActive((active) => !active);
                }}
              >
                {speakingActive ? "Pause" : "Start timer"}
              </button>
              <button
                type="button"
                className="placement-secondary-button"
                onClick={() => {
                  setAutosaveEnabled(true);
                  setSpeakingActive(false);
                  setSpeakingSeconds(0);
                }}
              >
                Reset
              </button>
            </div>
          </div>
          <div className="placement-speaking-grid">
            {SPEAKING_CHECKS.map((check) => (
              <fieldset className="placement-speaking-check" key={check.id}>
                <legend>{check.label}</legend>
                <select
                  aria-label={check.label}
                  value={speakingChecks[check.id] ?? ""}
                  onChange={(e) => setAnswer(setSpeakingChecks, check.id, e.target.value)}
                >
                  <option value="">Choose the closest descriptor</option>
                  {check.options.map((option, index) => (
                    <option value={index} key={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </fieldset>
            ))}
          </div>
        </section>

        <section className="placement-section">
          <header>
            <span>Section 5</span>
            <h2>Writing</h2>
            <p>
              Write {WRITING_TARGET} words. This section checks organization,
              grammar control, vocabulary range, and professional clarity.
            </p>
          </header>
          <div className="placement-writing-prompt">
            <h3>Writing task</h3>
            <p>
              Your company is considering whether to offer English coaching to
              employees. Write a message to a manager explaining why this could
              be useful, what problems it should solve, and how success should
              be measured after three months.
            </p>
          </div>
          <label className="placement-writing-label" htmlFor="placement-writing">
            <span>Your written response</span>
            <textarea
              id="placement-writing"
              rows={14}
              value={writing}
              onChange={(e) => {
                setAutosaveEnabled(true);
                setWriting(e.target.value);
              }}
              placeholder="Write your response here..."
            />
          </label>
          <p className="placement-word-count">
            {wordCount} words · target {WRITING_TARGET} · minimum {WRITING_MIN}
          </p>
        </section>

        <section className="placement-submit">
          <div>
            <h2>Submit placement test</h2>
            <p>
              You will receive an immediate provisional CEFR sublevel. Speexify
              should still validate speaking in a live session before making a
              final coaching plan.
            </p>
          </div>
          <div>
            <button type="submit" className="placement-primary-button" disabled={saving}>
              {saving ? "Scoring..." : "Score and submit"}
            </button>
            <button type="button" className="placement-secondary-button" onClick={resetDraft}>
              Clear draft
            </button>
            <Link href="/dashboard" className="placement-dashboard-link">
              Back to dashboard
            </Link>
          </div>
        </section>
      </form>
    </main>
  );
}
