"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  MessageCircle,
  Save,
  ShieldCheck,
  Target,
  UserRound,
} from "lucide-react";
import api from "@/lib/api";
import { useToast } from "@/components/ToastProvider";
import { trackEvent } from "@/lib/analytics";
import { getDictionary, t } from "@/app/i18n";
import useAuth from "@/hooks/useAuth";

const DRAFT_KEY = "speexify_onboarding_draft_v2";

const MOTIVATIONS = [
  "professional_development",
  "academic_studies",
  "exam_preparation",
  "immigration_relocation",
  "travel",
  "social_personal_growth",
  "other",
];

const USAGE_CONTEXTS = [
  "work_emails",
  "meetings_presentations",
  "client_communication",
  "academic_writing",
  "research_reading",
  "social_conversation",
  "travel_situations",
  "other",
];

const LEARNING_STYLES = [
  "structured_grammar",
  "interactive_speaking",
  "task_project",
  "listening_video",
  "reading_vocab",
  "self_paced",
];

const SKILLS = [
  "Speaking",
  "Listening",
  "Reading",
  "Writing",
  "Pronunciation",
  "Grammar",
  "Vocabulary",
];

const CONFIDENCE_SKILLS = ["Speaking", "Listening", "Reading", "Writing"];
const AVAILABILITY_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const AVAILABILITY_DAY_LABELS_AR = ["الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت", "الأحد"];
const AVAILABILITY_HOURS = Array.from({ length: 17 }, (_, index) => index + 8);
const formatAvailabilityHour = (hour) => {
  const normalized = hour === 24 ? 0 : hour;
  const suffix = normalized < 12 ? "AM" : "PM";
  const display = normalized % 12 || 12;
  return `${display} ${suffix}`;
};

const DEFAULT_ANSWERS = {
  timezone: "",
  availability: "",
  preferredFormat: "1:1",
  notes: "",
  goals: "",
  context: "",
  levelSelfEval: "",
  usageFrequency: "",
  usageContexts: [],
  motivations: [],
  motivationOther: "",
  examDetails: "",
  skillPriority: {
    Speaking: 3,
    Listening: 3,
    Reading: 3,
    Writing: 3,
    Pronunciation: 3,
    Grammar: 3,
    Vocabulary: 3,
  },
  challenges: "",
  learningStyles: [],
  confidence: {
    Speaking: 5,
    Listening: 5,
    Reading: 5,
    Writing: 5,
  },
  consentRecording: false,
};

const ONBOARDING_SECTION_IDS = ["schedule", "goal", "focus", "style"];

function safeAnswers(value) {
  const input = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const merged = mergeAnswers(input);
  const clampNumber = (value, min, max, fallback) => {
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : fallback;
  };
  return {
    ...merged,
    timezone: typeof merged.timezone === "string" ? merged.timezone : "",
    availability: typeof merged.availability === "string" ? merged.availability : "",
    goals: typeof merged.goals === "string" ? merged.goals : "",
    context: typeof merged.context === "string" ? merged.context : "",
    notes: typeof merged.notes === "string" ? merged.notes : "",
    challenges: typeof merged.challenges === "string" ? merged.challenges : "",
    skillPriority: Object.fromEntries(
      SKILLS.map((skill) => [skill, clampNumber(merged.skillPriority[skill], 1, 5, 3)])
    ),
    confidence: Object.fromEntries(
      CONFIDENCE_SKILLS.map((skill) => [skill, clampNumber(merged.confidence[skill], 1, 10, 5)])
    ),
  };
}

