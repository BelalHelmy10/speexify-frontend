// app/about/page.js
"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import "@/styles/about.scss";
import { getDictionary, t } from "@/app/i18n";
import FadeIn from "@/components/FadeIn";

const heroImg = "/images/about_hero.avif";
const historyImg = "/images/about_history.avif";
const lifeImgA = "/images/about_life_a.avif";
const lifeImgB = "/images/about_life_b.avif";
const valuesIconA = "/logos/icon_empathy.svg";
const valuesIconB = "/logos/icon_empower.svg";
const valuesIconC = "/logos/icon_ownership.svg";
const valuesIconD = "/logos/icon_inclusive.svg";
const leadBilly = "/images/Billy.jpeg";
const leadZiad = "/images/ZiadAnwer.jpeg";
const leadChris = "/images/leader_chris.avif";

// config arrays – text comes from translations
const statsConfig = [
  {
    tone: "coral",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
        <ellipse cx="12" cy="12" rx="4" ry="9" stroke="currentColor" strokeWidth="1.8" />
        <path d="M3 12h18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M3.5 8h17M3.5 16h17" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.6" />
      </svg>
    ),
    valueKey: "stat1_value",
    labelKey: "stat1_label",
  },
  {
    tone: "blue",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" strokeWidth="1.8" />
        <path d="M7 9l2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M2 8h20" stroke="currentColor" strokeWidth="1.4" opacity="0.5" />
        <circle cx="17" cy="14" r="3" stroke="currentColor" strokeWidth="1.5" />
        <path d="M19.5 16.5L22 19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    valueKey: "stat2_value",
    labelKey: "stat2_label",
  },
  {
    tone: "gold",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 19V7a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M2 19h20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M9 19V11h6v8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <rect x="10" y="4" width="4" height="3" rx="0.5" fill="currentColor" opacity="0.5" />
      </svg>
    ),
    valueKey: "stat3_value",
    labelKey: "stat3_label",
  },
  {
    tone: "teal",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
        <path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    valueKey: "stat4_value",
    labelKey: "stat4_label",
  },
];

const valuesConfig = [
  { icon: valuesIconA, titleKey: "value1_title", descKey: "value1_desc" },
  { icon: valuesIconB, titleKey: "value2_title", descKey: "value2_desc" },
  { icon: valuesIconC, titleKey: "value3_title", descKey: "value3_desc" },
  { icon: valuesIconD, titleKey: "value4_title", descKey: "value4_desc" },
];

const timelineConfig = [
  { yearKey: "timeline1_year", textKey: "timeline1_text" },
  { yearKey: "timeline2_year", textKey: "timeline2_text" },
  { yearKey: "timeline3_year", textKey: "timeline3_text" },
  { yearKey: "timeline4_year", textKey: "timeline4_text" },
];

const leadersConfig = [
  { img: leadBilly, nameKey: "leader1_name", roleKey: "leader1_role" },
  { img: leadZiad, nameKey: "leader2_name", roleKey: "leader2_role" },
  { img: leadChris, nameKey: "leader3_name", roleKey: "leader3_role" },
];

const testimonialsConfig = [
  {
    quoteKey: "testi1_quote",
    nameKey: "testi1_name",
    companyKey: "testi1_company",
    rating: 5,
  },
  {
    quoteKey: "testi2_quote",
    nameKey: "testi2_name",
    companyKey: "testi2_company",
    rating: 5,
  },
  {
    quoteKey: "testi3_quote",
    nameKey: "testi3_name",
    companyKey: "testi3_company",
    rating: 5,
  },
  {
    quoteKey: "testi4_quote",
    nameKey: "testi4_name",
    companyKey: "testi4_company",
    rating: 5,
  },
];

