// app/dashboard/progress/page.js
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import api from "@/lib/api";
import useAuth from "@/hooks/useAuth";
import "@/styles/progress-page.scss";
import { getDictionary, t } from "@/app/i18n";

export default function ProgressPage() {
  const { user, checking } = useAuth();
  const pathname = usePathname();
  const locale = pathname?.startsWith("/ar") ? "ar" : "en";
  const dict = getDictionary(locale, "progress");

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
        setError(err?.response?.data?.error || t(dict, "error_generic"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [checking, user, dict]);

  // ───────────────── LOADING ─────────────────
  if (checking || loading) {
    return (
      <div className="container page-dashboard page-progress">
        <header className="page-progress__header">
          <h1 className="page-progress__title">{t(dict, "page_title")}</h1>
          <p className="page-progress__subtitle">
            {t(dict, "subtitle_loading")}
          </p>
        </header>
      </div>
    );
  }

  // ───────────────── NOT LOGGED IN ─────────────────
  if (!user) {
    return (
      <div className="container page-dashboard page-progress">
        <header className="page-progress__header">
          <h1 className="page-progress__title">{t(dict, "page_title")}</h1>
          <p className="page-progress__subtitle">
            {t(dict, "subtitle_not_logged_in")}
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
          <h1 className="page-progress__title">{t(dict, "page_title")}</h1>
          <p className="page-progress__subtitle">{t(dict, "subtitle_error")}</p>
        </header>

        <div className="page-progress__error-alert">{error}</div>

        <footer className="page-progress__footer">
          <Link href="/dashboard" className="btn btn--ghost">
            {t(dict, "back_to_dashboard")}
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
        <h1 className="page-progress__title">{t(dict, "page_title")}</h1>
        <p className="page-progress__subtitle">{t(dict, "subtitle_main")}</p>
      </header>

      {/* Summary cards */}
      <section className="progress-summary">
        <div className="progress-summary__grid">
          <article className="progress-summary__card">
            <h3 className="progress-summary__label">
              {t(dict, "summary_completed_label")}
            </h3>
            <p className="progress-summary__value">
              {summary.totalCompletedSessions ?? 0}
            </p>
          </article>

          <article className="progress-summary__card">
            <h3 className="progress-summary__label">
              {t(dict, "summary_total_time_label")}
            </h3>
            <p className="progress-summary__value">
              {summary.totalHours ?? 0}h
            </p>
            <p className="progress-summary__meta">
              ~{summary.totalMinutes ?? 0}{" "}
              {t(dict, "summary_total_time_meta_suffix")}
            </p>
          </article>

          <article className="progress-summary__card">
            <h3 className="progress-summary__label">
              {t(dict, "summary_avg_rating_label")}
            </h3>
            <p className="progress-summary__value">
              {summary.averageRating != null
                ? summary.averageRating.toFixed(1)
                : "—"}
            </p>
            <p className="progress-summary__meta">
              {t(dict, "summary_avg_rating_meta")}
            </p>
          </article>
        </div>
      </section>

      {/* Timeline */}
      <section className="progress-timeline">
        <header className="progress-timeline__header">
          <h2 className="progress-timeline__title">
            {t(dict, "timeline_title")}
          </h2>
          <p className="progress-timeline__subtitle">
            {t(dict, "timeline_subtitle_prefix")} {timeline.length || 0}{" "}
            {t(dict, "timeline_subtitle_suffix")}
          </p>
        </header>

        {timeline.length === 0 ? (
          <div className="progress-timeline__empty">
            <p>{t(dict, "timeline_empty")}</p>
          </div>
        ) : (
          <table className="table progress-timeline__table">
            <thead>
              <tr>
                <th>{t(dict, "timeline_col_month")}</th>
                <th>{t(dict, "timeline_col_completed")}</th>
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
          {t(dict, "back_to_dashboard")}
        </Link>
      </footer>
    </div>
  );
}
