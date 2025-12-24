// app/about/page.js
"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import "@/styles/about.scss";
import { getDictionary, t } from "@/app/i18n";

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
  { icon: "🌍", valueKey: "stat1_value", labelKey: "stat1_label" },
  { icon: "🗺️", valueKey: "stat2_value", labelKey: "stat2_label" },
  { icon: "📚", valueKey: "stat3_value", labelKey: "stat3_label" },
  { icon: "⏰", valueKey: "stat4_value", labelKey: "stat4_label" },
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
            <div className="about__badge">
              <span className="about__badge-icon">✨</span>
              <span>{t(dict, "hero_badge")}</span>
            </div>

            <h1 className="about__headline">
              {t(dict, "hero_title_main")}
              <span className="about__headline-accent">
                {t(dict, "hero_title_accent")}
              </span>
            </h1>

            <p className="about__sub">{t(dict, "hero_sub")}</p>

            <div className="about-cta-row">
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
            </div>
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
            <div className="about__stat" key={s.labelKey}>
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
            <h2 className="about__section-title">{t(dict, "offer_title")}</h2>
            <p className="about__section-subtitle">
              {t(dict, "offer_subtitle")}
            </p>
          </div>

          <div className="about__values-grid">
            <article className="about__value">
              <div className="about__value-icon-wrap">
                <span aria-hidden="true" style={{ fontSize: 22 }}>
                  👤
                </span>
              </div>
              <h3>{t(dict, "offer_card1_title")}</h3>
              <p>{t(dict, "offer_card1_text")}</p>
            </article>

            <article className="about__value">
              <div className="about__value-icon-wrap">
                <span aria-hidden="true" style={{ fontSize: 22 }}>
                  🏢
                </span>
              </div>
              <h3>{t(dict, "offer_card2_title")}</h3>
              <p>{t(dict, "offer_card2_text")}</p>
            </article>

            <article className="about__value">
              <div className="about__value-icon-wrap">
                <span aria-hidden="true" style={{ fontSize: 22 }}>
                  🔄
                </span>
              </div>
              <h3>{t(dict, "offer_card3_title")}</h3>
              <p>{t(dict, "offer_card3_text")}</p>
            </article>

            <article className="about__value">
              <div className="about__value-icon-wrap">
                <span aria-hidden="true" style={{ fontSize: 22 }}>
                  📊
                </span>
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
            <h2>{t(dict, "history_title")}</h2>
            <p>{t(dict, "history_p1")}</p>
            <p>{t(dict, "history_p2")}</p>
          </div>
        </div>
      </section>

      {/* VALUES */}
      <section className="about__values">
        <div className="container">
          <div className="about__section-header">
            <h2 className="about__section-title">{t(dict, "values_title")}</h2>
            <p className="about__section-subtitle">
              {t(dict, "values_subtitle")}
            </p>
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
            <h2>{t(dict, "life_title")}</h2>
            <p>{t(dict, "life_p1")}</p>
            <p>{t(dict, "life_p2")}</p>
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
            <h2 className="about__section-title">
              {t(dict, "timeline_title")}
            </h2>
            <p className="about__section-subtitle">
              {t(dict, "timeline_subtitle")}
            </p>
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
            <h2 className="about__section-title">{t(dict, "leaders_title")}</h2>
            <p className="about__section-subtitle">
              {t(dict, "leaders_subtitle")}
            </p>
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
            <h2 className="about__section-title">
              {t(dict, "testimonials_title")}
            </h2>
            <p className="about__section-subtitle">
              {t(dict, "testimonials_subtitle")}
            </p>
          </div>

          <div className="about__quote-grid">
            {testimonialsConfig.map((q, i) => (
              <blockquote className="about__quote" key={i}>
                <div className="about__quote-stars" aria-hidden="true">
                  {[...Array(q.rating)].map((_, idx) => (
                    <span key={idx} className="about__quote-star">
                      ★
                    </span>
                  ))}
                </div>
                <p>"{t(dict, q.quoteKey)}"</p>
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
