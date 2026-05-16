"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
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
  writingSample: "",
  consentRecording: false,
};

const LOCAL_COPY = {
  en: {
    eyebrow: "Speexify setup",
    title: "Let's shape your coaching plan.",
    subtitle:
      "A short setup so your coach knows what matters before the first live conversation.",
    estimate: "About 3 minutes",
    saveIdle: "Autosaves as you go",
    savedAt: "Autosaved {time}",
    requiredGoal: "Add one clear goal before continuing.",
    completeTitle: "Your coaching brief is ready.",
    completeBody:
      "We saved your setup. The next best step is the placement test so your coach can match the plan to your current level.",
    placementCta: "Start placement test",
    dashboardCta: "Go to dashboard",
    reviewTitle: "Review your brief",
    reviewBody:
      "This is what your coach will use to prepare your first session.",
    stepLabel: "Step {current} of {total}",
    buttons: {
      back: "Back",
      next: "Continue",
      submit: "Save setup",
      saving: "Saving...",
    },
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
          "This helps us tune the lesson style without repeating the placement test.",
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
      "Your coach sees this brief with your placement result, then builds the first session around your real use case.",
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
    eyebrow: "إعداد Speexify",
    title: "لنصمم خطة التدريب المناسبة لك.",
    subtitle:
      "إعداد قصير يساعد المدرب على فهم ما يهمك قبل أول محادثة مباشرة.",
    estimate: "حوالي 3 دقائق",
    saveIdle: "يتم الحفظ تلقائيًا أثناء العمل",
    savedAt: "تم الحفظ {time}",
    requiredGoal: "أضف هدفًا واضحًا واحدًا قبل المتابعة.",
    completeTitle: "ملخص التدريب جاهز.",
    completeBody:
      "حفظنا إعداداتك. الخطوة الأفضل الآن هي اختبار تحديد المستوى حتى يطابق المدرب الخطة مع مستواك الحالي.",
    placementCta: "ابدأ اختبار المستوى",
    dashboardCta: "الذهاب إلى لوحة التحكم",
    reviewTitle: "راجع الملخص",
    reviewBody:
      "هذه المعلومات التي سيستخدمها المدرب للتحضير لأول جلسة.",
    stepLabel: "خطوة {current} من {total}",
    buttons: {
      back: "رجوع",
      next: "متابعة",
      submit: "حفظ الإعداد",
      saving: "جارٍ الحفظ...",
    },
    steps: [
      {
        id: "schedule",
        label: "المواعيد",
        title: "متى يناسبك التدريب خلال الأسبوع؟",
        description:
          "أخبرنا بالأساسيات حتى نعرض مواعيد مناسبة وواقعية.",
      },
      {
        id: "goal",
        label: "الهدف",
        title: "ما الذي تريد أن تساعدك الإنجليزية على فعله؟",
        description:
          "هدف واضح واحد أفضل من وعد عام بالطلاقة.",
      },
      {
        id: "focus",
        label: "التركيز",
        title: "أين يجب أن يبدأ المدرب؟",
        description:
          "اختر المهارات والمواقف التي ستحدث أكبر فرق لك.",
      },
      {
        id: "style",
        label: "الأسلوب",
        title: "كيف تتعلم بأفضل شكل؟",
        description:
          "هذا يساعدنا على ضبط أسلوب الحصة دون تكرار اختبار المستوى.",
      },
      {
        id: "review",
        label: "المراجعة",
        title: "هل أنت جاهز لإرسال الملخص للمدرب؟",
        description:
          "راجع التفاصيل المهمة واحفظ ملخص البداية.",
      },
    ],
    coachNoteTitle: "ماذا يحدث بعد ذلك",
    coachNote:
      "يرى المدرب هذا الملخص مع نتيجة اختبار المستوى، ثم يبني أول جلسة حول استخدامك الحقيقي للغة.",
    proof: ["خاص بفريق التدريب", "يمكن تعديله لاحقًا", "لا توجد خطوة دفع هنا"],
    fieldPrimaryGoal: "الهدف الأساسي",
    fieldPrimaryGoalHint: "اكتب نتيجة واقعية، وليس فقط 'أريد الطلاقة'.",
    fieldContextHint: "أين تظهر الإنجليزية في حياتك.",
    fieldNotesHint: "تفضيلات، مخاوف، احتياجات وصول، أو أي أمر شخصي.",
    quickGoalTitle: "أهداف سريعة",
    quickGoals: [
      "أتحدث بثقة أكبر في الاجتماعات",
      "أستعد لمقابلات العمل",
      "أقدم عروضًا أوضح في العمل",
      "أكتب رسائل بريد أفضل",
      "أفهم المحادثات السريعة",
    ],
    reviewEmpty: "لم تتم الإضافة بعد",
    summary: {
      schedule: "المواعيد",
      goal: "الهدف",
      situations: "مواقف استخدام الإنجليزية",
      focus: "أهم مهارات التركيز",
      style: "أسلوب التعلم",
      confidence: "الثقة",
    },
  },
};

const STEP_ICONS = [CalendarDays, Target, MessageCircle, UserRound, ClipboardCheck];

