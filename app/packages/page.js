"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import "@/styles/packages.scss";

const AUD = { INDIVIDUAL: "INDIVIDUAL", CORPORATE: "CORPORATE" };
const LESSON_TYPE = { ONE_ON_ONE: "ONE_ON_ONE", GROUP: "GROUP" };

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
  const map = new Map();
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
  const [lessonType, setLessonType] = useState(LESSON_TYPE.ONE_ON_ONE);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // Seats estimator for corporate
  const [seats, setSeats] = useState(15);

  // Init tab from query
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if ((p.get("tab") || "").toLowerCase() === "corporate")
      setTab(AUD.CORPORATE);
  }, []);

  // Get current plans based on selection
  const plans = useMemo(() => {
    if (tab === AUD.CORPORATE) return corporatePlans;
    return lessonType === LESSON_TYPE.ONE_ON_ONE ? oneOnOnePlans : groupPlans;
  }, [tab, lessonType]);

  const matrix = useMemo(() => buildFeatureMatrix(plans), [plans]);

  // Corporate estimate
  const corpEstimate = useMemo(() => {
    const base = 60;
    return Math.max(0, Math.round(seats * base));
  }, [seats]);

  return (
    <div className="spx-pkg">
      {/* HERO */}
      <section className="spx-pkg__section spx-pkg-hero">
        <div className="spx-pkg__container spx-pkg-hero__inner">
          <div className="spx-pkg-hero__copy">
            <h1 className="spx-pkg-hero__title">
              Professional English Coaching
            </h1>
            <p className="spx-pkg-hero__subtitle">
              Choose the format that works for you—private one-on-one sessions
              or collaborative group learning. Flexible plans, real results.
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

            {tab === AUD.INDIVIDUAL && (
              <div className="spx-pkg-lesson-toggle">
                <button
                  className={`spx-pkg-lesson-btn ${
                    lessonType === LESSON_TYPE.ONE_ON_ONE ? "is-active" : ""
                  }`}
                  onClick={() => setLessonType(LESSON_TYPE.ONE_ON_ONE)}
                >
                  <span className="spx-pkg-lesson-icon">👤</span>
                  <span className="spx-pkg-lesson-text">
                    <strong>One-on-One</strong>
                    <small>Private sessions</small>
                  </span>
                </button>
                <button
                  className={`spx-pkg-lesson-btn ${
                    lessonType === LESSON_TYPE.GROUP ? "is-active" : ""
                  }`}
                  onClick={() => setLessonType(LESSON_TYPE.GROUP)}
                >
                  <span className="spx-pkg-lesson-icon">👥</span>
                  <span className="spx-pkg-lesson-text">
                    <strong>Group</strong>
                    <small>2-5 learners</small>
                  </span>
                </button>
              </div>
            )}

            {tab === AUD.INDIVIDUAL ? (
              <div className="spx-pkg-hero__note">
                {lessonType === LESSON_TYPE.ONE_ON_ONE ? (
                  <>
                    <strong>60-minute sessions</strong> · Personalized coaching
                    · Flexible scheduling
                  </>
                ) : (
                  <>
                    <strong>90-minute sessions</strong> · Small groups (2-5
                    learners) · Collaborative learning
                  </>
                )}
              </div>
            ) : (
              <div className="spx-pkg-hero__note">
                Custom programs · Progress reporting · Enterprise billing ·
                Dedicated support
              </div>
            )}
          </div>

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
      {loading && (
        <section className="spx-pkg__section">
          <div className="spx-pkg__container">
            <div className="spx-pkg-status">Loading packages…</div>
          </div>
        </section>
      )}
      {!loading && err && (
        <section className="spx-pkg__section">
          <div className="spx-pkg__container">
            <div className="spx-pkg-status spx-pkg-status--warn">{err}</div>
          </div>
        </section>
      )}

      {/* PRICING GRID */}
      <section className="spx-pkg__section spx-pkg-pricing-section">
        <div className="spx-pkg__container">
          <div className="spx-pkg-section-header">
            <h2 className="spx-pkg-section-title">
              {tab === AUD.INDIVIDUAL
                ? lessonType === LESSON_TYPE.ONE_ON_ONE
                  ? "One-on-One Packages"
                  : "Group Learning Packages"
                : "Enterprise Solutions"}
            </h2>
            <p className="spx-pkg-section-subtitle">
              {tab === AUD.INDIVIDUAL
                ? "Choose the package that fits your learning goals and schedule"
                : "Scalable language training for teams of all sizes"}
            </p>
          </div>

          <div className="spx-pkg-grid spx-pkg-grid--fade-in">
            {plans.map((p, idx) => (
              <PricingCard
                key={p.id || idx}
                plan={p}
                audience={tab}
                lessonType={lessonType}
              />
            ))}
          </div>
        </div>
      </section>

      {/* CORPORATE SEATS ESTIMATOR */}
      {tab === AUD.CORPORATE && (
        <section className="spx-pkg__section spx-pkg-estimator">
          <div className="spx-pkg__container spx-pkg-card spx-pkg-estimator__row">
            <div className="spx-pkg-estimator__copy">
              <h3 className="spx-pkg-estimator__title">Budget Estimator</h3>
              <p className="spx-pkg-estimator__p">
                Get a rough estimate for your team size. Final pricing depends
                on program format, duration, and custom requirements.
              </p>
            </div>
            <div className="spx-pkg-estimator__control">
              <label className="spx-pkg-label" htmlFor="seats">
                Team Size
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
              <div className="spx-pkg-estimator__value">{seats} employees</div>
            </div>
            <div className="spx-pkg-estimator__result">
              <div className="spx-pkg-estimator__number">
                ~${corpEstimate.toLocaleString()}/mo
              </div>
              <Link
                href="/corporate#rfp"
                className="spx-pkg-btn spx-pkg-btn--primary"
              >
                Get Custom Quote
              </Link>
            </div>
            <div className="spx-pkg-estimator__disclaimer">
              This is an indicative estimate only. Actual pricing varies based
              on program scope, duration, and delivery format.
            </div>
          </div>
        </section>
      )}

      {/* HOW IT WORKS */}
      <section className="spx-pkg__section spx-pkg-how">
        <div className="spx-pkg__container">
          <div className="spx-pkg-section-header">
            <h2 className="spx-pkg-section-title">How It Works</h2>
            <p className="spx-pkg-section-subtitle">
              Get started in three simple steps
            </p>
          </div>
          <div className="spx-pkg-grid-steps">
            <Step
              n="1"
              title="Choose Your Plan"
              desc="Select the package that matches your goals—private coaching or group learning."
            />
            <Step
              n="2"
              title="Schedule Sessions"
              desc="Book times that fit your schedule. Easy rescheduling if plans change."
            />
            <Step
              n="3"
              title="Start Improving"
              desc="Practical lessons, actionable feedback, and measurable progress from day one."
            />
          </div>
        </div>
      </section>

      {/* FEATURE COMPARISON */}
      <section className="spx-pkg__section">
        <div className="spx-pkg__container spx-pkg-compare spx-pkg-card">
          <div className="spx-pkg-compare__header">
            <h2 className="spx-pkg-compare__title">What's Included</h2>
            <p className="spx-pkg-compare__subtitle">
              Compare features across all packages
            </p>
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
                      All packages include personalized coaching, flexible
                      scheduling, and progress tracking.
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
          <h2 className="spx-pkg-faq__title">Frequently Asked Questions</h2>
          <div className="spx-pkg-faq__list">
            <Faq
              q="Can I switch between One-on-One and Group lessons?"
              a="Yes! You can switch formats between billing periods. Contact us and we'll help you transition smoothly."
            />
            <Faq
              q="What's the difference between One-on-One and Group sessions?"
              a="One-on-One sessions are 60 minutes of private coaching focused entirely on your goals. Group sessions are 90 minutes with 2-5 learners, offering collaborative practice at a lower cost per person."
            />
            <Faq
              q="How does group composition work?"
              a="We match learners with similar proficiency levels and learning goals to ensure productive, balanced sessions."
            />
            <Faq
              q="What if I miss a session?"
              a="You can reschedule within your package period. We offer flexible rescheduling with 24-hour notice."
            />
            <Faq
              q="Do you offer corporate/enterprise plans?"
              a="Yes! We provide custom programs for teams with volume pricing, dedicated account management, progress reporting, and flexible billing options."
            />
          </div>
        </div>
      </section>

      {/* CTA STRIP */}
      <section className="spx-pkg__section spx-pkg-cta">
        <div className="spx-pkg__container spx-pkg-cta__inner">
          <h2>Ready to Start Your English Journey?</h2>
          {tab === AUD.INDIVIDUAL ? (
            <div className="spx-pkg-cta__actions">
              <Link
                className="spx-pkg-btn spx-pkg-btn--primary spx-pkg-btn--lg"
                href="/individual#trial"
              >
                Book Free Consultation
              </Link>
              <Link
                className="spx-pkg-btn spx-pkg-btn--ghost spx-pkg-btn--lg"
                href="/packages"
              >
                View All Plans
              </Link>
            </div>
          ) : (
            <div className="spx-pkg-cta__actions">
              <Link
                href="/corporate#rfp"
                className="spx-pkg-btn spx-pkg-btn--primary spx-pkg-btn--lg"
              >
                Request Proposal
              </Link>
              <Link
                className="spx-pkg-btn spx-pkg-btn--ghost spx-pkg-btn--lg"
                href="/corporate"
              >
                Learn About Corporate Programs
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

/* Components */
function PricingCard({ plan, audience, lessonType }) {
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
    savings,
  } = plan;

  const bullets = parseFeatures(plan.featuresRaw || "").slice(0, 8);
  const isCorp = audience === AUD.CORPORATE;

  const priceLabel = (() => {
    if (priceType === "CUSTOM" || (!priceUSD && !startingAtUSD))
      return "Custom Pricing";
    if (startingAtUSD && !priceUSD) return `From $${startingAtUSD}`;
    if (typeof priceUSD === "number") return `$${priceUSD}`;
    return "Custom Pricing";
  })();

  const perSessionPrice =
    typeof priceUSD === "number" && sessionsPerPack
      ? Math.round(priceUSD / sessionsPerPack)
      : null;

  return (
    <div
      className={`spx-pkg-card spx-pkg-card--plan ${
        isPopular ? "is-popular" : ""
      }`}
    >
      {isPopular && <div className="spx-pkg-badge">Most Popular</div>}
      {savings && <div className="spx-pkg-savings">{savings}</div>}

      <figure className="spx-pkg-media spx-pkg-card__media">
        <img src={image} alt="" loading="lazy" />
      </figure>

      <div className="spx-pkg-card__head">
        <div className="spx-pkg-card__title">{title}</div>
        {sessionsPerPack && (
          <div className="spx-pkg-card__sessions">
            {sessionsPerPack} sessions
          </div>
        )}
      </div>

      {description && <p className="spx-pkg-card__desc">{description}</p>}

      <div className="spx-pkg-card__price">
        <div className="spx-pkg-card__value">{priceLabel}</div>
        {perSessionPrice && (
          <div className="spx-pkg-card__sub">${perSessionPrice}/session</div>
        )}
        {durationMin && !isCorp && (
          <div className="spx-pkg-card__duration">
            {durationMin} min/session
          </div>
        )}
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
              Contact Sales
            </Link>
            <Link className="spx-pkg-btn spx-pkg-btn--ghost" href="/corporate">
              Learn More
            </Link>
          </>
        ) : (
          <>
            <Link
              href={`/checkout?plan=${encodeURIComponent(plan.title)}`}
              className="spx-pkg-btn spx-pkg-btn--primary"
            >
              Buy Now
            </Link>
            <Link
              href="/individual#trial"
              className="spx-pkg-btn spx-pkg-btn--ghost"
            >
              Free Consultation
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
        <span className="spx-pkg-faq__icon">{open ? "−" : "+"}</span>
      </button>
      <div className="spx-pkg-faq__a">{a}</div>
    </div>
  );
}

/* Plan Data */
const oneOnOnePlans = [
  {
    id: "1on1-4",
    title: "Starter",
    description: "Perfect for trying out personalized coaching",
    priceUSD: 240,
    durationMin: 60,
    sessionsPerPack: 4,
    priceType: "BUNDLE",
    featuresRaw:
      "Private 1:1 coaching\nFlexible scheduling\nPersonalized curriculum\nSession recordings\nEmail support",
    isPopular: false,
    image: "/images/pilot.avif",
  },
  {
    id: "1on1-12",
    title: "Professional",
    description: "Build lasting skills with consistent practice",
    priceUSD: 660,
    durationMin: 60,
    sessionsPerPack: 12,
    priceType: "BUNDLE",
    featuresRaw:
      "Private 1:1 coaching\nPriority scheduling\nCustom learning plan\nDetailed progress reports\nHomework & resources\nPronunciation analysis",
    isPopular: true,
    savings: "Save 8%",
    image: "/images/team.avif",
  },
  {
    id: "1on1-24",
    title: "Intensive",
    description: "Accelerate your progress with deep practice",
    priceUSD: 1.248,
    durationMin: 60,
    sessionsPerPack: 24,
    priceType: "BUNDLE",
    featuresRaw:
      "Private 1:1 coaching\nPriority scheduling\nAdvanced curriculum\nWeekly progress calls\nMock interviews\nIndustry-specific content\nUnlimited email support",
    isPopular: false,
    savings: "Save 13%",
    image: "/images/company.avif",
  },
  {
    id: "1on1-48",
    title: "Master",
    description: "Maximum commitment for transformation",
    priceUSD: 2.304,
    durationMin: 60,
    sessionsPerPack: 48,
    priceType: "BUNDLE",
    featuresRaw:
      "Private 1:1 coaching\nDedicated coach\nBi-weekly strategy sessions\nComprehensive assessments\nCareer coaching\nNetworking practice\nLifetime resource access\n24/7 support",
    isPopular: false,
    savings: "Save 20%",
    image: "/images/company.avif",
  },
];

const groupPlans = [
  {
    id: "group-4",
    title: "Group Starter",
    description: "Learn together in a small, focused group",
    priceUSD: 160,
    durationMin: 90,
    sessionsPerPack: 4,
    priceType: "BUNDLE",
    featuresRaw:
      "Small groups (2-5 learners)\nLevel-matched peers\nInteractive exercises\nGroup activities\nShared resources",
    isPopular: false,
    image: "/images/pilot.avif",
  },
  {
    id: "group-12",
    title: "Group Professional",
    description: "Consistent group practice for steady growth",
    priceUSD: 420,
    durationMin: 90,
    sessionsPerPack: 12,
    priceType: "BUNDLE",
    featuresRaw:
      "Small groups (2-5 learners)\nCarefully matched groups\nRole-play scenarios\nPeer feedback sessions\nMonthly assessments\nDigital workbook",
    isPopular: true,
    savings: "Save 13%",
    image: "/images/team.avif",
  },
  {
    id: "group-24",
    title: "Group Intensive",
    description: "Immersive collaborative learning experience",
    priceUSD: 768,
    durationMin: 90,
    sessionsPerPack: 24,
    priceType: "BUNDLE",
    featuresRaw:
      "Small groups (2-5 learners)\nStable learning cohort\nReal-world simulations\nGroup projects\nPeer presentations\nProgress tracking\nExtended resources",
    isPopular: false,
    savings: "Save 20%",
    image: "/images/company.avif",
  },
  {
    id: "group-48",
    title: "Group Master",
    description: "Complete transformation through group dynamics",
    priceUSD: 1.392,
    durationMin: 90,
    sessionsPerPack: 48,
    priceType: "BUNDLE",
    featuresRaw:
      "Small groups (2-5 learners)\nDedicated cohort\nAdvanced workshops\nGuest speaker sessions\nCommunity access\nCertificate of completion\nLifetime alumni network\nOngoing support",
    isPopular: false,
    savings: "Save 28%",
    image: "/images/company.avif",
  },
];

const corporatePlans = [
  {
    id: "corp-pilot",
    title: "Pilot Program",
    description: "Test and validate with a small team cohort",
    priceType: "CUSTOM",
    startingAtUSD: null,
    featuresRaw:
      "5-15 employees\nMixed 1:1 and group format\nNeeds assessment\n8-12 week program\nKickoff workshop\nEnd-of-program report\nManager briefings",
    isPopular: false,
    image: "/images/pilot.avif",
  },
  {
    id: "corp-team",
    title: "Team Program",
    description: "Comprehensive training for growing teams",
    priceType: "CUSTOM",
    startingAtUSD: null,
    featuresRaw:
      "15-50 employees\nFlexible delivery formats\nCustom curriculum design\nQuarterly assessments\nDedicated program manager\nMonthly reporting dashboard\nInvoicing & PO support\nSSO integration",
    isPopular: true,
    image: "/images/team.avif",
  },
  {
    id: "corp-enterprise",
    title: "Enterprise Solution",
    description: "Scaled language training with full support",
    priceType: "CUSTOM",
    startingAtUSD: null,
    featuresRaw:
      "50+ employees\nMulti-location rollout\nDedicated Customer Success Manager\nExecutive dashboards\nAPI integration\nSecurity & compliance review\nCustom reporting\nQuarterly business reviews\n24/7 support\nROI analysis",
    isPopular: false,
    image: "/images/company.avif",
  },
];

export default Packages;
