// app/needsanalysis/page.js
"use client";

import { useEffect, useMemo, useState } from "react";
import "@/styles/needsanalysis.scss";

const SECTIONS = [
  {
    key: "warm",
    title: "Warm alignment",
    questions: [
      {
        id: "why_now",
        label:
          "1) What prompted you to reach out about personal coaching in business communications right now?",
        placeholder:
          "Capture her words verbatim if possible. What triggered this? What's coming up?",
        type: "textarea",
      },
      {
        id: "useful_end",
        label: "2) By the end of this call, what would make it useful for you?",
        placeholder:
          "Clarity? A plan? A quick win? A decision? Note what 'useful' means to her.",
        type: "textarea",
      },
    ],
  },
  {
    key: "context",
    title: "Context & reality",
    questions: [
      {
        id: "high_stakes",
        label:
          "3) In your founder role, where does communication matter most right now? (investors, partners, team, customers, etc.)",
        placeholder:
          "List the top 2–3 situations and who's involved. Note what's at stake.",
        type: "textarea",
      },
      {
        id: "formats",
        label:
          "4) What formats show up most for you? (pitches, demos, meetings, written updates, 1:1s, Q&A, etc.)",
        placeholder:
          "Which formats feel easiest? Which feel hardest? Any patterns?",
        type: "textarea",
      },
      {
        id: "working",
        label:
          "5) When communication goes well for you, what are you doing that makes the difference?",
        placeholder:
          "What strengths should we preserve? What's already working?",
        type: "textarea",
      },
    ],
  },
  {
    key: "friction",
    title: "Friction & pain (the leverage)",
    questions: [
      {
        id: "hardest",
        label:
          "6) In high-stakes moments, what feels hardest for you personally?",
        placeholder:
          "Examples: structuring thoughts on the spot, sounding decisive, handling pushback, not over-explaining, landing a clear ask…",
        type: "textarea",
      },
      {
        id: "recent_example",
        label:
          "7) Tell me about a recent moment where your message didn't land the way you intended. What happened?",
        placeholder:
          "Capture: situation, audience, what she said, where it drifted, what the outcome was.",
        type: "textarea",
        subPrompts: [
          "What did you say first?",
          "Where did their face change / energy shift?",
          "What question or objection came up?",
          "How did you respond in the moment?",
        ],
      },
      {
        id: "cost",
        label:
          "8) When that happens, what do you think it's costing you right now? (time, momentum, perception, decisions, energy)",
        placeholder:
          "Make it concrete: follow-ups, delays, missed buy-in, investor confidence, team alignment, etc.",
        type: "textarea",
      },
      {
        id: "future_cost",
        label: "9) What happens if this doesn't improve in the next 6 months?",
        placeholder:
          "Dig into future cost: What opportunities slip? What gets harder? What compounds?",
        type: "textarea",
      },
    ],
  },
  {
    key: "goals",
    title: "Goals & success",
    questions: [
      {
        id: "success",
        label:
          "10) If we fast-forward 3–6 months, what would 'success' look like in your communication?",
        placeholder:
          "What would she be doing differently? What would others notice? What outcomes improve?",
        type: "textarea",
      },
      {
        id: "first_scenario",
        label:
          "11) What's the #1 scenario you'd want to work on first if we start?",
        placeholder:
          "Pick one: investor narrative, demo clarity, Q&A pressure, leadership messaging, team alignment, partner calls…",
        type: "textarea",
      },
    ],
  },
  {
    key: "wrap",
    title: "Wrap-up mirror",
    questions: [
      {
        id: "one_sentence",
        label:
          "12) If you had to name the core issue in one sentence, what would it be?",
        placeholder:
          "Let her phrase the 'headline'. This becomes your reflection back to her.",
        type: "textarea",
      },
      {
        id: "next_step",
        label: "13) What would feel like the best next step from here?",
        placeholder:
          "Examples: a short engagement, a first working session on a real upcoming meeting, or a plan + timeline.",
        type: "textarea",
      },
    ],
  },
];

