"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import api from "@/lib/api";
import Link from "next/link";
import { useToast } from "@/components/ToastProvider";
import { trackEvent } from "@/lib/analytics";
import { getDictionary, t } from "@/app/i18n";
import "@/styles/onboarding.scss";

// We store KEYS here, labels come from i18n
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

export default function OnboardingPage() {
  const { toast } = useToast();
  const pathname = usePathname();
  const locale = pathname?.startsWith("/ar") ? "ar" : "en";
  const dict = getDictionary(locale, "onboarding");
  const isRTL = locale === "ar";

  const [answers, setAnswers] = useState({
    // ——— Profile / Logistics ———
    timezone: "",
    availability: "",
    preferredFormat: "1:1",
    notes: "",

    // ——— Goals & Context ———
    goals: "",
    context: "",
    levelSelfEval: "",
    usageFrequency: "", // "never" | "sometimes" | "often" | "daily"
    usageContexts: [],

    // ——— Needs Analysis ———
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

    // ——— Self-Assessment ———
    confidence: {
      Speaking: 5,
      Listening: 5,
      Reading: 5,
      Writing: 5,
    },

    writingSample: "",
    consentRecording: false,
  });

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Derived: whether to show exam details input
  const isExamSelected = useMemo(
    () => answers.motivations.includes("exam_preparation"),
    [answers.motivations]
  );

  // Slider background helper (RTL-aware)
  const getSliderBackground = (value, min, max, rtl = false) => {
    const percentage = ((value - min) / (max - min)) * 100;

    if (rtl) {
      // Blue fill from the RIGHT in RTL
      return {
        background: `linear-gradient(to left, #0ea5e9 0%, #0ea5e9 ${percentage}%, #e2e8f0 ${percentage}%, #e2e8f0 100%)`,
      };
    }

    // Default LTR
    return {
      background: `linear-gradient(to right, #0ea5e9 0%, #0ea5e9 ${percentage}%, #e2e8f0 ${percentage}%, #e2e8f0 100%)`,
    };
  };

  const handleCheckboxGroup = (key, value) => {
    setAnswers((prev) => {
      const set = new Set(prev[key]);
      if (set.has(value)) set.delete(value);
      else set.add(value);
      return { ...prev, [key]: Array.from(set) };
    });
  };

  const handleNestedRange = (group, field, value) => {
    setAnswers((prev) => ({
      ...prev,
      [group]: { ...prev[group], [field]: Number(value) },
    }));
  };

  const handleToggle = (key) =>
    setAnswers((prev) => ({ ...prev, [key]: !prev[key] }));

  // Load existing answers
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/me/onboarding");
        if (data?.answers) {
          setAnswers((prev) => ({ ...prev, ...data.answers }));
        }
      } catch {
        // ignore
      }
    })();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      await api.post("/me/onboarding", { answers });

      trackEvent("onboarding_completed", {
        // extra props if needed
      });

      setSaved(true);
    } catch (e) {
      toast.error(e?.response?.data?.error || t(dict, "error_save_failed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="onboarding-wrapper">
      <div className="onboarding-container">
        <div className="onboarding-header">
          <h2 className="onboarding-header__title">{t(dict, "hero_title")}</h2>
          <p className="onboarding-header__subtitle">
            {t(dict, "hero_subtitle")}
          </p>
        </div>

        <form onSubmit={submit} className="onboarding-form">
          {/* ========== SECTION: Profile & Logistics ========== */}
          <section className="onboarding-section">
            <div className="onboarding-section__header">
              <h3 className="onboarding-section__title">
                {t(dict, "section_profile_title")}
              </h3>
              <p className="onboarding-section__hint">
                {t(dict, "section_profile_hint")}
              </p>
            </div>

            <div className="onboarding-form__grid">
              {/* Timezone */}
              <div className="onboarding-field">
                <label className="onboarding-field__label" htmlFor="timezone">
                  <span className="onboarding-field__label-text">
                    {t(dict, "field_timezone_label")}
                  </span>
                  <span className="onboarding-field__label-hint">
                    {t(dict, "field_timezone_hint")}
                  </span>
                </label>
                <input
                  id="timezone"
                  type="text"
                  className="onboarding-field__input"
                  value={answers.timezone}
                  onChange={(e) =>
                    setAnswers({ ...answers, timezone: e.target.value })
                  }
                  placeholder={t(dict, "field_timezone_placeholder")}
                  required
                />
              </div>

              {/* Preferred Format */}
              <div className="onboarding-field">
                <label className="onboarding-field__label" htmlFor="format">
                  <span className="onboarding-field__label-text">
                    {t(dict, "field_format_label")}
                  </span>
                  <span className="onboarding-field__label-hint">
                    {t(dict, "field_format_hint")}
                  </span>
                </label>
                <div className="onboarding-field__select-wrapper">
                  <select
                    id="format"
                    className="onboarding-field__select"
                    value={answers.preferredFormat}
                    onChange={(e) =>
                      setAnswers({
                        ...answers,
                        preferredFormat: e.target.value,
                      })
                    }
                  >
                    <option value="1:1">
                      {t(dict, "field_format_option_1to1")}
                    </option>
                    <option value="group">
                      {t(dict, "field_format_option_group")}
                    </option>
                    <option value="intensive">
                      {t(dict, "field_format_option_intensive")}
                    </option>
                  </select>
                  <svg
                    className="onboarding-field__select-icon"
                    width="12"
                    height="8"
                    viewBox="0 0 12 8"
                    fill="none"
                  >
                    <path
                      d="M1 1.5L6 6.5L11 1.5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>

              {/* Availability */}
              <div className="onboarding-field onboarding-field--full">
                <label
                  className="onboarding-field__label"
                  htmlFor="availability"
                >
                  <span className="onboarding-field__label-text">
                    {t(dict, "field_availability_label")}
                  </span>
                  <span className="onboarding-field__label-hint">
                    {t(dict, "field_availability_hint")}
                  </span>
                </label>
                <textarea
                  id="availability"
                  rows={3}
                  className="onboarding-field__textarea"
                  value={answers.availability}
                  onChange={(e) =>
                    setAnswers({ ...answers, availability: e.target.value })
                  }
                  placeholder={t(dict, "field_availability_placeholder")}
                />
              </div>
            </div>
          </section>

          {/* ========== SECTION: Goals & Context ========== */}
          <section className="onboarding-section">
            <div className="onboarding-section__header">
              <h3 className="onboarding-section__title">
                {t(dict, "section_goals_title")}
              </h3>
              <p className="onboarding-section__hint">
                {t(dict, "section_goals_hint")}
              </p>
            </div>

            <div className="onboarding-form__grid">
              {/* Goals */}
              <div className="onboarding-field onboarding-field--full">
                <label className="onboarding-field__label" htmlFor="goals">
                  <span className="onboarding-field__label-text">
                    {t(dict, "field_goals_label")}
                  </span>
                  <span className="onboarding-field__label-hint">
                    {t(dict, "field_goals_hint")}
                  </span>
                </label>
                <textarea
                  id="goals"
                  rows={3}
                  className="onboarding-field__textarea"
                  value={answers.goals}
                  onChange={(e) =>
                    setAnswers({ ...answers, goals: e.target.value })
                  }
                  placeholder={t(dict, "field_goals_placeholder")}
                />
              </div>

              {/* Context */}
              <div className="onboarding-field onboarding-field--full">
                <label className="onboarding-field__label" htmlFor="context">
                  <span className="onboarding-field__label-text">
                    {t(dict, "field_context_label")}
                  </span>
                  <span className="onboarding-field__label-hint">
                    {t(dict, "field_context_hint")}
                  </span>
                </label>
                <textarea
                  id="context"
                  rows={2}
                  className="onboarding-field__textarea"
                  value={answers.context}
                  onChange={(e) =>
                    setAnswers({ ...answers, context: e.target.value })
                  }
                  placeholder={t(dict, "field_context_placeholder")}
                />
              </div>

              {/* Usage frequency */}
              <div className="onboarding-field">
                <label
                  className="onboarding-field__label"
                  htmlFor="usageFrequency"
                >
                  <span className="onboarding-field__label-text">
                    {t(dict, "field_usage_frequency_label")}
                  </span>
                </label>
                <div className="onboarding-field__select-wrapper">
                  <select
                    id="usageFrequency"
                    className="onboarding-field__select"
                    value={answers.usageFrequency}
                    onChange={(e) =>
                      setAnswers({
                        ...answers,
                        usageFrequency: e.target.value,
                      })
                    }
                  >
                    <option value="">
                      {t(dict, "field_usage_frequency_placeholder")}
                    </option>
                    <option value="never">
                      {t(dict, "usage_frequency_never")}
                    </option>
                    <option value="sometimes">
                      {t(dict, "usage_frequency_sometimes")}
                    </option>
                    <option value="often">
                      {t(dict, "usage_frequency_often")}
                    </option>
                    <option value="daily">
                      {t(dict, "usage_frequency_daily")}
                    </option>
                  </select>
                  <svg
                    className="onboarding-field__select-icon"
                    width="12"
                    height="8"
                    viewBox="0 0 12 8"
                    fill="none"
                  >
                    <path
                      d="M1 1.5L6 6.5L11 1.5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>

              {/* Usage contexts */}
              <div className="onboarding-field onboarding-field--full">
                <label className="onboarding-field__label">
                  <span className="onboarding-field__label-text">
                    {t(dict, "field_usage_contexts_label")}
                  </span>
                  <span className="onboarding-field__label-hint">
                    {t(dict, "field_usage_contexts_hint")}
                  </span>
                </label>
                <div className="onboarding-checkbox-grid">
                  {USAGE_CONTEXTS.map((key) => (
                    <label key={key} className="onboarding-checkbox">
                      <input
                        type="checkbox"
                        checked={answers.usageContexts.includes(key)}
                        onChange={() =>
                          handleCheckboxGroup("usageContexts", key)
                        }
                      />
                      <span>{t(dict, `usage_${key}`)}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* ========== SECTION: Needs Analysis ========== */}
          <section className="onboarding-section">
            <div className="onboarding-section__header">
              <h3 className="onboarding-section__title">
                {t(dict, "section_needs_title")}
              </h3>
              <p className="onboarding-section__hint">
                {t(dict, "section_needs_hint")}
              </p>
            </div>

            <div className="onboarding-form__grid">
              {/* Motivations */}
              <div className="onboarding-field onboarding-field--full">
                <label className="onboarding-field__label">
                  <span className="onboarding-field__label-text">
                    {t(dict, "field_motivations_label")}
                  </span>
                  <span className="onboarding-field__label-hint">
                    {t(dict, "field_motivations_hint")}
                  </span>
                </label>
                <div className="onboarding-checkbox-grid">
                  {MOTIVATIONS.map((key) => (
                    <label key={key} className="onboarding-checkbox">
                      <input
                        type="checkbox"
                        checked={answers.motivations.includes(key)}
                        onChange={() => handleCheckboxGroup("motivations", key)}
                      />
                      <span>{t(dict, `motivation_${key}`)}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Motivation other */}
              {answers.motivations.includes("other") && (
                <div className="onboarding-field onboarding-field--full">
                  <label
                    className="onboarding-field__label"
                    htmlFor="motivationOther"
                  >
                    <span className="onboarding-field__label-text">
                      {t(dict, "field_motivation_other_label")}
                    </span>
                  </label>
                  <input
                    id="motivationOther"
                    type="text"
                    className="onboarding-field__input"
                    value={answers.motivationOther}
                    onChange={(e) =>
                      setAnswers({
                        ...answers,
                        motivationOther: e.target.value,
                      })
                    }
                    placeholder={t(dict, "field_motivation_other_placeholder")}
                  />
                </div>
              )}

              {/* Exam details, conditional */}
              {isExamSelected && (
                <div className="onboarding-field onboarding-field--full">
                  <label
                    className="onboarding-field__label"
                    htmlFor="examDetails"
                  >
                    <span className="onboarding-field__label-text">
                      {t(dict, "field_exam_details_label")}
                    </span>
                    <span className="onboarding-field__label-hint">
                      {t(dict, "field_exam_details_hint")}
                    </span>
                  </label>
                  <input
                    id="examDetails"
                    type="text"
                    className="onboarding-field__input"
                    value={answers.examDetails}
                    onChange={(e) =>
                      setAnswers({
                        ...answers,
                        examDetails: e.target.value,
                      })
                    }
                    placeholder={t(dict, "field_exam_details_placeholder")}
                  />
                </div>
              )}

              {/* Skill priorities */}
              <div className="onboarding-field onboarding-field--full">
                <label className="onboarding-field__label">
                  <span className="onboarding-field__label-text">
                    {t(dict, "field_skill_priority_label")}
                  </span>
                  <span className="onboarding-field__label-hint">
                    {t(dict, "field_skill_priority_hint")}
                  </span>
                </label>
                <div className="onboarding-sliders">
                  {SKILLS.map((s) => (
                    <div className="onboarding-slider" key={s}>
                      <div className="onboarding-slider__label">
                        <span>{t(dict, `skill_${s.toLowerCase()}`)}</span>
                        <span className="onboarding-slider__value">
                          {answers.skillPriority[s]}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="5"
                        step="1"
                        value={answers.skillPriority[s]}
                        onChange={(e) =>
                          handleNestedRange("skillPriority", s, e.target.value)
                        }
                        style={getSliderBackground(
                          answers.skillPriority[s],
                          1,
                          5,
                          isRTL
                        )}
                      />
                      <div className="onboarding-slider__scale">
                        <span>1</span>
                        <span>2</span>
                        <span>3</span>
                        <span>4</span>
                        <span>5</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Challenges */}
              <div className="onboarding-field onboarding-field--full">
                <label className="onboarding-field__label" htmlFor="challenges">
                  <span className="onboarding-field__label-text">
                    {t(dict, "field_challenges_label")}
                  </span>
                  <span className="onboarding-field__label-hint">
                    {t(dict, "field_challenges_hint")}
                  </span>
                </label>
                <textarea
                  id="challenges"
                  rows={3}
                  className="onboarding-field__textarea"
                  value={answers.challenges}
                  onChange={(e) =>
                    setAnswers({ ...answers, challenges: e.target.value })
                  }
                  placeholder={t(dict, "field_challenges_placeholder")}
                />
              </div>

              {/* Learning styles */}
              <div className="onboarding-field onboarding-field--full">
                <label className="onboarding-field__label">
                  <span className="onboarding-field__label-text">
                    {t(dict, "field_learning_styles_label")}
                  </span>
                  <span className="onboarding-field__label-hint">
                    {t(dict, "field_learning_styles_hint")}
                  </span>
                </label>
                <div className="onboarding-checkbox-grid">
                  {LEARNING_STYLES.map((key) => (
                    <label key={key} className="onboarding-checkbox">
                      <input
                        type="checkbox"
                        checked={answers.learningStyles.includes(key)}
                        onChange={() =>
                          handleCheckboxGroup("learningStyles", key)
                        }
                      />
                      <span>{t(dict, `learning_${key}`)}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* ========== SECTION: Self-Assessment ========== */}
          <section className="onboarding-section">
            <div className="onboarding-section__header">
              <h3 className="onboarding-section__title">
                {t(dict, "section_self_title")}
              </h3>
              <p className="onboarding-section__hint">
                {t(dict, "section_self_hint")}
              </p>
            </div>

            <div className="onboarding-form__grid">
              {/* CEFR Level */}
              <div className="onboarding-field">
                <label className="onboarding-field__label" htmlFor="level">
                  <span className="onboarding-field__label-text">
                    {t(dict, "field_level_label")}
                  </span>
                  <span className="onboarding-field__label-hint">
                    {t(dict, "field_level_hint")}
                  </span>
                </label>
                <div className="onboarding-field__select-wrapper">
                  <select
                    id="level"
                    className="onboarding-field__select"
                    value={answers.levelSelfEval}
                    onChange={(e) =>
                      setAnswers({
                        ...answers,
                        levelSelfEval: e.target.value,
                      })
                    }
                  >
                    <option value="">
                      {t(dict, "field_level_placeholder")}
                    </option>
                    <option value="A1">{t(dict, "level_a1")}</option>
                    <option value="A2">{t(dict, "level_a2")}</option>
                    <option value="B1">{t(dict, "level_b1")}</option>
                    <option value="B2">{t(dict, "level_b2")}</option>
                    <option value="C1">{t(dict, "level_c1")}</option>
                    <option value="C2">{t(dict, "level_c2")}</option>
                  </select>
                  <svg
                    className="onboarding-field__select-icon"
                    width="12"
                    height="8"
                    viewBox="0 0 12 8"
                    fill="none"
                  >
                    <path
                      d="M1 1.5L6 6.5L11 1.5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>

              {/* Confidence sliders */}
              <div className="onboarding-field onboarding-field--full">
                <label className="onboarding-field__label">
                  <span className="onboarding-field__label-text">
                    {t(dict, "field_confidence_label")}
                  </span>
                  <span className="onboarding-field__label-hint">
                    {t(dict, "field_confidence_hint")}
                  </span>
                </label>
                <div className="onboarding-sliders">
                  {["Speaking", "Listening", "Reading", "Writing"].map((s) => (
                    <div className="onboarding-slider" key={s}>
                      <div className="onboarding-slider__label">
                        <span>{t(dict, `skill_${s.toLowerCase()}`)}</span>
                        <span className="onboarding-slider__value">
                          {answers.confidence[s]}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        step="1"
                        value={answers.confidence[s]}
                        onChange={(e) =>
                          handleNestedRange("confidence", s, e.target.value)
                        }
                        style={getSliderBackground(
                          answers.confidence[s],
                          1,
                          10,
                          isRTL
                        )}
                      />
                      <div className="onboarding-slider__scale">
                        <span>1</span>
                        <span>3</span>
                        <span>5</span>
                        <span>7</span>
                        <span>10</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Writing sample */}
              <div className="onboarding-field onboarding-field--full">
                <label
                  className="onboarding-field__label"
                  htmlFor="writingSample"
                >
                  <span className="onboarding-field__label-text">
                    {t(dict, "field_writing_sample_label")}
                  </span>
                  <span className="onboarding-field__label-hint">
                    {t(dict, "field_writing_sample_hint")}
                  </span>
                </label>
                <textarea
                  id="writingSample"
                  rows={4}
                  className="onboarding-field__textarea"
                  value={answers.writingSample}
                  onChange={(e) =>
                    setAnswers({
                      ...answers,
                      writingSample: e.target.value,
                    })
                  }
                  placeholder={t(dict, "field_writing_sample_placeholder")}
                />
              </div>

              {/* Consent */}
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
          </section>

          {/* ========== SECTION: Additional Notes ========== */}
          <section className="onboarding-section">
            <div className="onboarding-section__header">
              <h3 className="onboarding-section__title">
                {t(dict, "section_notes_title")}
              </h3>
              <p className="onboarding-section__hint">
                {t(dict, "section_notes_hint")}
              </p>
            </div>

            <div className="onboarding-form__grid">
              <div className="onboarding-field onboarding-field--full">
                <label className="onboarding-field__label" htmlFor="notes">
                  <span className="onboarding-field__label-text">
                    {t(dict, "field_notes_label")}
                  </span>
                </label>
                <textarea
                  id="notes"
                  rows={3}
                  className="onboarding-field__textarea"
                  value={answers.notes}
                  onChange={(e) =>
                    setAnswers({ ...answers, notes: e.target.value })
                  }
                  placeholder={t(dict, "field_notes_placeholder")}
                />
              </div>
            </div>
          </section>

          {/* Actions */}
          <div className="onboarding-actions">
            <button
              type="submit"
              className="onboarding-btn onboarding-btn--primary"
              disabled={saving}
            >
              {saving ? (
                <>
                  <span className="onboarding-btn__spinner"></span>
                  {t(dict, "button_saving")}
                </>
              ) : (
                t(dict, "button_submit")
              )}
            </button>

            <Link
              className="onboarding-btn onboarding-btn--ghost"
              href="/dashboard"
            >
              {t(dict, "button_back_dashboard")}
            </Link>

            {saved && (
              <div className="onboarding-success">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path
                    d="M16.6667 5L7.50004 14.1667L3.33337 10"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span>{t(dict, "save_success")}</span>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
