"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import useAuth from "@/hooks/useAuth";
import ".@/styles/progress-page.scss";

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

  // ───────────────── LOADING ─────────────────
  if (checking || loading) {
    return (
      <div className="container page-dashboard page-progress">
        <header className="page-progress__header">
          <h1 className="page-progress__title">Learning progress</h1>
          <p className="page-progress__subtitle">Loading your progress…</p>
        </header>
      </div>
    );
  }

  // ───────────────── NOT LOGGED IN ─────────────────
  if (!user) {
    return (
      <div className="container page-dashboard page-progress">
        <header className="page-progress__header">
          <h1 className="page-progress__title">Learning progress</h1>
          <p className="page-progress__subtitle">
            You need to be logged in to view this page.
          </p>
        </header>
      </div>
    );
  }

  // ───────────────── ERROR ─────────────────
  if (error) {
    return (
      <div className="container page-dashboard page-progress">
        <header className="page-progress__header">
          <h1 className="page-progress__title">Learning progress</h1>
          <p className="page-progress__subtitle">
            We couldn’t load your progress right now.
          </p>
        </header>

        <div className="page-progress__error-alert">{error}</div>

        <footer className="page-progress__footer">
          <Link href="/dashboard" className="btn btn--ghost">
            ← Back to dashboard
          </Link>
        </footer>
      </div>
    );
  }

  // ───────────────── NORMAL STATE ─────────────────
  const summary = progress?.summary || {};
  const timeline = progress?.timeline || [];

  return (
    <div className="container page-dashboard page-progress">
      <header className="page-progress__header">
        <h1 className="page-progress__title">Learning progress</h1>
        <p className="page-progress__subtitle">
          See how many sessions you’ve completed and how your activity evolves
          over time.
        </p>
      </header>

      {/* Summary cards */}
      <section className="progress-summary">
        <div className="progress-summary__grid">
          <article className="progress-summary__card">
            <h3 className="progress-summary__label">Completed sessions</h3>
            <p className="progress-summary__value">
              {summary.totalCompletedSessions ?? 0}
            </p>
          </article>

          <article className="progress-summary__card">
            <h3 className="progress-summary__label">Total time</h3>
            <p className="progress-summary__value">
              {summary.totalHours ?? 0}h
            </p>
            <p className="progress-summary__meta">
              ~{summary.totalMinutes ?? 0} minutes
            </p>
          </article>

          <article className="progress-summary__card">
            <h3 className="progress-summary__label">Average rating</h3>
            <p className="progress-summary__value">
              {summary.averageRating != null
                ? summary.averageRating.toFixed(1)
                : "—"}
            </p>
            <p className="progress-summary__meta">
              (ratings coming in a later step)
            </p>
          </article>
        </div>
      </section>

      {/* Timeline */}
      <section className="progress-timeline">
        <header className="progress-timeline__header">
          <h2 className="progress-timeline__title">Sessions per month</h2>
          <p className="progress-timeline__subtitle">
            Last {timeline.length || 0} months.
          </p>
        </header>

        {timeline.length === 0 ? (
          <div className="progress-timeline__empty">
            <p>
              You don’t have any completed sessions yet. Once you start taking
              sessions, you’ll see your activity here.
            </p>
          </div>
        ) : (
          <table className="table progress-timeline__table">
            <thead>
              <tr>
                <th>Month</th>
                <th>Completed sessions</th>
              </tr>
            </thead>
            <tbody>
              {timeline.map((item) => (
                <tr key={item.month}>
                  <td>{item.month}</td>
                  <td>{item.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <footer className="page-progress__footer">
        <Link href="/dashboard" className="btn btn--ghost">
          ← Back to dashboard
        </Link>
      </footer>
    </div>
  );
}
