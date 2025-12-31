"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import api from "@/lib/api";
import "@/styles/packages.scss";
import { getDictionary, t } from "@/app/i18n";
import {
  formatMoney,
  getRateEGPTo,
  guessCurrencyFromNavigator,
} from "@/lib/currency";

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
  const pathname = usePathname();
  const locale = pathname?.startsWith("/ar") ? "ar" : "en";
  const dict = getDictionary(locale, "packages");
  const localePrefix = locale === "ar" ? "/ar" : "";

  const [tab, setTab] = useState(AUD.INDIVIDUAL);
  const [lessonType, setLessonType] = useState(LESSON_TYPE.ONE_ON_ONE);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // Visitor currency (base prices are EGP; we convert to viewer currency)
  const [currency, setCurrency] = useState("EGP");
  const [rate, setRate] = useState(1);

  // Seats estimator for corporate
  const [seats, setSeats] = useState(15);

  // Init tab from query
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if ((p.get("tab") || "").toLowerCase() === "corporate")
      setTab(AUD.CORPORATE);
  }, []);

  // Detect viewer currency + FX rate (EGP -> viewer currency)
  useEffect(() => {
    (async () => {
      let c = null;

      // Try server geo first (best-effort)
      try {
        const r = await fetch("/api/geo");
        const j = await r.json();
        c = j?.currency || null;
      } catch {}

      // Fallback: browser locale guess
      if (!c) c = guessCurrencyFromNavigator();

      setCurrency(c);

      try {
        const fx = await getRateEGPTo(c);
        setRate(fx || 1);
      } catch {
        setRate(1);
      }
    })();
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

  const isIndividual = tab === AUD.INDIVIDUAL;
  const isOneOnOne = lessonType === LESSON_TYPE.ONE_ON_ONE;

  // Section title/subtitle logic with translations
  const pricingTitle = isIndividual
    ? isOneOnOne
      ? t(dict, "pricing_title_1on1", "One-on-One Packages")
      : t(dict, "pricing_title_group", "Group Learning Packages")
    : t(dict, "pricing_title_corporate", "Enterprise Solutions");

  const pricingSubtitle = isIndividual
    ? t(
        dict,
        "pricing_subtitle_individual",
        "Choose the package that fits your learning goals and schedule"
      )
    : t(
        dict,
        "pricing_subtitle_corporate",
        "Scalable language training for teams of all sizes"
      );

  return (
    <div className="ecp">
      {/* HERO */}
      <section className="ecp__section ecp-hero">
        <div className="ecp__container ecp-hero__inner">
          <div className="ecp-hero__copy">
            <h1 className="ecp-hero__title">
              {t(dict, "hero_title", "Professional English Coaching")}
            </h1>
            <p className="ecp-hero__subtitle">
              {t(
                dict,
                "hero_subtitle",
                "Choose the format that works for you—private one-on-one sessions or collaborative group learning. Flexible plans, real results."
              )}
            </p>

            <div className="ecp-tabs" role="tablist" aria-label="Audience">
              <button
                role="tab"
                aria-selected={tab === AUD.INDIVIDUAL}
                className={`ecp-tab ${
                  tab === AUD.INDIVIDUAL ? "is-active" : ""
                }`}
                onClick={() => setTab(AUD.INDIVIDUAL)}
              >
                {t(dict, "tab_individual", "Individuals")}
              </button>
              <button
                role="tab"
                aria-selected={tab === AUD.CORPORATE}
                className={`ecp-tab ${
                  tab === AUD.CORPORATE ? "is-active" : ""
                }`}
                onClick={() => setTab(AUD.CORPORATE)}
              >
                {t(dict, "tab_corporate", "Teams & Companies")}
              </button>
            </div>

            {tab === AUD.INDIVIDUAL && (
              <div className="ecp-lesson-toggle">
                <button
                  className={`ecp-lesson-btn ${
                    lessonType === LESSON_TYPE.ONE_ON_ONE ? "is-active" : ""
                  }`}
                  onClick={() => setLessonType(LESSON_TYPE.ONE_ON_ONE)}
                >
                  <span className="ecp-lesson-icon">👤</span>
                  <span className="ecp-lesson-text">
                    <strong>
                      {t(dict, "lesson_one_on_one_title", "One-on-One")}
                    </strong>
                    <small>
                      {t(dict, "lesson_one_on_one_sub", "Private sessions")}
                    </small>
                  </span>
                </button>
                <button
                  className={`ecp-lesson-btn ${
                    lessonType === LESSON_TYPE.GROUP ? "is-active" : ""
                  }`}
                  onClick={() => setLessonType(LESSON_TYPE.GROUP)}
                >
                  <span className="ecp-lesson-icon">👥</span>
                  <span className="ecp-lesson-text">
                    <strong>{t(dict, "lesson_group_title", "Group")}</strong>
                    <small>{t(dict, "lesson_group_sub", "2-5 learners")}</small>
                  </span>
                </button>
              </div>
            )}

            {tab === AUD.INDIVIDUAL ? (
              <div className="ecp-hero__note">
                {lessonType === LESSON_TYPE.ONE_ON_ONE ? (
                  <>
                    <strong>
                      {t(dict, "note_1on1_strong", "60-minute sessions")}
                    </strong>{" "}
                    ·{" "}
                    {t(
                      dict,
                      "note_1on1_rest",
                      "Personalized coaching · Flexible scheduling"
                    )}
                  </>
                ) : (
                  <>
                    <strong>
                      {t(dict, "note_group_strong", "90-minute sessions")}
                    </strong>{" "}
                    ·{" "}
                    {t(
                      dict,
                      "note_group_rest",
                      "Small groups (2-5 learners) · Collaborative learning"
                    )}
                  </>
                )}
              </div>
            ) : (
              <div className="ecp-hero__note">
                {t(
                  dict,
                  "note_corporate",
                  "Custom programs · Progress reporting · Enterprise billing · Dedicated support"
                )}
              </div>
            )}
          </div>

          <figure className="ecp-media ecp-hero__media">
            <img
              src="/images/english-coaching-in-action.avif"
              alt={t(dict, "hero_media_alt", "English coaching in action")}
              loading="eager"
            />
          </figure>
        </div>
      </section>

      {/* STATUS */}
      {loading && (
        <section className="ecp__section">
          <div className="ecp__container">
            <div className="ecp-status">
              {t(dict, "status_loading", "Loading packages…")}
            </div>
          </div>
        </section>
      )}
      {!loading && err && (
        <section className="ecp__section">
          <div className="ecp__container">
            <div className="ecp-status ecp-status--warn">
              {t(dict, "status_error", err || "Something went wrong.")}
            </div>
          </div>
        </section>
      )}

      {/* PRICING GRID */}
      <section className="ecp__section ecp-pricing-section">
        <div className="ecp__container">
          <div className="ecp-section-header">
            <h2 className="ecp-section-title">{pricingTitle}</h2>
            <p className="ecp-section-subtitle">{pricingSubtitle}</p>
          </div>

          <div className="ecp-grid ecp-grid--fade-in">
            {plans.map((p, idx) => (
              <PricingCard
                key={p.id || idx}
                plan={p}
                audience={tab}
                dict={dict}
                locale={locale}
                currency={currency}
                rate={rate}
              />
            ))}
          </div>
        </div>
      </section>

      {/* CORPORATE SEATS ESTIMATOR */}
      {tab === AUD.CORPORATE && (
        <section className="ecp__section ecp-estimator">
          <div className="ecp__container ecp-card ecp-estimator__row">
            <div className="ecp-estimator__copy">
              <h3 className="ecp-estimator__title">
                {t(dict, "estimator_title", "Budget Estimator")}
              </h3>
              <p className="ecp-estimator__p">
                {t(
                  dict,
                  "estimator_text",
                  "Get a rough estimate for your team size. Final pricing depends on program format, duration, and custom requirements."
                )}
              </p>
            </div>
            <div className="ecp-estimator__control">
              <label className="ecp-label" htmlFor="seats">
                {t(dict, "estimator_label_team_size", "Team Size")}
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
              <div className="ecp-estimator__value">
                {seats} {t(dict, "estimator_employees", "employees")}
              </div>
            </div>
            <div className="ecp-estimator__result">
              <div className="ecp-estimator__number">
                ~${corpEstimate.toLocaleString()}/
                {t(dict, "estimator_period", "mo")}
              </div>
              <Link
                href={`${localePrefix}/corporate#rfp`}
                className="ecp-btn ecp-btn--primary"
              >
                {t(dict, "estimator_cta", "Get Custom Quote")}
              </Link>
            </div>
            <div className="ecp-estimator__disclaimer">
              {t(
                dict,
                "estimator_disclaimer",
                "This is an indicative estimate only. Actual pricing varies based on program scope, duration, and delivery format."
              )}
            </div>
          </div>
        </section>
      )}

      {/* HOW IT WORKS */}
      <section className="ecp__section ecp-how">
        <div className="ecp__container">
          <div className="ecp-section-header">
            <h2 className="ecp-section-title">
              {t(dict, "how_title", "How It Works")}
            </h2>
            <p className="ecp-section-subtitle">
              {t(dict, "how_subtitle", "Get started in three simple steps")}
            </p>
          </div>
          <div className="ecp-grid-steps">
            <Step
              n="1"
              title={t(dict, "how_step1_title", "Choose Your Plan")}
              desc={t(
                dict,
                "how_step1_desc",
                "Select the package that matches your goals—private coaching or group learning."
              )}
            />
            <Step
              n="2"
              title={t(dict, "how_step2_title", "Schedule Sessions")}
              desc={t(
                dict,
                "how_step2_desc",
                "Book times that fit your schedule. Easy rescheduling if plans change."
              )}
            />
            <Step
              n="3"
              title={t(dict, "how_step3_title", "Start Improving")}
              desc={t(
                dict,
                "how_step3_desc",
                "Practical lessons, actionable feedback, and measurable progress from day one."
              )}
            />
          </div>
        </div>
      </section>

      {/* FEATURE COMPARISON */}
      <section className="ecp__section">
        <div className="ecp__container ecp-compare ecp-card">
          <div className="ecp-compare__header">
            <h2 className="ecp-compare__title">
              {t(dict, "compare_title", "What's Included")}
            </h2>
            <p className="ecp-compare__subtitle">
              {t(
                dict,
                "compare_subtitle",
                "Compare features across all packages"
              )}
            </p>
          </div>
          <div className="ecp-compare__tablewrap">
            <table className="ecp-compare__table">
              <thead>
                <tr>
                  <th>{t(dict, "compare_col_features", "Features")}</th>
                  {plans.map((p, i) => (
                    <th key={i}>{p.title}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrix.length === 0 ? (
                  <tr>
                    <td colSpan={1 + plans.length} className="empty">
                      {t(
                        dict,
                        "compare_empty",
                        "All packages include personalized coaching, flexible scheduling, and progress tracking."
                      )}
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
      <section className="ecp__section ecp-faq">
        <div className="ecp__container ecp-card">
          <h2 className="ecp-faq__title">
            {t(dict, "faq_title", "Frequently Asked Questions")}
          </h2>
          <div className="ecp-faq__list">
            <Faq
              q={t(
                dict,
                "faq1_q",
                "Can I switch between One-on-One and Group lessons?"
              )}
              a={t(
                dict,
                "faq1_a",
                "Yes! You can switch formats between billing periods. Contact us and we'll help you transition smoothly."
              )}
            />
            <Faq
              q={t(
                dict,
                "faq2_q",
                "What's the difference between One-on-One and Group sessions?"
              )}
              a={t(
                dict,
                "faq2_a",
                "One-on-One sessions are 60 minutes of private coaching focused entirely on your goals. Group sessions are 90 minutes with 2-5 learners, offering collaborative practice at a lower cost per person."
              )}
            />
            <Faq
              q={t(dict, "faq3_q", "How does group composition work?")}
              a={t(
                dict,
                "faq3_a",
                "We match learners with similar proficiency levels and learning goals to ensure productive, balanced sessions."
              )}
            />
            <Faq
              q={t(dict, "faq4_q", "What if I miss a session?")}
              a={t(
                dict,
                "faq4_a",
                "You can reschedule within your package period. We offer flexible rescheduling with 24-hour notice."
              )}
            />
            <Faq
              q={t(dict, "faq5_q", "Do you offer corporate/enterprise plans?")}
              a={t(
                dict,
                "faq5_a",
                "Yes! We provide custom programs for teams with volume pricing, dedicated account management, progress reporting, and flexible billing options."
              )}
            />
          </div>
        </div>
      </section>

      {/* CTA STRIP */}
      <section className="ecp__section ecp-cta">
        <div className="ecp__container ecp-cta__inner">
          <h2>
            {t(dict, "cta_title", "Ready to Start Your English Journey?")}
          </h2>
          {tab === AUD.INDIVIDUAL ? (
            <div className="ecp-cta__actions">
              <Link
                className="ecp-btn ecp-btn--primary ecp-btn--lg"
                href={`${localePrefix}/individual#trial`}
              >
                {t(dict, "cta_individual_primary", "Book Free Consultation")}
              </Link>
              <Link
                className="ecp-btn ecp-btn--ghost ecp-btn--lg"
                href={`${localePrefix}/packages`}
              >
                {t(dict, "cta_individual_secondary", "View All Plans")}
              </Link>
            </div>
          ) : (
            <div className="ecp-cta__actions">
              <Link
                href={`${localePrefix}/corporate#rfp`}
                className="ecp-btn ecp-btn--primary ecp-btn--lg"
              >
                {t(dict, "cta_corp_primary", "Request Proposal")}
              </Link>
              <Link
                className="ecp-btn ecp-btn--ghost ecp-btn--lg"
                href={`${localePrefix}/corporate`}
              >
                {t(
                  dict,
                  "cta_corp_secondary",
                  "Learn About Corporate Programs"
                )}
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

/* Components */
function PricingCard({ plan, audience, dict, locale, currency, rate }) {
  const {
    title,
    description,
    priceUSD,
    priceEGP,
    priceType,
    startingAtUSD,
    isPopular,
    sessionsPerPack,
    durationMin,
    savings,
  } = plan;

  const bullets = parseFeatures(plan.featuresRaw || "").slice(0, 8);
  const isCorp = audience === AUD.CORPORATE;
  const localePrefix = locale === "ar" ? "/ar" : "";

  // Base price is EGP; support legacy priceUSD if priceEGP isn't provided
  const baseEGP =
    typeof priceEGP === "number"
      ? priceEGP
      : typeof priceUSD === "number"
      ? priceUSD
      : null;

  const totalLabel = (() => {
    if (priceType === "CUSTOM" || (!baseEGP && !startingAtUSD))
      return t(dict, "price_custom", "Custom Pricing");

    // If you ever use startingAt again, treat startingAtUSD as base EGP too (legacy name)
    if (startingAtUSD && !baseEGP) {
      const converted = Math.round(Number(startingAtUSD) * (rate || 1));
      return t(
        dict,
        "price_from",
        `From ${formatMoney(converted, currency || "EGP", locale)}`
      );
    }

    if (typeof baseEGP === "number") {
      const converted = Math.round(baseEGP * (rate || 1));
      return formatMoney(converted, currency || "EGP", locale);
    }

    return t(dict, "price_custom", "Custom Pricing");
  })();

  const perSessionPrice =
    typeof baseEGP === "number" && sessionsPerPack
      ? Math.round((baseEGP / sessionsPerPack) * (rate || 1))
      : null;

  return (
    <div className={`ecp-card ecp-card--plan ${isPopular ? "is-popular" : ""}`}>
      {isPopular && (
        <div className="ecp-badge">
          {t(dict, "badge_most_popular", "MOST POPULAR")}
        </div>
      )}
      {savings && <div className="ecp-savings">{savings.toUpperCase()}</div>}

      <div className="ecp-card__head">
        <div className="ecp-card__title">{title}</div>
        {sessionsPerPack && (
          <div className="ecp-card__sessions">
            {sessionsPerPack} {t(dict, "label_sessions", "sessions")}
          </div>
        )}
      </div>

      {description && <p className="ecp-card__desc">{description}</p>}

      <div className="ecp-card__price">
        <div className="ecp-card__value">{totalLabel}</div>
        {perSessionPrice && (
          <div className="ecp-card__sub">
            {formatMoney(perSessionPrice, currency || "EGP", locale)}/
            {t(dict, "label_per_session", "session")}
          </div>
        )}
        {durationMin && !isCorp && (
          <div className="ecp-card__duration">
            {durationMin} {t(dict, "label_min_per_session", "min/session")}
          </div>
        )}
      </div>

      {bullets.length > 0 && (
        <ul className="ecp-card__bullets">
          {bullets.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      )}

      <div className="ecp-card__actions">
        {isCorp ? (
          <>
            <Link
              href={`${localePrefix}/corporate#rfp`}
              className="ecp-btn ecp-btn--primary"
            >
              {t(dict, "cta_corp_card_primary", "Contact Sales")}
            </Link>
            <Link
              className="ecp-btn ecp-btn--ghost"
              href={`${localePrefix}/corporate`}
            >
              {t(dict, "cta_corp_card_secondary", "Learn More")}
            </Link>
          </>
        ) : (
          <>
            <Link
              href={`${localePrefix}/checkout?plan=${encodeURIComponent(
                plan.title
              )}`}
              className="ecp-btn ecp-btn--primary"
            >
              {t(dict, "cta_buy_now", "Buy Now")}
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

function Step({ n, title, desc }) {
  return (
    <div className="ecp-step ecp-card">
      <div className="ecp-step__n">{n}</div>
      <div className="ecp-step__title">{title}</div>
      <div className="ecp-step__desc">{desc}</div>
    </div>
  );
}

function Faq({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`ecp-faq__item ${open ? "is-open" : ""}`}>
      <button
        className="ecp-faq__q"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        {q}
        <span className="ecp-faq__icon">{open ? "−" : "+"}</span>
      </button>
      <div className="ecp-faq__a">{a}</div>
    </div>
  );
}

/* Plan Data (EGP base totals; shown in viewer currency via FX) */
const oneOnOnePlans = [
  {
    id: "1on1-4",
    title: "Starter",
    description: "Perfect for trying out personalized coaching",
    priceEGP: 800,
    durationMin: 60,
    sessionsPerPack: 4,
    priceType: "BUNDLE",
    featuresRaw:
      "Private 1:1 coaching\nFlexible scheduling\nPersonalized curriculum\nSession recordings\nEmail support",
    isPopular: false,
  },
  {
    id: "1on1-12",
    title: "Professional",
    description: "Build lasting skills with consistent practice",
    priceEGP: 2200,
    durationMin: 60,
    sessionsPerPack: 12,
    priceType: "BUNDLE",
    featuresRaw:
      "Private 1:1 coaching\nPriority scheduling\nCustom learning plan\nDetailed progress reports\nHomework & resources\nPronunciation analysis",
    isPopular: true,
    savings: "Save 8%",
  },
  {
    id: "1on1-24",
    title: "Intensive",
    description: "Accelerate your progress with deep practice",
    priceEGP: 3800,
    durationMin: 60,
    sessionsPerPack: 24,
    priceType: "BUNDLE",
    featuresRaw:
      "Private 1:1 coaching\nPriority scheduling\nAdvanced curriculum\nWeekly progress calls\nMock interviews\nIndustry-specific content\nUnlimited email support",
    isPopular: false,
    savings: "Save 13%",
  },
  {
    id: "1on1-48",
    title: "Master",
    description: "Maximum commitment for transformation",
    priceEGP: 6800,
    durationMin: 60,
    sessionsPerPack: 48,
    priceType: "BUNDLE",
    featuresRaw:
      "Private 1:1 coaching\nDedicated coach\nBi-weekly strategy sessions\nComprehensive assessments\nCareer coaching\nNetworking practice\nLifetime resource access\n24/7 support",
    isPopular: false,
    savings: "Save 20%",
  },
];

const groupPlans = [
  {
    id: "group-4",
    title: "Group Starter",
    description: "Learn together in a small, focused group",
    priceEGP: 600,
    durationMin: 90,
    sessionsPerPack: 4,
    priceType: "BUNDLE",
    featuresRaw:
      "Small groups (2-5 learners)\nLevel-matched peers\nInteractive exercises\nGroup activities\nShared resources",
    isPopular: false,
  },
  {
    id: "group-12",
    title: "Group Professional",
    description: "Consistent group practice for steady growth",
    priceEGP: 1600,
    durationMin: 90,
    sessionsPerPack: 12,
    priceType: "BUNDLE",
    featuresRaw:
      "Small groups (2-5 learners)\nCarefully matched groups\nRole-play scenarios\nPeer feedback sessions\nMonthly assessments\nDigital workbook",
    isPopular: true,
    savings: "Save 13%",
  },
  {
    id: "group-24",
    title: "Group Intensive",
    description: "Immersive collaborative learning experience",
    priceEGP: 2800,
    durationMin: 90,
    sessionsPerPack: 24,
    priceType: "BUNDLE",
    featuresRaw:
      "Small groups (2-5 learners)\nStable learning cohort\nReal-world simulations\nGroup projects\nPeer presentations\nProgress tracking\nExtended resources",
    isPopular: false,
    savings: "Save 20%",
  },
  {
    id: "group-48",
    title: "Group Master",
    description: "Complete transformation through group dynamics",
    priceEGP: 5000,
    durationMin: 90,
    sessionsPerPack: 48,
    priceType: "BUNDLE",
    featuresRaw:
      "Small groups (2-5 learners)\nDedicated cohort\nAdvanced workshops\nGuest speaker sessions\nCommunity access\nCertificate of completion\nLifetime alumni network\nOngoing support",
    isPopular: false,
    savings: "Save 28%",
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
  },
  {
    id: "global-enterprise",
    title: "Global Enterprise",
    description:
      "Worldwide language training with enterprise-grade scalability",
    priceType: "CUSTOM",
    startingAtUSD: null,
    featuresRaw:
      "100+ employees\nGlobal multi-region deployment\n24/7 multilingual support\nDedicated Enterprise Success Director\nAdvanced analytics & insights\nCustom integrations (HRIS, LMS, SSO)\nRegulatory & data compliance (GDPR, SOC2)\nROI & performance benchmarking\nAnnual strategic partnership review\nTailored executive workshops",
    isPopular: false,
  },
];

export default Packages;