export default function AboutPage() {
  const pathname = usePathname();
  const locale = pathname?.startsWith("/ar") ? "ar" : "en";
  const dict = getDictionary(locale, "about");

  // ✅ only for URLs, not for translations
  const prefix = locale === "ar" ? "/ar" : "";

  return (
    <main className="about">
      {/* HERO */}
      <section className="about__hero">
        <div className="about__hero-background">
          <div className="about__hero-gradient"></div>
          <div className="about__hero-pattern"></div>
        </div>

        <div className="about__hero-content">
          <div className="about__hero-left">
            <FadeIn as="div" className="about__badge" delay={0.1}>
              <span className="about__badge-icon" aria-hidden="true">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <path d="M7 0v3M7 11v3M0 7h3M11 7h3M2.05 2.05l2.12 2.12M9.83 9.83l2.12 2.12M9.83 4.17l2.12-2.12M2.05 11.95l2.12-2.12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </span>
              <span>{t(dict, "hero_badge")}</span>
            </FadeIn>

            <FadeIn as="h1" className="about__headline" delay={0.2}>
              {t(dict, "hero_title_main")}
              <span className="about__headline-accent">
                {t(dict, "hero_title_accent")}
              </span>
            </FadeIn>

            <FadeIn as="p" className="about__sub" delay={0.3}>{t(dict, "hero_sub")}</FadeIn>

            <FadeIn as="div" className="about-cta-row" delay={0.4}>
              <Link
                href={`${prefix}/demo`}
                className="about-btn about-btn--primary about-btn--lg"
              >
                <span>{t(dict, "hero_cta_primary")}</span>
                <svg
                  className="about-btn__arrow"
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
              </Link>

              <Link
                href={`${prefix}/packages`}
                className="about-btn about-btn--outline about-btn--lg"
              >
                {t(dict, "hero_cta_secondary")}
              </Link>
            </FadeIn>
          </div>

          <div className="about__hero-right">
            <div className="about__hero-media">
              <div className="about__hero-media-glow"></div>
              <img src={heroImg} alt={t(dict, "hero_image_alt")} />
              <div className="about__hero-media-badge">
                <span className="about__hero-media-badge-dot"></span>
                <span>{t(dict, "hero_trusted")}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="about__stats">
        <div className="container about__stats-grid">
          {statsConfig.map((s) => (
            <div className={`about__stat about__stat--${s.tone}`} key={s.labelKey}>
              <div className="about__stat-icon">{s.icon}</div>
              <div className="about__stat-value">{t(dict, s.valueKey)}</div>
              <div className="about__stat-label">{t(dict, s.labelKey)}</div>
            </div>
          ))}
        </div>
      </section>

      {/* OFFER (B2C + B2B + DIGITAL-ONLY) */}
      {/* OFFER (B2C + B2B + FLEX + OUTCOMES) */}
      <section className="about__values">
        <div className="container">
          <div className="about__section-header">
            <FadeIn as="h2" className="about__section-title">{t(dict, "offer_title")}</FadeIn>
            <FadeIn as="p" className="about__section-subtitle" delay={0.1}>
              {t(dict, "offer_subtitle")}
            </FadeIn>
          </div>

          <div className="about__values-grid">
            <article className="about__value about__value--coral">
              <div className="about__value-icon-wrap">
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
                  <circle cx="11" cy="7" r="4" stroke="currentColor" strokeWidth="1.7" />
                  <path d="M2 19c0-4.418 4.03-8 9-8s9 3.582 9 8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                </svg>
              </div>
              <h3>{t(dict, "offer_card1_title")}</h3>
              <p>{t(dict, "offer_card1_text")}</p>
            </article>

            <article className="about__value about__value--gold">
              <div className="about__value-icon-wrap">
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
                  <rect x="1" y="8" width="20" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
                  <path d="M7 21V13h8v8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                  <path d="M1 12V6a1 1 0 0 1 .55-.89l9-4.5a1 1 0 0 1 .9 0l9 4.5A1 1 0 0 1 21 6v6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                </svg>
              </div>
              <h3>{t(dict, "offer_card2_title")}</h3>
              <p>{t(dict, "offer_card2_text")}</p>
            </article>

            <article className="about__value about__value--teal">
              <div className="about__value-icon-wrap">
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
                  <path d="M4 11a7 7 0 0 1 13.5-2.6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                  <path d="M18 11a7 7 0 0 1-13.5 2.6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                  <path d="M18 5l-.5 3.4-3.4-.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M4 17l.5-3.4 3.4.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h3>{t(dict, "offer_card3_title")}</h3>
              <p>{t(dict, "offer_card3_text")}</p>
            </article>

            <article className="about__value about__value--blue">
              <div className="about__value-icon-wrap">
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
                  <rect x="2" y="14" width="4" height="6" rx="1" fill="currentColor" opacity="0.5" />
                  <rect x="9" y="9" width="4" height="11" rx="1" fill="currentColor" opacity="0.75" />
                  <rect x="16" y="4" width="4" height="16" rx="1" fill="currentColor" />
                  <path d="M18 7l-3-3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h3>{t(dict, "offer_card4_title")}</h3>
              <p>{t(dict, "offer_card4_text")}</p>
            </article>
          </div>
        </div>
      </section>

      {/* HISTORY */}
      <section className="about__history">
        <div className="container about__history-grid">
          <div className="about__history-media">
            <img src={historyImg} alt={t(dict, "history_image_alt")} />
            <div className="about__history-overlay"></div>
          </div>
          <div className="about__history-copy">
            <FadeIn as="h2">{t(dict, "history_title")}</FadeIn>
            <FadeIn as="p" delay={0.1}>{t(dict, "history_p1")}</FadeIn>
            <FadeIn as="p" delay={0.2}>{t(dict, "history_p2")}</FadeIn>
          </div>
        </div>
      </section>

      {/* VALUES */}
      <section className="about__values">
        <div className="container">
          <div className="about__section-header">
            <FadeIn as="h2" className="about__section-title">{t(dict, "values_title")}</FadeIn>
            <FadeIn as="p" className="about__section-subtitle" delay={0.1}>
              {t(dict, "values_subtitle")}
            </FadeIn>
          </div>

          <div className="about__values-grid">
            {valuesConfig.map((v) => (
              <article className="about__value" key={v.titleKey}>
                <div className="about__value-icon-wrap">
                  <img
                    className="about__value-icon"
                    src={v.icon}
                    alt=""
                    aria-hidden="true"
                  />
                </div>
                <h3>{t(dict, v.titleKey)}</h3>
                <p>{t(dict, v.descKey)}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* LIFE @ SPEEXIFY */}
      <section className="about__life">
        <div className="container about__life-grid">
          <div className="about__life-copy">
            <FadeIn as="h2">{t(dict, "life_title")}</FadeIn>
            <FadeIn as="p" delay={0.1}>{t(dict, "life_p1")}</FadeIn>
            <FadeIn as="p" delay={0.2}>{t(dict, "life_p2")}</FadeIn>
          </div>
          <div className="about__life-media">
            <img
              className="about__life-img about__life-img--top"
              src={lifeImgA}
              alt={t(dict, "life_image_alt_1")}
            />
            <img
              className="about__life-img about__life-img--bottom"
              src={lifeImgB}
              alt={t(dict, "life_image_alt_2")}
            />
          </div>
        </div>
      </section>

      {/* TIMELINE */}
      <section className="about__timeline">
        <div className="container">
          <div className="about__section-header">
            <FadeIn as="h2" className="about__section-title">
              {t(dict, "timeline_title")}
            </FadeIn>
            <FadeIn as="p" className="about__section-subtitle" delay={0.1}>
              {t(dict, "timeline_subtitle")}
            </FadeIn>
          </div>

          <div className="about__timeline-grid">
            {timelineConfig.map((item, idx) => (
              <div className="about__timeline-card" key={item.yearKey}>
                <div className="about__timeline-number">{idx + 1}</div>
                <div className="about__timeline-year">
                  {t(dict, item.yearKey)}
                </div>
                <p>{t(dict, item.textKey)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* LEADERSHIP */}
      <section className="about__leaders">
        <div className="container">
          <div className="about__section-header">
            <FadeIn as="h2" className="about__section-title">{t(dict, "leaders_title")}</FadeIn>
            <FadeIn as="p" className="about__section-subtitle" delay={0.1}>
              {t(dict, "leaders_subtitle")}
            </FadeIn>
          </div>

          <div className="about__leader-grid">
            {leadersConfig.map((l) => (
              <div className="about__leader" key={l.nameKey}>
                <div className="about__leader-media">
                  <img src={l.img} alt={t(dict, l.nameKey)} />
                  <div className="about__leader-overlay"></div>
                </div>
                <div className="about__leader-card">
                  <h4>{t(dict, l.nameKey)}</h4>
                  <span>{t(dict, l.roleKey)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="about__testimonials">
        <div className="container">
          <div className="about__section-header">
            <FadeIn as="h2" className="about__section-title">
              {t(dict, "testimonials_title")}
            </FadeIn>
            <FadeIn as="p" className="about__section-subtitle" delay={0.1}>
              {t(dict, "testimonials_subtitle")}
            </FadeIn>
          </div>

          <div className="about__quote-grid">
            {testimonialsConfig.map((q, i) => (
              <blockquote className="about__quote" key={i}>
                <div className="about__quote-stars" aria-label={`${q.rating} out of 5 stars`}>
                  {[...Array(q.rating)].map((_, idx) => (
                    <svg key={idx} className="about__quote-star" width="16" height="16" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                      <path d="M7 1.5l1.545 3.13 3.455.503-2.5 2.436.59 3.44L7 9.25l-3.09 1.759.59-3.44L2 5.133l3.455-.503L7 1.5Z" fill="currentColor" />
                    </svg>
                  ))}
                </div>
                <p>&ldquo;{t(dict, q.quoteKey)}&rdquo;</p>
                <footer>
                  <strong>{t(dict, q.nameKey)}</strong>
                  <span>{t(dict, q.companyKey)}</span>
                </footer>
              </blockquote>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="about__cta">
        <div className="about__cta-background">
          <div className="about__cta-gradient"></div>
          <div className="about__cta-shapes">
            <div className="about__cta-shape about__cta-shape--1"></div>
            <div className="about__cta-shape about__cta-shape--2"></div>
          </div>
        </div>

        <div className="container about__cta-inner">
          <h2>{t(dict, "cta_title")}</h2>
          <p>
            {t(dict, "cta_text")}{" "}
            <span>
              {t(dict, "about_contact_line", { email: "support@speexify.com" })}{" "}
              <a href="mailto:support@speexify.com" className="about-link">
                support@speexify.com
              </a>
            </span>
          </p>

          <div className="about-cta-row">
            <Link
              href={`${prefix}/careers`}
              className="about-btn about-btn--secondary about-btn--lg"
            >
              <span>{t(dict, "cta_primary")}</span>
              <svg
                className="about-btn__arrow"
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
            </Link>

            <Link
              href={`${prefix}/contact`}
              className="about-btn about-btn--ghost about-btn--lg"
            >
              {t(dict, "cta_secondary")}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
