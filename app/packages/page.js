"use client";

import { useEffect, useId, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import api from "@/lib/api";
import "@/styles/packages.scss";
import { getDictionary, t } from "@/app/i18n";
import FadeIn from "@/components/FadeIn";
import PackageComparison from "@/components/PackageComparison";
// import { guessCurrencyFromNavigator } from "@/lib/currency"; // no longer needed
import { usePricingCatalog, mergeCatalogPlans } from "@/hooks/usePricingCatalog";
import { isPurchaseReadyPlan, isValidPricingCatalog } from "@/lib/pricing-catalog.mjs";
import {
  calculatePackagePrice,
  calculatePerSessionPrice,
  formatRegionalPrice,
} from "@/lib/regional-pricing";
import { oneOnOnePlans, groupPlans, corporatePlans } from "@/lib/plans";
import { getPricingRegion } from "@/lib/pricing-regions";
import { APP_ROUTES, getPrimaryConversionHref, routeHref } from "@/lib/routes";
import { formatNumber } from "@/utils/locale";

const AUD = { INDIVIDUAL: "INDIVIDUAL", CORPORATE: "CORPORATE" };
const LESSON_TYPE = { ONE_ON_ONE: "ONE_ON_ONE", GROUP: "GROUP" };
const DEFAULT_COUNTRY_CODE = "EG";
const DEFAULT_CURRENCY = getPricingRegion(DEFAULT_COUNTRY_CODE).currency;
const STAGE_CODES = ["A1", "A2", "B1", "B2", "C1", "C2"];

// Semicolons/newlines separate benefits; commas belong to the copy.
function parseFeatures(raw) {
  if (!raw) return [];
  return String(raw)
    .split(/\r?\n|;/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

function getPackProgressGuide(sessionsPerPack, dict) {
  const key = {
    4: "pack_progress_4",
    12: "pack_progress_12",
    24: "pack_progress_24",
    48: "pack_progress_48",
  }[sessionsPerPack];

  if (!key) return null;

  const fallback = {
    4: "A focused start",
    12: "About half a level",
    24: "About one level",
    48: "About one full stage",
  }[sessionsPerPack];

  return t(dict, key, fallback);
}


function getPlanPriceLabels(plan, countryCode, locale, dict) {
  const resolvedCountry = countryCode || DEFAULT_COUNTRY_CODE;
  const regionalPrice = calculatePackagePrice(plan, resolvedCountry);
  const perSessionPrice = calculatePerSessionPrice(plan, resolvedCountry);

  const totalLabel = (() => {
    if (plan.priceType === "CUSTOM" || regionalPrice.isCustomPricing) {
      return t(dict, "price_custom", "Custom Pricing");
    }

    if (regionalPrice.displayAmount > 0) {
      return formatRegionalPrice(regionalPrice, locale);
    }

    return t(dict, "price_custom", "Custom Pricing");
  })();

  const perSessionLabel = (() => {
    return perSessionPrice
      ? formatRegionalPrice(perSessionPrice, locale)
      : null;
  })();

  return {
    regionalPrice,
    perSessionPrice,
    totalLabel,
    perSessionLabel,
  };
}

function Packages() {
  const pathname = usePathname();
  const locale = pathname?.startsWith("/ar") ? "ar" : "en";
  const dict = getDictionary(locale, "packages");

  const [tab, setTab] = useState(AUD.INDIVIDUAL);
  const [lessonType, setLessonType] = useState(LESSON_TYPE.ONE_ON_ONE);
  const {catalog, error: err, loading, retry} = usePricingCatalog();

  // Regional pricing
  const countryCode = catalog?.countryCode || DEFAULT_COUNTRY_CODE;
  const currency = catalog?.packages?.[0]?.pricing?.displayCurrency || DEFAULT_CURRENCY;

  // Seats estimator for corporate
  const [seats, setSeats] = useState(15);

  // Init tab from query
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if ((p.get("tab") || "").toLowerCase() === "corporate")
      setTab(AUD.CORPORATE);
  }, []);

  // Get current plans based on selection
  const rawPlans = useMemo(() => {
    if (tab === AUD.CORPORATE) return corporatePlans;
    return mergeCatalogPlans(lessonType === LESSON_TYPE.ONE_ON_ONE ? oneOnOnePlans : groupPlans, catalog);
  }, [tab, lessonType, catalog]);

  // Localize display strings while keeping the English title as the backend identifier.
  const plans = useMemo(() => {
    return rawPlans.map((p) => {
      const localizedTitle = dict[`plan_${p.id}_title`];
      const localizedDesc = dict[`plan_${p.id}_desc`];
      const localizedFeatures = dict[`plan_${p.id}_features`];
      return {
        ...p,
        _backendTitle: p.title,
        title: localizedTitle || p.title,
        description: localizedDesc || p.description,
        featuresRaw: localizedFeatures || p.featuresRaw,
      };
    });
  }, [rawPlans, dict]);

  // Corporate estimate
  const corpEstimate = useMemo(() => {
    const base = 60;
    return Math.max(0, Math.round(seats * base));
  }, [seats]);

  const isIndividual = tab === AUD.INDIVIDUAL;
  const isOneOnOne = lessonType === LESSON_TYPE.ONE_ON_ONE;
  const catalogReady = isValidPricingCatalog(catalog) && !loading && !err;
  const pricePreview = useMemo(() => {
    const pricedPlans = plans.map((plan) => ({
      plan,
      ...getPlanPriceLabels(plan, countryCode, locale, dict),
    }));
    const plansWithPerSession = pricedPlans.filter(
      (item) => item.perSessionPrice?.displayAmount > 0
    );
    const lowestPerSession = plansWithPerSession.reduce(
      (best, item) =>
        !best || item.perSessionPrice.displayAmount < best.perSessionPrice.displayAmount
          ? item
          : best,
      null
    );

    const lowestTotal = pricedPlans.reduce(
      (best, item) =>
        !best || item.regionalPrice.displayAmount < best.regionalPrice.displayAmount
          ? item
          : best,
      null,
    );

    return { pricedPlans, lowestPerSession, lowestTotal };
  }, [plans, countryCode, locale, dict]);

  // Section title/subtitle logic with translations
  const pricingTitle = isIndividual
    ? isOneOnOne
      ? t(dict, "pricing_title_1on1", "One-on-One Packages")
      : t(dict, "pricing_title_group", "Group Learning Packages")
    : t(dict, "pricing_title_corporate", "Enterprise Solutions");

  const pricingSubtitle = isIndividual
    ? t(
      dict,
      isOneOnOne ? "pricing_subtitle_1on1" : "pricing_subtitle_group",
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
            <p className="ecp-hero__eyebrow">{t(dict, "path_eyebrow", "YOUR ENGLISH ROADMAP")}</p>
            <h1
              className="ecp-hero__title"
              aria-label={t(dict, "hero_title", "6 stages. 12 levels. One clear path.")}
            >
              <span>{t(dict, "hero_title_stages", "6 stages.")}</span>{" "}
              <span className="ecp-hero__title-accent">{t(dict, "hero_title_levels", "12 levels.")}</span>
              <span className="ecp-hero__title-ending">
                {t(dict, "hero_title_ending", "One clear path.")}
              </span>
            </h1>
            <p className="ecp-hero__subtitle">
              {t(
                dict,
                "hero_subtitle",
                "Start at the level that fits you. Practise with a coach, review your progress, and move forward when you are ready."
              )}
            </p>

            <div className="ecp-path" id="learning-stages">
              <div className="ecp-path__heading">
                <strong>{t(dict, "path_title", "How the path is built")}</strong>
                <span>{t(dict, "path_count", "6 stages · 2 levels each")}</span>
              </div>
              <div className="ecp-path__equation" aria-label={t(dict, "path_equation_aria", "One level is roughly 24 sessions. Two levels make one stage, roughly 48 sessions.")}>
                <div className="ecp-path__measure">
                  <span>{t(dict, "path_one_level", "1 level")}</span>
                  <strong>{t(dict, "path_level_sessions", "≈ 24 sessions")}</strong>
                </div>
                <span className="ecp-path__operator" aria-hidden="true">× 2</span>
                <div className="ecp-path__measure ecp-path__measure--stage">
                  <span>{t(dict, "path_one_stage", "1 stage")}</span>
                  <strong>{t(dict, "path_stage_sessions", "≈ 48 sessions")}</strong>
                </div>
              </div>
              <ol className="ecp-path__bands" aria-label={t(dict, "path_aria", "Six English stages from A1 to C2, with two learning levels in each stage")}>
                {STAGE_CODES.map((stage) => (
                  <li className="ecp-path__band" key={stage}>
                    <span className="ecp-path__code" dir="ltr">{stage}</span>
                    <span className="ecp-path__label">{t(dict, `path_${stage.toLowerCase()}`, stage)}</span>
                    <span className="ecp-path__levels" dir="ltr">
                      <span>{stage}.1</span>
                      <span aria-hidden="true">→</span>
                      <span>{stage}.2</span>
                    </span>
                  </li>
                ))}
              </ol>
              <div className="ecp-path__guidance">
                <span className="ecp-path__guidance-icon" aria-hidden="true">i</span>
                <p>
                  <strong>{t(dict, "path_estimate_title", "A planning guide, not a promise.")}</strong>{" "}
                  {t(dict, "path_explain", "Your pace depends on your starting point, attendance, practice between sessions, and progress with your coach.")}
                </p>
              </div>
              <Link className="ecp-path__assessment" href={getPrimaryConversionHref(locale)}>
                <span>{t(dict, "path_assessment_kicker", "Not sure where you start?")}</span>
                <strong>{t(dict, "path_assessment_cta", "Book your free live session")}</strong>
                <span aria-hidden="true">{locale === "ar" ? "←" : "→"}</span>
              </Link>
            </div>

            <p className="ecp-hero__choice-label">{t(dict, "path_choice", "Choose how you want to practise")}</p>

            <div className="ecp-tabs" role="tablist" aria-label="Audience">
              <button
                role="tab"
                aria-selected={tab === AUD.INDIVIDUAL}
                className={`ecp-tab ${tab === AUD.INDIVIDUAL ? "is-active" : ""
                  }`}
                onClick={() => setTab(AUD.INDIVIDUAL)}
              >
                {t(dict, "tab_individual", "Individuals")}
              </button>
              <button
                role="tab"
                aria-selected={tab === AUD.CORPORATE}
                className={`ecp-tab ${tab === AUD.CORPORATE ? "is-active" : ""
                  }`}
                onClick={() => setTab(AUD.CORPORATE)}
              >
                {t(dict, "tab_corporate", "Teams & Companies")}
              </button>
            </div>

            {tab === AUD.INDIVIDUAL && (
              <div className="ecp-lesson-toggle">
                <button
                  className={`ecp-lesson-btn ${lessonType === LESSON_TYPE.ONE_ON_ONE ? "is-active" : ""
                    }`}
                  onClick={() => setLessonType(LESSON_TYPE.ONE_ON_ONE)}
                >
                  <span className="ecp-lesson-icon">👤</span>
                  <span className="ecp-lesson-text">
                    <strong>
                      {t(dict, "mode_one_on_one_title", "One-on-One")}
                    </strong>
                    <small>
                      {t(dict, "mode_one_on_one_sub", "Private sessions")}
                    </small>
                  </span>
                </button>
                <button
                  className={`ecp-lesson-btn ${lessonType === LESSON_TYPE.GROUP ? "is-active" : ""
                    }`}
                  onClick={() => setLessonType(LESSON_TYPE.GROUP)}
                >
                  <span className="ecp-lesson-icon">👥</span>
                  <span className="ecp-lesson-text">
                    <strong>{t(dict, "mode_group_title", "Group")}</strong>
                    <small>{t(dict, "mode_group_sub", "2-5 members")}</small>
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

          <aside className="ecp-hero-pricing" aria-label="Current package pricing">
            <div className="ecp-hero-pricing__eyebrow">
              {isIndividual
                ? t(dict, "hero_pricing_eyebrow", "Prices visible upfront")
                : t(dict, "hero_pricing_corp_eyebrow", "Team pricing")}
            </div>
            {isIndividual && !catalog ? (
              <div className="ecp-hero-pricing__availability" role={err ? "alert" : "status"}>
                <span>
                  {err
                    ? t(dict, "pricing_unavailable", "Prices are temporarily unavailable.")
                    : t(dict, "pricing_loading", "Loading prices…")}
                </span>
                {err && (
                  <button type="button" className="ecp-pricing-retry" onClick={retry}>
                    {t(dict, "pricing_retry", "Retry")}
                  </button>
                )}
              </div>
            ) : isIndividual && pricePreview.lowestPerSession ? (
              <>
                <h2 className="ecp-hero-pricing__title">
                  {t(dict, "hero_pricing_from", "From")}{" "}
                  <strong>
                    {pricePreview.lowestTotal?.totalLabel || pricePreview.lowestPerSession.perSessionLabel}
                  </strong>
                  <span className="ecp-hero-pricing__unit">
                    {t(dict, "hero_pricing_upfront", "upfront")}
                  </span>
                </h2>
                <p className="ecp-hero-pricing__copy">
                  {t(dict, "hero_pricing_lowest_per_session", "Best value")}:{" "}
                  <strong>
                    {pricePreview.lowestPerSession.perSessionLabel}/
                    {t(dict, "label_per_session", "session")}
                  </strong>{" "}
                  {t(
                    dict,
                    "hero_pricing_copy",
                    "Paid upfront. Details and full comparison are below."
                  )}
                </p>
              </>
            ) : (
              <>
                <h2 className="ecp-hero-pricing__title">
                  {t(dict, "hero_pricing_custom", "Custom team programs")}
                </h2>
                <p className="ecp-hero-pricing__copy">
                  {t(
                    dict,
                    "hero_pricing_custom_copy",
                    "See the program tiers now, then request a proposal for your team size."
                  )}
                </p>
              </>
            )}

            <div className="ecp-hero-pricing__list">
              {pricePreview.pricedPlans.map((item) => (
                <a
                  className="ecp-hero-pricing__row"
                  href={`#package-${item.plan.id}`}
                  key={item.plan.id || item.plan.title}
                >
                  <span>
                    <strong>{item.plan.title}</strong>
                    <small>
                      {item.plan.sessionsPerPack
                        ? `${item.plan.sessionsPerPack} ${t(dict, "label_sessions", "sessions")}`
                        : t(dict, "hero_pricing_custom_scope", "Custom scope")}
                    </small>
                  </span>
                  <span>
                    <strong>{item.totalLabel}</strong>
                    {item.perSessionLabel && (
                      <small>
                        {item.perSessionLabel}/
                        {t(dict, "label_per_session", "session")}
                      </small>
                    )}
                  </span>
                </a>
              ))}
            </div>

            <a className="ecp-btn ecp-btn--primary" href="#packages-pricing">
              {t(dict, "hero_pricing_cta", "Compare packages")}
            </a>
          </aside>
        </div>
      </section>

      {/* STATUS */}
      {loading && (
        <section className="ecp__section">
          <div className="ecp__container">
            <div className="ecp-status" role="status">
              {t(dict, "pricing_loading", "Loading prices…")}
            </div>
          </div>
        </section>
      )}
      {!loading && err && (
        <section className="ecp__section">
          <div className="ecp__container">
            <div className="ecp-status ecp-status--warn" role="alert">
              <span>{t(dict, "pricing_unavailable", "Prices are temporarily unavailable.")}</span>
              <button type="button" className="ecp-pricing-retry" onClick={retry}>
                {t(dict, "pricing_retry", "Retry")}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* PRICING GRID */}
      <section className="ecp__section ecp-pricing-section" id="packages-pricing">
        <div className="ecp__container">
          <div className="ecp-section-header ecp-section-header--pricing">
            <FadeIn as="h2" className="ecp-section-title">{pricingTitle}</FadeIn>
            <FadeIn as="p" className="ecp-section-subtitle" delay={0.1}>{pricingSubtitle}</FadeIn>
          </div>

          {isIndividual && (
            <div className="ecp-progress-guide" aria-label={t(dict, "progress_guide_aria", "How package sizes relate to the learning path")}>
              <div className="ecp-progress-guide__intro">
                <span>{t(dict, "progress_guide_eyebrow", "PLAN WITH CONTEXT")}</span>
                <strong>{t(dict, "progress_guide_title", "Match your pack to your next milestone")}</strong>
              </div>
              <div className="ecp-progress-guide__item">
                <strong>{t(dict, "progress_guide_level", "24 sessions")}</strong>
                <span>{t(dict, "progress_guide_level_desc", "roughly one level")}</span>
              </div>
              <div className="ecp-progress-guide__item ecp-progress-guide__item--accent">
                <strong>{t(dict, "progress_guide_stage", "48 sessions")}</strong>
                <span>{t(dict, "progress_guide_stage_desc", "roughly one stage · two levels")}</span>
              </div>
              <p>{t(dict, "progress_guide_note", "These are planning estimates. Your coach reviews your progress with you; finishing a pack does not automatically guarantee a level change.")}</p>
            </div>
          )}

          <div className={`ecp-grid ecp-grid--fade-in ${isIndividual ? "ecp-grid--shared" : ""}`}>
            {plans.map((p, idx) => (
              <PricingCard
                key={p.id || idx}
                plan={p}
                audience={tab}
                dict={dict}
                locale={locale}
                currency={currency}
                countryCode={countryCode}
                catalog={catalog}
                loading={loading}
                catalogError={err}
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
              <FadeIn as="h3" className="ecp-estimator__title">
                {t(dict, "estimator_title", "Budget Estimator")}
              </FadeIn>
              <FadeIn as="p" className="ecp-estimator__p" delay={0.1}>
                {t(
                  dict,
                  "estimator_text",
                  "Get a rough estimate for your team size. Final pricing depends on program format, duration, and custom requirements."
                )}
              </FadeIn>
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
                {formatNumber(seats, locale)} {t(dict, "estimator_employees", "employees")}
              </div>
            </div>
            <div className="ecp-estimator__result">
              <div className="ecp-estimator__number">
                ~${formatNumber(corpEstimate, locale)}/
                {t(dict, "estimator_period", "mo")}
              </div>
              <Link
                href={routeHref(APP_ROUTES.corporateTraining, locale, "#rfp")}
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
            <FadeIn as="h2" className="ecp-section-title">
              {t(dict, "how_title", "How It Works")}
            </FadeIn>
            <FadeIn as="p" className="ecp-section-subtitle" delay={0.1}>
              {t(dict, "how_subtitle", "Get started in three simple steps")}
            </FadeIn>
          </div>
          <div className="ecp-grid-steps">
            <Step
              n="1"
              title={t(dict, "how_step1_title", "Find your starting level.")}
              desc={t(
                dict,
                "how_step1_desc",
                "Share your goal and availability so your coach can prepare."
              )}
            />
            <Step
              n="2"
              title={t(dict, "how_step2_title", "Choose your format and pack.")}
              desc={t(
                dict,
                "how_step2_desc",
                "Pick one-on-one or small-group practice, then choose how far ahead you want to plan."
              )}
            />
            <Step
              n="3"
              title={t(dict, "how_step3_title", "Practise, review, move forward.")}
              desc={t(
                dict,
                "how_step3_desc",
                "Your coach follows your performance and confirms when you are ready for the next level."
              )}
            />
          </div>
        </div>
      </section>

      <PackageComparison
        key={isIndividual ? lessonType : tab}
        kind={isIndividual ? (isOneOnOne ? "individual" : "group") : "corporate"}
        plans={plans}
        locale={locale}
        prices={pricePreview.pricedPlans}
        loading={loading}
        ready={catalogReady}
      />

      {/* FAQ */}
      <section className="ecp__section ecp-faq">
        <div className="ecp__container ecp-card">
          <FadeIn as="h2" className="ecp-faq__title">
            {t(dict, "faq_title", "Frequently Asked Questions")}
          </FadeIn>
          <div className="ecp-faq__list">
            <Faq
              q={t(dict, "faq_progress_q", "Does 24 sessions guarantee that I finish a level?")}
              a={t(dict, "faq_progress_a", "No. Twenty-four sessions per level and 48 per stage are useful planning estimates, not guarantees. Your pace depends on your starting point, attendance, practice between sessions, and demonstrated progress. Your coach reviews this with you throughout the pack.")}
            />
            <Faq
              q={t(
                dict,
                "faq1_q",
                "Can I switch between one-on-one and group sessions?"
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
                "We match members with similar practice bands and learning goals to ensure productive, balanced sessions."
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
                href={getPrimaryConversionHref(locale)}
              >
                {t(dict, "cta_individual_primary", "Find my starting level")}
              </Link>
              <Link
                className="ecp-btn ecp-btn--ghost ecp-btn--lg"
                href="#packages-comparison"
              >
                {t(dict, "cta_individual_secondary", "View All Plans")}
              </Link>
            </div>
          ) : (
            <div className="ecp-cta__actions">
              <Link
                href={routeHref(APP_ROUTES.corporateTraining, locale, "#rfp")}
                className="ecp-btn ecp-btn--primary ecp-btn--lg"
              >
                {t(dict, "cta_corp_primary", "Request Proposal")}
              </Link>
              <Link
                className="ecp-btn ecp-btn--ghost ecp-btn--lg"
                href={routeHref(APP_ROUTES.corporateTraining, locale)}
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
function PricingCard({
  plan,
  audience,
  dict,
  locale,
  currency,
  countryCode,
  catalog,
  loading,
  catalogError,
}) {
  const {
    title,
    description,
    isPopular,
    sessionsPerPack,
    durationMin,
    savings,
  } = plan;

  const bullets = parseFeatures(plan.featuresRaw || "").slice(0, 8);
  const isCorp = audience === AUD.CORPORATE;
  const progressGuide = !isCorp
    ? getPackProgressGuide(sessionsPerPack, dict)
    : null;

  const { totalLabel, perSessionLabel } = getPlanPriceLabels(
    plan,
    countryCode,
    locale,
    dict
  );

  // inside function PricingCard({ plan, ... })
  const paymentRoute = APP_ROUTES.checkout;
  const canPurchase = !isCorp && !loading && !catalogError && isPurchaseReadyPlan(plan, catalog);
  // Pass planId (stable, locale-independent identifier) plus the English
  // backend title as a fallback for backward compatibility.
  const urlTitle = plan._backendTitle || plan.title;
  const target = canPurchase
    ? `${routeHref(paymentRoute, locale)}?planId=${encodeURIComponent(
      plan.id
    )}&plan=${encodeURIComponent(urlTitle)}&cc=${encodeURIComponent(
      countryCode || ""
    )}&cur=${encodeURIComponent(currency || "")}&region=${encodeURIComponent(
      plan.regionToken
    )}&packageId=${encodeURIComponent(plan.backendId)}`
    : null;
  const conversionTarget = getPrimaryConversionHref(locale, { planId: plan.id });

  return (
    <div
      id={`package-${plan.id}`}
      className={`ecp-card ecp-card--plan ${isPopular ? "is-popular" : ""}`}
    >
      {isPopular && (
        <div className="ecp-badge">
          {t(dict, "badge_most_popular", "MOST POPULAR")}
        </div>
      )}
      {savings && <div className="ecp-savings">{savings.toUpperCase()}</div>}

      <div className="ecp-card__head">
        {(!isPopular || !isCorp) && (
          <div className="ecp-card__eyebrow">
            {isCorp
              ? t(dict, "card_eyebrow_live", "Live practice")
              : t(dict, "card_eyebrow_level", "At your level")}
          </div>
        )}
        <div className="ecp-card__title">{title}</div>
        {sessionsPerPack && (
          <div className="ecp-card__sessions">
            {!isCorp ? (plan.id.startsWith("1on1-") ? t(dict, "card_format_1on1", "One-on-one coaching") : t(dict, "card_format_group", "Small-group coaching")) : <>{sessionsPerPack} {t(dict, "label_sessions", "sessions")}</>}
          </div>
        )}
      </div>

      {description && <p className="ecp-card__desc">{description}</p>}

      {progressGuide && (
        <div className="ecp-card__progress">
          <span>{t(dict, "card_progress_label", "Progress guide")}</span>
          <strong>{progressGuide}</strong>
        </div>
      )}

      <div className="ecp-card__price">
        <div className="ecp-card__value">{totalLabel}</div>
        {perSessionLabel && (
          <div className="ecp-card__sub">
            {perSessionLabel}/{t(dict, "label_per_session", "session")}
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
            <li key={i}>
              <span className="ecp-card__bullet-icon" aria-hidden="true">✓</span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="ecp-card__actions">
        {isCorp ? (
          <>
            <Link
              href={routeHref(APP_ROUTES.corporateTraining, locale, "#rfp")}
              className="ecp-btn ecp-btn--primary"
            >
              {t(dict, "cta_corp_card_primary", "Contact Sales")}
            </Link>
            <Link
              className="ecp-btn ecp-btn--ghost"
              href={routeHref(APP_ROUTES.corporateTraining, locale)}
            >
              {t(dict, "cta_corp_card_secondary", "Learn More")}
            </Link>
          </>
        ) : (
          <>
            {/* <Link
              WILL REVERT BACK TO THIS UPON PRODUCTION
              href={`${routeHref(APP_ROUTES.checkout, locale)}?plan=${encodeURIComponent(
                plan.title
              )}`}
              className="ecp-btn ecp-btn--primary"
            >
              {t(dict, "cta_buy_now", "Buy Now")}
            </Link> */}

            {target ? (
              <>
              <Link
                href={conversionTarget}
                className="ecp-btn ecp-btn--primary"
                aria-label={`${t(dict, "cta_start_free_session", "Start with a free session")} — ${title}`}
              >
                {t(dict, "cta_start_free_session", "Start with a free session")}
              </Link>
              <Link
                href={`${routeHref(APP_ROUTES.login, locale)}?next=${encodeURIComponent(target)}`}
                className="ecp-btn ecp-btn--ghost"
                aria-label={`${t(dict, "cta_after_free_session", "Already had your free session? Choose")} ${title}`}
              >
                {t(dict, "cta_after_free_session", "Already had your free session? Choose")} {title}
              </Link>
              </>
            ) : (
              <button
                type="button"
                className="ecp-btn ecp-btn--primary ecp-btn--disabled"
                disabled
                aria-label={`${t(dict, "cta_unavailable", "Unavailable")} ${title}`}
              >
                {loading
                  ? t(dict, "cta_loading", "Loading price…")
                  : t(dict, "cta_unavailable", "Unavailable")}
              </button>
            )}
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
  const id = useId();
  const panelId = `faq-${id.replace(/:/g, "")}`;
  return (
    <div className={`ecp-faq__item ${open ? "is-open" : ""}`}>
      <button
        className="ecp-faq__q"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
      >
        {q}
        <span className="ecp-faq__icon">{open ? "−" : "+"}</span>
      </button>
      <div
        id={panelId}
        className="ecp-faq__a"
        role="region"
        aria-hidden={!open}
      >
        {a}
      </div>
    </div>
  );
}

/* Plan Data (EGP base totals; shown in viewer currency via regional pricing) */
// const oneOnOnePlans = [
//   {
//     id: "1on1-4",
//     title: "Starter",
//     description: "Perfect for trying out personalized coaching",
//     priceEGP: 800,
//     durationMin: 60,
//     sessionsPerPack: 4,
//     priceType: "BUNDLE",
//     featuresRaw:
//       "Private 1:1 coaching\nFlexible scheduling\nPersonalized curriculum\nSession recordings\nEmail support",
//     isPopular: false,
//   },
//   {
//     id: "1on1-12",
//     title: "Professional",
//     description: "Build lasting skills with consistent practice",
//     priceEGP: 2200,
//     durationMin: 60,
//     sessionsPerPack: 12,
//     priceType: "BUNDLE",
//     featuresRaw:
//       "Private 1:1 coaching\nPriority scheduling\nCustom learning plan\nDetailed progress reports\nHomework & resources\nPronunciation analysis",
//     isPopular: false,
//     savings: "Save 8%",
//   },
//   {
//     id: "1on1-24",
//     title: "Intensive",
//     description: "Accelerate your progress with deep practice",
//     priceEGP: 3800,
//     durationMin: 60,
//     sessionsPerPack: 24,
//     priceType: "BUNDLE",
//     featuresRaw:
//       "Private 1:1 coaching\nPriority scheduling\nAdvanced curriculum\nWeekly progress calls\nMock interviews\nIndustry-specific content\nUnlimited email support",
//     isPopular: true,
//     savings: "Save 13%",
//   },
//   {
//     id: "1on1-48",
//     title: "Master",
//     description: "Maximum commitment for transformation",
//     priceEGP: 6800,
//     durationMin: 60,
//     sessionsPerPack: 48,
//     priceType: "BUNDLE",
//     featuresRaw:
//       "Private 1:1 coaching\nDedicated coach\nBi-weekly strategy sessions\nComprehensive assessments\nCareer coaching\nNetworking practice\nLifetime resource access\n24/7 support",
//     isPopular: false,
//     savings: "Save 20%",
//   },
// ];

// const groupPlans = [
//   {
//     id: "group-4",
//     title: "Group Starter",
//     description: "Learn together in a small, focused group",
//     priceEGP: 600,
//     durationMin: 90,
//     sessionsPerPack: 4,
//     priceType: "BUNDLE",
//     featuresRaw:
//       "Small groups (2-5 learners)\nLevel-matched peers\nInteractive exercises\nGroup activities\nShared resources",
//     isPopular: false,
//   },
//   {
//     id: "group-12",
//     title: "Group Professional",
//     description: "Consistent group practice for steady growth",
//     priceEGP: 1600,
//     durationMin: 90,
//     sessionsPerPack: 12,
//     priceType: "BUNDLE",
//     featuresRaw:
//       "Small groups (2-5 learners)\nCarefully matched groups\nRole-play scenarios\nPeer feedback sessions\nMonthly assessments\nDigital workbook",
//     isPopular: true,
//     savings: "Save 13%",
//   },
//   {
//     id: "group-24",
//     title: "Group Intensive",
//     description: "Immersive collaborative learning experience",
//     priceEGP: 2800,
//     durationMin: 90,
//     sessionsPerPack: 24,
//     priceType: "BUNDLE",
//     featuresRaw:
//       "Small groups (2-5 learners)\nStable learning cohort\nReal-world simulations\nGroup projects\nPeer presentations\nProgress tracking\nExtended resources",
//     isPopular: false,
//     savings: "Save 20%",
//   },
//   {
//     id: "group-48",
//     title: "Group Master",
//     description: "Complete transformation through group dynamics",
//     priceEGP: 5000,
//     durationMin: 90,
//     sessionsPerPack: 48,
//     priceType: "BUNDLE",
//     featuresRaw:
//       "Small groups (2-5 learners)\nDedicated cohort\nAdvanced workshops\nGuest speaker sessions\nCommunity access\nCertificate of completion\nLifetime alumni network\nOngoing support",
//     isPopular: false,
//     savings: "Save 28%",
//   },
// ];

// const corporatePlans = [
//   {
//     id: "corp-pilot",
//     title: "Pilot Program",
//     description: "Test and validate with a small team cohort",
//     priceType: "CUSTOM",
//     startingAtUSD: null,
//     featuresRaw:
//       "5-15 employees\nMixed 1:1 and group format\nNeeds assessment\n8-12 week program\nKickoff workshop\nEnd-of-program report\nManager briefings",
//     isPopular: false,
//   },
//   {
//     id: "corp-team",
//     title: "Team Program",
//     description: "Comprehensive training for growing teams",
//     priceType: "CUSTOM",
//     startingAtUSD: null,
//     featuresRaw:
//       "15-50 employees\nFlexible delivery formats\nCustom curriculum design\nQuarterly assessments\nDedicated program manager\nMonthly reporting dashboard\nInvoicing & PO support\nSSO integration",
//     isPopular: true,
//   },
//   {
//     id: "corp-enterprise",
//     title: "Enterprise Solution",
//     description: "Scaled language training with full support",
//     priceType: "CUSTOM",
//     startingAtUSD: null,
//     featuresRaw:
//       "50+ employees\nMulti-location rollout\nDedicated Customer Success Manager\nExecutive dashboards\nAPI integration\nSecurity & compliance review\nCustom reporting\nQuarterly business reviews\n24/7 support\nROI analysis",
//     isPopular: false,
//   },
//   {
//     id: "global-enterprise",
//     title: "Global Enterprise",
//     description:
//       "Worldwide language training with enterprise-grade scalability",
//     priceType: "CUSTOM",
//     startingAtUSD: null,
//     featuresRaw:
//       "100+ employees\nGlobal multi-region deployment\n24/7 multilingual support\nDedicated Enterprise Success Director\nAdvanced analytics & insights\nCustom integrations (HRIS, LMS, SSO)\nRegulatory & data compliance (GDPR, SOC2)\nROI & performance benchmarking\nAnnual strategic partnership review\nTailored executive workshops",
//     isPopular: false,
//   },
// ];

export default Packages;
