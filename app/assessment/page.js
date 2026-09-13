"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
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
    labelAr: "رسالة في الشغل",
    prompt:
      "Your company is considering whether to offer English coaching to employees. Write a message to a manager explaining why this could be useful, what problems it should solve, and how success should be measured after three months.",
  },
  {
    id: "decision",
    label: "Professional decision",
    labelAr: "قرار مهني",
    prompt:
      "Write a short recommendation to a colleague about whether your team should change the way it runs meetings. Explain the problem, propose a change, and acknowledge one possible drawback.",
  },
  {
    id: "everyday",
    label: "Real-life explanation",
    labelAr: "موقف من الحياة اليومية",
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
    format: "Listen and select",
    focus: "Main idea and key detail",
    title: "Card replacement call",
    titleAr: "مكالمة استبدال كارت",
    audioSrc: "/audio/placement/card-replacement.wav",
    duration: "45 sec",
    durationAr: "٤٥ ثانية",
    sourceNote: "Real two-person call recording",
    sourceNoteAr: "تسجيل مكالمة حقيقية بين شخصين",
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
    format: "Listen and select",
    focus: "Specific information",
    title: "Balance check call",
    titleAr: "مكالمة معرفة الرصيد",
    audioSrc: "/audio/placement/balance-check.wav",
    duration: "35 sec",
    durationAr: "٣٥ ثانية",
    sourceNote: "Real two-person call recording",
    sourceNoteAr: "تسجيل مكالمة حقيقية بين شخصين",
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
    format: "Extended listening",
    focus: "Details and sequence",
    title: "Bill payment call",
    titleAr: "مكالمة دفع فاتورة",
    audioSrc: "/audio/placement/bill-payment.wav",
    duration: "1 min 32 sec",
    durationAr: "دقيقة و٣٢ ثانية",
    sourceNote: "Real two-person call recording with natural phone-line noise",
    sourceNoteAr: "تسجيل مكالمة حقيقية وفيه صوت خط طبيعي",
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
    labelAr: "الطلاقة تحت ضغط",
    options: [
      "I can only answer with single words or memorized phrases.",
      "I can answer simple familiar questions with pauses.",
      "I can describe routine situations and recover from some pauses.",
      "I can explain opinions and keep going even when I need time.",
      "I can handle follow-up questions and adjust my answer clearly.",
      "I can speak naturally, precisely, and persuasively in complex situations.",
    ],
    optionsAr: [
      "بقدر أرد بكلمات منفصلة أو جمل محفوظة بس.",
      "بقدر أرد على أسئلة بسيطة ومألوفة، بس مع توقفات.",
      "بقدر أوصف مواقف عادية وأكمل بعد بعض التوقفات.",
      "بقدر أشرح رأيي وأكمل حتى لو محتاج أفكر لحظة.",
      "بقدر أتعامل مع أسئلة متابعة وأعدّل إجابتي بوضوح.",
      "بقدر أتكلم بطبيعية ودقة وإقناع في مواقف معقدة.",
    ],
  },
  {
    id: "s2",
    label: "Interaction",
    labelAr: "التفاعل في الحوار",
    options: [
      "I need the other person to speak very slowly and help a lot.",
      "I can manage predictable exchanges if the topic is familiar.",
      "I can participate in normal conversations about work and life.",
      "I can negotiate meaning, clarify, and repair misunderstandings.",
      "I can challenge, persuade, and respond diplomatically.",
      "I can adapt tone and strategy almost like a highly skilled professional speaker.",
    ],
    optionsAr: [
      "بحتاج الشخص التاني يتكلم ببطء شديد ويساعدني كتير.",
      "بقدر أتعامل مع حوارات متوقعة لو الموضوع مألوف.",
      "بقدر أشارك في محادثات عادية عن الشغل والحياة.",
      "بقدر أوضح قصدي، وأسأل، وأصلّح أي سوء فهم.",
      "بقدر أعترض، وأقنع، وأرد بدبلوماسية.",
      "بقدر أظبط النبرة وطريقة الكلام شبه متحدث مهني قوي.",
    ],
  },
  {
    id: "s3",
    label: "Range of expression",
    labelAr: "تنوع التعبير",
    options: [
      "I use isolated words and basic phrases.",
      "I use simple sentences about familiar topics.",
      "I can connect ideas with because, but, so, and when.",
      "I can explain causes, consequences, advantages, and risks.",
      "I can use nuanced language for uncertainty, emphasis, and diplomacy.",
      "I can express subtle distinctions with precision and flexibility.",
    ],
    optionsAr: [
      "بستخدم كلمات منفصلة وجمل بسيطة جدًا.",
      "بستخدم جمل بسيطة عن مواضيع مألوفة.",
      "بقدر أربط الأفكار بكلمات زي because وbut وso وwhen.",
      "بقدر أشرح الأسباب والنتائج والمميزات والمخاطر.",
      "بقدر أستخدم لغة فيها دقة للشك، والتأكيد، والدبلوماسية.",
      "بقدر أعبّر عن فروق دقيقة بمرونة ووضوح.",
    ],
  },
  {
    id: "s4",
    label: "Pronunciation and clarity",
    labelAr: "النطق والوضوح",
    options: [
      "Listeners often cannot understand me.",
      "Listeners understand me when I repeat or slow down.",
      "Listeners usually understand me, though some sounds cause difficulty.",
      "My pronunciation is clear enough for professional conversations.",
      "I can use stress, pausing, and intonation to guide the listener.",
      "My delivery supports meaning, emphasis, and relationship-building.",
    ],
    optionsAr: [
      "الناس غالبًا بتتعب عشان تفهمني.",
      "الناس بتفهمني لما أعيد أو أبطّأ الكلام.",
      "الناس غالبًا بتفهمني، مع إن بعض الأصوات بتعمل صعوبة.",
      "نطقي واضح كفاية للمحادثات المهنية.",
      "بقدر أستخدم الضغط، والوقفات، والنبرة عشان أوصل المعنى.",
      "طريقة كلامي بتساعد المعنى والتأثير والعلاقة مع اللي قدامي.",
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

function formatSavedAt(value, copy, locale) {
  if (!value) return copy.autosaveIdle;
  const time = value.toLocaleTimeString(locale === "ar" ? "ar-EG" : undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  return copy.autosavedAt(time);
}

const TEST_SECTIONS = [
  { id: "language", time: "8–12 min", timeAr: "٨–١٢ دقيقة" },
  { id: "reading", time: "8–10 min", timeAr: "٨–١٠ دقائق" },
  { id: "listening", time: "6–8 min", timeAr: "٦–٨ دقائق" },
  { id: "speaking", time: "4–6 min", timeAr: "٤–٦ دقائق" },
  { id: "writing", time: "10–15 min", timeAr: "١٠–١٥ دقيقة" },
];

const ASSESSMENT_COPY = {
  en: {
    dir: "ltr",
    gateLoading: "Preparing your private assessment…",
    kicker: "Speexify placement",
    pageTitle: "Find your real starting point.",
    authBody: "Sign in before you begin so your progress and responses stay attached to your account. Your speaking sample is attached when you submit.",
    signIn: "Sign in to begin",
    createAccount: "Create an account",
    welcomeBody: "A calm, multi-skill baseline for the English you use in real life. You will complete five short stages in about 35–50 minutes, with the option to pause and return on this device. You can visit the stages in any order.",
    continueAssessment: "Continue my assessment",
    beginAssessment: "Begin assessment",
    startOver: "Start over",
    privacyNote: "Your draft stays in this browser until you submit. Your submitted responses are private to your coaching team. Your objective questions are scored automatically; a coach confirms the final placement.",
    resultPlacement: "Your placement",
    resultReceived: "Assessment received",
    reviewed: "Reviewed",
    thankYou: "Thank you.",
    reviewedByCoach: "Reviewed by your coach",
    coachWillConfirm: "Your coach will confirm your starting level.",
    defaultResultNote: "Your objective results are below. Speaking and writing need a coach’s review before we assign a CEFR level.",
    startNewAttempt: "Start a new attempt",
    dashboard: "Go to dashboard",
    coachConfirmedPlacement: "Coach-confirmed placement",
    progressLabel: "Assessment progress",
    progressAria: (completion) => `${completion}% complete`,
    readyCount: (ready, total) => `${ready} of ${total} stages ready`,
    autosaveIdle: "Autosaves as you work",
    autosavedAt: (time) => `Autosaved ${time}`,
    stageLabel: (index, section) => `Stage ${index} · ${section.time}`,
    stageKicker: (index, total) => `Stage ${index} of ${total}`,
    stepperLabel: "Assessment stages",
    notSure: "I’m not sure",
    previousQuestions: "Previous questions",
    nextQuestions: "Next questions",
    questionSet: (page, total) => `Set ${page} of ${total}`,
    playsLeft: (count) => `${count} ${count === 1 ? "play" : "plays"} left`,
    pauseClip: "Pause clip",
    resumeClip: "Resume clip",
    replayClip: "Replay clip",
    playClip: "Play clip",
    audioAttributionPrefix: "Audio adapted from the",
    audioAttributionSuffix: "licensed under CC BY 4.0.",
    listeningClipLabel: (title) => `${title} listening clip`,
    speakingPromptTitle: "Speaking prompt",
    speakingPromptBody: "Speak for 60–90 seconds about a situation where English matters to you. Explain the context, the challenge, what you wanted to achieve, and how the conversation ended.",
    speakingNote: "You may retry before submitting. The recording is private to your coaching team.",
    recordingDurationLabel: "Recording duration",
    stopRecording: "Stop recording",
    recordAgain: "Record again",
    recordResponse: "Record response",
    reset: "Reset",
    liveOption: "I need to complete speaking live with a coach. My placement will remain pending until that conversation.",
    recordingReady: "Recording ready for coach review",
    speakingReflection: "Optional: tell your coach how speaking feels for you",
    optionalSelfCheck: "Optional self-check",
    taskType: "Task type",
    writingPromptLabel: "Your written response",
    writingPlaceholder: "Write naturally. There is no need to use words you would not normally use.",
    writingCount: (wordCount) => `${wordCount} words · target ${WRITING_TARGET} · suggested minimum ${WRITING_MIN} · maximum ${WRITING_MAX}`,
    back: "Back",
    saveAndExit: "Save and exit",
    continue: "Continue",
    submitForReview: "Submit for coach review",
    submitting: "Submitting…",
    confirmClear: "Clear this placement attempt? Your saved answers will be removed.",
    confirmShortWriting: (wordCount) => `Your response is ${wordCount} words. A response of at least ${WRITING_MIN} words gives your coach better evidence. Submit anyway?`,
    sectionNames: { language: "Language", reading: "Reading", listening: "Listening", speaking: "Speaking", writing: "Writing" },
    toasts: {
      submitted: "Your assessment is complete. A coach will confirm your placement.",
      saved: "Your answers are saved on this device. Return using the same browser and account.",
    },
    errors: {
      restoreRecording: "Saved answers are available, but the recording could not be restored. Please record again or choose a live speaking check.",
      saveDraft: "This browser could not save your answers. Keep this page open and try again before leaving.",
      audioPlay: "The clip could not play. Check your sound or connection, then try again. This has not used a play.",
      audioLoad: "The audio could not load. Check your connection and try again.",
      recordingUnavailable: "Recording is unavailable in this browser. You can choose a live speaking check below.",
      recordingSave: "Your recording is available here, but could not be saved on this device. Submit before closing this page, or choose a live speaking check.",
      recordingInterrupted: "Recording was interrupted. Please try again or choose a live speaking check.",
      microphoneDenied: "Microphone access was not granted. Try again or choose a live speaking check below.",
      missingObjective: "Complete the language, reading, and listening sections before submitting.",
      speakingTooShort: "Record at least 30 seconds for the speaking sample before submitting.",
      missingWriting: "Write a short response before submitting.",
      writingTooLong: `Keep the writing sample under ${WRITING_MAX} words.`,
      recordingTooLarge: "That recording is too large. Please record a shorter response.",
      invalidSubmission: "Invalid submission response",
      submitFallback: "We could not submit your assessment. Your draft is still saved.",
    },
    sections: {
      language: { label: "Language in context", shortLabel: "Language", title: "How do you use English?", description: "A focused check of grammar, vocabulary, structure, and precision.", heading: "Language in context", intro: "Choose the sentence that sounds right. The questions become more challenging. Choose “I’m not sure” when you don’t know; this helps us see where support will be useful." },
      reading: { label: "Reading for meaning", shortLabel: "Reading", title: "Read between the lines.", description: "Short texts that test detail, inference, tone, and meaning in context.", heading: "Reading for meaning", intro: "Read each short text at your own pace. Look for the main idea, detail, inference, tone, and meaning in context." },
      listening: { label: "Listening in real situations", shortLabel: "Listening", title: "Listen for what matters.", description: "Natural conversations with detail, intent, and real-world texture.", heading: "Listening in real situations", intro: "You will hear short and extended recordings twice. Start with the main idea, then listen for details, implied meaning, and the order of events. Questions follow the Cambridge-style placement formats." },
      speaking: { label: "Speaking in your own voice", shortLabel: "Speaking", title: "Let your voice do the work.", description: "A private recording gives your coach evidence of real spoken English.", heading: "Speaking in your own voice", intro: "Record one natural response. Your coach will review it for fluency, range, pronunciation, and clarity. Interaction is checked in a live conversation." },
      writing: { label: "Writing with a real purpose", shortLabel: "Writing", title: "Show how you communicate.", description: "A writing task chosen for your life, reviewed by a coach.", heading: "Writing with a real purpose", intro: `Choose the situation that feels closest to your life. Write ${WRITING_TARGET} words; your coach will review organization, control, range, and clarity.` },
    },
  },
  ar: {
    dir: "rtl",
    gateLoading: "بنجهّز اختبارك الخاص…",
    kicker: "اختبار مستوى Speexify",
    pageTitle: "اعرف نقطة البداية الحقيقية.",
    authBody: "سجّل دخول قبل ما تبدأ عشان إجاباتك وتقدمك يفضلوا مرتبطين بحسابك. تسجيل الكلام بيتضاف لما تبعت الاختبار.",
    signIn: "سجّل دخول وابدأ",
    createAccount: "اعمل حساب",
    welcomeBody: "اختبار هادي بيقيس الإنجليزي اللي بتستخدمه في الحياة والشغل: قراءة، استماع، كتابة، وكلام. هتخلص خمس مراحل قصيرة في حوالي ٣٥–٥٠ دقيقة، وتقدر توقف وترجع من نفس الجهاز. المراحل مش لازم تمشي بترتيب ثابت.",
    continueAssessment: "كمّل الاختبار",
    beginAssessment: "ابدأ الاختبار",
    startOver: "ابدأ من جديد",
    privacyNote: "المسودة بتفضل في المتصفح ده لحد ما تبعتها. بعد الإرسال، إجاباتك خاصة بفريق التدريب. الأسئلة الموضوعية بتتقيّم تلقائيًا، والمدرّب بيأكد المستوى النهائي.",
    resultPlacement: "مستواك",
    resultReceived: "استلمنا الاختبار",
    reviewed: "تمت المراجعة",
    thankYou: "شكرًا.",
    reviewedByCoach: "المدرّب راجع النتيجة",
    coachWillConfirm: "المدرّب هيأكد مستوى البداية المناسب ليك.",
    defaultResultNote: "نتائج الأسئلة الموضوعية ظاهرة تحت. الكلام والكتابة محتاجين مراجعة من المدرّب قبل تحديد مستوى CEFR النهائي.",
    startNewAttempt: "ابدأ محاولة جديدة",
    dashboard: "روح للداشبورد",
    coachConfirmedPlacement: "مستوى مؤكَّد من المدرّب",
    progressLabel: "تقدم الاختبار",
    progressAria: (completion) => `${completion}% مكتمل`,
    readyCount: (ready, total) => `${ready} من ${total} مراحل جاهزة`,
    autosaveIdle: "الحفظ التلقائي شغال وأنت بتجاوب",
    autosavedAt: (time) => `اتحفظ تلقائيًا ${time}`,
    stageLabel: (index, section) => `المرحلة ${index} · ${section.timeAr}`,
    stageKicker: (index, total) => `المرحلة ${index} من ${total}`,
    stepperLabel: "مراحل الاختبار",
    notSure: "مش متأكد",
    previousQuestions: "الأسئلة السابقة",
    nextQuestions: "الأسئلة اللي بعدها",
    questionSet: (page, total) => `المجموعة ${page} من ${total}`,
    playsLeft: (count) => `متبقي ${count} تشغيل`,
    pauseClip: "وقف المقطع",
    resumeClip: "كمّل المقطع",
    replayClip: "شغّل المقطع تاني",
    playClip: "شغّل المقطع",
    audioAttributionPrefix: "الصوت مأخوذ بتصرف من",
    audioAttributionSuffix: "بترخيص CC BY 4.0.",
    listeningClipLabel: (title) => `مقطع استماع: ${title}`,
    speakingPromptTitle: "مهمة الكلام",
    speakingPromptBody: "اتكلم بالإنجليزي لمدة ٦٠–٩٠ ثانية عن موقف اللغة فيه مهمة بالنسبة لك. اشرح السياق، التحدي، كنت عايز توصل لإيه، والمحادثة انتهت إزاي.",
    speakingNote: "تقدر تعيد التسجيل قبل الإرسال. التسجيل خاص بفريق التدريب بس.",
    recordingDurationLabel: "مدة التسجيل",
    stopRecording: "وقف التسجيل",
    recordAgain: "سجّل تاني",
    recordResponse: "سجّل الإجابة",
    reset: "امسح التسجيل",
    liveOption: "محتاج أعمل جزء الكلام لايف مع المدرّب. النتيجة هتفضل قيد المراجعة لحد المحادثة دي.",
    recordingReady: "التسجيل جاهز لمراجعة المدرّب",
    speakingReflection: "اختياري: قول للمدرّب الكلام بالإنجليزي بيحسسك بإيه",
    optionalSelfCheck: "تقييم ذاتي اختياري",
    taskType: "نوع المهمة",
    writingPromptLabel: "إجابتك المكتوبة",
    writingPlaceholder: "اكتب بالإنجليزي بطبيعتك. مش محتاج تستخدم كلمات مش بتستخدمها عادة.",
    writingCount: (wordCount) => `${wordCount} كلمة · الهدف ${WRITING_TARGET} · الحد المقترح ${WRITING_MIN} · الحد الأقصى ${WRITING_MAX}`,
    back: "رجوع",
    saveAndExit: "احفظ واخرج",
    continue: "كمّل",
    submitForReview: "ابعت للمراجعة",
    submitting: "بنبعت…",
    confirmClear: "تمسح محاولة اختبار المستوى دي؟ الإجابات المحفوظة هتتمسح.",
    confirmShortWriting: (wordCount) => `إجابتك ${wordCount} كلمة. لو كتبت ${WRITING_MIN} كلمة على الأقل، المدرّب هيقدر يقيّم كتابتك بدقة أكتر. تبعتها كده؟`,
    sectionNames: { language: "اللغة", reading: "القراءة", listening: "الاستماع", speaking: "الكلام", writing: "الكتابة" },
    toasts: { submitted: "اختبارك اكتمل. المدرّب هيأكد المستوى المناسب ليك.", saved: "إجاباتك اتحفظت على الجهاز ده. ارجع من نفس المتصفح ونفس الحساب." },
    errors: { restoreRecording: "إجاباتك المحفوظة موجودة، بس التسجيل ماقدرناش نرجّعه. سجّل تاني أو اختار جزء كلام لايف مع المدرّب.", saveDraft: "المتصفح ده ماقدرش يحفظ إجاباتك. سيب الصفحة مفتوحة وجرب تاني قبل ما تخرج.", audioPlay: "المقطع ما اشتغلش. راجع الصوت أو الاتصال وجرب تاني. المحاولة دي مش محسوبة من مرات التشغيل.", audioLoad: "الصوت ما اتحمّلش. راجع الاتصال وجرب تاني.", recordingUnavailable: "التسجيل مش متاح في المتصفح ده. تقدر تختار جزء كلام لايف مع المدرّب تحت.", recordingSave: "التسجيل موجود هنا، بس ماقدرناش نحفظه على الجهاز ده. ابعت الاختبار قبل ما تقفل الصفحة، أو اختار جزء كلام لايف مع المدرّب.", recordingInterrupted: "التسجيل اتقطع. جرب تاني أو اختار جزء كلام لايف مع المدرّب.", microphoneDenied: "إذن الميكروفون ما اتفتحش. جرب تاني أو اختار جزء كلام لايف مع المدرّب تحت.", missingObjective: "كمّل أجزاء اللغة والقراءة والاستماع قبل الإرسال.", speakingTooShort: "سجّل ٣٠ ثانية على الأقل في جزء الكلام قبل الإرسال.", missingWriting: "اكتب إجابة قصيرة قبل الإرسال.", writingTooLong: `خلي إجابة الكتابة أقل من ${WRITING_MAX} كلمة.`, recordingTooLarge: "التسجيل كبير جدًا. سجّل إجابة أقصر شوية.", invalidSubmission: "رد الإرسال غير صحيح", submitFallback: "ماقدرناش نبعت الاختبار. المسودة لسه محفوظة." },
    sections: {
      language: { label: "اللغة في السياق", shortLabel: "اللغة", title: "بتستخدم الإنجليزي إزاي؟", description: "قياس مركز للنحو، والمفردات، وتركيب الجملة، ودقة الاختيار.", heading: "اللغة في السياق", intro: "اختار الجملة اللي صوتها طبيعي. الأسئلة بتزيد صعوبة تدريجيًا. لو مش عارف، اختار «مش متأكد» عشان نعرف فين الدعم هيكون مفيد." },
      reading: { label: "القراءة وفهم المعنى", shortLabel: "القراءة", title: "اقرأ اللي بين السطور.", description: "نصوص قصيرة بتقيس الفكرة الرئيسية، التفاصيل، الاستنتاج، النبرة، والمعنى في السياق.", heading: "القراءة وفهم المعنى", intro: "اقرأ كل نص بهدوء. ركّز على الفكرة، التفاصيل، الاستنتاج، النبرة، ومعنى الكلمات في السياق." },
      listening: { label: "الاستماع في مواقف حقيقية", shortLabel: "الاستماع", title: "اسمع اللي يهم.", description: "محادثات طبيعية فيها تفاصيل، نية، وأصوات أقرب للواقع.", heading: "الاستماع في مواقف حقيقية", intro: "كل مقطع ممكن يتشغل مرتين. اسمع عشان تفهم الفكرة، التفاصيل، الأرقام، وقصد المتكلم." },
      speaking: { label: "الكلام بصوتك الحقيقي", shortLabel: "الكلام", title: "خلّي صوتك يوضح مستواك.", description: "تسجيل خاص بيدي المدرّب دليل حقيقي على طريقة كلامك بالإنجليزي.", heading: "الكلام بصوتك الحقيقي", intro: "سجّل إجابة طبيعية واحدة. المدرّب هيراجع الطلاقة، تنوع التعبير، النطق، والوضوح. التفاعل بيتراجع في محادثة لايف." },
      writing: { label: "كتابة بهدف حقيقي", shortLabel: "الكتابة", title: "ورّينا بتتواصل كتابة إزاي.", description: "مهمة كتابة قريبة من حياتك، والمدرّب بيراجعها بدقة.", heading: "كتابة بهدف حقيقي", intro: `اختار الموقف الأقرب لحياتك. اكتب ${WRITING_TARGET} كلمة بالإنجليزي، والمدرّب هيراجع التنظيم، التحكم، تنوع اللغة، والوضوح.` },
    },
  },
};
export default function AssessmentPage() {
  const { user } = useAuth();
  return <AssessmentExperience key={user?.id || "guest"} />;
}

function AssessmentExperience() {
  const { toast, confirmModal } = useToast();
  const { user, status: authStatus } = useAuth();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const locale = pathname?.startsWith("/ar") ? "ar" : "en";
  const routePrefix = locale === "ar" ? "/ar" : "";
  const copy = ASSESSMENT_COPY[locale];
  const packageId = useMemo(() => {
    const value = Number(searchParams.get("packageId"));
    return Number.isInteger(value) && value > 0 ? value : null;
  }, [searchParams]);
  const assessmentNextPath = packageId ? `${routePrefix}/assessment?packageId=${packageId}` : `${routePrefix}/assessment`;

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
          band: serverData.status === "reviewed" ? { level: serverData.cefr, label: copy.coachConfirmedPlacement } : null,
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
        } catch { setDraftError(copy.errors.restoreRecording); }
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
  }, [authStatus, copy.coachConfirmedPlacement, copy.errors.restoreRecording, draftStorageKey, user?.id]);

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
      setDraftError(copy.errors.saveDraft);
      return false;
    }
  }, [activeSection, questionPage, listeningPlays, audioPositions, speakingMode, autosaveEnabled, coreAnswers, copy.errors.saveDraft, draftReady, draftStorageKey, getAttemptId, listeningAnswers, readingAnswers, speakingChecks, speakingSeconds, user, writing, writingTaskId]);

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
      setAudioError(copy.errors.audioPlay);
    }
  };

  const startRecording = async () => {
    if (recording || recordingBusy) return;
    setRecordingError("");
    if (!navigator.mediaDevices?.getUserMedia || typeof window.MediaRecorder !== "function") {
      setRecordingError(copy.errors.recordingUnavailable);
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
        catch { setRecordingError(copy.errors.recordingSave); }
        finally { setRecordingBusy(false); stopPromiseRef.current?.(); stopPromiseRef.current = null; }
      };
      recorder.onerror = () => {
        stream.getTracks().forEach((track) => track.stop());
        setRecording(false);
        setSpeakingActive(false);
        setRecordingError(copy.errors.recordingInterrupted);
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
      setRecordingError(copy.errors.microphoneDenied);
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
    const ok = await confirmModal(copy.confirmClear);
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
      toast.error(copy.errors.missingObjective);
      setActiveSection(!sectionComplete[0] ? 0 : !sectionComplete[1] ? 1 : 2);
      return;
    }
    if (speakingMode !== "live" && (!speakingRecording || speakingRecording.seconds < 30)) {
      toast.error(copy.errors.speakingTooShort);
      setActiveSection(3);
      return;
    }
    if (!wordCount) { toast.error(copy.errors.missingWriting); return; }
    if (wordCount > WRITING_MAX) {
      toast.error(copy.errors.writingTooLong);
      setActiveSection(4);
      return;
    }
    if (wordCount < WRITING_MIN && !(await confirmModal(copy.confirmShortWriting(wordCount)))) return;

    setSaving(true);
    try {
      const audioDataUrl = speakingMode === "live" ? "" : await blobToDataUrl(speakingRecording.blob);
      if (audioDataUrl.length > 3_000_000) {
        toast.error(copy.errors.recordingTooLarge);
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
      if (!data?.submission?.id || !authoritativeResult) throw new Error(copy.errors.invalidSubmission);
      setResult(authoritativeResult);
      setStarted(false);
      setDraftFound(false);
      setAutosaveEnabled(false);
      try { window.localStorage.removeItem(draftStorageKey); } catch {}
      await clearPlacementAudio(draftStorageKey).catch(() => {});
      setLastSavedAt(null);
      trackEvent("placement_test_submitted", { score: authoritativeResult.score, cefr: authoritativeResult.band?.level, wordCount });
      toast.success(copy.toasts.submitted);
    } catch (error) {
      toast.error(error?.response?.data?.error || copy.errors.submitFallback);
    } finally {
      setSaving(false);
    }
  };

  const activeWritingTask = WRITING_TASKS.find((task) => task.id === writingTaskId) || WRITING_TASKS[0];
  const activeWritingTaskLabel = locale === "ar" ? activeWritingTask.labelAr : activeWritingTask.label;
  const getWritingTaskLabel = (task) => (locale === "ar" ? task.labelAr : task.label);
  const getSectionCopy = (index) => copy.sections[TEST_SECTIONS[index].id];
  const getListeningTitle = (item) => (locale === "ar" ? item.titleAr : item.title);
  const getListeningDuration = (item) => (locale === "ar" ? item.durationAr : item.duration);
  const getListeningSourceNote = (item) => (locale === "ar" ? item.sourceNoteAr : item.sourceNote);
  const getSpeakingCheckLabel = (check) => (locale === "ar" ? check.labelAr : check.label);
  const getSpeakingCheckOptions = (check) => (locale === "ar" ? check.optionsAr : check.options);
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
    toast.success(copy.toasts.saved);
  };

  const renderSection = () => {
    switch (activeSection) {
      case 0:
        return (
          <section className="placement-section" aria-labelledby="placement-section-language">
            <header>
              <span>{copy.stageLabel(1, TEST_SECTIONS[0])}</span>
              <h2 id="placement-section-language">{getSectionCopy(0).heading}</h2>
              <p>{getSectionCopy(0).intro}</p>
            </header>
            <div className="placement-question-grid">
              {CORE_ITEMS.slice(questionPage * 4, questionPage * 4 + 4).map((item, index) => (
                <fieldset className="placement-question" key={item.id} dir="ltr">
                  <legend><span>{questionPage * 4 + index + 1}</span>{item.prompt}</legend>
                  {item.options.map((option, optionIndex) => (
                    <label key={option}>
                      <input type="radio" name={item.id} value={optionIndex} checked={coreAnswers[item.id] === optionIndex} onChange={() => setAnswer(setCoreAnswers, item.id, optionIndex)} />
                      <span>{option}</span>
                    </label>
                  ))}
                  <label dir={copy.dir}>
                    <input type="radio" name={item.id} value={-1} checked={coreAnswers[item.id] === -1} onChange={() => setAnswer(setCoreAnswers, item.id, -1)} />
                    <span>{copy.notSure}</span>
                  </label>
                </fieldset>
              ))}
            </div>
            <div className="placement-question-pagination">
              <button type="button" className="placement-secondary-button" disabled={questionPage === 0} onClick={() => setQuestionPage((page) => page - 1)}>{copy.previousQuestions}</button>
              <span>{copy.questionSet(questionPage + 1, 6)}</span>
              <button type="button" className="placement-primary-button" disabled={questionPage === 5} onClick={() => setQuestionPage((page) => page + 1)}>{copy.nextQuestions}</button>
            </div>
          </section>
        );
      case 1:
        return (
          <section className="placement-section" aria-labelledby="placement-section-reading">
            <header>
              <span>{copy.stageLabel(2, TEST_SECTIONS[1])}</span>
              <h2 id="placement-section-reading">{getSectionCopy(1).heading}</h2>
              <p>{getSectionCopy(1).intro}</p>
            </header>
            {READING_PASSAGES.map((passage) => (
              <article className="placement-passage" key={passage.id} dir="ltr"><h3>{passage.title}</h3><p>{passage.text}</p><div className="placement-question-grid">{passage.questions.map((question) => (<fieldset className="placement-question" key={question.id}><legend>{question.prompt}</legend>{question.options.map((option, optionIndex) => (<label key={option}><input type="radio" name={question.id} value={optionIndex} checked={readingAnswers[question.id] === optionIndex} onChange={() => setAnswer(setReadingAnswers, question.id, optionIndex)} /><span>{option}</span></label>))}</fieldset>))}</div></article>
            ))}
          </section>
        );
      case 2:
        return (
          <section className="placement-section" aria-labelledby="placement-section-listening">
            <header>
              <span>{copy.stageLabel(3, TEST_SECTIONS[2])}</span>
              <h2 id="placement-section-listening">{getSectionCopy(2).heading}</h2>
              <p>{getSectionCopy(2).intro}</p>
            </header>
            {audioError && <p role="alert" className="placement-recording-error">{audioError}</p>}
            {LISTENING_ITEMS.map((item) => {
              const title = getListeningTitle(item);
              return (
                <article className="placement-listening" key={item.id}>
                  <div className="placement-listening-header"><div><span className="placement-listening-format">{item.format}</span><h3>{title}</h3><p>{getListeningSourceNote(item)} · {item.focus}</p></div><span>{getListeningDuration(item)} · {copy.playsLeft(Math.max(0, 2 - Number(listeningPlays[item.id] || 0)))}</span></div>
                  <audio ref={(node) => { listeningAudioRefs.current[item.id] = node; }} preload="metadata" src={item.audioSrc}
                    onTimeUpdate={(event) => { const time = Math.floor(event.currentTarget.currentTime); setAudioPositions((current) => current[item.id] === time ? current : { ...current, [item.id]: time }); }}
                    onEnded={() => { setPlayingId(null); setAudioPositions((current) => ({ ...current, [item.id]: 0 })); }}
                    onError={() => setAudioError(copy.errors.audioLoad)}
                    aria-label={copy.listeningClipLabel(title)} />
                  <button type="button" className="placement-primary-button placement-audio-button" onClick={() => startListening(item.id)} disabled={Number(listeningPlays[item.id] || 0) >= 2 && !audioPositions[item.id] && playingId !== item.id}>
                    {playingId === item.id ? copy.pauseClip : audioPositions[item.id] ? copy.resumeClip : Number(listeningPlays[item.id] || 0) ? copy.replayClip : copy.playClip}
                  </button>
                  <div className="placement-question-grid" dir="ltr">{item.questions.map((question) => (<fieldset className="placement-question" key={question.id}><legend>{question.prompt}</legend>{question.options.map((option, optionIndex) => (<label key={option}><input type="radio" name={question.id} value={optionIndex} checked={listeningAnswers[question.id] === optionIndex} onChange={() => setAnswer(setListeningAnswers, question.id, optionIndex)} /><span>{option}</span></label>))}</fieldset>))}</div>
                </article>
              );
            })}
            <p className="placement-privacy-note">{copy.audioAttributionPrefix} <a href="https://github.com/cricketclub/gridspace-stanford-harper-valley" target="_blank" rel="noreferrer">Harper Valley speech dataset</a>, {copy.audioAttributionSuffix}</p>
          </section>
        );
      case 3:
        return (
          <section className="placement-section" aria-labelledby="placement-section-speaking">
            <header>
              <span>{copy.stageLabel(4, TEST_SECTIONS[3])}</span>
              <h2 id="placement-section-speaking">{getSectionCopy(3).heading}</h2>
              <p>{getSectionCopy(3).intro}</p>
            </header>
            <div className="placement-speaking-task"><div><h3>{copy.speakingPromptTitle}</h3><p>{copy.speakingPromptBody}</p><p className="placement-speaking-note">{copy.speakingNote}</p></div><div className="placement-timer"><strong aria-label={copy.recordingDurationLabel}>{formatTime(speakingSeconds)}</strong>{recording ? <button type="button" className="placement-primary-button" onClick={stopRecording}>{copy.stopRecording}</button> : <button type="button" className="placement-primary-button" onClick={startRecording} disabled={recordingBusy}>{speakingRecording ? copy.recordAgain : copy.recordResponse}</button>}<button type="button" className="placement-secondary-button" onClick={resetRecording} disabled={recordingBusy}>{copy.reset}</button></div></div>
            <label className="placement-live-option"><input type="checkbox" checked={speakingMode === "live"} disabled={recording || recordingBusy} onChange={(event) => { setSpeakingMode(event.target.checked ? "live" : "recording"); setAutosaveEnabled(true); }} /><span>{copy.liveOption}</span></label>
            {recordingError && <p className="placement-recording-error" role="alert">{recordingError}</p>}
            {speakingRecording?.url && <div className="placement-recording-preview"><span>{copy.recordingReady}</span><audio controls src={speakingRecording.url} /></div>}
            <details className="placement-self-reflection"><summary>{copy.speakingReflection}</summary><div className="placement-speaking-grid">{SPEAKING_CHECKS.map((check) => { const label = getSpeakingCheckLabel(check); return (<fieldset className="placement-speaking-check" key={check.id}><legend>{label}</legend><select aria-label={label} value={speakingChecks[check.id] ?? ""} onChange={(event) => setAnswer(setSpeakingChecks, check.id, event.target.value)}><option value="">{copy.optionalSelfCheck}</option>{getSpeakingCheckOptions(check).map((option, index) => <option value={index} key={option}>{option}</option>)}</select></fieldset>); })}</div></details>
          </section>
        );
      case 4:
      default:
        return (
          <section className="placement-section" aria-labelledby="placement-section-writing">
            <header>
              <span>{copy.stageLabel(5, TEST_SECTIONS[4])}</span>
              <h2 id="placement-section-writing">{getSectionCopy(4).heading}</h2>
              <p>{getSectionCopy(4).intro}</p>
            </header>
            <label className="placement-task-select" htmlFor="writing-task">{copy.taskType}<select id="writing-task" value={writingTaskId} onChange={(event) => setWritingTaskId(event.target.value)}>{WRITING_TASKS.map((task) => <option value={task.id} key={task.id}>{getWritingTaskLabel(task)}</option>)}</select></label>
            <div className="placement-writing-prompt"><h3>{activeWritingTaskLabel}</h3><p dir="ltr">{activeWritingTask.prompt}</p></div>
            <label className="placement-writing-label" htmlFor="placement-writing"><span>{copy.writingPromptLabel}</span><textarea id="placement-writing" dir="ltr" rows={14} value={writing} onChange={(event) => { setAutosaveEnabled(true); setWriting(event.target.value); }} placeholder={copy.writingPlaceholder} /></label>
            <p className="placement-word-count">{copy.writingCount(wordCount)}</p>
          </section>
        );
    }
  };

  if (authStatus === "checking" || initialLoading) {
    return (
      <main className="placement-page" dir={copy.dir}>
        <section className="placement-gate" aria-live="polite">
          <div className="placement-gate__spinner" />
          <p>{copy.gateLoading}</p>
        </section>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="placement-page" dir={copy.dir}>
        <section className="placement-gate">
          <p className="placement-kicker">{copy.kicker}</p>
          <h1>{copy.pageTitle}</h1>
          <p>{copy.authBody}</p>
          <div className="placement-gate__actions">
            <Link href={`${routePrefix}/login?next=${encodeURIComponent(assessmentNextPath)}`} className="placement-primary-button">
              {copy.signIn}
            </Link>
            <Link href={`${routePrefix}/register?next=${encodeURIComponent(assessmentNextPath)}`} className="placement-secondary-button">
              {copy.createAccount}
            </Link>
          </div>
        </section>
      </main>
    );
  }

  if (result && !started) {
    const reviewed = result.status === "reviewed";
    return (
      <main className="placement-page" dir={copy.dir}>
        <section className="placement-result placement-result--final" aria-live="polite">
          <div>
            <span>{reviewed ? copy.resultPlacement : copy.resultReceived}</span>
            <strong>{reviewed ? result.band?.level || copy.reviewed : copy.thankYou}</strong>
            <p>{reviewed ? copy.reviewedByCoach : copy.coachWillConfirm}</p>
            <small>{result.feedback || copy.defaultResultNote}</small>
          </div>
          <dl>
            {Object.entries(result.sectionScores || {}).map(([name, score]) => (
              <div key={name}>
                <dt>{copy.sectionNames[name] || name}</dt>
                <dd>{score}%</dd>
              </div>
            ))}
          </dl>
          <div className="placement-result__actions">
            <button type="button" className="placement-secondary-button" onClick={resetDraft}>
              {copy.startNewAttempt}
            </button>
            <Link href={`${routePrefix}/dashboard`} className="placement-primary-button">
              {copy.dashboard}
            </Link>
          </div>
        </section>
      </main>
    );
  }

  if (!started) {
    return (
      <main className="placement-page" dir={copy.dir}>
        <section className="placement-gate placement-gate--welcome">
          <p className="placement-kicker">{copy.kicker}</p>
          <h1>{copy.pageTitle}</h1>
          <p>{copy.welcomeBody}</p>
          <div className="placement-roadmap">
            {TEST_SECTIONS.map((section, index) => {
              const sectionCopy = copy.sections[section.id];
              return (
                <div key={section.id}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <strong>{sectionCopy.label}</strong>
                    <small>{locale === "ar" ? section.timeAr : section.time}</small>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="placement-gate__actions">
            <button type="button" className="placement-primary-button" onClick={startOrResume}>
              {draftFound ? copy.continueAssessment : copy.beginAssessment}
            </button>
            {draftFound && (
              <button type="button" className="placement-secondary-button" onClick={resetDraft}>
                {copy.startOver}
              </button>
            )}
          </div>
          <p className="placement-privacy-note">{copy.privacyNote}</p>
        </section>
      </main>
    );
  }

  const activeSectionCopy = getSectionCopy(activeSection);
  const readyStages = sectionComplete.filter(Boolean).length;

  return (
    <main className="placement-page" aria-labelledby="placement-title" dir={copy.dir}>
      <section className="placement-hero">
        <div>
          <p className="placement-kicker">{copy.stageKicker(activeSection + 1, TEST_SECTIONS.length)}</p>
          <h1 id="placement-title">{activeSectionCopy.title}</h1>
          <p>{activeSectionCopy.description}</p>
        </div>
        <aside className="placement-status">
          <span>{copy.progressLabel}</span>
          <strong>{completion}%</strong>
          <div
            className="placement-progress"
            role="progressbar"
            aria-label={copy.progressAria(completion)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={completion}
          >
            <span style={{ width: `${completion}%` }} />
          </div>
          <small>{copy.readyCount(readyStages, TEST_SECTIONS.length)}</small>
          <small className="placement-autosave">{formatSavedAt(lastSavedAt, copy, locale)}</small>
        </aside>
      </section>
      <nav className="placement-stepper" aria-label={copy.stepperLabel}>
        {TEST_SECTIONS.map((section, index) => {
          const sectionCopy = copy.sections[section.id];
          return (
            <button
              type="button"
              key={section.id}
              className={`${index === activeSection ? "is-active" : ""} ${sectionComplete[index] ? "is-complete" : ""}`}
              aria-current={index === activeSection ? "step" : undefined}
              disabled={saving || recording || recordingBusy}
              onClick={() => setActiveSection(index)}
            >
              <span>{sectionComplete[index] ? "✓" : String(index + 1).padStart(2, "0")}</span>
              <strong>{sectionCopy.shortLabel}</strong>
              <small>{locale === "ar" ? section.timeAr : section.time}</small>
            </button>
          );
        })}
      </nav>
      <form className="placement-form" onSubmit={submit}>
        {draftError && <p role="alert" className="placement-recording-error">{draftError}</p>}
        <div ref={sectionHeadingRef} tabIndex={-1}>{renderSection()}</div>
        <footer className="placement-section placement-actions">
          <button
            type="button"
            className="placement-secondary-button"
            onClick={() => setActiveSection((current) => Math.max(0, current - 1))}
            disabled={activeSection === 0 || saving || recording || recordingBusy}
          >
            {copy.back}
          </button>
          <button type="button" className="placement-secondary-button" onClick={saveAndExit} disabled={saving || recordingBusy}>
            {copy.saveAndExit}
          </button>
          {activeSection < TEST_SECTIONS.length - 1 ? (
            <button
              type="button"
              className="placement-primary-button"
              disabled={recording || recordingBusy}
              onClick={() => activeSection === 0 && questionPage < 5
                ? setQuestionPage((page) => page + 1)
                : setActiveSection((current) => Math.min(TEST_SECTIONS.length - 1, current + 1))}
            >
              {copy.continue}
            </button>
          ) : (
            <button type="submit" className="placement-primary-button" disabled={saving || recording || recordingBusy}>
              {saving ? copy.submitting : copy.submitForReview}
            </button>
          )}
        </footer>
      </form>
    </main>
  );
}
