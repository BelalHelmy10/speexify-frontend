"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Building2, Check, Users } from "lucide-react";
import "@/styles/home.scss";

import { getDictionary, t } from "./i18n"; // ✅ i18n
import FadeIn from "@/components/FadeIn";
import { detectUserCountry } from "@/lib/geo";
import { oneOnOnePlans } from "@/lib/plans";
import { getPricingRegion } from "@/lib/pricing-regions";
import {
  calculatePackagePrice,
  calculatePerSessionPrice,
  formatRegionalPrice,
} from "@/lib/regional-pricing";
import { APP_ROUTES, routeHref } from "@/lib/routes";

const MARKETING_IMAGE_VERSION = "20260519";
const marketingImage = (src) => `${src}?v=${MARKETING_IMAGE_VERSION}`;
const DEFAULT_COUNTRY_CODE = "EG";
const PAYMENT_MODE = process.env.NEXT_PUBLIC_PAYMENT_MODE || "manual";
const HOME_PRICING_PLAN_IDS = ["1on1-4", "1on1-12", "1on1-24"];

export default function HomePageContent({ locale = "en" }) {
  return <Home locale={locale} />;
}

/* ============================
   Scroll reveal observer hook
   ============================ */
function useSectionObserver() {
  useEffect(() => {
    const els = document.querySelectorAll("[data-reveal]");
    if (!els.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" },
    );

    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}

/* ============================
   Home
   ============================ */
function Home({ locale = "en" }) {
  const dict = getDictionary(locale, "home");
  useSectionObserver();

  const scrollToPricing = useCallback(({ behavior = "smooth" } = {}) => {
    const pricingSection = document.getElementById("home-pricing");
    if (!pricingSection) return false;

    const headerOffset = 112;
    const targetTop =
      pricingSection.getBoundingClientRect().top + window.scrollY - headerOffset;

    window.scrollTo({
      top: Math.max(0, targetTop),
      behavior,
    });
    document.body.classList.add("spx-pricing-in-view");

    return true;
  }, []);

  useEffect(() => {
    if (window.location.hash !== "#home-pricing") return undefined;

    const timer = window.setTimeout(() => {
      scrollToPricing({ behavior: "auto" });
    }, 50);

    return () => window.clearTimeout(timer);
  }, [scrollToPricing]);

  useEffect(() => {
    const updatePricingVisibility = () => {
      const pricingSection = document.getElementById("home-pricing");
      if (!pricingSection) return;

      const rect = pricingSection.getBoundingClientRect();
      const pricingInView =
        rect.top < window.innerHeight - 80 && rect.bottom > 160;

      document.body.classList.toggle("spx-pricing-in-view", pricingInView);
    };

    updatePricingVisibility();
    window.addEventListener("scroll", updatePricingVisibility, { passive: true });
    window.addEventListener("resize", updatePricingVisibility);

    return () => {
      window.removeEventListener("scroll", updatePricingVisibility);
      window.removeEventListener("resize", updatePricingVisibility);
      document.body.classList.remove("spx-pricing-in-view");
    };
  }, []);

  const handlePricingJump = (event) => {
    if (scrollToPricing()) {
      event.preventDefault();
      window.history.pushState(null, "", "#home-pricing");
    }
  };

  return (
    <div className="home-home">
      {/* ===== HERO ===== */}
      <section className="home-hero">
        <div className="home-hero__background">
          <div className="home-hero__gradient"></div>
          <div className="home-hero__grid-pattern"></div>
        </div>

        <div className="home-hero__grid home-container">
          <div className="home-hero__copy">
            <FadeIn as="div" className="home-hero__badge" delay={0.1}>
              <span className="home-hero__badge-icon" aria-hidden="true">
                <svg
                  className="home-hero__speech-burst"
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    className="home-hero__speech-bubble"
                    d="M4.3 9.35c0-2.68 2.28-4.72 5.36-4.72h.68c3.08 0 5.36 2.04 5.36 4.72s-2.28 4.72-5.36 4.72h-.56l-3.43 1.56.66-2.38C5.36 12.42 4.3 11 4.3 9.35Z"
                    fill="currentColor"
                    fillOpacity="0.12"
                    stroke="currentColor"
                    strokeWidth="1.35"
                    strokeLinejoin="round"
                  />
                  <path
                    className="home-hero__speech-wave"
                    d="M7.35 9.85v-1M10 11.05V7.7M12.65 10.2V8.5"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                  />
                  <path
                    className="home-hero__speech-accent"
                    d="M2.9 8.55c.24-1.16.92-2.14 1.92-2.8M17.1 8.55c-.24-1.16-.92-2.14-1.92-2.8"
                    stroke="currentColor"
                    strokeWidth="1.35"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              <span>{t(dict, "badge")}</span>
            </FadeIn>

            <FadeIn as="h1" className="home-hero__title" delay={0.2}>
              {t(dict, "title_main")}
              <span className="home-hero__title-accent">
                {t(dict, "title_accent")}
              </span>
            </FadeIn>

            <FadeIn as="p" className="home-hero__sub" delay={0.3}>
              {t(dict, "subtitle")}
            </FadeIn>

            <FadeIn as="div" className="home-hero__cta" delay={0.4}>
              <Link
                className="spx-btn spx-btn--primary spx-btn--shine"
                href={routeHref(APP_ROUTES.register, locale)}
              >
                <span>{t(dict, "ctaPrimary")}</span>
                <svg
                  className="spx-btn__arrow"
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M6 3L11 8L6 13"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Link>
              <a
                className="spx-btn spx-btn--ghost-navy"
                href={routeHref(APP_ROUTES.home, locale, "#home-pricing")}
                onClick={handlePricingJump}
              >
                {t(dict, "ctaSecondary")}
              </a>
            </FadeIn>
          </div>

          <div className="home-hero__media">
            <div className="home-media-card">
              <div className="home-media-card__glow"></div>
              <Image
                src="/images/home-hero-clean.webp"
                alt="Learner practicing live English coaching on Speexify"
                className="home-media-card__img"
                width={1920}
                height={1920}
                priority
                unoptimized
                sizes="(max-width: 768px) 92vw, (max-width: 1200px) 46vw, 620px"
              />
              <div className="home-media-card__float home-media-card__float--1">
                <div className="home-float-badge home-float-badge--live">
                  <span className="home-float-badge__icon" aria-hidden="true">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M2 3.5C2 2.67 2.67 2 3.5 2h9C13.33 2 14 2.67 14 3.5v6c0 .83-.67 1.5-1.5 1.5H8L4.5 13V11H3.5C2.67 11 2 10.33 2 9.5v-6Z"
                        stroke="currentColor"
                        strokeWidth="1.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M5 6h6M5 8.5h3.5"
                        stroke="currentColor"
                        strokeWidth="1.4"
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className="home-float-badge__dot"></span>
                  </span>
                  <span className="home-float-badge__text">
                    {t(dict, "float_live_coaching")}
                  </span>
                  <span className="home-float-badge__reveal" aria-hidden="true">
                    <span className="home-float-badge__reveal-inner">
                      <span className="home-float-badge__eq">
                        <i style={{ "--i": 0 }}></i>
                        <i style={{ "--i": 1 }}></i>
                        <i style={{ "--i": 2 }}></i>
                        <i style={{ "--i": 3 }}></i>
                        <i style={{ "--i": 4 }}></i>
                      </span>
                    </span>
                  </span>
                </div>
              </div>
              <div className="home-media-card__float home-media-card__float--2">
                <div className="home-float-badge home-float-badge--feedback">
                  <span className="home-float-badge__icon" aria-hidden="true">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M9.5 2L4 9h4.5L7.5 14l6-7H9l.5-5Z"
                        stroke="currentColor"
                        strokeWidth="1.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                  <span className="home-float-badge__text">
                    {t(dict, "float_instant_feedback")}
                  </span>
                  <span className="home-float-badge__reveal" aria-hidden="true">
                    <span className="home-float-badge__reveal-inner">
                      <span className="home-float-badge__wave">
                        <i style={{ "--i": 0 }}></i>
                        <i style={{ "--i": 1 }}></i>
                        <i style={{ "--i": 2 }}></i>
                        <i style={{ "--i": 3 }}></i>
                        <i style={{ "--i": 4 }}></i>
                        <span className="home-float-badge__scan"></span>
                      </span>
                      <svg
                        className="home-float-badge__check"
                        viewBox="0 0 16 16"
                        fill="none"
                        aria-hidden="true"
                      >
                        <path
                          d="M3.5 8.5L6.5 11.5L12.5 4.5"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          <FadeIn as="div" className="home-hero__stats" delay={0.6}>
            <div className="home-hero__stat">
              <div className="home-hero__stat-num">
                {t(dict, "hero_stat1_num")}
              </div>
              <div className="home-hero__stat-label">
                {t(dict, "hero_stat1_label")}
              </div>
            </div>
            <div className="home-hero__stat">
              <div className="home-hero__stat-num">
                {t(dict, "hero_stat2_num")}
              </div>
              <div className="home-hero__stat-label">
                {t(dict, "hero_stat2_label")}
              </div>
            </div>
            <div className="home-hero__stat">
              <div className="home-hero__stat-num">
                {t(dict, "hero_stat3_num")}
              </div>
              <div className="home-hero__stat-label">
                {t(dict, "hero_stat3_label")}
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ===== LIVE SESSION DEMO ===== */}
      <LiveSessionDemo />

      {/* ===== FEATURES ===== */}
      <FeaturesSection dict={dict} />

      {/* ===== HOW IT WORKS ===== */}
      <HowItWorksSection dict={dict} locale={locale} />

      {/* ===== CURRICULUM ===== */}
      <section className="home-spx-curriculum">
        <div className="home-container">
          <div className="home-section-header">
            <FadeIn as="h2" className="home-section-title" blur={false}>
              {t(dict, "curr_title")}
            </FadeIn>
            <FadeIn
              as="p"
              className="home-section-subtitle"
              delay={0.1}
              blur={false}
            >
              {t(dict, "curr_subtitle")}
            </FadeIn>
          </div>

          <div className="home-spx-curriculum__grid">
            <CurriculumCard
              title={t(dict, "curr1_title")}
              desc={t(dict, "curr1_desc")}
              img={marketingImage("/images/curr-conversations.png")}
              color="blue"
            />
            <CurriculumCard
              title={t(dict, "curr2_title")}
              desc={t(dict, "curr2_desc")}
              img={marketingImage("/images/curr-presentations.png")}
              color="purple"
            />
            <CurriculumCard
              title={t(dict, "curr3_title")}
              desc={t(dict, "curr3_desc")}
              img={marketingImage("/images/curr-writing.png")}
              color="green"
            />
            <CurriculumCard
              title={t(dict, "curr4_title")}
              desc={t(dict, "curr4_desc")}
              img={marketingImage("/images/curr-leadership.png")}
              color="orange"
            />
          </div>

          <div className="home-spx-curriculum__more">
            <Link
              className="spx-btn spx-btn--ghost-navy"
              href={routeHref(APP_ROUTES.packages, locale)}
            >
              {t(dict, "curr_more")}
            </Link>
          </div>
        </div>
      </section>

      {/* ===== PRODUCT DEMO ===== */}
      <ProductDemoSection dict={dict} />

      {/* ===== COACHES ===== */}
      <section className="home-spx-coaches">
        <div className="home-container">
          <div className="home-section-header">
            <span className="home-spx-coaches__label">
              {t(dict, "coaches_label")}
            </span>
            <h2 className="home-section-title">{t(dict, "coaches_title")}</h2>
            <p className="home-section-subtitle">
              {t(dict, "coaches_subtitle")}
            </p>
          </div>

          <div className="home-spx-coaches__grid">
            <CoachCard
              name={t(dict, "coach1_name")}
              role={t(dict, "coach1_role")}
              bio={t(dict, "coach1_bio")}
              img="/images/Billy.jpeg"
              index={0}
            />
            <CoachCard
              name={t(dict, "coach2_name")}
              role={t(dict, "coach2_role")}
              bio={t(dict, "coach2_bio")}
              img="/images/ZiadAnwer.jpeg"
              index={1}
            />
            <CoachCard
              name={t(dict, "coach3_name")}
              role={t(dict, "coach3_role")}
              bio={t(dict, "coach3_bio")}
              img="/images/Lina.avif"
              index={2}
            />
          </div>


        </div>
      </section>

      {/* ===== COMPARISON TABLE ===== */}
      <ComparisonSection dict={dict} />

      {/* ===== TRANSFORMATION DEMO ===== */}
      <TransformationDemo dict={dict} locale={locale} />

      {/* ===== PRICING ===== */}
      <PricingSection dict={dict} locale={locale} />

      {/* ===== TESTIMONIALS ===== */}
      <TestimonialsCarousel dict={dict} locale={locale} />

      {/* ===== FAQ ===== */}
      <section className="home-spx-faq">
        <div className="home-container">
          <div className="home-section-header">
            <h2 className="home-section-title">{t(dict, "faq_title")}</h2>
            <p className="home-section-subtitle">{t(dict, "faq_subtitle")}</p>
          </div>

          <div className="home-spx-faq__grid">
            <details className="home-spx-faq__item">
              <summary>{t(dict, "faq1_q")}</summary>
              <p>{t(dict, "faq1_a")}</p>
            </details>
            <details className="home-spx-faq__item">
              <summary>{t(dict, "faq2_q")}</summary>
              <p>{t(dict, "faq2_a")}</p>
            </details>
            <details className="home-spx-faq__item">
              <summary>{t(dict, "faq3_q")}</summary>
              <p>{t(dict, "faq3_a")}</p>
            </details>
            <details className="home-spx-faq__item">
              <summary>{t(dict, "faq4_q")}</summary>
              <p>{t(dict, "faq4_a")}</p>
            </details>
          </div>
        </div>
      </section>

      {/* ===== NEWSLETTER ===== */}
      <section className="home-spx-newsletter">
        <div className="home-container">
          <div className="home-spx-newsletter__inner">
            <div className="home-spx-newsletter__copy">
              <h3>{t(dict, "newsletter_title")}</h3>
              <p>{t(dict, "newsletter_sub")}</p>
            </div>
            <form
              className="home-spx-newsletter__form"
              onSubmit={(e) => e.preventDefault()}
            >
              <input
                type="email"
                placeholder={t(dict, "newsletter_placeholder")}
                aria-label="Email"
                className="home-spx-newsletter__input"
              />
              <button className="spx-btn spx-btn--primary" type="submit">
                {t(dict, "newsletter_button")}
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="home-cta">
        <div className="home-cta__background">
          <div className="home-cta__gradient"></div>
          <div className="home-cta__shapes">
            <div className="home-cta__shape home-cta__shape--1"></div>
            <div className="home-cta__shape home-cta__shape--2"></div>
          </div>
        </div>

        <div className="home-cta__inner">
          <h2 className="home-cta__title">{t(dict, "cta_title")}</h2>
          <p className="home-cta__sub">{t(dict, "cta_sub")}</p>
          <div className="home-cta__actions">
            <Link
              className="spx-btn spx-btn--primary spx-btn--lg"
              href={routeHref(APP_ROUTES.register, locale)}
            >
              <span>{t(dict, "cta_primary")}</span>
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M6 3L11 8L6 13"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
            <Link
              className="spx-btn spx-btn--ghost-white spx-btn--lg"
              href={routeHref(APP_ROUTES.contact, locale)}
            >
              {t(dict, "cta_secondary")}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ========== Local UI bits ========== */

function parsePlanFeatures(raw) {
  if (!raw) return [];
  return String(raw)
    .split(/\r?\n|;|,/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

function getHomePlanPriceLabels(plan, countryCode, locale) {
  const resolvedCountry = countryCode || DEFAULT_COUNTRY_CODE;
  const regionalPrice = calculatePackagePrice(plan, resolvedCountry);
  const perSessionPrice = calculatePerSessionPrice(plan, resolvedCountry);

  return {
    regionalPrice,
    perSessionPrice,
    totalLabel:
      regionalPrice?.displayAmount > 0
        ? formatRegionalPrice(regionalPrice, locale)
        : "Custom",
    perSessionLabel:
      perSessionPrice?.displayAmount > 0
        ? formatRegionalPrice(perSessionPrice, locale)
        : null,
  };
}

function buildPlanStartHref(plan, locale, countryCode) {
  const resolvedCountry = countryCode || DEFAULT_COUNTRY_CODE;
  const currency = getPricingRegion(resolvedCountry).currency;
  const paymentRoute =
    PAYMENT_MODE === "paymob" ? APP_ROUTES.checkout : APP_ROUTES.manualPayment;
  const paymentTarget = `${routeHref(paymentRoute, locale)}?planId=${encodeURIComponent(
    plan.id,
  )}&plan=${encodeURIComponent(
    plan._backendTitle || plan.title,
  )}&cc=${encodeURIComponent(resolvedCountry)}&cur=${encodeURIComponent(
    currency,
  )}`;

  return `${routeHref(APP_ROUTES.register, locale)}?next=${encodeURIComponent(
    paymentTarget,
  )}`;
}

function PricingSection({ dict, locale }) {
  const [countryCode, setCountryCode] = useState(DEFAULT_COUNTRY_CODE);
  const packageDict = useMemo(() => getDictionary(locale, "packages"), [locale]);

  useEffect(() => {
    let isMounted = true;

    detectUserCountry()
      .then((detectedCountry) => {
        if (isMounted && detectedCountry) {
          setCountryCode(detectedCountry);
        }
      })
      .catch(() => {
        // Keep the safe EGP default if geo detection is unavailable.
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const plans = useMemo(
    () =>
      HOME_PRICING_PLAN_IDS.map((id) =>
        oneOnOnePlans.find((plan) => plan.id === id),
      )
        .filter(Boolean)
        .map((plan) => ({
          ...plan,
          _backendTitle: plan.title,
          title: packageDict[`plan_${plan.id}_title`] || plan.title,
          description: packageDict[`plan_${plan.id}_desc`] || plan.description,
          featuresRaw: packageDict[`plan_${plan.id}_features`] || plan.featuresRaw,
        })),
    [packageDict],
  );

  const pricedPlans = useMemo(
    () =>
      plans.map((plan) => ({
        plan,
        features: parsePlanFeatures(plan.featuresRaw).slice(0, 3),
        ...getHomePlanPriceLabels(plan, countryCode, locale),
      })),
    [countryCode, locale, plans],
  );

  const lowestPerSession = pricedPlans.reduce((best, item) => {
    if (!item.perSessionPrice?.displayAmount) return best;
    if (!best) return item;
    return item.perSessionPrice.displayAmount < best.perSessionPrice.displayAmount
      ? item
      : best;
  }, null);

  const region = getPricingRegion(countryCode);

  return (
    <section className="home-pricing" id="home-pricing">
      <div className="home-container">
        <div className="home-pricing__shell">
          <div className="home-pricing__intro">
            <p className="home-pricing__eyebrow">
              {t(dict, "pricing_eyebrow")}
            </p>
            <h2 className="home-section-title">{t(dict, "pricing_title")}</h2>
            <p className="home-section-subtitle home-pricing__subtitle">
              {t(dict, "pricing_subtitle")}
            </p>

            <div className="home-pricing__from">
              <span>{t(dict, "pricing_from_label")}</span>
              <strong>
                {lowestPerSession?.perSessionLabel}/
                {t(dict, "pricing_per_session")}
              </strong>
              <small>{t(dict, "pricing_from_hint")}</small>
            </div>

            <div
              className="home-pricing__trust"
              aria-label={t(dict, "pricing_trust_label")}
            >
              <span>
                <Check size={16} aria-hidden="true" />
                {t(dict, "pricing_trust_1")}
              </span>
              <span>
                <Check size={16} aria-hidden="true" />
                {t(dict, "pricing_trust_2")}
              </span>
              <span>
                <Check size={16} aria-hidden="true" />
                {t(dict, "pricing_trust_3")}
              </span>
            </div>
          </div>

          <div
            className="home-pricing__cards"
            aria-label={t(dict, "pricing_cards_label")}
          >
            {pricedPlans.map((item) => (
              <article
                className={`home-price-card${
                  item.plan.isPopular ? " home-price-card--featured" : ""
                }`}
                key={item.plan.id}
              >
                {item.plan.isPopular && (
                  <div className="home-price-card__badge">
                    {t(dict, "pricing_popular")}
                  </div>
                )}

                <div className="home-price-card__top">
                  <span className="home-price-card__sessions">
                    {item.plan.sessionsPerPack} {t(dict, "pricing_sessions")}
                  </span>
                  {item.plan.savings && (
                    <span className="home-price-card__savings">
                      {item.plan.savings}
                    </span>
                  )}
                </div>

                <h3>{item.plan.title}</h3>
                <p className="home-price-card__desc">{item.plan.description}</p>

                <div className="home-price-card__price">
                  <strong>{item.totalLabel}</strong>
                  {item.perSessionLabel && (
                    <span>
                      {item.perSessionLabel}/{t(dict, "pricing_per_session")}
                    </span>
                  )}
                </div>

                <ul className="home-price-card__features">
                  {item.features.map((feature) => (
                    <li key={feature}>
                      <Check size={15} aria-hidden="true" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  className="home-price-card__button"
                  href={buildPlanStartHref(item.plan, locale, countryCode)}
                >
                  <span>{t(dict, "pricing_card_cta")}</span>
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
              </article>
            ))}
          </div>
        </div>

        <div className="home-pricing__footer">
          <div className="home-pricing__region">
            {t(dict, "pricing_region_note", {
              currency: region.currency,
              region: region.name,
            })}
          </div>
          <Link
            className="home-pricing__all-link"
            href={routeHref(APP_ROUTES.packages, locale)}
          >
            <span>{t(dict, "pricing_all_packages")}</span>
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>

        <div className="home-pricing__team">
          <div className="home-pricing__team-icon" aria-hidden="true">
            <Building2 size={22} />
          </div>
          <div>
            <p className="home-pricing__team-label">
              {t(dict, "pricing_team_label")}
            </p>
            <h3>{t(dict, "pricing_team_title")}</h3>
            <p>{t(dict, "pricing_team_text")}</p>
          </div>
          <Link
            className="home-pricing__team-link"
            href={routeHref(APP_ROUTES.corporateTraining, locale, "#rfp")}
          >
            <Users size={16} aria-hidden="true" />
            <span>{t(dict, "pricing_team_cta")}</span>
          </Link>
        </div>
      </div>
    </section>
  );
}

function FeaturesSection({ dict }) {
  const scenarios = [
    "The meeting you've been avoiding.",
    "The interview next Tuesday.",
    "The call you usually mute.",
  ];

  const bars = [
    { h: "30%", active: false },
    { h: "40%", active: false },
    { h: "35%", active: false },
    { h: "55%", active: true },
    { h: "70%", active: true },
    { h: "85%", active: true },
    { h: "100%", active: true },
  ];

  const smallCards = [
    {
      num: t(dict, "bento_num_02"),
      tone: "amber",
      icon: (
        <svg
          width="26"
          height="26"
          viewBox="0 0 26 26"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M9 3.5h8v7a4 4 0 0 1-8 0v-7Z" />
          <path d="M9 6.5H6a2.5 2.5 0 0 0 0 5h3M17 6.5h3a2.5 2.5 0 0 1 0 5h-3" />
          <path d="M13 14.5v4M9.5 18.5h7" />
        </svg>
      ),
      title: t(dict, "feature2_title") || "We measure the meeting, not the streak.",
      text:
        t(dict, "feature2_text") ||
        "No vanity streaks. No daily-goal guilt. We track the meeting you led. The interview you landed. The call you stopped dreading.",
    },
    {
      num: t(dict, "bento_num_03"),
      tone: "indigo",
      icon: (
        <svg
          width="26"
          height="26"
          viewBox="0 0 26 26"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="3.5" y="5" width="19" height="17" rx="2.5" />
          <path d="M3.5 10h19M9 3.5v3M17 3.5v3" />
          <path d="M9.5 15l2.5 2.5 5-5" />
        </svg>
      ),
      title: t(dict, "feature3_title") || "Show up when you can.",
      text:
        t(dict, "feature3_text") ||
        "Sessions when you're ready, not when a course tells you to be ready. Reschedule. Pause. Come back. Your spot stays.",
    },
    {
      num: t(dict, "bento_num_04"),
      tone: "navy",
      icon: (
        <svg
          width="26"
          height="26"
          viewBox="0 0 26 26"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M14 3.5L6 14.5h7l-1 8 8-11h-7l2-8Z" />
        </svg>
      ),
      title: t(dict, "feature4_title") || "Built around you, not a syllabus.",
      text:
        t(dict, "feature4_text") ||
        "Prepping for an interview next week? Leading your first meeting in English next month? Your practice plan starts from your real life, not a textbook.",
    },
  ];

  return (
    <section className="home-features">
      <div className="home-container">
        <div className="home-section-header home-features__header">
          <span className="home-features__eyebrow" aria-hidden="true">
            {t(dict, "features_eyebrow")}
          </span>
          <FadeIn as="h2" className="home-section-title home-features__title">
            {t(dict, "features_title") || (
              <>
                It&apos;s not a course.
                <br />
                It&apos;s a practice ground.
              </>
            )}
          </FadeIn>
          <FadeIn
            as="p"
            className="home-section-subtitle home-features__subtitle"
            delay={0.1}
          >
            {t(dict, "features_subtitle") ||
              "You've already tried the apps. You've already sat through the classrooms. They taught you the language. Speexify is where you finally use it."}
          </FadeIn>
        </div>

        {/* ── Bento grid ── */}
        <div className="home-bento">
          {/* Wide hero card */}
          <div
            className="home-bento__card home-bento__card--wide home-bento__card--coral"
            data-reveal
          >
            <div className="home-bento__wide-inner">
              <div className="home-bento__wide-copy">
                <span className="home-bento__tag">
                  {t(dict, "bento_tag_core")}
                </span>
                <div
                  className="home-bento__icon home-bento__icon--coral"
                  aria-hidden="true"
                >
                  <svg
                    width="26"
                    height="26"
                    viewBox="0 0 26 26"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M4 5.5C4 4.4 4.9 3.5 6 3.5h14c1.1 0 2 .9 2 2v9c0 1.1-.9 2-2 2h-7l-5 3.5V16.5H6c-1.1 0-2-.9-2-2v-9Z" />
                    <path d="M9 9.5h8M9 13h5" />
                  </svg>
                </div>
                <h3 className="home-bento__title">
                  {t(dict, "feature1_title") || "Reps, not lessons."}
                </h3>
                <p className="home-bento__text">
                  {t(dict, "feature1_text") ||
                    "Every session is a real conversation with a coach who knows your goals, your work, your voice. No drills. No scripts. No 'repeat after me.' Just the reps you actually need."}
                </p>
              </div>

              {/* Scenario chips */}
              <div className="home-bento__chips">
                {scenarios.map((s, i) => (
                  <div key={i} className="home-bento__chip">
                    {s}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Narrow stat card */}
          <div
            className="home-bento__card home-bento__card--narrow home-bento__card--teal"
            data-reveal
            style={{ "--reveal-delay": "80" }}
          >
            <span className="home-bento__tag">
              {t(dict, "bento_tag_outcome")}
            </span>
            <div className="home-bento__stat">2.7×</div>
            <h3 className="home-bento__title">{t(dict, "bento_stat_title")}</h3>
            <p className="home-bento__text">{t(dict, "bento_stat_text")}</p>
            <div className="home-bento__minichart">
              {bars.map((b, i) => (
                <div
                  key={i}
                  className={`home-bento__bar${b.active ? " home-bento__bar--active" : ""}`}
                  style={{ height: b.h }}
                />
              ))}
            </div>
          </div>

          {/* Three small cards */}
          {smallCards.map((c, i) => (
            <div
              key={i}
              className={`home-bento__card home-bento__card--third home-bento__card--${c.tone}`}
              data-reveal
              style={{ "--reveal-delay": `${(i + 2) * 100}` }}
            >
              <span className="home-bento__tag">{c.num}</span>
              <div
                className={`home-bento__icon home-bento__icon--${c.tone}`}
                aria-hidden="true"
              >
                {c.icon}
              </div>
              <h3 className="home-bento__title">{c.title}</h3>
              <p className="home-bento__text">{c.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Feature({ icon, title, text, tone, index }) {
  return (
    <div
      className={`home-feature home-feature--${tone}`}
      style={{ "--card-index": index, "--reveal-delay": index * 100 }}
      data-reveal
    >
      <div className="home-feature__accent-bar" aria-hidden="true" />

      <div className="home-feature__top">
        <div className="home-feature__icon" aria-hidden="true">
          <FeatureIcon icon={icon} />
        </div>
        <span className="home-feature__num" aria-hidden="true">
          0{index + 1}
        </span>
      </div>

      <div className="home-feature__content">
        <h3 className="home-feature__title">{title}</h3>
        <p className="home-feature__text">{text}</p>
      </div>

      <div className="home-feature__footer">
        <span className="home-feature__arrow" aria-hidden="true">
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M3 8h10M9 4l4 4-4 4"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </div>
    </div>
  );
}

function FeatureIcon({ icon }) {
  const base = {
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    width: "26",
    height: "26",
    viewBox: "0 0 26 26",
    "aria-hidden": "true",
  };

  // Chat bubble — "Real conversations"
  if (icon === "chat") {
    return (
      <svg {...base} strokeWidth="1.7">
        <path d="M4 5.5C4 4.4 4.9 3.5 6 3.5h14c1.1 0 2 .9 2 2v9c0 1.1-.9 2-2 2h-7l-5 3.5V16.5H6c-1.1 0-2-.9-2-2v-9Z" />
        <path d="M9 9.5h8M9 13h5" />
      </svg>
    );
  }

  // Trophy cup — "Outcome-obsessed"
  if (icon === "trophy") {
    return (
      <svg {...base} strokeWidth="1.7">
        <path d="M9 3.5h8v7a4 4 0 0 1-8 0v-7Z" />
        <path d="M9 6.5H6a2.5 2.5 0 0 0 0 5h3M17 6.5h3a2.5 2.5 0 0 1 0 5h-3" />
        <path d="M13 14.5v4M9.5 18.5h7" />
      </svg>
    );
  }

  // Calendar with checkmark — "Flexible & measurable"
  if (icon === "calendar") {
    return (
      <svg {...base} strokeWidth="1.7">
        <rect x="3.5" y="5" width="19" height="17" rx="2.5" />
        <path d="M3.5 10h19M9 3.5v3M17 3.5v3" />
        <path d="M9.5 15l2.5 2.5 5-5" />
      </svg>
    );
  }

  // Lightning bolt — "For you, on your terms"
  return (
    <svg {...base} strokeWidth="1.7">
      <path d="M14.5 3.5L6 14.5h7L11.5 22.5l9-11h-7l1-8Z" />
    </svg>
  );
}

function Quote({ quote, author, role, rating }) {
  return (
    <figure className="home-quote">
      <div className="home-quote__top">
        <div
          className="home-quote__stars"
          role="img"
          aria-label={`${rating} out of 5 stars`}
        >
          {Array.from({ length: rating }).map((_, i) => (
            <svg
              key={i}
              className="home-quote__star"
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M7 1.5l1.545 3.13 3.455.503-2.5 2.436.59 3.44L7 9.25l-3.09 1.759.59-3.44L2 5.133l3.455-.503L7 1.5Z"
                fill="currentColor"
              />
            </svg>
          ))}
        </div>
        <svg
          className="home-quote__mark"
          width="24"
          height="18"
          viewBox="0 0 24 18"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M0 18V10.8C0 4.68 3.36.72 10.08 0l1.44 2.16C8.16 3.12 6.24 5.28 5.76 8.4H10.08V18H0ZM13.92 18V10.8C13.92 4.68 17.28.72 24 0l1.44 2.16C22.08 3.12 20.16 5.28 19.68 8.4H24V18H13.92Z"
            fill="currentColor"
            opacity="0.12"
          />
        </svg>
      </div>
      <blockquote>{quote}</blockquote>
      <figcaption>
        <strong>{author}</strong>
        <span>{role}</span>
      </figcaption>
    </figure>
  );
}

function HowStep({ step, title, text, img }) {
  return (
    <div className="home-spx-how__card">
      <div className="home-spx-how__media">
        <Image
          src={img}
          alt=""
          width={600}
          height={400}
          style={{ objectFit: "cover" }}
        />
        <span className="home-spx-how__badge">{step}</span>
      </div>
      <div className="home-spx-how__body">
        <h3>{title}</h3>
        <p>{text}</p>
      </div>
    </div>
  );
}

function CurriculumCard({ title, desc, img, color }) {
  return (
    <article
      className={`home-spx-curriculum__card home-spx-curriculum__card--${color}`}
    >
      <span className="home-spx-curriculum__index" aria-hidden="true"></span>
      <div className="home-spx-curriculum__thumb">
        <img
          src={img}
          alt=""
          loading="lazy"
          decoding="async"
        />
        <div className="home-spx-curriculum__overlay"></div>
      </div>
      <div className="home-spx-curriculum__content">
        <h3>{title}</h3>
        <p>{desc}</p>
      </div>
    </article>
  );
}

function CoachCard({ name, role, bio, img, index = 0 }) {
  return (
    <div className="home-spx-coaches__card">
      <span className="home-spx-coaches__index" aria-hidden="true">
        0{index + 1}
      </span>
      <div className="home-spx-coaches__avatar-wrap">
        <Image
          className="home-spx-coaches__avatar"
          src={img}
          alt={name}
          width={150}
          height={150}
          style={{ objectFit: "cover" }}
        />
        <div className="home-spx-coaches__avatar-ring"></div>
      </div>
      <div className="home-spx-coaches__info">
        <h3>{name}</h3>
        <p className="home-spx-coaches__role">{role}</p>
        <p className="home-spx-coaches__bio">{bio}</p>
      </div>
    </div>
  );
}

function TransformationDemo({ dict, locale }) {
  const [scene, setScene] = React.useState(0);
  const totalScenes = 3;

  React.useEffect(() => {
    const timer = setInterval(() => {
      setScene((s) => (s + 1) % totalScenes);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const scenes = [
    {
      before: t(dict, "shift1_before"),
      after: t(dict, "shift1_after"),
      label: t(dict, "shift1_label"),
      desc: t(dict, "shift1_desc"),
      icon: "mic",
    },
    {
      before: t(dict, "shift2_before"),
      after: t(dict, "shift2_after"),
      label: t(dict, "shift2_label"),
      desc: t(dict, "shift2_desc"),
      icon: "type",
    },
    {
      before: t(dict, "shift3_before"),
      after: t(dict, "shift3_after"),
      label: t(dict, "shift3_label"),
      desc: t(dict, "shift3_desc"),
      icon: "meter",
    },
  ];

  const current = scenes[scene];

  return (
    <section className="home-shift">
      <div className="home-container">
        <div className="home-section-header">
          <FadeIn as="h2" className="home-section-title" blur={false}>
            {t(dict, "shift_title")}
          </FadeIn>
          <FadeIn as="p" className="home-section-subtitle" delay={0.1} blur={false}>
            {t(dict, "shift_subtitle")}
          </FadeIn>
        </div>

        <div className="home-shift__stage" data-scene={scene}>
          {/* Animated visual */}
          <div className="home-shift__visual">
            <div className="home-shift__window">
              <div className="home-shift__chrome">
                <span className="home-shift__chrome-dot" />
                <span className="home-shift__chrome-dot" />
                <span className="home-shift__chrome-dot" />
                <span className="home-shift__chrome-url">{t(dict, "shift_window_label")}</span>
              </div>
              <div className="home-shift__body">
                <div className="home-shift__avatar-row">
                  <div className="home-shift__avatar" aria-hidden="true">
                    {current.icon === "mic" ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                        <line x1="12" y1="19" x2="12" y2="22" />
                      </svg>
                    ) : current.icon === "type" ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="4" width="20" height="16" rx="2" />
                        <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M7 16h10" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 3v18h18" />
                        <path d="M18 9l-4 4-3-3-3 3" />
                      </svg>
                    )}
                  </div>
                  <div className="home-shift__meta">
                    <strong>{current.label}</strong>
                    <span>{t(dict, "shift_live_tag")}</span>
                  </div>
                </div>

                {/* Before / After animated text */}
                <div className="home-shift__chat">
                  <div className={`home-shift__bubble home-shift__bubble--before${scene === 0 ? " is-active" : ""}`}>
                    <span className="home-shift__tag">{t(dict, "shift_tag_before")}</span>
                    <p>{scenes[0].before}</p>
                  </div>
                  <div className={`home-shift__bubble home-shift__bubble--after${scene === 0 ? " is-active" : ""}`}>
                    <span className="home-shift__tag home-shift__tag--after">{t(dict, "shift_tag_after")}</span>
                    <p>{scenes[0].after}</p>
                  </div>
                </div>

                <div className="home-shift__chat">
                  <div className={`home-shift__bubble home-shift__bubble--before${scene === 1 ? " is-active" : ""}`}>
                    <span className="home-shift__tag">{t(dict, "shift_tag_before")}</span>
                    <p>{scenes[1].before}</p>
                  </div>
                  <div className={`home-shift__bubble home-shift__bubble--after${scene === 1 ? " is-active" : ""}`}>
                    <span className="home-shift__tag home-shift__tag--after">{t(dict, "shift_tag_after")}</span>
                    <p>{scenes[1].after}</p>
                  </div>
                </div>

                <div className="home-shift__chat">
                  <div className={`home-shift__bubble home-shift__bubble--before${scene === 2 ? " is-active" : ""}`}>
                    <span className="home-shift__tag">{t(dict, "shift_tag_before")}</span>
                    <p>{scenes[2].before}</p>
                  </div>
                  <div className={`home-shift__bubble home-shift__bubble--after${scene === 2 ? " is-active" : ""}`}>
                    <span className="home-shift__tag home-shift__tag--after">{t(dict, "shift_tag_after")}</span>
                    <p>{scenes[2].after}</p>
                  </div>
                </div>

                {/* Animated wave / meter */}
                <div className="home-shift__wave" aria-hidden="true">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div
                      key={i}
                      className="home-shift__wave-bar"
                      style={{ "--bar-i": i }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Story caption */}
          <div className="home-shift__caption">
            <h3 className="home-shift__title">{current.desc}</h3>
            <div className="home-shift__dots">
              {scenes.map((_, i) => (
                <button
                  key={i}
                  className={`home-shift__dot${scene === i ? " home-shift__dot--active" : ""}`}
                  onClick={() => setScene(i)}
                  aria-label={`${t(dict, "shift_slide")} ${i + 1}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="home-shift__cta">
          <Link
            className="spx-btn spx-btn--primary spx-btn--shine"
            href={routeHref(APP_ROUTES.register, locale)}
          >
            <span>{t(dict, "shift_cta")}</span>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}

function TestimonialsCarousel({ dict, locale = "en" }) {
  const trackRef = useRef(null);
  const [active, setActive] = React.useState(0);

  const testimonials = [
    {
      quote: t(dict, "testi1_quote"),
      author: t(dict, "testi1_author"),
      role: t(dict, "testi1_role"),
    },
    {
      quote: t(dict, "testi2_quote"),
      author: t(dict, "testi2_author"),
      role: t(dict, "testi2_role"),
    },
    {
      quote: t(dict, "testi3_quote"),
      author: t(dict, "testi3_author"),
      role: t(dict, "testi3_role"),
    },
    {
      quote: t(dict, "testi4_quote"),
      author: t(dict, "testi4_author"),
      role: t(dict, "testi4_role"),
    },
  ];

  const scroll = (dir) => {
    if (!trackRef.current) return;
    const track = trackRef.current;
    const cardWidth = track.querySelector(".home-quote")?.offsetWidth || 400;
    const gap = 24;
    const currentIdx = Math.round(track.scrollLeft / (cardWidth + gap));
    const next = (currentIdx + dir + testimonials.length) % testimonials.length;
    track.scrollTo({
      left: next * (cardWidth + gap),
      behavior: "smooth",
    });
    setActive(next);
  };

  // Update active dot on scroll
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const onScroll = () => {
      const cardWidth = track.querySelector(".home-quote")?.offsetWidth || 400;
      const idx = Math.round(track.scrollLeft / (cardWidth + 24));
      setActive(Math.min(idx, testimonials.length - 1));
    };
    track.addEventListener("scroll", onScroll, { passive: true });
    return () => track.removeEventListener("scroll", onScroll);
  }, [testimonials.length]);

  return (
    <section className="home-testimonials">
      <div className="home-container">
        <div className="home-testimonials__header-row">
          <div className="home-testimonials__header">
            <FadeIn as="h2" className="home-section-title" blur={false}>
              {t(dict, "testimonials_title")}
            </FadeIn>
            <FadeIn
              as="p"
              className="home-section-subtitle"
              delay={0.1}
              blur={false}
            >
              {t(dict, "testimonials_subtitle")}
            </FadeIn>
          </div>

          <div
            className="home-testimonials__arrows"
            aria-label="Carousel navigation"
          >
            <button
              className="home-testimonials__arrow"
              aria-label={t(dict, "testimonials_prev")}
              onClick={() => scroll(-1)}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 18 18"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M11 4L6 9l5 5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <button
              className="home-testimonials__arrow"
              aria-label={t(dict, "testimonials_next")}
              onClick={() => scroll(1)}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 18 18"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M7 4l5 5-5 5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>

        <div
          className="home-testimonials__track"
          ref={trackRef}
          tabIndex={0}
          aria-label={t(dict, "testimonials_title")}
        >
          {testimonials.map((t_, i) => (
            <Quote
              key={i}
              quote={t_.quote}
              author={t_.author}
              role={t_.role}
              rating={5}
            />
          ))}
        </div>

        <div className="home-testimonials__cta">
          <Link
            href={routeHref(APP_ROUTES.memberStories, locale)}
          >
            <span>Read their full stories</span>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>

        <div
          className="home-testimonials__dots"
          role="tablist"
          aria-label="Testimonial slides"
        >
          {testimonials.map((_, i) => (
            <button
              key={i}
              role="tab"
              aria-selected={active === i}
              aria-label={`${t(dict, "testimonials_slide")} ${i + 1}`}
              className={`home-testimonials__dot${active === i ? " home-testimonials__dot--active" : ""}`}
              onClick={() => {
                if (!trackRef.current) return;
                const cardWidth =
                  trackRef.current.querySelector(".home-quote")?.offsetWidth ||
                  400;
                trackRef.current.scrollTo({
                  left: i * (cardWidth + 24),
                  behavior: "smooth",
                });
                setActive(i);
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================
   How It Works — Sticky Tracker
   ============================ */
function HowItWorksSection({ dict, locale }) {
  const [activeStep, setActiveStep] = useState(0);
  const step0 = useRef(null);
  const step1 = useRef(null);
  const step2 = useRef(null);
  const stepRefs = [step0, step1, step2];

  useEffect(() => {
    const observers = stepRefs.map((ref, i) => {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActiveStep(i);
        },
        { threshold: 0.5 },
      );
      if (ref.current) observer.observe(ref.current);
      return observer;
    });
    return () => observers.forEach((obs) => obs.disconnect());
  }, []);

  const steps = [
    {
      num: "01",
      label: t(dict, "how_step1_label"),
      title: t(dict, "how_step1_title") || "Tell us what you need to say.",
      text:
        t(dict, "how_step1_text") ||
        "A short call. We listen for what you actually need: at work, in interviews, in life. Then we shape your practice plan around it.",
      img: "/images/how-step1.png",
    },
    {
      num: t(dict, "bento_num_02"),
      label: t(dict, "how_step2_label"),
      title: t(dict, "how_step2_title") || "Meet your coach.",
      text:
        t(dict, "how_step2_text") ||
        "We pair you with a coach who fits your goals, your industry, your voice. Not random. Chosen.",
      img: "/images/how-step2.png",
    },
    {
      num: t(dict, "bento_num_03"),
      label: t(dict, "how_step3_label"),
      title: t(dict, "how_step3_title") || "Show up. Speak. Repeat.",
      text:
        t(dict, "how_step3_text") ||
        "Live sessions, one or two a week. Real conversations, every time. Within a month you'll hear the change. Soon after, so will everyone else.",
      img: "/images/how-step3.png",
    },
  ];

  return (
    <section className="home-spx-how">
      <div className="home-container">
        <div className="home-section-header">
          <FadeIn as="h2" className="home-section-title">
            {t(dict, "how_title") || "How it works"}
          </FadeIn>
          <FadeIn as="p" className="home-section-subtitle" delay={0.1}>
            {t(dict, "how_subtitle") || "From your first session to sounding like yourself in another language."}
          </FadeIn>
        </div>

        <div className="home-spx-how__inner">
          <div className="home-spx-how__rail" aria-hidden="true">
            {steps.map((s, i) => (
              <React.Fragment key={i}>
                <div
                  className={`home-spx-how__rail-dot${activeStep === i ? " is-active" : activeStep > i ? " is-done" : ""}`}
                >
                  {activeStep > i ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : s.num}
                </div>
                {i < steps.length - 1 && (
                  <div
                    className={`home-spx-how__rail-line${activeStep > i ? " is-active" : ""}`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>

          <div className="home-spx-how__steps">
            {steps.map((s, i) => (
              <div key={i} className="home-spx-how__step" ref={stepRefs[i]}>
                <div
                  className={`home-spx-how__card${activeStep === i ? " is-active" : ""}`}
                >
                  <div className="home-spx-how__media">
                    <img src={s.img} alt={s.title} />
                    <span className="home-spx-how__badge">{s.num}</span>
                  </div>
                  <div className="home-spx-how__body">
                    <span className="home-spx-how__step-label">{s.label}</span>
                    <h3>{s.title}</h3>
                    <p>{s.text}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="home-spx-how__cta">
          <Link
            className="spx-btn spx-btn--primary spx-btn--shine"
            href={routeHref(APP_ROUTES.register, locale)}
          >
            <span>{t(dict, "how_cta_primary") || "Claim your spot"}</span>
            <svg
              className="spx-btn__arrow"
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M6 3L11 8L6 13"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
          <Link
            className="spx-btn spx-btn--ghost-navy"
            href={routeHref(APP_ROUTES.contact, locale)}
          >
            {t(dict, "how_cta_secondary") || "Ask us anything"}
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ============================
   Product Demo Section
   ============================ */
function ProductDemoSection({ dict }) {
  const features = [
    t(dict, "demo_feature_1"),
    t(dict, "demo_feature_2"),
    t(dict, "demo_feature_3"),
    t(dict, "demo_feature_4"),
    t(dict, "demo_feature_5"),
  ];

  const floatStyle = { animation: "float 3s ease-in-out infinite" };
  const floatStyle2 = { animation: "float 3.6s ease-in-out 0.8s infinite" };

  return (
    <section className="home-demo" data-reveal>
      <div className="home-container">
        <div className="home-demo__inner">
          <div className="home-demo__copy">
            <p className="home-demo__eyebrow">{t(dict, "demo_eyebrow")}</p>
            <h2>
              {t(dict, "demo_title_prefix")}{" "}
              <em className="home-demo__accent-word">
                {t(dict, "demo_title_accent")}
              </em>
            </h2>
            <p>{t(dict, "demo_body")}</p>
            <ul className="home-demo__features">
              {features.map((f, i) => (
                <li key={i} className="home-demo__feature">
                  <span className="home-demo__feature-dot" />
                  {f}
                </li>
              ))}
            </ul>
          </div>

          <div className="home-demo__phone-wrap">
            <div
              className="home-demo__float home-demo__float--1"
              style={floatStyle}
            >
              <div className="home-demo__float-card">
                {t(dict, "demo_rating_label")}
              </div>
            </div>
            <div
              className="home-demo__float home-demo__float--2"
              style={floatStyle2}
            >
              <div className="home-demo__float-card">
                {t(dict, "demo_sessions_label")}
              </div>
            </div>

            <div className="home-demo__phone">
              <div className="home-demo__screen">
                <div className="home-demo__coach-card">
                  <div className="home-demo__coach-avatar">SJ</div>
                  <div className="home-demo__coach-info">
                    <strong>{t(dict, "demo_coach_name")}</strong>
                    <span>{t(dict, "demo_coach_role")}</span>
                  </div>
                  <span className="home-demo__live-badge">
                    {t(dict, "demo_live_badge")}
                  </span>
                </div>
                <div className="home-demo__waveform">
                  {Array.from({ length: 12 }, (_, i) => (
                    <div key={i} className="home-demo__bar" />
                  ))}
                </div>
                <div className="home-demo__session-row">
                  <span className="home-demo__session-label">
                    {t(dict, "demo_session_label")}
                  </span>
                  <span className="home-demo__session-time">24:07</span>
                </div>
                <div className="home-demo__session-feedback">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  {t(dict, "demo_session_feedback")}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================
   Hero Cinema (choreographed 20s loop)
   ============================ */
function HeroCinema() {
  const wave = [
    { h: 40, d: "0s" },
    { h: 72, d: "0.11s" },
    { h: 55, d: "0.24s" },
    { h: 88, d: "0.06s" },
    { h: 62, d: "0.38s" },
    { h: 45, d: "0.19s" },
    { h: 92, d: "0.30s" },
    { h: 58, d: "0.13s" },
  ];

  return (
    <div className="home-hcine" role="img" aria-label="Animated preview of a live Speexify coaching session">
      {/* Chrome */}
      <div className="home-hcine__chrome" aria-hidden="true">
        <div className="home-hcine__dots">
          <span className="home-hcine__dot home-hcine__dot--r" />
          <span className="home-hcine__dot home-hcine__dot--y" />
          <span className="home-hcine__dot home-hcine__dot--g" />
        </div>
        <span className="home-hcine__url">speexify.com/session</span>
        <span className="home-hcine__timer">24:07</span>
      </div>

      {/* Body */}
      <div className="home-hcine__body">

        {/* Coach row */}
        <div className="home-hcine__coach" aria-hidden="true">
          <div className="home-hcine__avatar">SJ</div>
          <div className="home-hcine__coach-info">
            <strong>Sarah Johnson</strong>
            <span>English Communication Coach</span>
          </div>
          <div className="home-hcine__live">
            <span className="home-hcine__live-dot" />
            LIVE
          </div>
        </div>

        <hr className="home-hcine__sep" aria-hidden="true" />

        {/* Member message */}
        <div className="home-hcine__msg" aria-hidden="true">
          <span className="home-hcine__from">You</span>
          <div className="home-hcine__bubble">
            I work in this company{" "}
            <mark className="home-hcine__err">since</mark> five years.
          </div>
        </div>

        {/* Waveform */}
        <div className="home-hcine__wave" aria-hidden="true">
          {wave.map((b, i) => (
            <span
              key={i}
              className="home-hcine__wave-bar"
              style={{ "--bh": `${b.h}%`, "--bd": b.d }}
            />
          ))}
        </div>

        {/* Correction */}
        <div className="home-hcine__correction" aria-hidden="true">
          <div className="home-hcine__correction-tag">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
              <path d="M1 7.5L6.5 2l1.5 1.5L2.5 9H1V7.5ZM6 3l1-1 1.5 1.5-1 1L6 3Z" fill="currentColor" />
            </svg>
            Correction
          </div>
          <div className="home-hcine__swap">
            <span className="home-hcine__old">since</span>
            <span className="home-hcine__arr">→</span>
            <span className="home-hcine__new">for</span>
          </div>
          <p className="home-hcine__corrected">
            &ldquo;I have worked at this company for five years.&rdquo;
          </p>
        </div>

        {/* Coach note */}
        <div className="home-hcine__note" aria-hidden="true">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Great. That&apos;s the present perfect. Keep that pattern.
        </div>

        {/* Progress */}
        <div className="home-hcine__progress" aria-hidden="true">
          <div className="home-hcine__progress-row">
            <span>Your sessions</span>
            <span className="home-hcine__progress-count">Session 7 of 12</span>
          </div>
          <div className="home-hcine__progress-track">
            <div className="home-hcine__progress-fill" />
          </div>
        </div>

      </div>

      {/* Floating badges */}
      <div className="home-hcine__float home-hcine__float--a" aria-hidden="true">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <line x1="10" y1="9" x2="8" y2="9" />
        </svg>
        Note saved
      </div>
      <div className="home-hcine__float home-hcine__float--b" aria-hidden="true">
        <span className="home-hcine__float-plus">+1</span> correction
      </div>
    </div>
  );
}

/* ============================
   Live Session Demo
   ============================ */
function LiveSessionDemo() {
  const waveBars = [
    { h: 30, d: "0s" }, { h: 55, d: "0.12s" }, { h: 70, d: "0.28s" },
    { h: 45, d: "0.08s" }, { h: 85, d: "0.42s" }, { h: 60, d: "0.18s" },
    { h: 95, d: "0.55s" }, { h: 50, d: "0.32s" }, { h: 75, d: "0.22s" },
    { h: 40, d: "0.48s" }, { h: 65, d: "0.15s" }, { h: 80, d: "0.38s" },
    { h: 35, d: "0.06s" }, { h: 50, d: "0.25s" },
  ];

  return (
    <section className="home-live-demo">
      <div className="home-live-demo__glow" aria-hidden="true" />

      <div className="home-container">
        <div className="home-live-demo__header">
          <span className="home-live-demo__eyebrow">
            <span className="home-live-demo__eyebrow-dot" aria-hidden="true" />
            Live session
          </span>
          <h2 className="home-live-demo__heading">
            See exactly what happens
            <br />
            inside a Speexify session.
          </h2>
        </div>

        <div className="home-live-demo__scene">
          {/* Main window */}
          <div
            className="home-live-demo__window"
            role="img"
            aria-label="Animated preview of a live Speexify coaching session"
          >
            {/* Browser chrome */}
            <div className="home-live-demo__chrome" aria-hidden="true">
              <div className="home-live-demo__chrome-dots">
                <span className="home-live-demo__dot home-live-demo__dot--red" />
                <span className="home-live-demo__dot home-live-demo__dot--yellow" />
                <span className="home-live-demo__dot home-live-demo__dot--green" />
              </div>
              <div className="home-live-demo__chrome-url">
                speexify.com/session
              </div>
              <div className="home-live-demo__chrome-timer">24:07</div>
            </div>

            {/* Session body */}
            <div className="home-live-demo__body">
              {/* Coach row */}
              <div className="home-live-demo__coach-row">
                <div className="home-live-demo__coach-avatar">SJ</div>
                <div className="home-live-demo__coach-meta">
                  <strong>Sarah Johnson</strong>
                  <span>English Communication Coach</span>
                </div>
                <div className="home-live-demo__live">
                  <span
                    className="home-live-demo__live-dot"
                    aria-hidden="true"
                  />
                  LIVE
                </div>
              </div>

              <hr className="home-live-demo__sep" aria-hidden="true" />

              {/* Member message */}
              <div className="home-live-demo__student-msg">
                <span className="home-live-demo__from">You</span>
                <div className="home-live-demo__bubble">
                  I work in this company{" "}
                  <mark className="home-live-demo__err">since</mark> five years.
                </div>
              </div>

              {/* Waveform */}
              <div className="home-live-demo__wave" aria-hidden="true">
                {waveBars.map((bar, i) => (
                  <span
                    key={i}
                    className="home-live-demo__wave-bar"
                    style={{
                      "--bar-h": `${bar.h}%`,
                      "--bar-delay": bar.d,
                    }}
                  />
                ))}
              </div>

              {/* Correction */}
              <div className="home-live-demo__correction">
                <div className="home-live-demo__correction-tag">
                  <svg
                    width="11"
                    height="11"
                    viewBox="0 0 11 11"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M1 8.5L7 2.5l1.5 1.5L2.5 10H1V8.5ZM6.5 3.5l1-1 1.5 1.5-1 1-1.5-1.5Z"
                      fill="currentColor"
                    />
                  </svg>
                  Correction
                </div>
                <div className="home-live-demo__swap">
                  <span className="home-live-demo__old">since</span>
                  <span className="home-live-demo__arr" aria-hidden="true">
                    →
                  </span>
                  <span className="home-live-demo__new">for</span>
                </div>
                <p className="home-live-demo__corrected">
                  &ldquo;I have worked at this company for five years.&rdquo;
                </p>
              </div>

              {/* Coach note */}
              <div className="home-live-demo__note">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Great. That&apos;s the present perfect. Keep that pattern.
              </div>
            </div>
          </div>

          {/* Floating badges */}
          <div
            className="home-live-demo__float home-live-demo__float--a"
            aria-hidden="true"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <line x1="10" y1="9" x2="8" y2="9" />
            </svg>
            Session note saved
          </div>
          <div
            className="home-live-demo__float home-live-demo__float--b"
            aria-hidden="true"
          >
            <span className="home-live-demo__float-num">+1</span> correction
            logged
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================
   Comparison Table Section
   ============================ */
function ComparisonSection({ dict }) {
  const rows = [
    {
      feature: t(dict, "compare_row_1"),
      speexify: "yes",
      apps: "no",
      classroom: "partial",
    },
    {
      feature: t(dict, "compare_row_2"),
      speexify: "yes",
      apps: "no",
      classroom: "partial",
    },
    {
      feature: t(dict, "compare_row_3"),
      speexify: "yes",
      apps: "yes",
      classroom: "no",
    },
    {
      feature: t(dict, "compare_row_4"),
      speexify: "yes",
      apps: "partial",
      classroom: "no",
    },
    {
      feature: t(dict, "compare_row_5"),
      speexify: "yes",
      apps: "no",
      classroom: "partial",
    },
    {
      feature: t(dict, "compare_row_6"),
      speexify: "yes",
      apps: "partial",
      classroom: "no",
    },
  ];

  const Icon = ({ type }) => {
    if (type === "yes") {
      return (
        <span className="home-compare__icon home-compare__icon--yes">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
            <polyline points="20 6 9 17 4 12" />
          </svg>
          {t(dict, "compare_yes")}
        </span>
      );
    }
    if (type === "no") {
      return (
        <span className="home-compare__icon home-compare__icon--no">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
          {t(dict, "compare_no")}
        </span>
      );
    }
    if (type === "partial") {
      return (
        <span className="home-compare__icon home-compare__icon--partial">
          ~ {t(dict, "compare_partial")}
        </span>
      );
    }
    return null;
  };

  return (
    <section className="home-compare" data-reveal>
      <div className="home-container">
        <div className="home-section-header">
          <p className="home-features__eyebrow">{t(dict, "compare_eyebrow")}</p>
          <h2 className="home-section-title">{t(dict, "compare_title")}</h2>
          <p className="home-section-subtitle">{t(dict, "compare_subtitle")}</p>
        </div>
        <div className="home-compare__tablewrap">
          <table className="home-compare__table">
            <thead>
              <tr className="home-compare__head-row">
                <th className="home-compare__th" style={{ width: "38%" }}>
                  {t(dict, "compare_th_feature")}
                </th>
                <th className="home-compare__th home-compare__th--speexify">
                  {t(dict, "compare_th_speexify")}
                </th>
                <th className="home-compare__th">
                  {t(dict, "compare_th_apps")}
                </th>
                <th className="home-compare__th">
                  {t(dict, "compare_th_classroom")}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="home-compare__row">
                  <td className="home-compare__td home-compare__td--feature">
                    {row.feature}
                  </td>
                  <td className="home-compare__td home-compare__td--speexify">
                    <Icon type={row.speexify} />
                  </td>
                  <td className="home-compare__td">
                    <Icon type={row.apps} />
                  </td>
                  <td className="home-compare__td">
                    <Icon type={row.classroom} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
