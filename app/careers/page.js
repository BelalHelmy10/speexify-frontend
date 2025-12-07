// app/careers/page.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getDictionary, t } from "@/app/i18n";

function Careers({ dict }) {
  const [jobs, setJobs] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filters, setFilters] = useState({
    department: "All",
    location: "All",
    type: "All",
  });
  const [activeJob, setActiveJob] = useState(null);
  const [saved, setSaved] = useState(() => {
    if (typeof window === "undefined") return new Set();
    try {
      return new Set(
        JSON.parse(localStorage.getItem("speexify_saved_jobs") || "[]")
      );
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/data/jobs.json", { cache: "no-store" });
        const data = await res.json();
        if (!alive) return;
        setJobs(data.jobs || []);
        setDepartments(["All", ...(data.departments || [])]);
      } catch (e) {
        console.error("Failed to load jobs.json", e);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(
      "speexify_saved_jobs",
      JSON.stringify(Array.from(saved))
    );
  }, [saved]);

  const locations = useMemo(() => {
    const set = new Set(jobs.map((j) => j.location));
    return ["All", ...Array.from(set)];
  }, [jobs]);

  const types = useMemo(() => {
    const set = new Set(jobs.map((j) => j.type));
    return ["All", ...Array.from(set)];
  }, [jobs]);

  const filtered = useMemo(() => {
    const qNorm = q.trim().toLowerCase();
    return jobs.filter((j) => {
      if (filters.department !== "All" && j.department !== filters.department)
        return false;
      if (filters.location !== "All" && j.location !== filters.location)
        return false;
      if (filters.type !== "All" && j.type !== filters.type) return false;

      if (!qNorm) return true;
      const hay = [
        j.title,
        j.department,
        j.location,
        j.type,
        ...(j.tags || []),
        ...(j.keywords || []),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(qNorm);
    });
  }, [jobs, q, filters]);

  function toggleSave(id) {
    setSaved((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function apply(job) {
    if (job.applyUrl) {
      window.open(job.applyUrl, "_blank", "noopener,noreferrer");
      return;
    }
    const mail = "careers@speexify.com";
    const subject = encodeURIComponent(
      `Application — ${job.title} (ID: ${job.id})`
    );
    const body = encodeURIComponent(
      `Hi Speexify team,

I'd like to apply for ${job.title} (ID: ${job.id}).

Name:
Location:
LinkedIn / Portfolio:
Notes:

Thanks!`
    );
    window.location.href = `mailto:${mail}?subject=${subject}&body=${body}`;
  }

  return (
    <main className="careers">
      {/* Hero */}
      <section className="careers__hero">
        <div className="careers__hero-background">
          <div className="careers__hero-gradient"></div>
          <div className="careers__hero-pattern"></div>
        </div>

        <div className="careers__hero-inner">
          <div className="careers__hero-copy">
            <div className="careers__badge">
              <span className="careers__badge-icon">🚀</span>
              <span>{t(dict, "hero_badge")}</span>
            </div>

            <h1 className="careers__headline">
              {t(dict, "hero_title_main")}
              <span className="careers__headline-accent">
                {t(dict, "hero_title_accent")}
              </span>
            </h1>

            <p className="careers__subtitle">{t(dict, "hero_subtitle")}</p>

            <div className="careers-cta-row">
              <a
                href="#open-roles"
                className="careers-btn careers-btn--primary careers-btn--lg"
              >
                <span>{t(dict, "hero_cta_primary")}</span>
                <svg
                  className="careers-btn__arrow"
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                >
                  <path
                    d="M6 3L11 8L6 13"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </a>
              <Link
                href="/about"
                className="careers-btn careers-btn--outline careers-btn--lg"
              >
                {t(dict, "hero_cta_secondary")}
              </Link>
            </div>
          </div>

          <div className="careers__hero-art">
            <div className="careers__hero-art-glow"></div>
            <div className="careers__hero-art-shape careers__hero-art-shape--1"></div>
            <div className="careers__hero-art-shape careers__hero-art-shape--2"></div>
            <div className="careers__hero-art-shape careers__hero-art-shape--3"></div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="careers__values">
        <div className="careers__values-grid">
          <div className="careers__value">
            <div className="careers__value-icon">🌍</div>
            <h3>{t(dict, "values_remote_title")}</h3>
            <p>{t(dict, "values_remote_body")}</p>
          </div>
          <div className="careers__value">
            <div className="careers__value-icon">📚</div>
            <h3>{t(dict, "values_learning_title")}</h3>
            <p>{t(dict, "values_learning_body")}</p>
          </div>
          <div className="careers__value">
            <div className="careers__value-icon">🏖️</div>
            <h3>{t(dict, "values_wellbeing_title")}</h3>
            <p>{t(dict, "values_wellbeing_body")}</p>
          </div>
          <div className="careers__value">
            <div className="careers__value-icon">🤝</div>
            <h3>{t(dict, "values_inclusive_title")}</h3>
            <p>{t(dict, "values_inclusive_body")}</p>
          </div>
        </div>
      </section>

      {/* Open roles */}
      <section id="open-roles" className="careers__roles">
        <div className="careers__roles-head">
          <div>
            <h2>{t(dict, "roles_heading")}</h2>
            <p className="careers__roles-sub">
              {loading
                ? t(dict, "roles_loading")
                : filtered.length === 1
                ? t(dict, "roles_count_single", { count: filtered.length })
                : t(dict, "roles_count_multi", { count: filtered.length })}
            </p>
          </div>

          <div className="careers__saved">
            <svg
              className="careers__saved-icon"
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
            >
              <path
                d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
                fill="currentColor"
              />
            </svg>
            <span>{t(dict, "saved_label")}</span>
            <span className="careers__saved-count">{saved.size}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="careers__controls">
          <div className="careers__search-wrap">
            <svg
              className="careers__search-icon"
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
            >
              <path
                d="M17 17l-4-4m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            <input
              type="search"
              placeholder={t(dict, "search_placeholder")}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="careers__search"
              aria-label={t(dict, "search_placeholder")}
            />
          </div>

          <div className="careers__filters">
            <select
              value={filters.department}
              onChange={(e) =>
                setFilters((f) => ({ ...f, department: e.target.value }))
              }
              aria-label={t(dict, "filter_department_label")}
              className="careers__filter"
            >
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d === "All" ? t(dict, "filter_department_all") : d}
                </option>
              ))}
            </select>
            <select
              value={filters.location}
              onChange={(e) =>
                setFilters((f) => ({ ...f, location: e.target.value }))
              }
              aria-label={t(dict, "filter_location_label")}
              className="careers__filter"
            >
              {locations.map((l) => (
                <option key={l} value={l}>
                  {l === "All" ? t(dict, "filter_location_all") : l}
                </option>
              ))}
            </select>
            <select
              value={filters.type}
              onChange={(e) =>
                setFilters((f) => ({ ...f, type: e.target.value }))
              }
              aria-label={t(dict, "filter_type_label")}
              className="careers__filter"
            >
              {types.map((tOpt) => (
                <option key={tOpt} value={tOpt}>
                  {tOpt === "All" ? t(dict, "filter_type_all") : tOpt}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Role list */}
        <div className="careers__list" role="list">
          {!loading && filtered.length === 0 && (
            <div className="careers__empty">
              <svg
                className="careers__empty-icon"
                width="48"
                height="48"
                viewBox="0 0 48 48"
                fill="none"
              >
                <path
                  d="M24 44c11.046 0 20-8.954 20-20S35.046 4 24 4 4 12.954 4 24s8.954 20 20 20z"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <path
                  d="M17 17l14 14m0-14L17 31"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              <p>{t(dict, "empty_text")}</p>
            </div>
          )}

          {filtered.map((job) => {
            const isSaved = saved.has(job.id);
            return (
              <article key={job.id} className="careers-card" role="listitem">
                <div className="careers-card__header">
                  <div className="careers-card__meta">
                    <span className="careers-pill">{job.department}</span>
                    <span className="careers-dot">•</span>
                    <span>{job.location}</span>
                    <span className="careers-dot">•</span>
                    <span>{job.type}</span>
                  </div>
                  <button
                    className={"careers-save" + (isSaved ? " is-saved" : "")}
                    aria-pressed={isSaved}
                    onClick={() => toggleSave(job.id)}
                    title={isSaved ? "Remove from saved" : "Save this role"}
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 20 20"
                      fill={isSaved ? "currentColor" : "none"}
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
                    </svg>
                  </button>
                </div>

                <h3 className="careers-card__title">{job.title}</h3>
                {job.summary && (
                  <p className="careers-card__summary">{job.summary}</p>
                )}

                <div className="careers-card__actions">
                  <button
                    className="careers-btn careers-btn--secondary careers-btn--md"
                    onClick={() => setActiveJob(job)}
                  >
                    {t(dict, "card_view_details")}
                  </button>
                  <button
                    className="careers-btn careers-btn--primary careers-btn--md"
                    onClick={() => apply(job)}
                  >
                    <span>{t(dict, "card_apply")}</span>
                    <svg
                      className="careers-btn__arrow"
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                    >
                      <path
                        d="M6 3L11 8L6 13"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Connect band */}
      <section className="careers__connect">
        <div className="careers__connect-background">
          <div className="careers__connect-gradient"></div>
          <div className="careers__connect-shapes">
            <div className="careers__connect-shape careers__connect-shape--1"></div>
            <div className="careers__connect-shape careers__connect-shape--2"></div>
          </div>
        </div>

        <div className="careers__connect-inner">
          <div className="careers__connect-content">
            <h2>{t(dict, "connect_title")}</h2>
            <p>{t(dict, "connect_body")}</p>
          </div>
          <a
            href="mailto:careers@speexify.com"
            className="careers-btn careers-btn--ghost careers-btn--lg"
          >
            {t(dict, "connect_cta")}
          </a>
        </div>
      </section>

      {/* Modal */}
      {activeJob && (
        <JobModal
          job={activeJob}
          onClose={() => setActiveJob(null)}
          onApply={apply}
          dict={dict}
        />
      )}
    </main>
  );
}

function JobModal({ job, onClose, onApply, dict }) {
  useEffect(() => {
    const onEsc = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [onClose]);

  return (
    <div
      className="careers-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="job-title"
    >
      <div className="careers-modal__backdrop" onClick={onClose} />
      <div className="careers-modal__panel" role="document">
        <button
          className="careers-modal__close"
          onClick={onClose}
          aria-label={t(dict, "modal_close")}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M6 6l12 12m0-12L6 18" />
          </svg>
        </button>

        <header className="careers-modal__header">
          <div className="careers-modal__kicker">
            <span className="careers-pill">{job.department}</span>
            <span className="careers-dot">•</span>
            <span>{job.location}</span>
            <span className="careers-dot">•</span>
            <span>{job.type}</span>
          </div>
          <h3 id="job-title" className="careers-modal__title">
            {job.title}
          </h3>
        </header>

        <div className="careers-modal__content">
          {job.description && (
            <>
              <h4>{t(dict, "modal_do_title")}</h4>
              <ul>
                {job.description.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            </>
          )}

          {job.requirements && (
            <>
              <h4>{t(dict, "modal_bring_title")}</h4>
              <ul>
                {job.requirements.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            </>
          )}

          {job.benefits && (
            <>
              <h4>{t(dict, "modal_benefits_title")}</h4>
              <ul>
                {job.benefits.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            </>
          )}
        </div>

        <footer className="careers-modal__footer">
          <button
            className="careers-btn careers-btn--secondary careers-btn--md"
            onClick={onClose}
          >
            {t(dict, "modal_close")}
          </button>
          <button
            className="careers-btn careers-btn--primary careers-btn--md"
            onClick={() => onApply(job)}
          >
            <span>{t(dict, "modal_apply")}</span>
            <svg
              className="careers-btn__arrow"
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
            >
              <path
                d="M6 3L11 8L6 13"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </footer>
      </div>
    </div>
  );
}

export default function CareersPage() {
  const pathname = usePathname();
  const locale = pathname?.startsWith("/ar") ? "ar" : "en";
  const dict = getDictionary(locale, "careers");

  return <Careers dict={dict} />;
}
