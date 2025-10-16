"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import "@/styles/careers.scss";

export default function Careers() {
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
              <span>Careers at Speexify</span>
            </div>

            <h1 className="careers__headline">
              Help people speak with
              <span className="careers__headline-accent">
                {" "}
                confidence, everywhere
              </span>
            </h1>

            <p className="careers__subtitle">
              We're a remote-first team building language & communication
              training that actually works—for learners and for the businesses
              that rely on them. Join us to ship impact, not just features.
            </p>

            <div className="careers-cta-row">
              <a
                href="#open-roles"
                className="careers-btn careers-btn--primary careers-btn--lg"
              >
                <span>See open roles</span>
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
                Learn about Speexify
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
            <h3>Remote-first</h3>
            <p>Work from anywhere. Async-friendly culture across time zones.</p>
          </div>
          <div className="careers__value">
            <div className="careers__value-icon">📚</div>
            <h3>Learning stipend</h3>
            <p>
              Each teammate gets a budget for courses, books, and conferences.
            </p>
          </div>
          <div className="careers__value">
            <div className="careers__value-icon">🏖️</div>
            <h3>Wellbeing & PTO</h3>
            <p>
              Flexible time off, local holidays, and generous parental leave.
            </p>
          </div>
          <div className="careers__value">
            <div className="careers__value-icon">🤝</div>
            <h3>Inclusive culture</h3>
            <p>We embrace diverse perspectives to create better solutions.</p>
          </div>
        </div>
      </section>

      {/* Open roles */}
      <section id="open-roles" className="careers__roles">
        <div className="careers__roles-head">
          <div>
            <h2>Open roles</h2>
            <p className="careers__roles-sub">
              {loading
                ? "Loading roles…"
                : `${filtered.length} role${
                    filtered.length === 1 ? "" : "s"
                  } available`}
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
            <span>Saved:</span>
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
              placeholder="Search by title, keyword, tech…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="careers__search"
              aria-label="Search jobs"
            />
          </div>

          <div className="careers__filters">
            <select
              value={filters.department}
              onChange={(e) =>
                setFilters((f) => ({ ...f, department: e.target.value }))
              }
              aria-label="Filter by department"
              className="careers__filter"
            >
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d === "All" ? "All departments" : d}
                </option>
              ))}
            </select>
            <select
              value={filters.location}
              onChange={(e) =>
                setFilters((f) => ({ ...f, location: e.target.value }))
              }
              aria-label="Filter by location"
              className="careers__filter"
            >
              {locations.map((l) => (
                <option key={l} value={l}>
                  {l === "All" ? "All locations" : l}
                </option>
              ))}
            </select>
            <select
              value={filters.type}
              onChange={(e) =>
                setFilters((f) => ({ ...f, type: e.target.value }))
              }
              aria-label="Filter by type"
              className="careers__filter"
            >
              {types.map((t) => (
                <option key={t} value={t}>
                  {t === "All" ? "All types" : t}
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
              <p>
                No matches. Try clearing filters or searching for fewer words.
              </p>
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
                    View details
                  </button>
                  <button
                    className="careers-btn careers-btn--primary careers-btn--md"
                    onClick={() => apply(job)}
                  >
                    <span>Apply</span>
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
            <h2>Don't see the right role?</h2>
            <p>
              We love meeting curious, kind builders. Tell us how you can help
              our mission.
            </p>
          </div>
          <a
            href="mailto:careers@speexify.com"
            className="careers-btn careers-btn--ghost careers-btn--lg"
          >
            Connect with us
          </a>
        </div>
      </section>

      {/* Modal */}
      {activeJob && (
        <JobModal
          job={activeJob}
          onClose={() => setActiveJob(null)}
          onApply={apply}
        />
      )}
    </main>
  );
}

function JobModal({ job, onClose, onApply }) {
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
          aria-label="Close"
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
              <h4>What you'll do</h4>
              <ul>
                {job.description.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            </>
          )}

          {job.requirements && (
            <>
              <h4>What you'll bring</h4>
              <ul>
                {job.requirements.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            </>
          )}

          {job.benefits && (
            <>
              <h4>Benefits</h4>
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
            Close
          </button>
          <button
            className="careers-btn careers-btn--primary careers-btn--md"
            onClick={() => onApply(job)}
          >
            <span>Apply</span>
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
