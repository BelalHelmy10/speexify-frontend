// app/page.js
"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import useAuth from "@/hooks/useAuth";
import "@/styles/home.scss";

// (Global CSS note)
// Move this to app/layout.js:
// import "@/styles/home.scss";

export default function Page() {
  const { user, checking } = useAuth();
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    if (checking) return;
    if (user) router.replace(params.get("next") || "/dashboard");
  }, [checking, user, router, params]);

  if (checking) return <div className="home-route-loading">Loading…</div>;
  if (user) return null;
  return <Home />;
}

/* ============================
   Home (inline, formerly Home.jsx)
   ============================ */
function Home() {
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
              <span>Language &amp; communication coaching</span>
            </div>

            <h1 className="home-hero__title">
              Empower your team to
              <span className="home-hero__title-accent">
                {" "}
                speak with confidence
              </span>
            </h1>

            <p className="home-hero__sub">
              Speexify delivers personalized English coaching and applied
              learning programs that drive measurable performance at work.
            </p>

            <div className="home-hero__cta">
              <Link
                className="home-btn home-btn--primary home-btn--shine"
                href="/register"
              >
                <span>Get started</span>
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
                Explore packages
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
            <h2 className="home-section-title">Why Speexify</h2>
            <p className="home-section-subtitle">
              Everything you need to master professional communication
            </p>
          </div>

          <div className="home-features__grid">
            <Feature
              icon="🎯"
              title="Personalized coaching"
              text="A tailored plan built around your role, goals, and level. Learn what actually helps you succeed at work."
            />
            <Feature
              icon="⭐"
              title="Top-tier coaches"
              text="Hand-picked, experienced trainers with business expertise — not just grammar."
            />
            <Feature
              icon="📊"
              title="Flexible & measurable"
              text="Book sessions around your schedule and track progress with clear milestones and reports."
            />
            <Feature
              icon="🚀"
              title="For individuals & teams"
              text="From solo learners to company programs — Speexify scales with your needs."
            />
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section className="home-spx-how">
        <div className="home-container">
          <div className="home-section-header">
            <h2 className="home-section-title">How it works</h2>
            <p className="home-section-subtitle">
              Three simple steps to transformation
            </p>
          </div>

          <div className="home-spx-how__grid">
            <HowStep
              step="01"
              title="Assess"
              text="Complete a quick skills & goals survey to personalize your plan."
              img="/images/assess.avif"
            />
            <HowStep
              step="02"
              title="Coach"
              text="Meet 1:1 with a coach matched to your role & industry."
              img="/images/coach.avif"
            />
            <HowStep
              step="03"
              title="Apply"
              text="Practice with real work scenarios and measure improvement."
              img="/images/apply.avif"
            />
          </div>

          <div className="home-spx-how__cta">
            <Link
              className="home-btn home-btn--primary home-btn--shine"
              href="/register"
            >
              <span>Start your assessment</span>
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
              Ask a question
            </Link>
          </div>
        </div>
      </section>

      {/* ===== CURRICULUM ===== */}
      <section className="home-spx-curriculum">
        <div className="home-container">
          <div className="home-section-header">
            <h2 className="home-section-title">What you'll learn</h2>
            <p className="home-section-subtitle">
              Practical, job-ready modules you can apply the same day
            </p>
          </div>

          <div className="home-spx-curriculum__grid">
            <CurriculumCard
              title="Client communication"
              desc="Run structured calls, handle objections, and summarize clearly."
              img="/images/client-communication.avif"
              color="blue"
            />
            <CurriculumCard
              title="Presentations"
              desc="Build confident narratives with visuals and engaging delivery."
              img="/images/presentations.avif"
              color="purple"
            />
            <CurriculumCard
              title="Email & async"
              desc="Write crisp, professional messages that get quick responses."
              img="/images/email-and-async.avif"
              color="green"
            />
            <CurriculumCard
              title="Leadership"
              desc="Drive decisions, give feedback, and influence across teams."
              img="/images/leadership.avif"
              color="orange"
            />
          </div>

          <div className="home-spx-curriculum__more">
            <Link className="home-btn home-btn--ghost" href="/packages">
              See full track list
            </Link>
          </div>
        </div>
      </section>

      {/* ===== COACHES ===== */}
      <section className="home-spx-coaches">
        <div className="home-container">
          <div className="home-section-header">
            <h2 className="home-section-title">Meet a few of our coaches</h2>
            <p className="home-section-subtitle">
              Expert trainers with real-world business experience
            </p>
          </div>

          <div className="home-spx-coaches__grid">
            <CoachCard
              name="Billy H."
              role="Senior Communication Coach"
              bio="Former enterprise trainer; specializes in client-facing roles."
              img="/images/Billy.jpeg"
            />
            <CoachCard
              name="Zee A."
              role="Presentation & Storytelling"
              bio="Ex-consultant; helps craft persuasive narratives for execs."
              img="/images/ZiadAnwer.jpeg"
            />
            <CoachCard
              name="Lina T."
              role="Leadership Communication"
              bio="Led global teams; mentors managers on clarity and influence."
              img="/images/Lina.avif"
            />
          </div>

          <p className="home-spx-coaches__note">
            We'll match you with the perfect coach for your goals
          </p>
        </div>
      </section>

      {/* ===== CASE STUDIES ===== */}
      <section className="home-spx-cases">
        <div className="home-container">
          <div className="home-section-header">
            <h2 className="home-section-title">Real outcomes</h2>
            <p className="home-section-subtitle">
              See how teams are transforming their communication
            </p>
          </div>

          <div className="home-spx-cases__grid">
            <CaseCard
              logo="/images/logo-indeed.svg"
              title="Onboarding made faster"
              text="A support team reduced average handle time by 22% with clearer call structures."
              metric="22%"
              metricLabel="faster"
            />
            <CaseCard
              logo="/images/logo-amazon.svg"
              title="Meetings that decide"
              text="A product trio cut weekly syncs by 30% using agenda-first updates."
              metric="30%"
              metricLabel="less time"
            />
            <CaseCard
              logo="/images/logo-allianz.svg"
              title="Sales confidence"
              text="Reps improved objection handling and boosted close rates in Q2."
              metric="2.1×"
              metricLabel="close rate"
            />
          </div>
        </div>
      </section>

      {/* ===== TESTIMONIALS ===== */}
      <section className="home-testimonials">
        <div className="home-container">
          <div className="home-testimonials__grid">
            <Quote
              quote="My coach helped me nail tough client calls. I feel confident and clear."
              author="Sara M."
              role="Customer Success"
              rating={5}
            />
            <Quote
              quote="Our team's communication improved in weeks — meetings are faster and decisions clearer."
              author="Ahmed K."
              role="Team Lead"
              rating={5}
            />
            <Quote
              quote="The sessions are practical and fun. I can see progress after every call."
              author="Javier R."
              role="Product Manager"
              rating={5}
            />
          </div>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section className="home-spx-faq">
        <div className="home-container">
          <div className="home-section-header">
            <h2 className="home-section-title">Frequently asked questions</h2>
            <p className="home-section-subtitle">
              Everything you need to know to get started
            </p>
          </div>

          <div className="home-spx-faq__grid">
            <details className="home-spx-faq__item">
              <summary>How do you match me with a coach?</summary>
              <p>
                We consider your goals, current level, industry, and schedule to
                suggest the best coach profiles for you or your team.
              </p>
            </details>
            <details className="home-spx-faq__item">
              <summary>Can I switch coaches later?</summary>
              <p>
                Absolutely. If the fit isn't right, you can switch anytime
                without losing progress.
              </p>
            </details>
            <details className="home-spx-faq__item">
              <summary>Do you offer corporate packages?</summary>
              <p>
                Yes — we support budget controls, reporting, and manager
                dashboards for teams.
              </p>
            </details>
            <details className="home-spx-faq__item">
              <summary>What's the time commitment?</summary>
              <p>
                Most learners do 1–2 sessions per week plus short, role-based
                practice.
              </p>
            </details>
          </div>
        </div>
      </section>

      {/* ===== NEWSLETTER ===== */}
      <section className="home-spx-newsletter">
        <div className="home-container">
          <div className="home-spx-newsletter__inner">
            <div className="home-spx-newsletter__copy">
              <h3>Get actionable communication tips</h3>
              <p>Monthly insights from coaches — no spam, just value.</p>
            </div>
            <form
              className="home-spx-newsletter__form"
              onSubmit={(e) => e.preventDefault()}
            >
              <input
                type="email"
                placeholder="Enter your email"
                aria-label="Email"
                className="home-spx-newsletter__input"
              />
              <button className="home-btn home-btn--primary" type="submit">
                Subscribe
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
            <h3 className="home-cta__title">
              Ready to accelerate your English?
            </h3>
            <p className="home-cta__sub">
              Join Speexify today — start with a personalized plan in minutes.
            </p>
          </div>
          <div className="home-cta__actions">
            <Link
              className="home-btn home-btn--primary home-btn--lg home-btn--shine"
              href="/register"
            >
              <span>Create your account</span>
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
              Talk to us
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
