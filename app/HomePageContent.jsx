"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import "@/styles/home.scss";

import { getDictionary, t } from "./i18n"; // ✅ i18n
import FadeIn from "@/components/FadeIn";
import { APP_ROUTES, routeHref } from "@/lib/routes";

export default function HomePageContent({ locale = "en" }) {
  useEffect(() => {
    document.documentElement.classList.add("home-client-ready");

    return () => {
      document.documentElement.classList.remove("home-client-ready");
    };
  }, []);

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
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
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
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <path d="M7 1v2.5M7 10.5V13M1 7h2.5M10.5 7H13M3.05 3.05l1.77 1.77M9.18 9.18l1.77 1.77M10.95 3.05L9.18 4.82M4.82 9.18l-1.77 1.77" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
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
              <Link
                className="spx-btn spx-btn--ghost-navy"
                href={routeHref(APP_ROUTES.packages, locale)}
              >
                {t(dict, "ctaSecondary")}
              </Link>
            </FadeIn>

          </div>

          <div className="home-hero__media">
            <div className="home-media-card">
              <div className="home-media-card__glow"></div>
              <Image
                src="/images/home-hero-clean.png"
                alt="Learner practicing live English coaching on Speexify"
                className="home-media-card__img"
                width={2048}
                height={2048}
                priority
                quality={82}
                sizes="(max-width: 768px) 92vw, (max-width: 1200px) 46vw, 620px"
              />
              <div className="home-media-card__float home-media-card__float--1">
                <div className="home-float-badge">
                  <span className="home-float-badge__icon" aria-hidden="true">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <path d="M2 3.5C2 2.67 2.67 2 3.5 2h9C13.33 2 14 2.67 14 3.5v6c0 .83-.67 1.5-1.5 1.5H8L4.5 13V11H3.5C2.67 11 2 10.33 2 9.5v-6Z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M5 6h6M5 8.5h3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                    </svg>
                  </span>
                  <span className="home-float-badge__text">{t(dict, "float_live_coaching")}</span>
                </div>
              </div>
              <div className="home-media-card__float home-media-card__float--2">
                <div className="home-float-badge">
                  <span className="home-float-badge__icon" aria-hidden="true">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <path d="M9.5 2L4 9h4.5L7.5 14l6-7H9l.5-5Z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <span className="home-float-badge__text">{t(dict, "float_instant_feedback")}</span>
                </div>
              </div>
            </div>
          </div>

          <FadeIn as="div" className="home-hero__stats" delay={0.6}>
            <div className="home-hero__stat">
              <div className="home-hero__stat-num">{t(dict, "hero_stat1_num")}</div>
              <div className="home-hero__stat-label">{t(dict, "hero_stat1_label")}</div>
            </div>
            <div className="home-hero__stat">
              <div className="home-hero__stat-num">{t(dict, "hero_stat2_num")}</div>
              <div className="home-hero__stat-label">{t(dict, "hero_stat2_label")}</div>
            </div>
            <div className="home-hero__stat">
              <div className="home-hero__stat-num">{t(dict, "hero_stat3_num")}</div>
              <div className="home-hero__stat-label">{t(dict, "hero_stat3_label")}</div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ===== SOCIAL PROOF ===== */}
      <section className="home-proof">
        <div className="home-container">
          <FadeIn as="p" className="home-proof__title">{t(dict, "proof_title")}</FadeIn>
          <div className="home-proof__scroller">
            <div className="home-proof__logos">
              {/* Set 1 */}
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={`set1-${i}`} className="home-proof__logo-wrap">
                  <Image
                    src={`/images/logo-${["amazon", "cocacola", "tesla", "allianz", "indeed"][i - 1]
                      }.svg`}
                    alt={t(dict, "proof_logo_alt")}
                    className="home-logo"
                    width={140}
                    height={50}
                  />
                </div>
              ))}
              {/* Set 2 (Duplicate for loop) */}
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={`set2-${i}`} className="home-proof__logo-wrap">
                  <Image
                    src={`/images/logo-${["amazon", "cocacola", "tesla", "allianz", "indeed"][i - 1]
                      }.svg`}
                    alt={t(dict, "proof_logo_alt")}
                    className="home-logo"
                    width={140}
                    height={50}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== FEATURES ===== */}
      <FeaturesSection dict={dict} />

      {/* ===== HOW IT WORKS ===== */}
      <HowItWorksSection dict={dict} locale={locale} />

      {/* ===== CURRICULUM ===== */}
      <section className="home-spx-curriculum">
        <div className="home-container">
          <div className="home-section-header">
            <FadeIn as="h2" className="home-section-title" blur={false}>{t(dict, "curr_title")}</FadeIn>
            <FadeIn as="p" className="home-section-subtitle" delay={0.1} blur={false}>{t(dict, "curr_subtitle")}</FadeIn>
          </div>

          <div className="home-spx-curriculum__grid">
            <CurriculumCard
              title={t(dict, "curr1_title")}
              desc={t(dict, "curr1_desc")}
              img="/images/curr-conversations.png"
              color="blue"
            />
            <CurriculumCard
              title={t(dict, "curr2_title")}
              desc={t(dict, "curr2_desc")}
              img="/images/curr-presentations.png"
              color="purple"
            />
            <CurriculumCard
              title={t(dict, "curr3_title")}
              desc={t(dict, "curr3_desc")}
              img="/images/curr-writing.png"
              color="green"
            />
            <CurriculumCard
              title={t(dict, "curr4_title")}
              desc={t(dict, "curr4_desc")}
              img="/images/curr-leadership.png"
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
            <span className="home-spx-coaches__label">{t(dict, "coaches_label")}</span>
            <h2 className="home-section-title">{t(dict, "coaches_title")}</h2>
            <p className="home-section-subtitle">{t(dict, "coaches_subtitle")}</p>
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

          <p className="home-spx-coaches__note">{t(dict, "coaches_note")}</p>
        </div>
      </section>

      {/* ===== COMPARISON TABLE ===== */}
      <ComparisonSection dict={dict} />

      {/* ===== CASE STUDIES ===== */}
      <section className="home-spx-cases">
        <div className="home-container">
          <div className="home-section-header">
            <h2 className="home-section-title">{t(dict, "cases_title")}</h2>
            <p className="home-section-subtitle">{t(dict, "cases_subtitle")}</p>
          </div>

          <div className="home-spx-cases__grid">
            <CaseCard
              logo="/images/logo-indeed.svg"
              title={t(dict, "case1_title")}
              text={t(dict, "case1_text")}
              metric={t(dict, "case1_metric")}
              metricLabel={t(dict, "case1_metric_label")}
            />
            <CaseCard
              logo="/images/logo-amazon.svg"
              title={t(dict, "case2_title")}
              text={t(dict, "case2_text")}
              metric={t(dict, "case2_metric")}
              metricLabel={t(dict, "case2_metric_label")}
            />
            <CaseCard
              logo="/images/logo-allianz.svg"
              title={t(dict, "case3_title")}
              text={t(dict, "case3_text")}
              metric={t(dict, "case3_metric")}
              metricLabel={t(dict, "case3_metric_label")}
            />
          </div>
        </div>
      </section>

      {/* ===== TESTIMONIALS ===== */}
      <TestimonialsCarousel dict={dict} />


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

