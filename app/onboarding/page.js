"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import Link from "next/link";

export default function OnboardingPage() {
  const [answers, setAnswers] = useState({
    timezone: "",
    availability: "",
    goals: "",
    context: "",
    levelSelfEval: "",
    preferredFormat: "1:1",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/me/onboarding");
        if (data?.answers) setAnswers({ ...answers, ...data.answers });
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
      alert(e?.response?.data?.error || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="onboarding-wrapper">
      <div className="onboarding-container">
        <div className="onboarding-header">
          <h2 className="onboarding-header__title">
            Welcome! Let's Get Started
          </h2>
          <p className="onboarding-header__subtitle">
            Help us personalize your learning experience by sharing a few
            details about yourself.
          </p>
        </div>

        <form onSubmit={submit} className="onboarding-form">
          <div className="onboarding-form__grid">
            {/* Timezone Field */}
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
              />
            </div>

            {/* Availability Field */}
            <div className="onboarding-field onboarding-field--full">
              <label className="onboarding-field__label" htmlFor="availability">
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

            {/* Goals Field */}
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

            {/* Context Field */}
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

            {/* Level Field */}
            <div className="onboarding-field">
              <label className="onboarding-field__label" htmlFor="level">
                <span className="onboarding-field__label-text">
                  Current Level
                </span>
                <span className="onboarding-field__label-hint">
                  Self-assessment
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

            {/* Format Field */}
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
                    setAnswers({ ...answers, preferredFormat: e.target.value })
                  }
                >
                  <option value="1:1">1:1 (Individual Sessions)</option>
                  <option value="group">Small Group (2–5 people)</option>
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

            {/* Notes Field */}
            <div className="onboarding-field onboarding-field--full">
              <label className="onboarding-field__label" htmlFor="notes">
                <span className="onboarding-field__label-text">
                  Additional Notes
                </span>
                <span className="onboarding-field__label-hint">
                  Anything else we should know?
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
                placeholder="Share any specific requirements, preferences, or concerns..."
              />
            </div>
          </div>

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
