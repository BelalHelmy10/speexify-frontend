"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import useAuth from "@/hooks/useAuth";

export default function ProgressPage() {
  const { user, checking } = useAuth();
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (checking) return;
    if (!user) return;

    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError("");
        const { data } = await api.get("/me/progress");
        if (cancelled) return;
        setProgress(data);
      } catch (err) {
        if (cancelled) return;
        console.error("Failed to load progress", err);
        setError(err?.response?.data?.error || "Failed to load progress");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [checking, user]);

  if (checking || loading) {
    return (
      <div className="container page-dashboard">
        <h1>Learning progress</h1>
        <p style={{ marginTop: 8, opacity: 0.8 }}>Loading your progress…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container page-dashboard">
        <h1>Learning progress</h1>
        <p style={{ marginTop: 8 }}>
          You need to be logged in to view this page.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container page-dashboard">
        <h1>Learning progress</h1>
        <div
          style={{
            marginTop: 16,
            padding: 12,
            borderRadius: 8,
            background: "#fef2f2",
            color: "#b91c1c",
          }}
        >
          {error}
        </div>
      </div>
    );
  }

  const summary = progress?.summary || {};
  const timeline = progress?.timeline || [];

  return (
    <div className="container page-dashboard">
      <header style={{ marginBottom: 24 }}>
        <h1>Learning progress</h1>
        <p style={{ marginTop: 4, opacity: 0.8 }}>
          See how many sessions you’ve completed and how your activity evolves
          over time.
        </p>
      </header>

      {/* Summary cards */}
      <div
        className="cards-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 16,
          marginBottom: 32,
        }}
      >
        <div
          className="card"
          style={{
            padding: 20,
            borderRadius: 16,
            boxShadow: "0 18px 45px rgba(15, 23, 42, 0.06)",
          }}
        >
          <h3 style={{ fontSize: 14, opacity: 0.7 }}>Completed sessions</h3>
          <p style={{ marginTop: 8, fontSize: 28, fontWeight: 600 }}>
            {summary.totalCompletedSessions ?? 0}
          </p>
        </div>

        <div
          className="card"
          style={{
            padding: 20,
            borderRadius: 16,
            boxShadow: "0 18px 45px rgba(15, 23, 42, 0.06)",
          }}
        >
          <h3 style={{ fontSize: 14, opacity: 0.7 }}>Total time</h3>
          <p style={{ marginTop: 8, fontSize: 28, fontWeight: 600 }}>
            {summary.totalHours ?? 0}h
          </p>
          <p style={{ marginTop: 4, fontSize: 12, opacity: 0.7 }}>
            ~{summary.totalMinutes ?? 0} minutes
          </p>
        </div>

        <div
          className="card"
          style={{
            padding: 20,
            borderRadius: 16,
            boxShadow: "0 18px 45px rgba(15, 23, 42, 0.06)",
          }}
        >
          <h3 style={{ fontSize: 14, opacity: 0.7 }}>Average rating</h3>
          <p style={{ marginTop: 8, fontSize: 28, fontWeight: 600 }}>
            {summary.averageRating != null
              ? summary.averageRating.toFixed(1)
              : "—"}
          </p>
          <p style={{ marginTop: 4, fontSize: 12, opacity: 0.7 }}>
            (ratings coming in a later step)
          </p>
        </div>
      </div>

      {/* Timeline */}
      <section>
        <h2 style={{ fontSize: 18 }}>Sessions per month</h2>
        <p style={{ marginTop: 4, opacity: 0.8, fontSize: 14 }}>
          Last {timeline.length || 0} months.
        </p>

        {timeline.length === 0 ? (
          <div
            style={{
              marginTop: 16,
              padding: 16,
              borderRadius: 12,
              background: "#f9fafb",
            }}
          >
            <p style={{ opacity: 0.8 }}>
              You don’t have any completed sessions yet. Once you start taking
              sessions, you’ll see your activity here.
            </p>
          </div>
        ) : (
          <table
            style={{
              width: "100%",
              marginTop: 16,
              borderCollapse: "collapse",
              fontSize: 14,
            }}
          >
            <thead>
              <tr
                style={{
                  textAlign: "left",
                  borderBottom: "1px solid #e5e7eb",
                }}
              >
                <th style={{ padding: "8px 4px" }}>Month</th>
                <th style={{ padding: "8px 4px" }}>Completed sessions</th>
              </tr>
            </thead>
            <tbody>
              {timeline.map((item) => (
                <tr key={item.month}>
                  <td style={{ padding: "8px 4px" }}>{item.month}</td>
                  <td style={{ padding: "8px 4px" }}>{item.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <footer style={{ marginTop: 32 }}>
        <Link href="/dashboard" className="btn btn--ghost">
          ← Back to dashboard
        </Link>
      </footer>
    </div>
  );
}
