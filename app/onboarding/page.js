"use client";

import { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import Link from "next/link";
import { useToast } from "@/components/ToastProvider";

const MOTIVATIONS = [
  "Professional development",
  "Academic studies",
  "Exam preparation (IELTS/TOEFL/etc.)",
  "Immigration / relocation",
  "Travel",
  "Social / personal growth",
  "Other",
];

const USAGE_CONTEXTS = [
  "Work emails",
  "Meetings / presentations",
  "Client communication",
  "Academic writing",
  "Research / reading papers",
  "Social conversation",
  "Travel situations",
  "Other",
];

const LEARNING_STYLES = [
  "Structured grammar-focused lessons",
  "Interactive speaking & conversation",
  "Task / project-based learning",
  "Listening & video-based practice",
  "Reading-focused with vocabulary building",
  "Self-paced study with feedback",
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
    usageFrequency: "", // Never / Sometimes / Often / Daily
    usageContexts: [], // array of strings

    // ——— Needs Analysis ———
    motivations: [], // array of strings
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
    }, // 1–5 Likert

    challenges: "",
    learningStyles: [], // array of strings

    // ——— Self-Assessment ———
    confidence: {
      Speaking: 5,
      Listening: 5,
      Reading: 5,
      Writing: 5,
    }, // 1–10

    writingSample: "",
    consentRecording: false,
  });

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Derived: whether to show exam details input
  const isExamSelected = useMemo(
    () => answers.motivations.includes("Exam preparation (IELTS/TOEFL/etc.)"),
    [answers.motivations]
  );

  // Helper function for dynamic slider background
  const getSliderBackground = (value, min, max) => {
    const percentage = ((value - min) / (max - min)) * 100;
    return {
      background: `linear-gradient(to right, #0ea5e9 0%, #0ea5e9 ${percentage}%, #e2e8f0 ${percentage}%, #e2e8f0 100%)`,
    };
  };

  const handleCheckboxGroup = (key, value) => {
    setAnswers((prev) => {
      const arr = new Set(prev[key]);
      if (arr.has(value)) arr.delete(value);
      else arr.add(value);
      return { ...prev, [key]: Array.from(arr) };
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

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/me/onboarding");
        if (data?.answers) setAnswers((prev) => ({ ...prev, ...data.answers }));
      } catch {}
      // eslint-disable-next-line react-hooks/exhaustive-deps
    })();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      await api.post("/me/onboarding", { answers });
      setSaved(true);
    } catch (e) {
      toast.error(e?.response?.data?.error || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="onboarding-wrapper">
      <div className="onboarding-container">
        <div className="onboarding-header">
          <h2 className="onboarding-header__title">
            Welcome! Let&apos;s Get Started
          </h2>
          <p className="onboarding-header__subtitle">
            Help us personalize your learning experience by sharing a few
            details about yourself.
          </p>
        </div>

        <form onSubmit={submit} className="onboarding-form">
          {/* ========== SECTION: Profile & Logistics ========== */}
          <section className="onboarding-section">
            <div className="onboarding-section__header">
              <h3 className="onboarding-section__title">Profile & Logistics</h3>
              <p className="onboarding-section__hint">
                Your timezone and availability help us schedule effectively.
              </p>
            </div>

            <div className="onboarding-form__grid">
              {/* Timezone */}
              <div className="onboarding-field">
                <label className="onboarding-field__label" htmlFor="timezone">
                  <span className="onboarding-field__label-text">Timezone</span>
                  <span className="onboarding-field__label-hint">
                    Where are you located?
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
                  placeholder="e.g., Africa/Cairo, America/New_York"
                  required
                />
              </div>

              {/* Preferred Format */}
              <div className="onboarding-field">
                <label className="onboarding-field__label" htmlFor="format">
                  <span className="onboarding-field__label-text">
                    Preferred Format
                  </span>
                  <span className="onboarding-field__label-hint">
                    Class size preference
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
                    <option value="1:1">1:1 (Individual Sessions)</option>
                    <option value="group">Small Group (2–5 people)</option>
                    <option value="intensive">
                      Intensive (short-term, high frequency)
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
                    Weekly Availability
                  </span>
                  <span className="onboarding-field__label-hint">
                    When are you typically free?
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
                  placeholder="e.g., Sun 18:00–20:00, Tue 10:00–12:00, Thu 14:00–16:00"
                />
              </div>
            </div>
          </section>

          {/* ========== SECTION: Goals & Context ========== */}
          <section className="onboarding-section">
            <div className="onboarding-section__header">
              <h3 className="onboarding-section__title">Goals & Context</h3>
              <p className="onboarding-section__hint">
                Tell us what success looks like and how you use English.
              </p>
            </div>

            <div className="onboarding-form__grid">
              {/* Goals */}
              <div className="onboarding-field onboarding-field--full">
                <label className="onboarding-field__label" htmlFor="goals">
                  <span className="onboarding-field__label-text">
                    Your Learning Goals
                  </span>
                  <span className="onboarding-field__label-hint">
                    What would you like to achieve?
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
                  placeholder="e.g., Present better at work, pass IELTS 7.0, ace job interviews..."
                />
              </div>

              {/* Context */}
              <div className="onboarding-field onboarding-field--full">
                <label className="onboarding-field__label" htmlFor="context">
                  <span className="onboarding-field__label-text">
                    Learning Context
                  </span>
                  <span className="onboarding-field__label-hint">
                    Work, study, personal growth?
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
                  placeholder="e.g., Professional development, university studies, immigration prep..."
                />
              </div>

              {/* Usage frequency */}
              <div className="onboarding-field">
                <label
                  className="onboarding-field__label"
                  htmlFor="usageFrequency"
                >
                  <span className="onboarding-field__label-text">
                    How often do you use English?
                  </span>
                </label>
                <div className="onboarding-field__select-wrapper">
                  <select
                    id="usageFrequency"
                    className="onboarding-field__select"
                    value={answers.usageFrequency}
                    onChange={(e) =>
                      setAnswers({ ...answers, usageFrequency: e.target.value })
                    }
                  >
                    <option value="">Select...</option>
                    <option value="Never">Never</option>
                    <option value="Sometimes">Sometimes</option>
                    <option value="Often">Often</option>
                    <option value="Daily">Daily</option>
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
                    In which situations?
                  </span>
                  <span className="onboarding-field__label-hint">
                    Select all that apply
                  </span>
                </label>
                <div className="onboarding-checkbox-grid">
                  {USAGE_CONTEXTS.map((c) => (
                    <label key={c} className="onboarding-checkbox">
                      <input
                        type="checkbox"
                        checked={answers.usageContexts.includes(c)}
                        onChange={() => handleCheckboxGroup("usageContexts", c)}
                      />
                      <span>{c}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* ========== SECTION: Needs Analysis ========== */}
          <section className="onboarding-section">
            <div className="onboarding-section__header">
              <h3 className="onboarding-section__title">Needs Analysis</h3>
              <p className="onboarding-section__hint">
                Help us tailor your plan and choose the right materials.
              </p>
            </div>

            <div className="onboarding-form__grid">
              {/* Motivations */}
              <div className="onboarding-field onboarding-field--full">
                <label className="onboarding-field__label">
                  <span className="onboarding-field__label-text">
                    Main reasons for learning
                  </span>
                  <span className="onboarding-field__label-hint">
                    Select all that apply
                  </span>
                </label>
                <div className="onboarding-checkbox-grid">
                  {MOTIVATIONS.map((m) => (
                    <label key={m} className="onboarding-checkbox">
                      <input
                        type="checkbox"
                        checked={answers.motivations.includes(m)}
                        onChange={() => handleCheckboxGroup("motivations", m)}
                      />
                      <span>{m}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Motivation other */}
              {answers.motivations.includes("Other") && (
                <div className="onboarding-field onboarding-field--full">
                  <label
                    className="onboarding-field__label"
                    htmlFor="motivationOther"
                  >
                    <span className="onboarding-field__label-text">
                      Tell us more
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
                    placeholder="Briefly describe your motivation"
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
                      Exam details
                    </span>
                    <span className="onboarding-field__label-hint">
                      Which exam? Target score? Deadline?
                    </span>
                  </label>
                  <input
                    id="examDetails"
                    type="text"
                    className="onboarding-field__input"
                    value={answers.examDetails}
                    onChange={(e) =>
                      setAnswers({ ...answers, examDetails: e.target.value })
                    }
                    placeholder="e.g., IELTS 7.0 by Oct 15"
                  />
                </div>
              )}

              {/* Skill priorities (Likert 1-5) */}
              <div className="onboarding-field onboarding-field--full">
                <label className="onboarding-field__label">
                  <span className="onboarding-field__label-text">
                    Skill focus priorities
                  </span>
                  <span className="onboarding-field__label-hint">
                    1 = Not important, 5 = Very important
                  </span>
                </label>
                <div className="onboarding-sliders">
                  {SKILLS.map((s) => (
                    <div className="onboarding-slider" key={s}>
                      <div className="onboarding-slider__label">
                        <span>{s}</span>
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
                          5
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
                    What do you find most difficult?
                  </span>
                  <span className="onboarding-field__label-hint">
                    Be specific—this guides our first lessons.
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
                  placeholder="e.g., understanding fast speech; organizing ideas in writing; accurate grammar in emails..."
                />
              </div>

              {/* Learning styles */}
              <div className="onboarding-field onboarding-field--full">
                <label className="onboarding-field__label">
                  <span className="onboarding-field__label-text">
                    Preferred learning style
                  </span>
                  <span className="onboarding-field__label-hint">
                    Select all that apply
                  </span>
                </label>
                <div className="onboarding-checkbox-grid">
                  {LEARNING_STYLES.map((s) => (
                    <label key={s} className="onboarding-checkbox">
                      <input
                        type="checkbox"
                        checked={answers.learningStyles.includes(s)}
                        onChange={() =>
                          handleCheckboxGroup("learningStyles", s)
                        }
                      />
                      <span>{s}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* ========== SECTION: Self-Assessment ========== */}
          <section className="onboarding-section">
            <div className="onboarding-section__header">
              <h3 className="onboarding-section__title">Self-Assessment</h3>
              <p className="onboarding-section__hint">
                Optional but helpful for placement and lesson planning.
              </p>
            </div>

            <div className="onboarding-form__grid">
              {/* CEFR Level */}
              <div className="onboarding-field">
                <label className="onboarding-field__label" htmlFor="level">
                  <span className="onboarding-field__label-text">
                    Current Level
                  </span>
                  <span className="onboarding-field__label-hint">
                    Self-assessment (CEFR)
                  </span>
                </label>
                <div className="onboarding-field__select-wrapper">
                  <select
                    id="level"
                    className="onboarding-field__select"
                    value={answers.levelSelfEval}
                    onChange={(e) =>
                      setAnswers({ ...answers, levelSelfEval: e.target.value })
                    }
                  >
                    <option value="">Select your level...</option>
                    <option value="A1">A1 (Beginner)</option>
                    <option value="A2">A2 (Elementary)</option>
                    <option value="B1">B1 (Intermediate)</option>
                    <option value="B2">B2 (Upper Intermediate)</option>
                    <option value="C1">C1 (Advanced)</option>
                    <option value="C2">C2 (Near-native)</option>
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

              {/* Confidence sliders 1–10 */}
              <div className="onboarding-field onboarding-field--full">
                <label className="onboarding-field__label">
                  <span className="onboarding-field__label-text">
                    Confidence by skill
                  </span>
                  <span className="onboarding-field__label-hint">
                    1 = Low confidence, 10 = Very confident
                  </span>
                </label>
                <div className="onboarding-sliders">
                  {["Speaking", "Listening", "Reading", "Writing"].map((s) => (
                    <div className="onboarding-slider" key={s}>
                      <div className="onboarding-slider__label">
                        <span>{s}</span>
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
                          10
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
                    Short writing sample (optional)
                  </span>
                  <span className="onboarding-field__label-hint">
                    3–5 sentences about your goals or interests
                  </span>
                </label>
                <textarea
                  id="writingSample"
                  rows={4}
                  className="onboarding-field__textarea"
                  value={answers.writingSample}
                  onChange={(e) =>
                    setAnswers({ ...answers, writingSample: e.target.value })
                  }
                  placeholder="Write a short paragraph here…"
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
                  <span>
                    I consent to use of session recordings/screenshots for
                    private feedback and coaching purposes only.
                  </span>
                </label>
              </div>
            </div>
          </section>

          {/* ========== SECTION: Additional Notes ========== */}
          <section className="onboarding-section">
            <div className="onboarding-section__header">
              <h3 className="onboarding-section__title">Additional Notes</h3>
              <p className="onboarding-section__hint">
                Anything else we should know?
              </p>
            </div>

            <div className="onboarding-form__grid">
              <div className="onboarding-field onboarding-field--full">
                <label className="onboarding-field__label" htmlFor="notes">
                  <span className="onboarding-field__label-text">Notes</span>
                </label>
                <textarea
                  id="notes"
                  rows={3}
                  className="onboarding-field__textarea"
                  value={answers.notes}
                  onChange={(e) =>
                    setAnswers({ ...answers, notes: e.target.value })
                  }
                  placeholder="Share any specific requirements, preferences, accessibility needs, or concerns..."
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
                  Saving...
                </>
              ) : (
                "Complete Onboarding"
              )}
            </button>

            <Link
              className="onboarding-btn onboarding-btn--ghost"
              href="/dashboard"
            >
              Back to Dashboard
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
                <span>Successfully saved!</span>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