const SCORE_ITEMS = [
  {
    id: "clarity",
    label: "Clarity",
    prompt: "How confident are you that your ideas land cleanly?",
  },
  {
    id: "structure",
    label: "Structure",
    prompt: "How confident are you that you stay organized under pressure?",
  },
  {
    id: "concision",
    label: "Concision",
    prompt: "How confident are you that you avoid over-explaining?",
  },
  {
    id: "presence",
    label: "Executive presence",
    prompt: "How confident are you in your confidence, pace, and authority?",
  },
  {
    id: "pushback",
    label: "Handling pushback",
    prompt: "How confident are you handling Q&A, objections, interruptions?",
  },
];

const STORAGE_KEY = "speexify_needsanalysis_v2";

function safeParseJSON(v, fallback) {
  try {
    return JSON.parse(v);
  } catch {
    return fallback;
  }
}

export default function NeedsAnalysisPage() {
  const [clientName, setClientName] = useState("Jessica");
  const [answers, setAnswers] = useState({});
  const [scores, setScores] = useState(() =>
    Object.fromEntries(SCORE_ITEMS.map((s) => [s.id, 5]))
  );
  const [coachNotes, setCoachNotes] = useState({
    corePattern: "",
    unlock: "",
    priority: "",
    redFlags: "",
  });
  const [toast, setToast] = useState(null);

  // Load
  useEffect(() => {
    const saved = safeParseJSON(localStorage.getItem(STORAGE_KEY), null);
    if (!saved) return;

    setClientName(saved.clientName ?? "Jessica");
    setAnswers(saved.answers ?? {});
    setScores((prev) => ({ ...prev, ...(saved.scores ?? {}) }));
    setCoachNotes((prev) => ({ ...prev, ...(saved.coachNotes ?? {}) }));
  }, []);

  // Save
  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ clientName, answers, scores, coachNotes })
    );
  }, [clientName, answers, scores, coachNotes]);

  const completion = useMemo(() => {
    const total = SECTIONS.reduce((acc, s) => acc + s.questions.length, 0);
    const filled = Object.values(answers).filter((v) =>
      String(v).trim()
    ).length;
    const pct = total ? Math.round((filled / total) * 100) : 0;
    return { total, filled, pct };
  }, [answers]);

  const avgScore = useMemo(() => {
    const vals = Object.values(scores);
    const sum = vals.reduce((a, b) => a + Number(b || 0), 0);
    return vals.length ? Math.round((sum / vals.length) * 10) / 10 : 0;
  }, [scores]);

  const urgencyFlags = useMemo(() => {
    const flags = [];
    Object.entries(scores).forEach(([key, val]) => {
      if (val <= 3) {
        const item = SCORE_ITEMS.find((s) => s.id === key);
        if (item) flags.push(item.label);
      }
    });
    return flags;
  }, [scores]);

  function setAnswer(id, value) {
    setAnswers((a) => ({ ...a, [id]: value }));
  }

  function setScore(id, value) {
    setScores((s) => ({ ...s, [id]: Number(value) }));
  }

  function setCoachNote(key, value) {
    setCoachNotes((n) => ({ ...n, [key]: value }));
  }

  function reset() {
    localStorage.removeItem(STORAGE_KEY);
    setClientName("Jessica");
    setAnswers({});
    setScores(Object.fromEntries(SCORE_ITEMS.map((s) => [s.id, 5])));
    setCoachNotes({
      corePattern: "",
      unlock: "",
      priority: "",
      redFlags: "",
    });
    setToast("Reset complete.");
    setTimeout(() => setToast(null), 1400);
  }

  async function copySummary() {
    const lines = [];

    // Header
    lines.push("═".repeat(60));
    lines.push(`NEEDS ANALYSIS — ${clientName.toUpperCase()}`);
    lines.push("═".repeat(60));
    lines.push("");

    // Coach's synthesis (top priority)
    if (
      coachNotes.corePattern ||
      coachNotes.unlock ||
      coachNotes.priority ||
      coachNotes.redFlags
    ) {
      lines.push("🎯 COACH'S READ");
      lines.push("─".repeat(60));
      if (coachNotes.corePattern)
        lines.push(`Core pattern: ${coachNotes.corePattern}`);
      if (coachNotes.unlock) lines.push(`The unlock: ${coachNotes.unlock}`);
      if (coachNotes.priority)
        lines.push(`Priority focus: ${coachNotes.priority}`);
      if (coachNotes.redFlags) lines.push(`Red flags: ${coachNotes.redFlags}`);
      lines.push("");
    }

    // Headline insight from Q12
    const headline = (answers.one_sentence ?? "").trim();
    if (headline) {
      lines.push("💡 CLIENT'S HEADLINE");
      lines.push("─".repeat(60));
      lines.push(`"${headline}"`);
      lines.push("");
    }

    // Urgency indicators
    if (urgencyFlags.length > 0) {
      lines.push("🚨 HIGH-URGENCY AREAS (scored ≤3/10)");
      lines.push("─".repeat(60));
      urgencyFlags.forEach((f) => lines.push(`• ${f}`));
      lines.push("");
    }

    // Self-rating summary
    lines.push("📊 SELF-RATING SNAPSHOT");
    lines.push("─".repeat(60));
    lines.push(`Overall avg: ${avgScore}/10`);
    lines.push("");
    SCORE_ITEMS.forEach((s) => {
      const score = scores[s.id];
      const flag = score <= 3 ? " ⚠️" : "";
      lines.push(`${s.label}: ${score}/10${flag}`);
    });
    lines.push("");

    // Full Q&A
    lines.push("📝 FULL DISCOVERY NOTES");
    lines.push("─".repeat(60));
    SECTIONS.forEach((sec) => {
      lines.push("");
      lines.push(`[${sec.title.toUpperCase()}]`);
      sec.questions.forEach((q) => {
        const val = (answers[q.id] ?? "").trim();
        lines.push("");
        lines.push(q.label);
        if (val) {
          lines.push(`→ ${val}`);
        } else {
          lines.push("→ (no notes)");
        }

        // Add sub-prompts for Q7 if available
        if (q.subPrompts && val) {
          lines.push("");
          lines.push("  Follow-up prompts to explore:");
          q.subPrompts.forEach((sp) => lines.push(`  • ${sp}`));
        }
      });
    });

    lines.push("");
    lines.push("═".repeat(60));
    lines.push(`Generated: ${new Date().toLocaleString()}`);
    lines.push("═".repeat(60));

    const text = lines.join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setToast("Full summary copied to clipboard.");
    } catch {
      setToast("Couldn't copy. (Browser blocked clipboard)");
    } finally {
      setTimeout(() => setToast(null), 1400);
    }
  }

  return (
    <div className="naSimple">
      <header className="naSimple__header">
        <div className="naSimple__top">
          <div className="naSimple__titleBlock">
            <h1 className="naSimple__title">Needs Analysis</h1>
            <p className="naSimple__sub">
              Discovery questions + diagnostic scoring + post-call synthesis.
              Everything you need for client intake.
            </p>
          </div>

          <div className="naSimple__meta">
            <label className="naSimple__field">
              <span>Client</span>
              <input
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Client name"
              />
            </label>

            <div className="naSimple__progress">
              <div className="naSimple__progressTop">
                <span>Completion</span>
                <span>
                  {completion.filled}/{completion.total} • {completion.pct}%
                </span>
              </div>
              <div className="naSimple__bar">
                <div
                  className="naSimple__barFill"
                  style={{ width: `${completion.pct}%` }}
                />
              </div>
            </div>

            <div className="naSimple__actions">
              <button className="naSimple__btn" onClick={copySummary}>
                Copy full summary
              </button>
              <button
                className="naSimple__btn naSimple__btn--ghost"
                onClick={reset}
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        <section className="naSimple__scores">
          <div className="naSimple__scoresHead">
            <h2>Client confidence snapshot (0–10)</h2>
            <div className="naSimple__avg">
              Avg <strong>{avgScore}</strong>/10
            </div>
          </div>
          <p className="naSimple__scoresPrompt">
            Ask: "On a scale of 0-10, how confident are you that you can..."
          </p>

          <div className="naSimple__scoreGrid">
            {SCORE_ITEMS.map((s) => (
              <div key={s.id} className="naSimple__scoreCard">
                <div className="naSimple__scoreLabel">
                  <strong>{s.label}</strong>
                  <span>{s.prompt}</span>
                </div>
                <div className="naSimple__scoreRow">
                  <input
                    className="naSimple__range"
                    type="range"
                    min={0}
                    max={10}
                    step={1}
                    value={scores[s.id] ?? 5}
                    onChange={(e) => setScore(s.id, e.target.value)}
                  />
                  <div
                    className={`naSimple__scoreValue ${
                      scores[s.id] <= 3 ? "naSimple__scoreValue--urgent" : ""
                    }`}
                  >
                    {scores[s.id]}/10
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </header>

      {toast && <div className="naSimple__toast">{toast}</div>}

      <main className="naSimple__main">
        {SECTIONS.map((sec) => (
          <section key={sec.key} className="naSimple__section">
            <div className="naSimple__sectionHead">
              <h2>{sec.title}</h2>
            </div>

            <div className="naSimple__qa">
              {sec.questions.map((q) => (
                <div key={q.id} className="naSimple__item">
                  <div className="naSimple__question">{q.label}</div>
                  <textarea
                    className="naSimple__answer"
                    value={answers[q.id] ?? ""}
                    onChange={(e) => setAnswer(q.id, e.target.value)}
                    placeholder={q.placeholder}
                    rows={4}
                  />
                  {q.subPrompts && (
                    <div className="naSimple__subPrompts">
                      <div className="naSimple__subPromptsLabel">
                        Follow-up prompts:
                      </div>
                      <ul>
                        {q.subPrompts.map((sp, i) => (
                          <li key={i}>{sp}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}

        {/* Coach's synthesis section */}
        <section className="naSimple__section naSimple__section--coach">
          <div className="naSimple__sectionHead">
            <h2>🎯 Coach's post-call synthesis</h2>
          </div>

          <div className="naSimple__qa">
            <div className="naSimple__item">
              <div className="naSimple__question">
                What's the core pattern you're seeing?
              </div>
              <textarea
                className="naSimple__answer"
                value={coachNotes.corePattern}
                onChange={(e) => setCoachNote("corePattern", e.target.value)}
                placeholder="What keeps showing up? What's the thread connecting their struggles?"
                rows={3}
              />
            </div>

            <div className="naSimple__item">
              <div className="naSimple__question">What's the unlock?</div>
              <textarea
                className="naSimple__answer"
                value={coachNotes.unlock}
                onChange={(e) => setCoachNote("unlock", e.target.value)}
                placeholder="What single shift would create the biggest change? What would unblock everything else?"
                rows={3}
              />
            </div>

            <div className="naSimple__item">
              <div className="naSimple__question">
                What would you prioritize first?
              </div>
              <textarea
                className="naSimple__answer"
                value={coachNotes.priority}
                onChange={(e) => setCoachNote("priority", e.target.value)}
                placeholder="Which scenario or skill would you tackle in session 1? What's the highest-leverage starting point?"
                rows={3}
              />
            </div>

            <div className="naSimple__item">
              <div className="naSimple__question">
                Any red flags or considerations?
              </div>
              <textarea
                className="naSimple__answer"
                value={coachNotes.redFlags}
                onChange={(e) => setCoachNote("redFlags", e.target.value)}
                placeholder="Readiness concerns? Misaligned expectations? Scope issues? Anything that needs addressing upfront?"
                rows={3}
              />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
