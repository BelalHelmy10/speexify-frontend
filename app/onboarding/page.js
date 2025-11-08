"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import Link from "next/link";

export default function OnboardingPage() {
  const [answers, setAnswers] = useState({
    timezone: "",
    availability: "", // free text or CSV: Mon 18–20, Wed 10–12...
    goals: "",
    context: "", // work, study, interview, immigration, etc.
    levelSelfEval: "", // A1..C2 or beginner/intermediate/advanced
    preferredFormat: "1:1", // 1:1 or group
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
    <div className="container-narrow">
      <h2>Onboarding form</h2>
      <p>Please fill this so we can match you and tailor your program.</p>

      <form onSubmit={submit} className="form-grid" style={{ marginTop: 16 }}>
        <label>
          <span>Timezone</span>
          <input
            value={answers.timezone}
            onChange={(e) =>
              setAnswers({ ...answers, timezone: e.target.value })
            }
            placeholder="e.g., Africa/Cairo"
          />
        </label>

        <label>
          <span>Weekly availability (days & times)</span>
          <textarea
            rows={3}
            value={answers.availability}
            onChange={(e) =>
              setAnswers({ ...answers, availability: e.target.value })
            }
            placeholder="e.g., Sun 18:00–20:00, Tue 10:00–12:00"
          />
        </label>

        <label>
          <span>Your goals</span>
          <textarea
            rows={3}
            value={answers.goals}
            onChange={(e) => setAnswers({ ...answers, goals: e.target.value })}
            placeholder="Present better at work, pass IELTS 7.0, job interviews..."
          />
        </label>

        <label>
          <span>Context (work, study, interviews, etc.)</span>
          <textarea
            rows={2}
            value={answers.context}
            onChange={(e) =>
              setAnswers({ ...answers, context: e.target.value })
            }
          />
        </label>

        <label>
          <span>Self-evaluated level</span>
          <select
            value={answers.levelSelfEval}
            onChange={(e) =>
              setAnswers({ ...answers, levelSelfEval: e.target.value })
            }
          >
            <option value="">Select…</option>
            <option>A1 (Beginner)</option>
            <option>A2</option>
            <option>B1</option>
            <option>B2</option>
            <option>C1</option>
            <option>C2 (Near-native)</option>
          </select>
        </label>

        <label>
          <span>Preferred format</span>
          <select
            value={answers.preferredFormat}
            onChange={(e) =>
              setAnswers({ ...answers, preferredFormat: e.target.value })
            }
          >
            <option value="1:1">1:1</option>
            <option value="group">Small group (2–5)</option>
          </select>
        </label>

        <label>
          <span>Anything else we should know?</span>
          <textarea
            rows={3}
            value={answers.notes}
            onChange={(e) => setAnswers({ ...answers, notes: e.target.value })}
          />
        </label>

        <div className="button-row" style={{ marginTop: 8 }}>
          <button className="btn btn--primary" disabled={saving}>
            {saving ? "Saving..." : "Submit"}
          </button>
          <Link className="btn btn--ghost" href="/dashboard">
            Back to dashboard
          </Link>
          {saved && <span style={{ opacity: 0.8 }}>✅ Saved</span>}
        </div>
      </form>
    </div>
  );
}
