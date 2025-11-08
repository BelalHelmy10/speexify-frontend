"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import Link from "next/link";

export default function AssessmentPage() {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [last, setLast] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/me/assessment");
        if (data?.text) {
          setLast(data);
          setText(data.text);
        }
      } catch {}
    })();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
    if (wordCount < 120) {
      if (!confirm("Your submission is under 120 words. Submit anyway?"))
        return;
    }
    setSaving(true);
    try {
      await api.post("/me/assessment", { text });
      alert("Assessment submitted. We’ll review it soon.");
    } catch (e) {
      alert(e?.response?.data?.error || "Failed to submit");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container-narrow">
      <h2>Written assessment</h2>
      <p>
        Please write ~150–250 words on the prompt below. We’ll use this to gauge
        your grammar, vocabulary, and organization.
      </p>

      <div className="panel" style={{ marginTop: 12 }}>
        <h4>Prompt</h4>
        <p>
          <em>
            Describe a situation where improving your English would have changed
            the outcome. What happened, and what would you like to do
            differently next time?
          </em>
        </p>
      </div>

      <form onSubmit={submit} className="form-grid" style={{ marginTop: 12 }}>
        <label>
          <span>Your response</span>
          <textarea
            rows={12}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write here..."
          />
        </label>

        <div className="button-row">
          <button className="btn btn--primary" disabled={saving}>
            {saving ? "Submitting..." : "Submit"}
          </button>
          <Link href="/dashboard" className="btn btn--ghost">
            Back to dashboard
          </Link>
          {last && (
            <span style={{ opacity: 0.8 }}>
              Last submitted: {new Date(last.createdAt).toLocaleString()}
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