const LOCAL_COPY = {
  en: {
    eyebrow: "Speexify setup",
    title: "Let's shape your coaching plan.",
    subtitle:
      "A short setup so your coach knows what matters before the first live conversation. Complete each section in any order.",
    estimate: "About 3 minutes",
    saveIdle: "Autosaves as you go",
    savedAt: "Autosaved {time}",
    progressSaved: "Your progress is saved. You can return anytime.",
    requiredTimezone: "Please confirm your timezone before saving your setup.",
    requiredAvailability: "Please add at least one time window that works for you.",
    requiredGoal: "Add one clear goal before continuing.",
    completeTitle: "Your coaching brief is ready.",
    completeBody:
      "We saved your setup. You can take the placement test whenever you are ready, or go straight to your dashboard.",
    placementCta: "Take placement test",
    dashboardCta: "Go to dashboard",
    reviewTitle: "Review your brief",
    reviewBody:
      "This is what your coach will use to prepare your first session.",
    stepLabel: "Step {current} of {total}",
    buttons: {
      back: "Back",
      next: "Continue",
      saveProgress: "Save progress",
      submit: "Save setup",
      saving: "Saving...",
    },
    stepsAriaLabel: "Onboarding sections",
    steps: [
      {
        id: "schedule",
        label: "Schedule",
        title: "When can coaching fit your week?",
        description:
          "Give us the basics so sessions can be offered at realistic times.",
      },
      {
        id: "goal",
        label: "Goal",
        title: "What should English help you do?",
        description:
          "One clear outcome beats a vague promise of fluency.",
      },
      {
        id: "focus",
        label: "Focus",
        title: "Where should your coach focus first?",
        description:
          "Choose the skills and situations that would make the biggest difference.",
      },
      {
        id: "style",
        label: "Style",
        title: "How do you learn best?",
        description:
          "This helps us tune the session style without repeating the placement test.",
      },
      {
        id: "review",
        label: "Review",
        title: "Ready to hand this to your coach?",
        description:
          "Check the important details and save your onboarding brief.",
      },
    ],
    coachNoteTitle: "What happens next",
    coachNote:
      "Your coach sees this brief and any placement result, then builds the first session around your real use case.",
    proof: ["Private to your coaching team", "Editable later", "No payment step here"],
    fieldPrimaryGoal: "Main goal",
    fieldPrimaryGoalHint: "Use a real outcome, not just 'be fluent'.",
    fieldContextHint: "Where English shows up in your life.",
    fieldNotesHint: "Preferences, concerns, accessibility needs, or anything personal.",
    quickGoalTitle: "Quick goal starters",
    quickGoals: [
      "Speak more confidently in meetings",
      "Prepare for interviews",
      "Present clearly at work",
      "Write better emails",
      "Understand fast conversations",
    ],
    reviewEmpty: "Not added yet",
    summary: {
      schedule: "Schedule",
      goal: "Goal",
      situations: "English situations",
      focus: "Top skill focus",
      style: "Learning style",
      confidence: "Confidence",
    },
  },
  ar: {
    eyebrow: "بداية Speexify",
    title: "يلّا نصمم خطتك المناسبة.",
    subtitle:
      "إعداد قصير بيساعد المدرّب يفهم إيه المهم ليك قبل أول محادثة مباشرة. كمّل الأقسام بأي ترتيب يناسبك.",
    estimate: "حوالي 3 دقائق",
    saveIdle: "تقدمك بيتحفظ وأنت بتكتب",
    savedAt: "اتحفظ {time}",
    progressSaved: "تقدمك اتحفظ. تقدر ترجع في أي وقت.",
    requiredTimezone: "أكد منطقتك الزمنية قبل ما تحفظ إعدادك.",
    requiredAvailability: "ضيف معاد واحد على الأقل يناسبك.",
    requiredGoal: "ضيف هدف واضح واحد قبل ما تكمل.",
    completeTitle: "ملخص التدريب جاهز.",
    completeBody:
      "حفظنا إعداداتك. تقدر تعمل اختبار تحديد المستوى وقت ما تكون جاهز، أو تروح للوحة التحكم مباشرة.",
    placementCta: "اعمل اختبار تحديد المستوى",
    dashboardCta: "روح للوحة التحكم",
    reviewTitle: "راجع الملخص",
    reviewBody:
      "المعلومات دي المدرّب هيستخدمها عشان يجهّز أول جلسة.",
    stepLabel: "خطوة {current} من {total}",
    buttons: {
      back: "رجوع",
      next: "كمل",
      saveProgress: "احفظ التقدم",
      submit: "احفظ الإعداد",
      saving: "بيتحفظ...",
    },
    stepsAriaLabel: "أقسام الإعداد",
    steps: [
      {
        id: "schedule",
        label: "المواعيد",
        title: "إمتى يناسبك التدريب في الأسبوع؟",
        description:
          "قولنا الأساسيات عشان نعرضلك مواعيد مناسبة وواقعية.",
      },
      {
        id: "goal",
        label: "الهدف",
        title: "عايز الإنجليزية تساعدك تعمل إيه؟",
        description:
          "هدف واضح واحد أحسن من وعد عام بالطلاقة.",
      },
      {
        id: "focus",
        label: "التركيز",
        title: "المدرّب يبدأ منين؟",
        description:
          "اختار المهارات والمواقف اللي هتعمل أحسن فرق ليك.",
      },
      {
        id: "style",
        label: "الأسلوب",
        title: "إزاي بتتمرن بأحسن شكل؟",
        description:
          "ده بيساعدنا نضبط أسلوب الجلسة من غير ما نعيد اختبار المستوى.",
      },
      {
        id: "review",
        label: "المراجعة",
        title: "جاهز تبعت الملخص للمدرّب؟",
        description:
          "راجع التفاصيل المهمة واحفظ ملخص البداية.",
      },
    ],
    coachNoteTitle: "إيه اللي هيحصل بعد كده",
    coachNote:
      "المدرّب هيشوف الملخص ده وأي نتيجة لاختبار المستوى، وبعدين يبني أول جلسة حول استخدامك الحقيقي للغة.",
    proof: ["خاص بفريق التدريب", "ممكن تعديله بعدين", "مفيش خطوة دفع هنا"],
    fieldPrimaryGoal: "الهدف الأساسي",
    fieldPrimaryGoalHint: "اكتب نتيجة واقعية، مش بس 'عايز أتكلم زي الأمريكان'.",
    fieldContextHint: "إنجليزية بتظهر فين في حياتك.",
    fieldNotesHint: "تفضيلات، مخاوف، احتياجات خاصة أو تفضيلات مهمة، أو أي حاجة شخصية.",
    quickGoalTitle: "أهداف سريعة",
    quickGoals: [
      "أتكلم بثقة أكتر في الاجتماعات",
      "أجهّز نفسي لمقابلات الشغل",
      "أقدم عروض أوضح في الشغل",
      "أكتب إيميلات أحسن",
      "أفهم المحادثات السريعة",
    ],
    reviewEmpty: "مضافش لسه",
    summary: {
      schedule: "المواعيد",
      goal: "الهدف",
      situations: "مواقف استخدام الإنجليزية",
      focus: "أهم مهارات التركيز",
      style: "أسلوب التمرين",
      confidence: "الثقة",
    },
  },
};

const STEP_ICONS = [CalendarDays, Target, MessageCircle, UserRound, ClipboardCheck];

