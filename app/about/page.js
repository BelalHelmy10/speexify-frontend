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

const statsConfig = [
  {
    tone: "coral",
    valueKey: "stat1_value",
    labelKey: "stat1_label",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
        <ellipse cx="12" cy="12" rx="4" ry="9" stroke="currentColor" strokeWidth="1.8" />
        <path d="M3 12h18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    tone: "blue",
    valueKey: "stat2_value",
    labelKey: "stat2_label",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" strokeWidth="1.8" />
        <path d="M7 9l2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="17" cy="14" r="3" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    tone: "gold",
    valueKey: "stat3_value",
    labelKey: "stat3_label",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 19V7a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M2 19h20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M9 19V11h6v8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    tone: "teal",
    valueKey: "stat4_value",
    labelKey: "stat4_label",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
        <path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

const offerConfig = [
  {
    tone: "coral",
    titleKey: "offer_card1_title",
    textKey: "offer_card1_text",
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
        <circle cx="11" cy="7" r="4" stroke="currentColor" strokeWidth="1.7" />
        <path d="M2 19c0-4.418 4.03-8 9-8s9 3.582 9 8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    tone: "gold",
    titleKey: "offer_card2_title",
    textKey: "offer_card2_text",
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
        <rect x="1" y="8" width="20" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
        <path d="M7 21V13h8v8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        <path d="M1 12V6a1 1 0 0 1 .55-.89l9-4.5a1 1 0 0 1 .9 0l9 4.5A1 1 0 0 1 21 6v6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    tone: "teal",
    titleKey: "offer_card3_title",
    textKey: "offer_card3_text",
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
        <path d="M4 11a7 7 0 0 1 13.5-2.6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        <path d="M18 11a7 7 0 0 1-13.5 2.6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        <path d="M18 5l-.5 3.4-3.4-.5M4 17l.5-3.4 3.4.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    tone: "blue",
    titleKey: "offer_card4_title",
    textKey: "offer_card4_text",
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
        <rect x="2" y="14" width="4" height="6" rx="1" fill="currentColor" opacity="0.5" />
        <rect x="9" y="9" width="4" height="11" rx="1" fill="currentColor" opacity="0.75" />
        <rect x="16" y="4" width="4" height="16" rx="1" fill="currentColor" />
        <path d="M18 7l-3-3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
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
  },
  {
    quoteKey: "testi2_quote",
    nameKey: "testi2_name",
    companyKey: "testi2_company",
  },
  {
    quoteKey: "testi3_quote",
    nameKey: "testi3_name",
    companyKey: "testi3_company",
  },
  {
    quoteKey: "testi4_quote",
    nameKey: "testi4_name",
    companyKey: "testi4_company",
  },
];

function getInitials(name) {
  const parts = String(name || "")
    .replace(/\./g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!parts.length) return "SP";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
}

function renderStatValue(value) {
  const raw = String(value || "").trim();
  const match = raw.match(/^(.*?)([+%])$/);

  if (!match) return raw;
  return (
    <>
      {match[1]}
      <span>{match[2]}</span>
    </>
  );
}

export default function AboutPage() {
  const pathname = usePathname();
  const locale = pathname?.startsWith("/ar") ? "ar" : "en";
  const dict = getDictionary(locale, "about");
  const isRtl = locale === "ar";
  const prefix = isRtl ? "/ar" : "";

  const contactEmail = "support@speexify.com";
  const contactLine = t(dict, "about_contact_line", { email: contactEmail });
  const contactLead = contactLine.includes(contactEmail)
    ? contactLine.replace(contactEmail, "").trim()
    : `${contactLine}`;

  return (
    <section className="about-page" dir={isRtl ? "rtl" : "ltr"}>
      <section className="hero">
        <div className="hero-panel">
          <div className="hero-panel-bg"></div>
          <div className="hero-wm">VOICE</div>

          <div className="hero-copy">
            <div className="hero-badge">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M7 0v3M7 11v3M0 7h3M11 7h3M2.05 2.05l2.12 2.12M9.83 9.83l2.12 2.12M9.83 4.17l2.12-2.12M2.05 11.95l2.12-2.12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
              {t(dict, "hero_badge")}
            </div>

            <h1 className="hero-title">
              {t(dict, "hero_title_main")}
              <span className="accent">{t(dict, "hero_title_accent")}</span>
            </h1>

            <p className="hero-sub">{t(dict, "hero_sub")}</p>

            <div className="hero-cta">
              <Link href={`${prefix}/register`} className="btn btn-primary btn-lg">
                {t(dict, "hero_cta_primary")}
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
              <Link href={`${prefix}/packages`} className="btn btn-outline btn-lg">
                {t(dict, "hero_cta_secondary")}
              </Link>
            </div>

            <div className="hero-trusted">
              <span className="trusted-dot"></span>
              {t(dict, "hero_trusted")}
            </div>
          </div>
        </div>

        <div className="hero-visual">
          <div className="hero-visual-bg"></div>
          <div className="hero-img-wrap">
            <img src={heroImg} alt={t(dict, "hero_image_alt")} />
            <div className="hero-img-overlay"></div>
            <div className="hero-img-caption">
              <div className="hero-img-label">{t(dict, "leaders_title")}</div>
              <div className="hero-img-sub">{t(dict, "values_subtitle")}</div>
            </div>
          </div>

          <div className="hero-float">
            <div className="hf-icon">🌍</div>
            <div>
              <div className="hf-val">{t(dict, "stat1_value")}</div>
              <div className="hf-label">{t(dict, "stat1_label")}</div>
            </div>
          </div>
        </div>
      </section>

      <section className="stats">
        <div className="container">
          <div className="stats-grid">
            {statsConfig.map((s) => (
              <div className="stat" key={s.labelKey}>
                <div className={`stat-icon ${s.tone}`}>{s.icon}</div>
                <div className="stat-val">{renderStatValue(t(dict, s.valueKey))}</div>
                <div className="stat-label">{t(dict, s.labelKey)}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="offer">
        <div className="container">
          <div className="section-header">
            <div className="eyebrow">{t(dict, "offer_title")}</div>
            <h2 className="section-title">{t(dict, "offer_subtitle")}</h2>
            <p className="section-sub">{t(dict, "digital_only_note")}</p>
          </div>

          <div className="offer-grid">
            {offerConfig.map((item) => (
              <article className={`offer-card ${item.tone}`} key={item.titleKey}>
                <div className="offer-icon">{item.icon}</div>
                <h3 className="offer-title">{t(dict, item.titleKey)}</h3>
                <p className="offer-p">{t(dict, item.textKey)}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="history">
        <div className="container">
          <div className="history-grid">
            <div className="history-media">
              <img src={historyImg} alt={t(dict, "history_image_alt")} />
              <div className="history-overlay"></div>
              <div className="history-year-badge">{t(dict, "timeline1_year")}</div>
            </div>

            <div className="history-copy">
              <div className="eyebrow">{t(dict, "history_title")}</div>
              <h2>{t(dict, "history_title")}</h2>
              <p>{t(dict, "history_p1")}</p>
              <p>{t(dict, "history_p2")}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="values">
        <div className="container">
          <div className="section-header">
            <div className="eyebrow">{t(dict, "values_title")}</div>
            <h2 className="section-title">{t(dict, "values_title")}</h2>
            <p className="section-sub">{t(dict, "values_subtitle")}</p>
          </div>

          <div className="values-grid">
            {valuesConfig.map((item) => (
              <article className="value-card" key={item.titleKey}>
                <div className="value-icon-wrap">
                  <img src={item.icon} alt="" aria-hidden="true" />
                </div>
                <h3 className="value-title">{t(dict, item.titleKey)}</h3>
                <p className="value-p">{t(dict, item.descKey)}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="life">
        <div className="container">
          <div className="life-grid">
            <div className="life-copy">
              <div className="eyebrow">{t(dict, "life_title")}</div>
              <h2>{t(dict, "life_title")}</h2>
              <p>{t(dict, "life_p1")}</p>
              <p>{t(dict, "life_p2")}</p>
            </div>

            <div className="life-media">
              <div className="life-img life-img-a">
                <img src={lifeImgA} alt={t(dict, "life_image_alt_1")} />
              </div>
              <div className="life-img life-img-b">
                <img src={lifeImgB} alt={t(dict, "life_image_alt_2")} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="timeline">
        <div className="container">
          <div className="section-header timeline-header">
            <div className="eyebrow">{t(dict, "timeline_title")}</div>
            <h2 className="section-title">{t(dict, "timeline_title")}</h2>
            <p className="section-sub">{t(dict, "timeline_subtitle")}</p>
          </div>

          <div className="timeline-grid">
            {timelineConfig.map((item, idx) => (
              <article className="timeline-card" key={item.yearKey}>
                <div className="timeline-num">{idx + 1}</div>
                <div className="timeline-year">{t(dict, item.yearKey)}</div>
                <p className="timeline-p">{t(dict, item.textKey)}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="leaders">
        <div className="container">
          <div className="section-header">
            <div className="eyebrow">{t(dict, "leaders_title")}</div>
            <h2 className="section-title">{t(dict, "leaders_title")}</h2>
            <p className="section-sub">{t(dict, "leaders_subtitle")}</p>
          </div>

          <div className="leaders-grid">
            {leadersConfig.map((leader) => (
              <article className="leader-card" key={leader.nameKey}>
                <div className="leader-media">
                  <img src={leader.img} alt={t(dict, leader.nameKey)} />
                  <div className="leader-overlay"></div>
                </div>
                <div className="leader-info">
                  <h3 className="leader-name">{t(dict, leader.nameKey)}</h3>
                  <p className="leader-role">{t(dict, leader.roleKey)}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="testimonials">
        <div className="container">
          <div className="section-header">
            <div className="eyebrow">{t(dict, "testimonials_title")}</div>
            <h2 className="section-title">{t(dict, "testimonials_title")}</h2>
            <p className="section-sub">{t(dict, "testimonials_subtitle")}</p>
          </div>

          <div className="quote-grid">
            {testimonialsConfig.map((item, idx) => {
              const name = t(dict, item.nameKey);
              return (
                <blockquote className="quote-card" key={`${item.quoteKey}-${idx}`}>
                  <div className="quote-stars" aria-label="5 out of 5 stars">★★★★★</div>
                  <p className="quote-text">&ldquo;{t(dict, item.quoteKey)}&rdquo;</p>
                  <footer className="quote-footer">
                    <div className="quote-avatar">{getInitials(name)}</div>
                    <div>
                      <div className="quote-name">{name}</div>
                      <div className="quote-company">{t(dict, item.companyKey)}</div>
                    </div>
                  </footer>
                </blockquote>
              );
            })}
          </div>
        </div>
      </section>

      <section className="cta-section">
        <div className="cta-wrap">
          <div className="cta-blob cta-blob-1"></div>
          <div className="cta-blob cta-blob-2"></div>
          <div className="cta-blob cta-blob-3"></div>

          <div className="cta-inner">
            <div className="cta-eyebrow">✦ {t(dict, "cta_primary")}</div>
            <h2 className="cta-title">{t(dict, "cta_title")}</h2>
            <p className="cta-sub">{t(dict, "cta_text")}</p>
            <p className="cta-email">
              {contactLead}{" "}
              <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
            </p>

            <div className="cta-btns">
              <Link href={`${prefix}/careers`} className="btn btn-cta-coral btn-lg">
                {t(dict, "cta_primary")}
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
              <Link href={`${prefix}/contact`} className="btn btn-cta-ghost btn-lg">
                {t(dict, "cta_secondary")}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </section>
  );
}