function FeaturesSection({ dict }) {
  const scenarios = [
    "Try explaining a complex idea.",
    "Disagree politely in a meeting.",
    "Tell a story under pressure.",
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
        <svg width="26" height="26" viewBox="0 0 26 26" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M9 3.5h8v7a4 4 0 0 1-8 0v-7Z" />
          <path d="M9 6.5H6a2.5 2.5 0 0 0 0 5h3M17 6.5h3a2.5 2.5 0 0 1 0 5h-3" />
          <path d="M13 14.5v4M9.5 18.5h7" />
        </svg>
      ),
      title: t(dict, "feature2_title") || "Outcome-obsessed",
      text: t(dict, "feature2_text") || "Every session has a clear goal. Every coach measures your progress against real communication benchmarks.",
    },
    {
      num: t(dict, "bento_num_03"),
      tone: "indigo",
      icon: (
        <svg width="26" height="26" viewBox="0 0 26 26" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3.5" y="5" width="19" height="17" rx="2.5" />
          <path d="M3.5 10h19M9 3.5v3M17 3.5v3" />
          <path d="M9.5 15l2.5 2.5 5-5" />
        </svg>
      ),
      title: t(dict, "feature3_title") || "Flexible & measurable",
      text: t(dict, "feature3_text") || "Book sessions around your life. Get a progress report after every coaching block.",
    },
    {
      num: t(dict, "bento_num_04"),
      tone: "navy",
      icon: (
        <svg width="26" height="26" viewBox="0 0 26 26" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M14 3.5L6 14.5h7l-1 8 8-11h-7l2-8Z" />
        </svg>
      ),
      title: t(dict, "feature4_title") || "Built for you",
      text: t(dict, "feature4_text") || "Your curriculum adapts to your industry, goals, and gaps — not a generic syllabus.",
    },
  ];

  return (
    <section className="home-features">
      <div className="home-container">
        <div className="home-section-header home-features__header">
          <span className="home-features__eyebrow" aria-hidden="true">{t(dict, "features_eyebrow")}</span>
          <FadeIn as="h2" className="home-section-title home-features__title">
            {t(dict, "features_title") || <>Everything you need<br />to speak with power</>}
          </FadeIn>
          <FadeIn as="p" className="home-section-subtitle home-features__subtitle" delay={0.1}>
            {t(dict, "features_subtitle") || "Not a language app. A real-world communication system built around how confident professionals actually speak."}
          </FadeIn>
        </div>

        {/* ── Bento grid ── */}
        <div className="home-bento">

          {/* Wide hero card */}
          <div className="home-bento__card home-bento__card--wide home-bento__card--coral" data-reveal>
            <div className="home-bento__wide-inner">
              <div className="home-bento__wide-copy">
                <span className="home-bento__tag">{t(dict, "bento_tag_core")}</span>
                <div className="home-bento__icon home-bento__icon--coral" aria-hidden="true">
                  <svg width="26" height="26" viewBox="0 0 26 26" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M4 5.5C4 4.4 4.9 3.5 6 3.5h14c1.1 0 2 .9 2 2v9c0 1.1-.9 2-2 2h-7l-5 3.5V16.5H6c-1.1 0-2-.9-2-2v-9Z" />
                    <path d="M9 9.5h8M9 13h5" />
                  </svg>
                </div>
                <h3 className="home-bento__title">
                  {t(dict, "feature1_title") || "Real conversations, not drills"}
                </h3>
                <p className="home-bento__text">
                  {t(dict, "feature1_text") || "Every session is a live, unscripted conversation with a native-level coach. No textbooks. No repetition. Just authentic, measurable practice that sticks."}
                </p>
              </div>

              {/* Scenario chips */}
              <div className="home-bento__chips">
                {scenarios.map((s, i) => (
                  <div key={i} className="home-bento__chip">{s}</div>
                ))}
              </div>
            </div>
          </div>

          {/* Narrow stat card */}
          <div className="home-bento__card home-bento__card--narrow home-bento__card--teal" data-reveal style={{ "--reveal-delay": "80" }}>
            <span className="home-bento__tag">{t(dict, "bento_tag_outcome")}</span>
            <div className="home-bento__stat">2.7×</div>
            <h3 className="home-bento__title">{t(dict, "bento_stat_title")}</h3>
            <p className="home-bento__text">{t(dict, "bento_stat_text")}</p>
            <div className="home-bento__minichart">
              {bars.map((b, i) => (
                <div key={i} className={`home-bento__bar${b.active ? " home-bento__bar--active" : ""}`} style={{ height: b.h }} />
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
              <div className={`home-bento__icon home-bento__icon--${c.tone}`} aria-hidden="true">{c.icon}</div>
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
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
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
        <div className="home-quote__stars" aria-label={`${rating} out of 5 stars`}>
          {Array.from({ length: rating }).map((_, i) => (
            <svg key={i} className="home-quote__star" width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M7 1.5l1.545 3.13 3.455.503-2.5 2.436.59 3.44L7 9.25l-3.09 1.759.59-3.44L2 5.133l3.455-.503L7 1.5Z" fill="currentColor" />
            </svg>
          ))}
        </div>
        <svg className="home-quote__mark" width="24" height="18" viewBox="0 0 24 18" fill="none" aria-hidden="true">
          <path d="M0 18V10.8C0 4.68 3.36.72 10.08 0l1.44 2.16C8.16 3.12 6.24 5.28 5.76 8.4H10.08V18H0ZM13.92 18V10.8C13.92 4.68 17.28.72 24 0l1.44 2.16C22.08 3.12 20.16 5.28 19.68 8.4H24V18H13.92Z" fill="currentColor" opacity="0.12" />
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
        <Image src={img} alt="" width={600} height={400} style={{ objectFit: "cover" }} />
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
        <Image src={img} alt="" width={800} height={600} style={{ objectFit: "cover" }} />
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
        <Image className="home-spx-coaches__avatar" src={img} alt={name} width={150} height={150} style={{ objectFit: "cover" }} />
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

function CaseCard({ logo, title, text, metric, metricLabel }) {
  return (
    <div className="home-spx-cases__card">
      <div className="home-spx-cases__header">
        <div className="home-spx-cases__logo">
          <Image src={logo} alt="" width={100} height={40} style={{ objectFit: "contain" }} />
        </div>
        <div className="home-spx-cases__metric">
          <div className="home-spx-cases__metric-num">{metric}</div>
          <div className="home-spx-cases__metric-label">{metricLabel}</div>
        </div>
      </div>
      <div className="home-spx-cases__content">
        <h3>{title}</h3>
        <p>{text}</p>
      </div>
    </div>
  );
}

function TestimonialsCarousel({ dict }) {
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
  ];

  const scroll = (dir) => {
    if (!trackRef.current) return;
    const cardWidth = trackRef.current.querySelector(".home-quote")?.offsetWidth || 400;
    trackRef.current.scrollBy({ left: dir * (cardWidth + 24), behavior: "smooth" });
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
            <FadeIn as="p" className="home-section-subtitle" delay={0.1} blur={false}>
              {t(dict, "testimonials_subtitle")}
            </FadeIn>
          </div>

          <div className="home-testimonials__arrows" aria-label="Carousel navigation">
            <button
              className="home-testimonials__arrow"
              aria-label={t(dict, "testimonials_prev")}
              onClick={() => scroll(-1)}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <path d="M11 4L6 9l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              className="home-testimonials__arrow"
              aria-label={t(dict, "testimonials_next")}
              onClick={() => scroll(1)}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <path d="M7 4l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>

        <div className="home-testimonials__track" ref={trackRef}>
          {testimonials.map((t_, i) => (
            <Quote key={i} quote={t_.quote} author={t_.author} role={t_.role} rating={5} />
          ))}
        </div>

        <div className="home-testimonials__dots" role="tablist" aria-label="Testimonial slides">
          {testimonials.map((_, i) => (
            <button
              key={i}
              role="tab"
              aria-selected={active === i}
              aria-label={`${t(dict, "testimonials_slide")} ${i + 1}`}
              className={`home-testimonials__dot${active === i ? " home-testimonials__dot--active" : ""}`}
              onClick={() => {
                if (!trackRef.current) return;
                const cardWidth = trackRef.current.querySelector(".home-quote")?.offsetWidth || 400;
                trackRef.current.scrollTo({ left: i * (cardWidth + 24), behavior: "smooth" });
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
        ([entry]) => { if (entry.isIntersecting) setActiveStep(i); },
        { threshold: 0.5 }
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
      title: t(dict, "how_step1_title") || "Set your goals",
      text: t(dict, "how_step1_text") || "Tell us about your English ambitions — job interviews, presentations, travel or daily confidence.",
      img: "/images/how-step1.png",
    },
    {
      num: t(dict, "bento_num_02"),
      label: t(dict, "how_step2_label"),
      title: t(dict, "how_step2_title") || "Get matched instantly",
      text: t(dict, "how_step2_text") || "We pair you with a vetted native-level coach whose expertise fits your exact goal.",
      img: "/images/how-step2.png",
    },
    {
      num: t(dict, "bento_num_03"),
      label: t(dict, "how_step3_label"),
      title: t(dict, "how_step3_title") || "Start speaking. Measure progress.",
      text: t(dict, "how_step3_text") || "Live sessions, instant feedback, and a personalised progress tracker to feel every improvement.",
      img: "/images/how-step3.png",
    },
  ];

  return (
    <section className="home-spx-how">
      <div className="home-container">
        <div className="home-section-header">
          <FadeIn as="h2" className="home-section-title">{t(dict, "how_title") || "How Speexify works"}</FadeIn>
          <FadeIn as="p" className="home-section-subtitle" delay={0.1}>
            {t(dict, "how_subtitle") || "Three simple steps to real fluency."}
          </FadeIn>
        </div>

        <div className="home-spx-how__inner">
          <div className="home-spx-how__rail" aria-hidden="true">
            {steps.map((s, i) => (
              <React.Fragment key={i}>
                <div className={`home-spx-how__rail-dot${activeStep === i ? " is-active" : activeStep > i ? " is-done" : ""}`}>
                  {activeStep > i ? "✓" : s.num}
                </div>
                {i < steps.length - 1 && (
                  <div className={`home-spx-how__rail-line${activeStep > i ? " is-active" : ""}`} />
                )}
              </React.Fragment>
            ))}
          </div>

          <div className="home-spx-how__steps">
            {steps.map((s, i) => (
              <div key={i} className="home-spx-how__step" ref={stepRefs[i]}>
                <div className={`home-spx-how__card${activeStep === i ? " is-active" : ""}`}>
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
          <Link className="spx-btn spx-btn--primary spx-btn--shine" href={routeHref(APP_ROUTES.register, locale)}>
            <span>{t(dict, "how_cta_primary") || "Start for free"}</span>
            <svg className="spx-btn__arrow" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <Link className="spx-btn spx-btn--ghost-navy" href={routeHref(APP_ROUTES.contact, locale)}>
            {t(dict, "how_cta_secondary") || "Talk to us"}
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
              <em className="home-demo__accent-word">{t(dict, "demo_title_accent")}</em>
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
            <div className="home-demo__float home-demo__float--1" style={floatStyle}>
              <div className="home-demo__float-card">
                {t(dict, "demo_rating_label")}
              </div>
            </div>
            <div className="home-demo__float home-demo__float--2" style={floatStyle2}>
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
                  <span className="home-demo__live-badge">{t(dict, "demo_live_badge")}</span>
                </div>
                <div className="home-demo__waveform">
                  {Array.from({ length: 12 }, (_, i) => (
                    <div key={i} className="home-demo__bar" />
                  ))}
                </div>
                <div className="home-demo__session-row">
                  <span className="home-demo__session-label">{t(dict, "demo_session_label")}</span>
                  <span className="home-demo__session-time">24:07</span>
                </div>
                <div className="home-demo__session-feedback">
                  ✓ {t(dict, "demo_session_feedback")}
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
   Comparison Table Section
   ============================ */
function ComparisonSection({ dict }) {
  const rows = [
    { feature: t(dict, "compare_row_1"), speexify: "yes", apps: "no", classroom: "partial" },
    { feature: t(dict, "compare_row_2"), speexify: "yes", apps: "no", classroom: "partial" },
    { feature: t(dict, "compare_row_3"), speexify: "yes", apps: "yes", classroom: "no" },
    { feature: t(dict, "compare_row_4"), speexify: "yes", apps: "partial", classroom: "no" },
    { feature: t(dict, "compare_row_5"), speexify: "yes", apps: "no", classroom: "partial" },
    { feature: t(dict, "compare_row_6"), speexify: "yes", apps: "partial", classroom: "no" },
  ];

  const Icon = ({ type }) => {
    if (type === "yes") {
      return <span className="home-compare__icon home-compare__icon--yes">✓ {t(dict, "compare_yes")}</span>;
    }
    if (type === "no") {
      return <span className="home-compare__icon home-compare__icon--no">✕ {t(dict, "compare_no")}</span>;
    }
    if (type === "partial") {
      return <span className="home-compare__icon home-compare__icon--partial">~ {t(dict, "compare_partial")}</span>;
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
        <div style={{ overflowX: "auto" }}>
          <table className="home-compare__table">
            <thead>
              <tr className="home-compare__head-row">
                <th className="home-compare__th" style={{ width: "38%" }}>{t(dict, "compare_th_feature")}</th>
                <th className="home-compare__th home-compare__th--speexify">{t(dict, "compare_th_speexify")}</th>
                <th className="home-compare__th">{t(dict, "compare_th_apps")}</th>
                <th className="home-compare__th">{t(dict, "compare_th_classroom")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="home-compare__row">
                  <td className="home-compare__td home-compare__td--feature">{row.feature}</td>
                  <td className="home-compare__td home-compare__td--speexify"><Icon type={row.speexify} /></td>
                  <td className="home-compare__td"><Icon type={row.apps} /></td>
                  <td className="home-compare__td"><Icon type={row.classroom} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