function mergeAnswers(incoming = {}) {
  return {
    ...DEFAULT_ANSWERS,
    ...incoming,
    usageContexts: Array.isArray(incoming.usageContexts)
      ? incoming.usageContexts.filter((value) => USAGE_CONTEXTS.includes(value))
      : [],
    motivations: Array.isArray(incoming.motivations)
      ? incoming.motivations.filter((value) => MOTIVATIONS.includes(value))
      : [],
    learningStyles: Array.isArray(incoming.learningStyles)
      ? incoming.learningStyles.filter((value) => LEARNING_STYLES.includes(value))
      : [],
    skillPriority: {
      ...DEFAULT_ANSWERS.skillPriority,
      ...(incoming.skillPriority || {}),
    },
    confidence: {
      ...DEFAULT_ANSWERS.confidence,
      ...(incoming.confidence || {}),
    },
  };
}

function getBrowserTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  } catch {
    return "";
  }
}

function withDetectedTimezone(incoming = {}) {
  const merged = mergeAnswers(incoming);
  return merged.timezone ? merged : { ...merged, timezone: getBrowserTimezone() };
}

function hasDraftProgress(answers) {
  return Boolean(
    answers.timezone ||
      answers.availability ||
      answers.goals ||
      answers.context ||
      answers.usageFrequency ||
      answers.usageContexts.length ||
      answers.motivations.length ||
      answers.motivationOther ||
      answers.examDetails ||
      answers.challenges ||
      answers.learningStyles.length ||
      answers.levelSelfEval ||
      Object.values(answers.skillPriority).some((value) => Number(value) !== 3) ||
      Object.values(answers.confidence).some((value) => Number(value) !== 5) ||
      answers.notes ||
      answers.consentRecording
  );
}

function formatSavedAt(copy, value) {
  if (!value) return copy.saveIdle;
  return copy.savedAt.replace(
    "{time}",
    value.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
  );
}

function selectedLabels(dict, keys, prefix) {
  return keys.map((key) => t(dict, `${prefix}_${key}`));
}

function topSkills(answers, limit = 3) {
  return SKILLS.map((skill) => [skill, answers.skillPriority[skill]])
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
}

function sectionIsComplete(sectionId, answers) {
  switch (sectionId) {
    case "schedule":
      return Boolean(answers.timezone.trim() && answers.availability.trim());
    case "goal":
      return Boolean(answers.goals.trim());
    case "focus":
      return Boolean(
        answers.motivations.length ||
          answers.challenges.trim() ||
          Object.values(answers.skillPriority).some((value) => Number(value) !== 3)
      );
    case "style":
      return Boolean(
        answers.learningStyles.length ||
          answers.levelSelfEval ||
          Object.values(answers.confidence).some((value) => Number(value) !== 5)
      );
    default:
      return false;
  }
}

function clampStep(value, total) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(total - 1, Math.trunc(parsed)));
}

