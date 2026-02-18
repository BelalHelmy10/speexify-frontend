// app/page.js
"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import useAuth from "@/hooks/useAuth";
import "@/styles/home.scss";

import { getDictionary, t } from "./i18n"; // ✅ i18n
import FadeIn from "@/components/FadeIn";

export default function Page({ locale = "en" }) {
  const { user, checking } = useAuth();
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    if (checking) return;

    const dashboardPath = locale === "ar" ? "/ar/dashboard" : "/dashboard";

    if (user) {
      router.replace(params.get("next") || dashboardPath);
    }
  }, [checking, user, router, params, locale]);

  if (checking) return <div className="home-route-loading">Loading…</div>;
  if (user) return null;

  return <Home locale={locale} />;
}

/* ============================
   Home
   ============================ */
function Home({ locale = "en" }) {
  const dict = getDictionary(locale, "home");
  const prefix = locale === "ar" ? "/ar" : "";

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
                className="home-btn home-btn--primary home-btn--shine"
                href={`${prefix}/register`}
              >
                <span>{t(dict, "ctaPrimary")}</span>
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
                className="home-btn home-btn--ghost"
                href={`${prefix}/packages`}
              >
                {t(dict, "ctaSecondary")}
              </Link>
            </FadeIn>

            <FadeIn as="div" className="home-hero__stats" delay={0.6}>
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
            </FadeIn>
          </div>

          <div className="home-hero__media">
            <div className="home-media-card">
              <div className="home-media-card__glow"></div>
              <img
                src="/images/hero-photo.png"
                alt="Live English coaching product preview"
                className="home-media-card__img"
              />
              <div className="home-media-card__float home-media-card__float--1">
                <div className="home-float-badge">
                  <span className="home-float-badge__icon" aria-hidden="true">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <path d="M2 3.5C2 2.67 2.67 2 3.5 2h9C13.33 2 14 2.67 14 3.5v6c0 .83-.67 1.5-1.5 1.5H8L4.5 13V11H3.5C2.67 11 2 10.33 2 9.5v-6Z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M5 6h6M5 8.5h3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                    </svg>
                  </span>
                  <span className="home-float-badge__text">Live coaching</span>
                </div>
              </div>
              <div className="home-media-card__float home-media-card__float--2">
                <div className="home-float-badge">
                  <span className="home-float-badge__icon" aria-hidden="true">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <path d="M9.5 2L4 9h4.5L7.5 14l6-7H9l.5-5Z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <span className="home-float-badge__text">Instant feedback</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== SOCIAL PROOF ===== */}
      <section className="home-proof">
        <div className="home-container">
          <FadeIn as="p" className="home-proof__title">Trusted by teams at</FadeIn>
          <div className="home-proof__scroller">
            <div className="home-proof__logos">
              {/* Set 1 */}
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={`set1-${i}`} className="home-proof__logo-wrap">
                  <img
                    src={`/images/logo-${["amazon", "cocacola", "tesla", "allianz", "indeed"][i - 1]
                      }.svg`}
                    alt="Client Logo"
                    className="home-logo"
                  />
                </div>
              ))}
              {/* Set 2 (Duplicate for loop) */}
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={`set2-${i}`} className="home-proof__logo-wrap">
                  <img
                    src={`/images/logo-${["amazon", "cocacola", "tesla", "allianz", "indeed"][i - 1]
                      }.svg`}
                    alt="Client Logo"
                    className="home-logo"
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
      <section className="home-spx-how">
        <div className="home-container">
          <div className="home-section-header">
            <FadeIn as="h2" className="home-section-title">{t(dict, "how_title")}</FadeIn>
            <FadeIn as="p" className="home-section-subtitle" delay={0.1}>{t(dict, "how_subtitle")}</FadeIn>
          </div>

          <div className="home-spx-how__grid">
            <HowStep
              step="01"
              title={t(dict, "how_step1_title")}
              text={t(dict, "how_step1_text")}
              img="/images/how-step1.png"
            />
            <HowStep
              step="02"
              title={t(dict, "how_step2_title")}
              text={t(dict, "how_step2_text")}
              img="/images/how-step2.png"
            />
            <HowStep
              step="03"
              title={t(dict, "how_step3_title")}
              text={t(dict, "how_step3_text")}
              img="/images/how-step3.png"
            />
          </div>

          <div className="home-spx-how__cta">
            <Link
              className="home-btn home-btn--primary home-btn--shine"
              href={`${prefix}/register`}
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
            <Link
              className="home-btn home-btn--ghost"
              href={`${prefix}/contact`}
            >
              {t(dict, "how_cta_secondary")}
            </Link>
          </div>
        </div>
      </section>

      {/* ===== CURRICULUM ===== */}
      <section className="home-spx-curriculum">
        <div className="home-container">
          <div className="home-section-header">
            <FadeIn as="h2" className="home-section-title">{t(dict, "curr_title")}</FadeIn>
            <FadeIn as="p" className="home-section-subtitle" delay={0.1}>{t(dict, "curr_subtitle")}</FadeIn>
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
              className="home-btn home-btn--ghost"
              href={`${prefix}/packages`}
            >
              {t(dict, "curr_more")}
            </Link>
          </div>
        </div>
      </section>

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
              <button className="home-btn home-btn--primary" type="submit">
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

        <div className="home-container home-cta__inner">
          <div className="home-cta__content">
            <h3 className="home-cta__title">{t(dict, "cta_title")}</h3>
            <p className="home-cta__sub">{t(dict, "cta_sub")}</p>
          </div>
          <div className="home-cta__actions">
            <Link
              className="home-btn home-btn--primary home-btn--lg home-btn--shine"
              href={`${prefix}/register`}
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
              href={`${prefix}/contact`}
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
  const gridRef = useRef(null);

  useEffect(() => {
    const cards = gridRef.current?.querySelectorAll(".home-feature");
    if (!cards) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("home-feature--visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    cards.forEach((card) => observer.observe(card));
    return () => observer.disconnect();
  }, []);

  return (
    <section className="home-features">
      <div className="home-container">
        <div className="home-section-header home-features__header">
          <span className="home-features__eyebrow" aria-hidden="true">
            Why Speexify
          </span>
          <FadeIn as="h2" className="home-section-title home-features__title">
            {t(dict, "features_title")}
          </FadeIn>
          <FadeIn
            as="p"
            className="home-section-subtitle home-features__subtitle"
            delay={0.1}
          >
            {t(dict, "features_subtitle")}
          </FadeIn>
        </div>

        <div className="home-features__grid" ref={gridRef}>
          <Feature
            index={0}
            icon="chat"
            tone="orange"
            title={t(dict, "feature1_title")}
            text={t(dict, "feature1_text")}
          />
          <Feature
            index={1}
            icon="trophy"
            tone="blue"
            title={t(dict, "feature2_title")}
            text={t(dict, "feature2_text")}
          />
          <Feature
            index={2}
            icon="calendar"
            tone="yellow"
            title={t(dict, "feature3_title")}
            text={t(dict, "feature3_text")}
          />
          <Feature
            index={3}
            icon="bolt"
            tone="teal"
            title={t(dict, "feature4_title")}
            text={t(dict, "feature4_text")}
          />
        </div>
      </div>
    </section>
  );
}

function Feature({ icon, title, text, tone, index }) {
  return (
    <div
      className={`home-feature home-feature--${tone}`}
      style={{ "--card-index": index }}
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
