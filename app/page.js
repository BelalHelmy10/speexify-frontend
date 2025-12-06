// app/page.js
"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import useAuth from "@/hooks/useAuth";
import "@/styles/home.scss";

import { getDictionary, t } from "./i18n"; // ✅ NEW

// (Global CSS note)
// Move this to app/layout.js:
// import "@/styles/home.scss";

export default function Page({ locale = "en" }) {
  const { user, checking } = useAuth();
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    if (checking) return;
    if (user) router.replace(params.get("next") || "/dashboard");
  }, [checking, user, router, params]);

  if (checking) return <div className="home-route-loading">Loading…</div>;
  if (user) return null;

  // Pass locale into Home so it can pick the right translations
  return <Home locale={locale} />;
}

/* ============================
   Home (inline, formerly Home.jsx)
   ============================ */
function Home({ locale = "en" }) {
  const dict = getDictionary(locale, "home"); // ✅ NEW

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
            <div className="home-hero__badge">
              <span className="home-hero__badge-icon">✦</span>
              <span>{t(dict, "badge")}</span> {/* ✅ translated */}
            </div>

            <h1 className="home-hero__title">
              {t(dict, "title")} {/* ✅ translated (full title) */}
            </h1>

            <p className="home-hero__sub">
              {t(dict, "subtitle")} {/* ✅ translated */}
            </p>

            <div className="home-hero__cta">
              <Link
                className="home-btn home-btn--primary home-btn--shine"
                href="/register"
              >
                <span>{t(dict, "ctaPrimary")}</span> {/* ✅ translated */}
                <svg
                  className="home-btn__arrow"
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
              <Link className="home-btn home-btn--ghost" href="/packages">
                {t(dict, "ctaSecondary")} {/* ✅ translated */}
              </Link>
            </div>

            <div className="home-hero__stats">
              <div className="home-hero__stat">
                <div className="home-hero__stat-num">98%</div>
                <div className="home-hero__stat-label">Client satisfaction</div>
              </div>
              <div className="home-hero__stat">
                <div className="home-hero__stat-num">50k+</div>
                <div className="home-hero__stat-label">Coaching hours</div>
              </div>
              <div className="home-hero__stat">
                <div className="home-hero__stat-num">2.7×</div>
                <div className="home-hero__stat-label">Faster outcomes</div>
              </div>
            </div>
          </div>

          <div className="home-hero__media">
            <div className="home-media-card">
              <div className="home-media-card__glow"></div>
              <img
                src="/images/Hero First.avif"
                alt="Live English coaching product preview"
                className="home-media-card__img"
              />
              <div className="home-media-card__float home-media-card__float--1">
                <div className="home-float-badge">
                  <span className="home-float-badge__icon">💬</span>
                  <span className="home-float-badge__text">Live coaching</span>
                </div>
              </div>
              <div className="home-media-card__float home-media-card__float--2">
                <div className="home-float-badge">
                  <span className="home-float-badge__icon">⚡</span>
                  <span className="home-float-badge__text">
                    Instant feedback
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== SOCIAL PROOF ===== */}
      <section className="home-proof">
        <div className="home-container">
          <p className="home-proof__title">Trusted by teams at</p>
          <div className="home-proof__logos">
            <div className="home-proof__logo-wrap">
              <img
                src="/images/logo-amazon.svg"
                alt="Amazon"
                className="home-logo"
              />
            </div>
            <div className="home-proof__logo-wrap">
              <img
                src="/images/logo-cocacola.svg"
                alt="Coca Cola"
                className="home-logo"
              />
            </div>
            <div className="home-proof__logo-wrap">
              <img
                src="/images/logo-tesla.svg"
                alt="Tesla"
                className="home-logo"
              />
            </div>
            <div className="home-proof__logo-wrap">
              <img
                src="/images/logo-allianz.svg"
                alt="Allianz"
                className="home-logo"
              />
            </div>
            <div className="home-proof__logo-wrap">
              <img
                src="/images/logo-indeed.svg"
                alt="Indeed"
                className="home-logo"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ===== FEATURES ===== */}
      <section className="home-features">
        <div className="home-container">
          <div className="home-section-header">
            <h2 className="home-section-title">{t(dict, "features_title")}</h2>
            <p className="home-section-subtitle">
              {t(dict, "features_subtitle")}
            </p>
          </div>

          <div className="home-features__grid">
            <Feature
              icon="🎯"
              title={t(dict, "feature1_title")}
              text={t(dict, "feature1_text")}
            />
            <Feature
              icon="⭐"
              title={t(dict, "feature2_title")}
              text={t(dict, "feature2_text")}
            />
            <Feature
              icon="📊"
              title={t(dict, "feature3_title")}
              text={t(dict, "feature3_text")}
            />
            <Feature
              icon="🚀"
              title={t(dict, "feature4_title")}
              text={t(dict, "feature4_text")}
            />
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      {/* ===== HOW IT WORKS ===== */}
      <section className="home-spx-how">
        <div className="home-container">
          <div className="home-section-header">
            <h2 className="home-section-title">{t(dict, "how_title")}</h2>
            <p className="home-section-subtitle">{t(dict, "how_subtitle")}</p>
          </div>

          <div className="home-spx-how__grid">
            <HowStep
              step="01"
              title={t(dict, "how_step1_title")}
              text={t(dict, "how_step1_text")}
              img="/images/assess.avif"
            />
            <HowStep
              step="02"
              title={t(dict, "how_step2_title")}
              text={t(dict, "how_step2_text")}
              img="/images/coach.avif"
            />
            <HowStep
              step="03"
              title={t(dict, "how_step3_title")}
              text={t(dict, "how_step3_text")}
              img="/images/apply.avif"
            />
          </div>

          <div className="home-spx-how__cta">
            <Link
              className="home-btn home-btn--primary home-btn--shine"
              href="/register"
            >
              <span>{t(dict, "how_cta_primary")}</span>
              <svg
                className="home-btn__arrow"
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
            <Link className="home-btn home-btn--ghost" href="/contact">
              {t(dict, "how_cta_secondary")}
            </Link>
          </div>
        </div>
      </section>

      {/* ===== CURRICULUM ===== */}
      {/* ===== CURRICULUM ===== */}
      <section className="home-spx-curriculum">
        <div className="home-container">
          <div className="home-section-header">
            <h2 className="home-section-title">{t(dict, "curr_title")}</h2>
            <p className="home-section-subtitle">{t(dict, "curr_subtitle")}</p>
          </div>

          <div className="home-spx-curriculum__grid">
            <CurriculumCard
              title={t(dict, "curr1_title")}
              desc={t(dict, "curr1_desc")}
              img="/images/client-communication.avif"
              color="blue"
            />
            <CurriculumCard
              title={t(dict, "curr2_title")}
              desc={t(dict, "curr2_desc")}
              img="/images/presentations.avif"
              color="purple"
            />
            <CurriculumCard
              title={t(dict, "curr3_title")}
              desc={t(dict, "curr3_desc")}
              img="/images/email-and-async.avif"
              color="green"
            />
            <CurriculumCard
              title={t(dict, "curr4_title")}
              desc={t(dict, "curr4_desc")}
              img="/images/leadership.avif"
              color="orange"
            />
          </div>

          <div className="home-spx-curriculum__more">
            <Link className="home-btn home-btn--ghost" href="/packages">
              {t(dict, "curr_more")}
            </Link>
          </div>
        </div>
      </section>

      {/* ===== COACHES ===== */}
      {/* ===== COACHES ===== */}
      <section className="home-spx-coaches">
        <div className="home-container">
          <div className="home-section-header">
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
            />
            <CoachCard
              name={t(dict, "coach2_name")}
              role={t(dict, "coach2_role")}
              bio={t(dict, "coach2_bio")}
              img="/images/ZiadAnwer.jpeg"
            />
            <CoachCard
              name={t(dict, "coach3_name")}
              role={t(dict, "coach3_role")}
              bio={t(dict, "coach3_bio")}
              img="/images/Lina.avif"
            />
          </div>

          <p className="home-spx-coaches__note">{t(dict, "coaches_note")}</p>
        </div>
      </section>

      {/* ===== CASE STUDIES ===== */}
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
      {/* ===== TESTIMONIALS ===== */}
      <section className="home-testimonials">
        <div className="home-container">
          <div className="home-testimonials__grid">
            <Quote
              quote={t(dict, "testi1_quote")}
              author={t(dict, "testi1_author")}
              role={t(dict, "testi1_role")}
              rating={5}
            />
            <Quote
              quote={t(dict, "testi2_quote")}
              author={t(dict, "testi2_author")}
              role={t(dict, "testi2_role")}
              rating={5}
            />
            <Quote
              quote={t(dict, "testi3_quote")}
              author={t(dict, "testi3_author")}
              role={t(dict, "testi3_role")}
              rating={5}
            />
          </div>
        </div>
      </section>

      {/* ===== FAQ ===== */}
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
              <button className="home-btn home-btn--primary" type="submit">
                {t(dict, "newsletter_button")}
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      {/* ===== CTA ===== */}
      <section className="home-cta">
        <div className="home-cta__background">
          <div className="home-cta__gradient"></div>
          <div className="home-cta__shapes">
            <div className="home-cta__shape home-cta__shape--1"></div>
            <div className="home-cta__shape home-cta__shape--2"></div>
          </div>
        </div>

        <div className="home-container home-cta__inner">
          <div className="home-cta__content">
            <h3 className="home-cta__title">{t(dict, "cta_title")}</h3>
            <p className="home-cta__sub">{t(dict, "cta_sub")}</p>
          </div>
          <div className="home-cta__actions">
            <Link
              className="home-btn home-btn--primary home-btn--lg home-btn--shine"
              href="/register"
            >
              <span>{t(dict, "cta_primary")}</span>
              <svg
                className="home-btn__arrow"
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
              className="home-btn home-btn--ghost home-btn--lg"
              href="/contact"
            >
              {t(dict, "cta_secondary")}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ========== Local UI bits (unchanged except class names) ========== */
function Feature({ icon, title, text }) {
  return (
    <div className="home-feature">
      <div className="home-feature__icon" aria-hidden="true">
        <span>{icon}</span>
      </div>
      <h3 className="home-feature__title">{title}</h3>
      <p className="home-feature__text">{text}</p>
    </div>
  );
}

function Quote({ quote, author, role, rating }) {
  return (
    <figure className="home-quote">
      <div className="home-quote__stars" aria-hidden="true">
        {Array.from({ length: rating }).map((_, i) => (
          <span key={i} className="home-quote__star">
            ★
          </span>
        ))}
      </div>
      <blockquote>"{quote}"</blockquote>
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
        <img src={img} alt="" />
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
      <div className="home-spx-curriculum__thumb">
        <img src={img} alt="" />
        <div className="home-spx-curriculum__overlay"></div>
      </div>
      <div className="home-spx-curriculum__content">
        <h3>{title}</h3>
        <p>{desc}</p>
      </div>
    </article>
  );
}

function CoachCard({ name, role, bio, img }) {
  return (
    <div className="home-spx-coaches__card">
      <div className="home-spx-coaches__avatar-wrap">
        <img className="home-spx-coaches__avatar" src={img} alt={name} />
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
          <img src={logo} alt="" />
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