export default function OnboardingPage() {
  const { toast } = useToast();
  const { user, status: authStatus } = useAuth();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const locale = pathname?.startsWith("/ar") ? "ar" : "en";
  const prefix = locale === "ar" ? "/ar" : "";
  const dict = getDictionary(locale, "onboarding");
  const copy = LOCAL_COPY[locale] || LOCAL_COPY.en;
  const isRTL = locale === "ar";
  const availabilityDayLabels = locale === "ar" ? AVAILABILITY_DAY_LABELS_AR : AVAILABILITY_DAYS;
  const availabilityText = locale === "ar"
    ? { instruction: "اختار الساعات اللي بتكون متاح فيها عادةً.", clear: "مسح الكل", empty: "لم يتم اختيار أي ساعات بعد" }
    : { instruction: "Select the hours that usually work for you.", clear: "Clear all", empty: "No hours selected yet" };
  const draftStorageKey = useMemo(
    () => (user?.id ? `${DRAFT_KEY}:${user.id}` : DRAFT_KEY),
    [user?.id]
  );
  const packageId = useMemo(() => {
    const value = Number(searchParams.get("packageId"));
    return Number.isInteger(value) && value > 0 ? value : null;
  }, [searchParams]);

  const [answers, setAnswers] = useState(DEFAULT_ANSWERS);
  const [availabilitySlots, setAvailabilitySlots] = useState([]);
  const availabilityGridRef = useRef(null);
  const [activeStep, setActiveStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [draftReady, setDraftReady] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [serverStatus, setServerStatus] = useState(null);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const saveTimer = useRef(null);
  const remoteSaveTimer = useRef(null);
  const stepHeadingRef = useRef(null);

  const isExamSelected = useMemo(
    () => answers.motivations.includes("exam_preparation"),
    [answers.motivations]
  );

  const isLastStep = activeStep === copy.steps.length - 1;
  const completedSections = ONBOARDING_SECTION_IDS.filter((id) =>
    sectionIsComplete(id, answers)
  ).length;
  const progress = Math.round((completedSections / ONBOARDING_SECTION_IDS.length) * 100);

  const getSliderBackground = (value, min, max, accent = "#f25c2e") => {
    const percentage = ((value - min) / (max - min)) * 100;
    const direction = isRTL ? "to left" : "to right";
    return {
      background: `linear-gradient(${direction}, ${accent} 0%, ${accent} ${percentage}%, #e8e0d5 ${percentage}%, #e8e0d5 100%)`,
    };
  };

  const updateAnswer = useCallback((patch) => {
    setSaved(false);
    setAnswers((current) => ({ ...current, ...patch }));
  }, []);

  const handleCheckboxGroup = (key, value) => {
    setSaved(false);
    setAnswers((prev) => {
      const set = new Set(prev[key]);
      if (set.has(value)) set.delete(value);
      else set.add(value);
      return { ...prev, [key]: Array.from(set) };
    });
  };

  const handleNestedRange = (group, field, value) => {
    setSaved(false);
    setAnswers((prev) => ({
      ...prev,
      [group]: { ...prev[group], [field]: Number(value) },
    }));
  };

  const handleToggle = (key) => {
    setSaved(false);
    setAnswers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  useEffect(() => {
    if (authStatus === "checking" && !user) return undefined;

    let active = true;

    (async () => {
      if (!user) {
        setInitialLoading(false);
        setDraftReady(true);
        return;
      }

      let serverAnswers = null;
      let serverForm = null;
      let localDraft = null;

      try {
        const { data } = await api.get("/me/onboarding");
        if (data?.answers) {
          serverAnswers = data.answers;
          serverForm = data;
          setServerStatus(data.status || "submitted");
        }
      } catch {}

      try {
        const local =
          window.localStorage.getItem(draftStorageKey) ||
          (draftStorageKey === DRAFT_KEY
            ? null
            : window.localStorage.getItem(DRAFT_KEY));
        if (local) localDraft = JSON.parse(local);
      } catch {}

      if (!active) return;

      if (localDraft?.answers && hasDraftProgress(safeAnswers(localDraft.answers))) {
        setAnswers(withDetectedTimezone(safeAnswers(localDraft.answers)));
        setActiveStep(clampStep(localDraft.activeStep, copy.steps.length));
        if (
          serverForm?.status === "submitted" &&
          localDraft.updatedAt &&
          serverForm.updatedAt &&
          new Date(localDraft.updatedAt).getTime() > new Date(serverForm.updatedAt).getTime()
        ) {
          setServerStatus("draft");
        }
        if (localDraft.updatedAt) {
          const savedAt = new Date(localDraft.updatedAt);
          if (!Number.isNaN(savedAt.getTime())) setLastSavedAt(savedAt);
        }
      } else if (serverAnswers) {
        setAnswers(withDetectedTimezone(serverAnswers));
      } else {
        setAnswers(withDetectedTimezone());
      }

      setInitialLoading(false);
      setDraftReady(true);
    })();

    return () => {
      active = false;
    };
  }, [authStatus, copy.steps.length, draftStorageKey, user]);

  useEffect(() => {
    if (!draftReady) return;
    stepHeadingRef.current?.focus({ preventScroll: true });
  }, [activeStep, draftReady]);

  const saveDraftNow = useCallback(() => {
    if (!draftReady || typeof window === "undefined") return;
    const savedAt = new Date();

    try {
      if (!hasDraftProgress(answers)) {
        window.localStorage.removeItem(draftStorageKey);
        setLastSavedAt(null);
        return;
      }

      window.localStorage.setItem(
        draftStorageKey,
        JSON.stringify({
          answers,
          activeStep,
          updatedAt: savedAt.toISOString(),
        })
      );
      setLastSavedAt(savedAt);
    } catch {}

    // Keep an in-progress onboarding available across devices. Once a form
    // has been submitted we leave it untouched until the learner explicitly
    // submits the edited version again.
    if (serverStatus === "submitted" || !user) return;
    if (remoteSaveTimer.current) window.clearTimeout(remoteSaveTimer.current);
    remoteSaveTimer.current = window.setTimeout(async () => {
      try {
        await api.post("/me/onboarding", { answers, packageId, status: "draft" });
        setServerStatus("draft");
      } catch {
        // Local storage remains the fallback when the backend is asleep.
      }
    }, 900);
  }, [activeStep, answers, draftReady, draftStorageKey, packageId, serverStatus, user]);

  useEffect(() => {
    if (!draftReady) return undefined;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(saveDraftNow, 300);

    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      if (remoteSaveTimer.current) window.clearTimeout(remoteSaveTimer.current);
    };
  }, [draftReady, saveDraftNow]);

  useEffect(() => {
    if (!draftReady) return undefined;

    const flush = () => saveDraftNow();
    const flushHidden = () => {
      if (document.visibilityState === "hidden") saveDraftNow();
    };

    window.addEventListener("beforeunload", flush);
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", flushHidden);

    return () => {
      window.removeEventListener("beforeunload", flush);
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", flushHidden);
    };
  }, [draftReady, saveDraftNow]);

  const goToStep = (stepIndex) => {
    setActiveStep(clampStep(stepIndex, copy.steps.length));
  };

  const goNext = () => {
    setActiveStep((current) => Math.min(copy.steps.length - 1, current + 1));
  };

  const goBack = () => {
    setActiveStep((current) => Math.max(0, current - 1));
  };

  const saveProgress = () => {
    saveDraftNow();
    toast.success(copy.progressSaved);
  };

  const submit = async (e) => {
    e.preventDefault();

    if (!answers.timezone.trim()) {
      toast.error(copy.requiredTimezone);
      setActiveStep(0);
      return;
    }

    if (!answers.availability.trim()) {
      toast.error(copy.requiredAvailability);
      setActiveStep(0);
      return;
    }

    if (!answers.goals.trim()) {
      toast.error(copy.requiredGoal);
      setActiveStep(1);
      return;
    }

    setSaving(true);
    setSaved(false);
    try {
      await api.post("/me/onboarding", { answers, packageId, status: "submitted" });

      trackEvent("onboarding_completed", {
        preferredFormat: answers.preferredFormat,
        motivations: answers.motivations.length,
        usageContexts: answers.usageContexts.length,
      });

      try {
        window.localStorage.removeItem(draftStorageKey);
      } catch {}

      setLastSavedAt(null);
      setServerStatus("submitted");
      setSaved(true);
    } catch (e) {
      toast.error(e?.response?.data?.error || t(dict, "error_save_failed"));
    } finally {
      setSaving(false);
    }
  };

  const quickGoal = (goal) => {
    if (answers.goals.includes(goal)) return;
    updateAnswer({
      goals: answers.goals ? `${answers.goals}\n${goal}` : goal,
    });
  };

  const renderSelectIcon = () => (
    <ChevronDown className="onboarding-field__select-icon" aria-hidden="true" />
  );

  const preferredFormatLabel = {
    "1:1": t(dict, "field_format_option_1to1"),
    group: t(dict, "field_format_option_group"),
    intensive: t(dict, "field_format_option_intensive"),
  }[answers.preferredFormat] || answers.preferredFormat;

  const renderStep = () => {
    switch (copy.steps[activeStep].id) {
      case "schedule":
        return (
          <div className="onboarding-form__grid">
            <Field
              id="timezone"
              label={t(dict, "field_timezone_label")}
              hint={t(dict, "field_timezone_hint")}
            >
              <input
                id="timezone"
                type="text"
                className="onboarding-field__input"
                value={answers.timezone}
                onChange={(e) => updateAnswer({ timezone: e.target.value })}
                placeholder={t(dict, "field_timezone_placeholder")}
                required
              />
            </Field>

            <Field
              id="format"
              label={t(dict, "field_format_label")}
              hint={t(dict, "field_format_hint")}
            >
              <div className="onboarding-field__select-wrapper">
                <select
                  id="format"
                  className="onboarding-field__select"
                  value={answers.preferredFormat}
                  onChange={(e) => updateAnswer({ preferredFormat: e.target.value })}
                >
                  <option value="1:1">{t(dict, "field_format_option_1to1")}</option>
                  <option value="group">{t(dict, "field_format_option_group")}</option>
                  <option value="intensive">{t(dict, "field_format_option_intensive")}</option>
                </select>
                {renderSelectIcon()}
              </div>
            </Field>

            <Field
              id="availability"
              label={t(dict, "field_availability_label")}
              hint={t(dict, "field_availability_hint")}
              full
            >
              <div className="onboarding-availability-grid" id="availability">
                <div className="onboarding-availability-grid__toolbar"><span>{availabilityText.instruction}</span><div><button type="button" onClick={() => availabilityGridRef.current?.scrollBy({ left: -420, behavior: "smooth" })} aria-label="Show earlier times">←</button><button type="button" onClick={() => availabilityGridRef.current?.scrollBy({ left: 420, behavior: "smooth" })} aria-label="Show later times">→</button><button type="button" onClick={() => { setAvailabilitySlots([]); updateAnswer({ availability: "" }); }}>{availabilityText.clear}</button></div></div>
                <div className="onboarding-availability-grid__scroll" ref={availabilityGridRef}>
                  <div className="onboarding-availability-grid__head"><span />{AVAILABILITY_HOURS.map((hour) => <span key={hour}>{formatAvailabilityHour(hour)}</span>)}</div>
                  {AVAILABILITY_DAYS.map((day, dayIndex) => <div className="onboarding-availability-grid__row" key={day}><strong>{availabilityDayLabels[dayIndex]}</strong>{AVAILABILITY_HOURS.map((hour) => { const slot = `${day} ${String(hour).padStart(2, "0")}:00`; const checked = availabilitySlots.includes(slot); return <label className={checked ? "is-selected" : ""} key={slot}><input type="checkbox" checked={checked} onChange={() => { const next = checked ? availabilitySlots.filter((item) => item !== slot) : [...availabilitySlots, slot]; setAvailabilitySlots(next); updateAnswer({ availability: next.join(", ") }); }} /><span aria-hidden="true" /></label>; })}</div>)}
                </div>
                <p className="onboarding-availability-grid__summary">{answers.availability || availabilityText.empty}</p>
              </div>
            </Field>
          </div>
        );

      case "goal":
        return (
          <div className="onboarding-form__grid">
            <div className="onboarding-field onboarding-field--full">
              <div className="onboarding-quick-goals" aria-label={copy.quickGoalTitle}>
                <span>{copy.quickGoalTitle}</span>
                <div>
                  {copy.quickGoals.map((goal) => (
                    <button type="button" key={goal} onClick={() => quickGoal(goal)}>
                      {goal}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <Field
              id="goals"
              label={copy.fieldPrimaryGoal}
              hint={copy.fieldPrimaryGoalHint}
              full
            >
              <textarea
                id="goals"
                rows={5}
                className="onboarding-field__textarea onboarding-field__textarea--large"
                value={answers.goals}
                onChange={(e) => updateAnswer({ goals: e.target.value })}
                placeholder={t(dict, "field_goals_placeholder")}
              />
            </Field>

            <Field
              id="context"
              label={t(dict, "field_context_label")}
              hint={copy.fieldContextHint}
              full
            >
              <textarea
                id="context"
                rows={3}
                className="onboarding-field__textarea"
                value={answers.context}
                onChange={(e) => updateAnswer({ context: e.target.value })}
                placeholder={t(dict, "field_context_placeholder")}
              />
            </Field>

            <Field id="usageFrequency" label={t(dict, "field_usage_frequency_label")}>
              <div className="onboarding-field__select-wrapper">
                <select
                  id="usageFrequency"
                  className="onboarding-field__select"
                  value={answers.usageFrequency}
                  onChange={(e) => updateAnswer({ usageFrequency: e.target.value })}
                >
                  <option value="">{t(dict, "field_usage_frequency_placeholder")}</option>
                  <option value="never">{t(dict, "usage_frequency_never")}</option>
                  <option value="sometimes">{t(dict, "usage_frequency_sometimes")}</option>
                  <option value="often">{t(dict, "usage_frequency_often")}</option>
                  <option value="daily">{t(dict, "usage_frequency_daily")}</option>
                </select>
                {renderSelectIcon()}
              </div>
            </Field>

            <ChoiceGroup
              label={t(dict, "field_usage_contexts_label")}
              hint={t(dict, "field_usage_contexts_hint")}
              items={USAGE_CONTEXTS}
              selected={answers.usageContexts}
              labelFor={(key) => t(dict, `usage_${key}`)}
              onToggle={(key) => handleCheckboxGroup("usageContexts", key)}
            />
          </div>
        );

      case "focus":
        return (
          <div className="onboarding-form__grid">
            <ChoiceGroup
              label={t(dict, "field_motivations_label")}
              hint={t(dict, "field_motivations_hint")}
              items={MOTIVATIONS}
              selected={answers.motivations}
              labelFor={(key) => t(dict, `motivation_${key}`)}
              onToggle={(key) => handleCheckboxGroup("motivations", key)}
            />

            {answers.motivations.includes("other") && (
              <Field
                id="motivationOther"
                label={t(dict, "field_motivation_other_label")}
                full
              >
                <input
                  id="motivationOther"
                  type="text"
                  className="onboarding-field__input"
                  value={answers.motivationOther}
                  onChange={(e) => updateAnswer({ motivationOther: e.target.value })}
                  placeholder={t(dict, "field_motivation_other_placeholder")}
                />
              </Field>
            )}

            {isExamSelected && (
              <Field
                id="examDetails"
                label={t(dict, "field_exam_details_label")}
                hint={t(dict, "field_exam_details_hint")}
                full
              >
                <input
                  id="examDetails"
                  type="text"
                  className="onboarding-field__input"
                  value={answers.examDetails}
                  onChange={(e) => updateAnswer({ examDetails: e.target.value })}
                  placeholder={t(dict, "field_exam_details_placeholder")}
                />
              </Field>
            )}

            <div className="onboarding-field onboarding-field--full">
              <FieldHeader
                label={t(dict, "field_skill_priority_label")}
                hint={t(dict, "field_skill_priority_hint")}
              />
              <div className="onboarding-sliders onboarding-sliders--compact">
                {SKILLS.map((skill) => (
                  <RangeControl
                    key={skill}
                    label={t(dict, `skill_${skill.toLowerCase()}`)}
                    value={answers.skillPriority[skill]}
                    min={1}
                    max={5}
                    marks={["1", "2", "3", "4", "5"]}
                    style={getSliderBackground(answers.skillPriority[skill], 1, 5)}
                    onChange={(value) => handleNestedRange("skillPriority", skill, value)}
                  />
                ))}
              </div>
            </div>

            <Field
              id="challenges"
              label={t(dict, "field_challenges_label")}
              hint={t(dict, "field_challenges_hint")}
              full
            >
              <textarea
                id="challenges"
                rows={4}
                className="onboarding-field__textarea"
                value={answers.challenges}
                onChange={(e) => updateAnswer({ challenges: e.target.value })}
                placeholder={t(dict, "field_challenges_placeholder")}
              />
            </Field>
          </div>
        );

      case "style":
        return (
          <div className="onboarding-form__grid">
            <ChoiceGroup
              label={t(dict, "field_learning_styles_label")}
              hint={t(dict, "field_learning_styles_hint")}
              items={LEARNING_STYLES}
              selected={answers.learningStyles}
              labelFor={(key) => t(dict, `learning_${key}`)}
              onToggle={(key) => handleCheckboxGroup("learningStyles", key)}
            />

            <div className="onboarding-field onboarding-field--full">
              <FieldHeader
                label={t(dict, "field_confidence_label")}
                hint={t(dict, "field_confidence_hint")}
              />
              <div className="onboarding-sliders">
                {CONFIDENCE_SKILLS.map((skill) => (
                  <RangeControl
                    key={skill}
                    label={t(dict, `skill_${skill.toLowerCase()}`)}
                    value={answers.confidence[skill]}
                    min={1}
                    max={10}
                    marks={["1", "3", "5", "7", "10"]}
                    style={getSliderBackground(answers.confidence[skill], 1, 10, "#0f766e")}
                    onChange={(value) => handleNestedRange("confidence", skill, value)}
                  />
                ))}
              </div>
            </div>

            <Field id="level" label={t(dict, "field_band_label")} hint={t(dict, "field_band_hint")}>
              <div className="onboarding-field__select-wrapper">
                <select
                  id="level"
                  className="onboarding-field__select"
                  value={answers.levelSelfEval}
                  onChange={(e) => updateAnswer({ levelSelfEval: e.target.value })}
                >
                  <option value="">{t(dict, "field_band_placeholder")}</option>
                  <option value="A1">{t(dict, "band_a1")}</option>
                  <option value="A2">{t(dict, "band_a2")}</option>
                  <option value="B1">{t(dict, "band_b1")}</option>
                  <option value="B2">{t(dict, "band_b2")}</option>
                  <option value="C1">{t(dict, "band_c1")}</option>
                  <option value="C2">{t(dict, "band_c2")}</option>
                </select>
                {renderSelectIcon()}
              </div>
            </Field>

            <div className="onboarding-note onboarding-field--full">
              <ShieldCheck aria-hidden="true" />
              <p>{copy.coachNote}</p>
            </div>

            <div className="onboarding-field onboarding-field--full">
              <label className="onboarding-checkbox onboarding-checkbox--inline">
                <input
                  type="checkbox"
                  checked={answers.consentRecording}
                  onChange={() => handleToggle("consentRecording")}
                />
                <span>{t(dict, "field_consent_label")}</span>
              </label>
            </div>
          </div>
        );

      case "review":
      default:
        return (
          <div className="onboarding-review">
            <div className="onboarding-review__intro">
              <h3>{copy.reviewTitle}</h3>
              <p>{copy.reviewBody}</p>
            </div>

            <div className="onboarding-summary">
              <SummaryItem
                label={copy.summary.schedule}
                value={[
                  answers.timezone || copy.reviewEmpty,
                  preferredFormatLabel,
                  answers.availability,
                ]
                  .filter(Boolean)
                  .join(" | ")}
              />
              <SummaryItem label={copy.summary.goal} value={answers.goals || copy.reviewEmpty} />
              <SummaryItem
                label={copy.summary.situations}
                value={
                  selectedLabels(dict, answers.usageContexts, "usage").join(", ") ||
                  copy.reviewEmpty
                }
              />
              <SummaryItem
                label={copy.summary.focus}
                value={topSkills(answers)
                  .map(([skill, value]) => `${t(dict, `skill_${skill.toLowerCase()}`)} ${value}/5`)
                  .join(", ")}
              />
              <SummaryItem
                label={copy.summary.style}
                value={
                  selectedLabels(dict, answers.learningStyles, "learning").join(", ") ||
                  copy.reviewEmpty
                }
              />
              <SummaryItem
                label={t(dict, "field_motivations_label")}
                value={
                  selectedLabels(dict, answers.motivations, "motivation").join(", ") ||
                  copy.reviewEmpty
                }
              />
              <SummaryItem
                label={t(dict, "field_band_label")}
                value={answers.levelSelfEval || copy.reviewEmpty}
              />
              <SummaryItem
                label={t(dict, "field_challenges_label")}
                value={answers.challenges || copy.reviewEmpty}
              />
              <SummaryItem
                label={copy.summary.confidence}
                value={CONFIDENCE_SKILLS.map(
                  (skill) => `${t(dict, `skill_${skill.toLowerCase()}`)} ${answers.confidence[skill]}/10`
                ).join(", ")}
              />
            </div>

            <Field id="notes" label={t(dict, "field_notes_label")} hint={copy.fieldNotesHint} full>
              <textarea
                id="notes"
                rows={4}
                className="onboarding-field__textarea"
                value={answers.notes}
                onChange={(e) => updateAnswer({ notes: e.target.value })}
                placeholder={t(dict, "field_notes_placeholder")}
              />
            </Field>
          </div>
        );
    }
  };

  if (authStatus === "checking" || (user && initialLoading)) {
    return (
      <main className="onboarding-wrapper" dir={isRTL ? "rtl" : "ltr"}>
        <section className="onboarding-complete onboarding-complete--loading" aria-live="polite">
          <div className="onboarding-btn__spinner" aria-hidden="true" />
          <p>{locale === "ar" ? "بنجهز إعداداتك..." : "Preparing your setup…"}</p>
        </section>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="onboarding-wrapper" dir={isRTL ? "rtl" : "ltr"}>
        <section className="onboarding-complete" aria-live="polite">
          <p className="onboarding-kicker">{copy.eyebrow}</p>
          <h1>{locale === "ar" ? "سجّل دخولك عشان نبدأ." : "Sign in to start your setup."}</h1>
          <p>
            {locale === "ar"
              ? "بياناتك بتتحفظ بأمان على حسابك وتقدر تكمله من أي جهاز."
              : "Your setup is saved securely to your account so you can continue on any device."}
          </p>
          <div className="onboarding-complete__actions">
            <Link className="onboarding-btn onboarding-btn--primary" href={`${prefix}/login?next=${encodeURIComponent(`${prefix}/onboarding`)}`}>
              {locale === "ar" ? "تسجيل الدخول" : "Sign in"}
              <ArrowRight aria-hidden="true" />
            </Link>
            <Link className="onboarding-btn onboarding-btn--ghost" href={`${prefix}/register?next=${encodeURIComponent(`${prefix}/onboarding`)}`}>
              {locale === "ar" ? "إنشاء حساب" : "Create an account"}
            </Link>
          </div>
        </section>
      </main>
    );
  }

  if (saved) {
    return (
      <main className="onboarding-wrapper" dir={isRTL ? "rtl" : "ltr"}>
        <section className="onboarding-complete" aria-live="polite">
          <div className="onboarding-complete__mark">
            <Check aria-hidden="true" />
          </div>
          <p className="onboarding-kicker">{copy.eyebrow}</p>
          <h1>{copy.completeTitle}</h1>
          <p>{copy.completeBody}</p>
          <div className="onboarding-complete__actions">
            <Link className="onboarding-btn onboarding-btn--primary" href={`${prefix}/assessment`}>
              {copy.placementCta}
              <ArrowRight aria-hidden="true" />
            </Link>
            <Link className="onboarding-btn onboarding-btn--ghost" href={`${prefix}/dashboard`}>
              {copy.dashboardCta}
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="onboarding-wrapper" dir={isRTL ? "rtl" : "ltr"}>
      <div className="onboarding-shell">
        <aside className="onboarding-rail" aria-label={copy.eyebrow}>
          <p className="onboarding-kicker">{copy.eyebrow}</p>
          <h1>{copy.title}</h1>
          <p>{copy.subtitle}</p>

          <div className="onboarding-status">
            <div>
              <ClockIcon />
              <span>{copy.estimate}</span>
            </div>
            <div>
              <Save aria-hidden="true" />
              <span>{formatSavedAt(copy, lastSavedAt)}</span>
            </div>
          </div>

          <div
            className="onboarding-progress"
            role="progressbar"
            aria-label={locale === "ar" ? "تقدم الإعداد" : "Setup progress"}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
          >
            <span style={{ width: `${progress}%` }} />
          </div>
          <p className="onboarding-progress__label">
            {completedSections}/{ONBOARDING_SECTION_IDS.length} {locale === "ar" ? "أقسام مكتملة" : "sections complete"}
          </p>

          <nav className="onboarding-stepper" aria-label={copy.stepsAriaLabel}>
            {copy.steps.map((step, index) => {
              const Icon = STEP_ICONS[index];
              const complete =
                step.id === "review"
                  ? completedSections === ONBOARDING_SECTION_IDS.length
                  : sectionIsComplete(step.id, answers);
              const active = index === activeStep;
              return (
                <button
                  type="button"
                  key={step.id}
                  className={`onboarding-step ${active ? "is-active" : ""} ${
                    complete ? "is-complete" : ""
                  }`}
                  aria-current={active ? "step" : undefined}
                  aria-label={`${step.label}${complete ? " — complete" : ""}`}
                  onClick={() => goToStep(index)}
                >
                  <span className="onboarding-step__icon">
                    {complete ? <Check aria-hidden="true" /> : <Icon aria-hidden="true" />}
                  </span>
                  <span>
                    <strong>{step.label}</strong>
                    <small>
                      {copy.stepLabel
                        .replace("{current}", index + 1)
                        .replace("{total}", copy.steps.length)}
                    </small>
                  </span>
                </button>
              );
            })}
          </nav>

          <div className="onboarding-coach-note">
            <ShieldCheck aria-hidden="true" />
            <strong>{copy.coachNoteTitle}</strong>
            <p>{copy.coachNote}</p>
            <ul>
              {copy.proof.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </aside>

        <form className="onboarding-stage" onSubmit={submit}>
          <header className="onboarding-stage__header">
            <span>
              {copy.stepLabel
                .replace("{current}", activeStep + 1)
                .replace("{total}", copy.steps.length)}
            </span>
            <h2 ref={stepHeadingRef} tabIndex={-1}>
              {copy.steps[activeStep].title}
            </h2>
            <p>{copy.steps[activeStep].description}</p>
          </header>

          <section className="onboarding-stage__body">{renderStep()}</section>

          <footer className="onboarding-actions">
            <button
              type="button"
              className="onboarding-btn onboarding-btn--ghost"
              onClick={goBack}
              disabled={activeStep === 0 || saving}
            >
              <ChevronLeft aria-hidden="true" />
              {copy.buttons.back}
            </button>

            <button
              type="button"
              className="onboarding-btn onboarding-btn--save"
              onClick={saveProgress}
              disabled={saving}
            >
              <Save aria-hidden="true" />
              {copy.buttons.saveProgress}
            </button>

            {isLastStep ? (
              <button
                type="submit"
                className="onboarding-btn onboarding-btn--primary"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <span className="onboarding-btn__spinner" />
                    {copy.buttons.saving}
                  </>
                ) : (
                  <>
                    {copy.buttons.submit}
                    <Check aria-hidden="true" />
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                className="onboarding-btn onboarding-btn--primary"
                onClick={goNext}
                disabled={saving}
              >
                {copy.buttons.next}
                <ChevronRight aria-hidden="true" />
              </button>
            )}
          </footer>
        </form>
      </div>
    </main>
  );
}

function ClockIcon() {
  return <CalendarDays aria-hidden="true" />;
}

function Field({ id, label, hint, full = false, children }) {
  return (
    <div className={`onboarding-field ${full ? "onboarding-field--full" : ""}`}>
      <label className="onboarding-field__label" htmlFor={id}>
        <FieldHeader label={label} hint={hint} />
      </label>
      {children}
    </div>
  );
}

function FieldHeader({ label, hint }) {
  return (
    <>
      <span className="onboarding-field__label-text">{label}</span>
      {hint && <span className="onboarding-field__label-hint">{hint}</span>}
    </>
  );
}

function ChoiceGroup({ label, hint, items, selected, labelFor, onToggle }) {
  return (
    <div className="onboarding-field onboarding-field--full">
      <FieldHeader label={label} hint={hint} />
      <div className="onboarding-chip-grid">
        {items.map((key) => (
          <label key={key} className="onboarding-chip">
            <input
              type="checkbox"
              checked={selected.includes(key)}
              onChange={() => onToggle(key)}
            />
            <span>{labelFor(key)}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function RangeControl({ label, value, min, max, marks, style, onChange }) {
  return (
    <div className="onboarding-slider">
      <div className="onboarding-slider__label">
        <span>{label}</span>
        <span className="onboarding-slider__value">{value}</span>
      </div>
      <input
        type="range"
        aria-label={label}
        aria-valuetext={`${value} out of ${max}`}
        min={min}
        max={max}
        step="1"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={style}
      />
      <div className="onboarding-slider__scale">
        {marks.map((mark) => (
          <span key={mark}>{mark}</span>
        ))}
      </div>
    </div>
  );
}

function SummaryItem({ label, value }) {
  return (
    <div className="onboarding-summary__item">
      <span>{label}</span>
      <p>{value}</p>
    </div>
  );
}
