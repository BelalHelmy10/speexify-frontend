"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import "@/styles/packages.scss";

const AUD = { INDIVIDUAL: "INDIVIDUAL", CORPORATE: "CORPORATE" };

// Split features by newline/semicolon/comma and trim
function parseFeatures(raw) {
  if (!raw) return [];
  return String(raw)
    .split(/\r?\n|;|,/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

// Build a feature matrix from given plans (limit rows to keep it readable)
function buildFeatureMatrix(plans, maxRows = 10) {
  const map = new Map(); // feature -> Set(planIndex)
  plans.forEach((p, i) => {
    const feats = parseFeatures(p.featuresRaw || "").concat(p.features || []);
    new Set(feats).forEach((f) => {
      if (!map.has(f)) map.set(f, new Set());
      map.get(f).add(i);
    });
  });
  const rows = Array.from(map.keys()).slice(0, maxRows);
  return rows.map((label) => ({
    label,
    checks: plans.map((_p, i) => map.get(label)?.has(i) || false),
  }));
}

function Packages() {
  const [tab, setTab] = useState(AUD.INDIVIDUAL);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [indPlans, setIndPlans] = useState([]);
  const [corpPlans, setCorpPlans] = useState([]);

  // Seats estimator (front-end only placeholder)
  const [seats, setSeats] = useState(15);

  // Init tab from query ?tab=corporate
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if ((p.get("tab") || "").toLowerCase() === "corporate")
      setTab(AUD.CORPORATE);
  }, []);

  // Fetch plans
  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const [indRes, corpRes] = await Promise.all([
          api
            .get("/api/packages?audience=INDIVIDUAL")
            .catch(() => ({ data: [] })),
          api
            .get("/api/packages?audience=CORPORATE")
            .catch(() => ({ data: [] })),
        ]);

        const toVM = (row) => ({
          id: row.id,
          title: row.title,
          description: row.description || "",
          priceUSD: typeof row.priceUSD === "number" ? row.priceUSD : null,
          featuresRaw: row.features || "",
          isPopular: !!row.isPopular,
          priceType: row.priceType || (row.priceUSD ? "PER_SESSION" : "CUSTOM"),
          sessionsPerPack: row.sessionsPerPack || null,
          durationMin: row.durationMin || null,
          startingAtUSD: row.startingAtUSD || null,
          sortOrder: row.sortOrder || 0,
          image: row.image || "/assets/packages/placeholder.avif",
          cta: row.cta || null,
        });

        const i = (indRes.data || [])
          .map(toVM)
          .sort((a, b) => a.sortOrder - b.sortOrder);
        const c = (corpRes.data || [])
          .map(toVM)
          .sort((a, b) => a.sortOrder - b.sortOrder);

        setIndPlans(i.length ? i : defaultIndividualPlans);
        setCorpPlans(c.length ? c : defaultCorporatePlans);
      } catch (_e) {
        setErr("Failed to load packages. Showing defaults.");
        setIndPlans(defaultIndividualPlans);
        setCorpPlans(defaultCorporatePlans);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const plans = tab === AUD.INDIVIDUAL ? indPlans : corpPlans;
  const matrix = useMemo(() => buildFeatureMatrix(plans), [plans]);

  // Placeholder corporate estimate
  const corpEstimate = useMemo(() => {
    const base = 60; // pretend $60/seat/month baseline
    return Math.max(0, Math.round(seats * base));
  }, [seats]);

  return (
    <div className="spx-pkg">
      {/* HERO */}
      <section className="spx-pkg__section spx-pkg-hero">
        <div className="spx-pkg__container spx-pkg-hero__inner spx-pkg-card">
          <div className="spx-pkg-hero__copy">
            <h1 className="spx-pkg-hero__title">Simple, flexible pricing</h1>
            <p className="spx-pkg-hero__subtitle">
              Individuals start right away. Teams get tailored programs with
              reporting and enterprise billing.
            </p>

            <div className="spx-pkg-tabs" role="tablist" aria-label="Audience">
              <button
                role="tab"
                aria-selected={tab === AUD.INDIVIDUAL}
                className={`spx-pkg-tab ${
                  tab === AUD.INDIVIDUAL ? "is-active" : ""
                }`}
                onClick={() => setTab(AUD.INDIVIDUAL)}
              >
                Individuals
              </button>
              <button
                role="tab"
                aria-selected={tab === AUD.CORPORATE}
                className={`spx-pkg-tab ${
                  tab === AUD.CORPORATE ? "is-active" : ""
                }`}
                onClick={() => setTab(AUD.CORPORATE)}
              >
                Teams & Companies
              </button>
            </div>

            {tab === AUD.INDIVIDUAL ? (
              <div className="spx-pkg-hero__note">
                Pay online, reschedule easily, no long-term contracts.
              </div>
            ) : (
              <div className="spx-pkg-hero__note">
                Volume pricing, invoicing & POs, progress reporting.
              </div>
            )}
          </div>

          {/* hero image */}
          <figure className="spx-pkg-media spx-pkg-hero__media">
            <img
              src="/images/english-coaching-in-action.avif"
              alt="English coaching in action"
              loading="eager"
            />
          </figure>
        </div>
      </section>

      {/* STATUS */}
      <section className="spx-pkg__section">
        <div className="spx-pkg__container">
          {loading && <div className="spx-pkg-status">Loading packages…</div>}
          {!loading && err && (
            <div className="spx-pkg-status spx-pkg-status--warn">{err}</div>
          )}
        </div>
      </section>

      {/* PRICING GRID */}
      <section className="spx-pkg__section">
        <div className="spx-pkg__container spx-pkg-grid">
          {plans.map((p, idx) => (
            <PricingCard key={p.id || idx} plan={p} audience={tab} />
          ))}
        </div>
      </section>

      {/* CORPORATE SEATS ESTIMATOR */}
      {tab === AUD.CORPORATE && (
        <section className="spx-pkg__section spx-pkg-estimator">
          <div className="spx-pkg__container spx-pkg-card spx-pkg-estimator__row">
            <div className="spx-pkg-estimator__copy">
              <h3 className="spx-pkg-estimator__title">Rough seat estimate</h3>
              <p className="spx-pkg-estimator__p">
                Drag to estimate a starting budget. We’ll tailor a proposal to
                your goals and schedule.
              </p>
            </div>
            <div className="spx-pkg-estimator__control">
              <label className="spx-pkg-label" htmlFor="seats">
                Seats
              </label>
              <input
                id="seats"
                type="range"
                min="5"
                max="100"
                step="5"
                value={seats}
                onChange={(e) => setSeats(Number(e.target.value))}
              />
              <div className="spx-pkg-estimator__value">{seats} people</div>
            </div>
            <div className="spx-pkg-estimator__result">
              <div className="spx-pkg-estimator__number">
                ~${corpEstimate}/mo
              </div>
              <Link
                href="/corporate#rfp"
                className="spx-pkg-btn spx-pkg-btn--primary"
              >
                Request proposal
              </Link>
            </div>
            <div className="spx-pkg-estimator__disclaimer">
              This is a placeholder estimate. Actual pricing depends on format,
              cadence, and scope.
            </div>
          </div>
        </section>
      )}

      {/* HOW IT WORKS */}
      <section className="spx-pkg__section spx-pkg-how">
        <div className="spx-pkg__container spx-pkg-grid-steps">
          <Step
            n="1"
            title="Pick a plan"
            desc="Choose the plan that fits your goals and cadence."
          />
          <Step
            n="2"
            title="Book times"
            desc="Schedule sessions at times that work for you or your team."
          />
          <Step
            n="3"
            title="Start learning"
            desc="Practical sessions, feedback, and steady progress."
          />
        </div>
      </section>

      {/* FEATURE COMPARISON */}
      <section className="spx-pkg__section">
        <div className="spx-pkg__container spx-pkg-compare spx-pkg-card">
          <div className="spx-pkg-compare__header">
            <h2 className="spx-pkg-compare__title">
              Compare {tab === AUD.INDIVIDUAL ? "individual" : "team"} plans
            </h2>
          </div>
          <div className="spx-pkg-compare__tablewrap">
            <table className="spx-pkg-compare__table">
              <thead>
                <tr>
                  <th>Features</th>
                  {plans.map((p, i) => (
                    <th key={i}>{p.title}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrix.length === 0 ? (
                  <tr>
                    <td colSpan={1 + plans.length} className="empty">
                      Feature details coming soon.
                    </td>
                  </tr>
                ) : (
                  matrix.map((row, rIdx) => (
                    <tr key={rIdx}>
                      <td className="feat">{row.label}</td>
                      {row.checks.map((has, cIdx) => (
                        <td key={cIdx} className="check">
                          {has ? "✓" : "—"}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="spx-pkg__section spx-pkg-faq">
        <div className="spx-pkg__container spx-pkg-card">
          <h2 className="spx-pkg-faq__title">FAQs</h2>
          <div className="spx-pkg-faq__list">
            <Faq
              q="Can I switch plans later?"
              a="Yes. You can change plans between billing periods; we’ll help you migrate."
            />
            <Faq
              q="Do you support invoices and POs?"
              a="Yes, for corporate plans we support invoicing, POs, and volume pricing."
            />
            <Faq
              q="What if I miss a session?"
              a="You can reschedule within your plan’s window. We’re flexible."
            />
          </div>
        </div>
      </section>

      {/* CTA STRIP */}
      <section className="spx-pkg__section spx-pkg-cta">
        <div className="spx-pkg__container spx-pkg-cta__inner">
          <h2>Ready to begin?</h2>
          {tab === AUD.INDIVIDUAL ? (
            <div className="spx-pkg-cta__actions">
              <Link
                className="spx-pkg-btn spx-pkg-btn--primary"
                href="/individual#trial"
              >
                Book free consult
              </Link>
              <Link className="spx-pkg-btn spx-pkg-btn--ghost" href="/packages">
                See individual plans
              </Link>
            </div>
          ) : (
            <div className="spx-pkg-cta__actions">
              <Link
                href="/corporate#rfp"
                className="spx-pkg-btn spx-pkg-btn--primary"
              >
                Request proposal
              </Link>
              <Link
                className="spx-pkg-btn spx-pkg-btn--ghost"
                href="/corporate"
              >
                Learn more
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

/* Components */
function PricingCard({ plan, audience }) {
  const {
    title,
    description,
    priceUSD,
    priceType,
    startingAtUSD,
    isPopular,
    sessionsPerPack,
    durationMin,
    image,
  } = plan;

  const bullets = parseFeatures(plan.featuresRaw || "").slice(0, 8);
  const isCorp = audience === AUD.CORPORATE;

  const priceLabel = (() => {
    if (priceType === "CUSTOM" || (!priceUSD && !startingAtUSD))
      return "Custom";
    if (startingAtUSD && !priceUSD) return `From $${startingAtUSD}`;
    if (typeof priceUSD === "number") return `$${priceUSD}`;
    return "Custom";
  })();

  const sub =
    (durationMin ? `${durationMin} min` : "") +
    (sessionsPerPack ? ` · ${sessionsPerPack} sessions` : "");

  return (
    <div
      className={`spx-pkg-card spx-pkg-card--plan ${
        isPopular ? "is-popular" : ""
      }`}
    >
      <figure className="spx-pkg-media spx-pkg-card__media">
        <img src={image} alt="" loading="lazy" />
      </figure>

      <div className="spx-pkg-card__head">
        <div className="spx-pkg-card__title">{title}</div>
        {isPopular && <span className="spx-pkg-badge">Most popular</span>}
      </div>

      {description && <p className="spx-pkg-card__desc">{description}</p>}

      <div className="spx-pkg-card__price">
        <div className="spx-pkg-card__value">{priceLabel}</div>
        {sub && <div className="spx-pkg-card__sub">{sub}</div>}
      </div>

      {bullets.length > 0 && (
        <ul className="spx-pkg-card__bullets">
          {bullets.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      )}

      <div className="spx-pkg-card__actions">
        {isCorp ? (
          <>
            <Link
              href="/corporate#rfp"
              className="spx-pkg-btn spx-pkg-btn--primary"
            >
              Request proposal
            </Link>
            <Link className="spx-pkg-btn spx-pkg-btn--ghost" href="/corporate">
              Learn more
            </Link>
          </>
        ) : (
          <>
            <Link
              href={`/checkout?plan=${encodeURIComponent(title)}`}
              className="spx-pkg-btn spx-pkg-btn--primary"
            >
              Buy now
            </Link>
            <Link
              href="/individual#trial"
              className="spx-pkg-btn spx-pkg-btn--ghost"
            >
              Book consult
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

function Step({ n, title, desc }) {
  return (
    <div className="spx-pkg-step spx-pkg-card">
      <div className="spx-pkg-step__n">{n}</div>
      <div className="spx-pkg-step__title">{title}</div>
      <div className="spx-pkg-step__desc">{desc}</div>
    </div>
  );
}

function Faq({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`spx-pkg-faq__item ${open ? "is-open" : ""}`}>
      <button
        className="spx-pkg-faq__q"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        {q}
        <span className="spx-pkg-faq__icon">{open ? "–" : "+"}</span>
      </button>
      <div className="spx-pkg-faq__a">{a}</div>
    </div>
  );
}

/* Defaults */
const defaultIndividualPlans = [
  {
    title: "Starter",
    description: "Focus on one goal with shorter sessions.",
    priceUSD: 25,
    durationMin: 30,
    sessionsPerPack: 4,
    priceType: "BUNDLE",
    featuresRaw:
      "Coach-matched 1:1\nFlexible scheduling\nPractical homework\nEmail feedback",
    isPopular: false,
    image: "/images/pilot.avif",
  },
  {
    title: "Standard",
    description: "Balanced pace to build skill and confidence.",
    priceUSD: 40,
    durationMin: 45,
    sessionsPerPack: 8,
    priceType: "BUNDLE",
    featuresRaw:
      "Coach-matched 1:1\nWeekly plan\nPronunciation tune-ups\nProgress check-ins",
    isPopular: true,
    image: "/images/team.avif",
  },
  {
    title: "Intensive",
    description: "Move fast with focused, twice-weekly sessions.",
    priceUSD: 55,
    durationMin: 60,
    sessionsPerPack: 8,
    priceType: "BUNDLE",
    featuresRaw:
      "2× weekly sessions\nPriority scheduling\nDetailed feedback\nMock interviews/presentations",
    isPopular: false,
    image: "/images/company.avif",
  },
];

const defaultCorporatePlans = [
  {
    title: "Pilot (5–10)",
    description: "Prove value quickly with a small cohort.",
    priceType: "CUSTOM",
    startingAtUSD: null,
    featuresRaw:
      "1:1 + small group mix\nKickoff & goal-setting\nEnd-of-pilot report\nManager updates",
    isPopular: false,
    image: "/images/pilot.avif",
  },
  {
    title: "Team (10–50)",
    description: "Mix formats for impact; add workshops.",
    priceType: "CUSTOM",
    startingAtUSD: null,
    featuresRaw:
      "1:1 + group + workshops\nCoach matching\nMonthly reporting\nInvoicing & POs",
    isPopular: true,
    image: "/images/team.avif",
  },
  {
    title: "Company (50+)",
    description: "Scaled rollout with CSM and quarterly reviews.",
    priceType: "CUSTOM",
    startingAtUSD: null,
    featuresRaw:
      "Scaled scheduling\nDedicated CSM\nQuarterly exec reports\nSecurity review support",
    isPopular: false,
    image: "/images/company.avif",
  },
];

export default Packages;