function mergeAnswers(incoming = {}) {
  return {
    ...DEFAULT_ANSWERS,
    ...incoming,
    usageContexts: Array.isArray(incoming.usageContexts) ? incoming.usageContexts : [],
    motivations: Array.isArray(incoming.motivations) ? incoming.motivations : [],
    learningStyles: Array.isArray(incoming.learningStyles) ? incoming.learningStyles : [],
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
      answers.challenges ||
      answers.learningStyles.length ||
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

export default function OnboardingPage() {
  const { toast } = useToast();
  const pathname = usePathname();
  const locale = pathname?.startsWith("/ar") ? "ar" : "en";
  const prefix = locale === "ar" ? "/ar" : "";
  const dict = getDictionary(locale, "onboarding");
  const copy = LOCAL_COPY[locale] || LOCAL_COPY.en;
  const isRTL = locale === "ar";

  const [answers, setAnswers] = useState(DEFAULT_ANSWERS);
  const [activeStep, setActiveStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [draftReady, setDraftReady] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const saveTimer = useRef(null);

  const isExamSelected = useMemo(
    () => answers.motivations.includes("exam_preparation"),
    [answers.motivations]
  );

  const progress = Math.round(((activeStep + 1) / copy.steps.length) * 100);
  const isLastStep = activeStep === copy.steps.length - 1;

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
    let active = true;

    (async () => {
      let serverAnswers = null;
      let localDraft = null;

      try {
        const { data } = await api.get("/me/onboarding");
        if (data?.answers) serverAnswers = data.answers;
      } catch {}

      try {
        const local = window.localStorage.getItem(DRAFT_KEY);
        if (local) localDraft = JSON.parse(local);
      } catch {}

      if (!active) return;

      if (localDraft?.answers && hasDraftProgress(mergeAnswers(localDraft.answers))) {
        setAnswers(withDetectedTimezone(localDraft.answers));
        setActiveStep(Number(localDraft.activeStep || 0));
        if (localDraft.updatedAt) {
          const savedAt = new Date(localDraft.updatedAt);
          if (!Number.isNaN(savedAt.getTime())) setLastSavedAt(savedAt);
        }
      } else if (serverAnswers) {
        setAnswers(withDetectedTimezone(serverAnswers));
      } else {
        setAnswers(withDetectedTimezone());
      }

      setDraftReady(true);
    })();

    return () => {
      active = false;
    };
  }, []);

  const saveDraftNow = useCallback(() => {
    if (!draftReady || typeof window === "undefined") return;
    const savedAt = new Date();

    try {
      if (!hasDraftProgress(answers)) {
        window.localStorage.removeItem(DRAFT_KEY);
        setLastSavedAt(null);
        return;
      }

      window.localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({
          answers,
          activeStep,
          updatedAt: savedAt.toISOString(),
        })
      );
      setLastSavedAt(savedAt);
    } catch {}
  }, [activeStep, answers, draftReady]);

  useEffect(() => {
    if (!draftReady) return undefined;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(saveDraftNow, 300);

    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
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

  const validateStep = (stepIndex) => {
    if (stepIndex === 1 && !answers.goals.trim()) {
      toast.error(copy.requiredGoal);
      return false;
    }
    return true;
  };

  const goToStep = (stepIndex) => {
    if (stepIndex <= activeStep || validateStep(activeStep)) {
      setActiveStep(Math.max(0, Math.min(copy.steps.length - 1, stepIndex)));
    }
  };

  const goNext = () => {
    if (!validateStep(activeStep)) return;
    setActiveStep((current) => Math.min(copy.steps.length - 1, current + 1));
  };

  const goBack = () => {
    setActiveStep((current) => Math.max(0, current - 1));
  };

  const submit = async (e) => {
    e.preventDefault();

    if (!validateStep(1)) {
      setActiveStep(1);
      return;
    }

    setSaving(true);
    setSaved(false);
    try {
      await api.post("/me/onboarding", { answers });

      trackEvent("onboarding_completed", {
        preferredFormat: answers.preferredFormat,
        motivations: answers.motivations.length,
        usageContexts: answers.usageContexts.length,
      });

      try {
        window.localStorage.removeItem(DRAFT_KEY);
      } catch {}

      setLastSavedAt(null);
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
              <textarea
                id="availability"
                rows={4}
                className="onboarding-field__textarea"
                value={answers.availability}
                onChange={(e) => updateAnswer({ availability: e.target.value })}
                placeholder={t(dict, "field_availability_placeholder")}
              />
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
                    style={getSliderBackground(answers.confidence[skill], 1, 10, "#2d9e8f")}
                    onChange={(value) => handleNestedRange("confidence", skill, value)}
                  />
                ))}
              </div>
            </div>

            <Field id="level" label={t(dict, "field_level_label")} hint={t(dict, "field_level_hint")}>
              <div className="onboarding-field__select-wrapper">
                <select
                  id="level"
                  className="onboarding-field__select"
                  value={answers.levelSelfEval}
                  onChange={(e) => updateAnswer({ levelSelfEval: e.target.value })}
                >
                  <option value="">{t(dict, "field_level_placeholder")}</option>
                  <option value="A1">{t(dict, "level_a1")}</option>
                  <option value="A2">{t(dict, "level_a2")}</option>
                  <option value="B1">{t(dict, "level_b1")}</option>
                  <option value="B2">{t(dict, "level_b2")}</option>
                  <option value="C1">{t(dict, "level_c1")}</option>
                  <option value="C2">{t(dict, "level_c2")}</option>
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
                  answers.preferredFormat,
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

          <div className="onboarding-progress" aria-label={`${progress}%`}>
            <span style={{ width: `${progress}%` }} />
          </div>

          <nav className="onboarding-stepper" aria-label="Onboarding steps">
            {copy.steps.map((step, index) => {
              const Icon = STEP_ICONS[index];
              const complete = index < activeStep;
              const active = index === activeStep;
              return (
                <button
                  type="button"
                  key={step.id}
                  className={`onboarding-step ${active ? "is-active" : ""} ${
                    complete ? "is-complete" : ""
                  }`}
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
            <h2>{copy.steps[activeStep].title}</h2>
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
