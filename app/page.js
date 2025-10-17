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

  if (checking) return <div className="route-loading">Loading…</div>;
  if (user) return null;
  return <Home />;
}

/* ============================
   Home (inline, formerly Home.jsx)
   ============================ */
function Home() {
  return (
    <div className="home">
      {/* ===== HERO ===== */}
      <section className="hero">
        <div className="hero__background">
          <div className="hero__gradient"></div>
          <div className="hero__grid-pattern"></div>
        </div>

        <div className="hero__grid container">
          <div className="hero__copy">
            <div className="hero__badge">
              <span className="hero__badge-icon">✦</span>
              <span>Language &amp; communication coaching</span>
            </div>

            <h1 className="hero__title">
              Empower your team to
              <span className="hero__title-accent"> speak with confidence</span>
            </h1>

            <p className="hero__sub">
              Speexify delivers personalized English coaching and applied
              learning programs that drive measurable performance at work.
            </p>

            <div className="hero__cta">
              <Link className="btn btn--primary btn--shine" href="/register">
                <span>Get started</span>
                <svg
                  className="btn__arrow"
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
              <Link className="btn btn--ghost" href="/packages">
                Explore packages
              </Link>
            </div>

            <div className="hero__stats">
              <div className="hero__stat">
                <div className="hero__stat-num">98%</div>
                <div className="hero__stat-label">Client satisfaction</div>
              </div>
              <div className="hero__stat">
                <div className="hero__stat-num">50k+</div>
                <div className="hero__stat-label">Coaching hours</div>
              </div>
              <div className="hero__stat">
                <div className="hero__stat-num">2.4×</div>
                <div className="hero__stat-label">Faster outcomes</div>
              </div>
            </div>
          </div>

          <div className="hero__media">
            <div className="media-card">
              <div className="media-card__glow"></div>
              <img
                src="/images/Hero First.avif"
                alt="Live English coaching product preview"
                className="media-card__img"
              />
              <div className="media-card__float media-card__float--1">
                <div className="float-badge">
                  <span className="float-badge__icon">💬</span>
                  <span className="float-badge__text">Live coaching</span>
                </div>
              </div>
              <div className="media-card__float media-card__float--2">
                <div className="float-badge">
                  <span className="float-badge__icon">⚡</span>
                  <span className="float-badge__text">Instant feedback</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== SOCIAL PROOF ===== */}
      <section className="proof">
        <div className="container">
          <p className="proof__title">Trusted by teams at</p>
          <div className="proof__logos">
            <div className="proof__logo-wrap">
              <img
                src="/images/logo-amazon.svg"
                alt="Amazon"
                className="logo"
              />
            </div>
            <div className="proof__logo-wrap">
              <img
                src="/images/logo-cocacola.svg"
                alt="Coca Cola"
                className="logo"
              />
            </div>
            <div className="proof__logo-wrap">
              <img src="/images/logo-tesla.svg" alt="Tesla" className="logo" />
            </div>
            <div className="proof__logo-wrap">
              <img
                src="/images/logo-allianz.svg"
                alt="Allianz"
                className="logo"
              />
            </div>
            <div className="proof__logo-wrap">
              <img
                src="/images/logo-indeed.svg"
                alt="Indeed"
                className="logo"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ===== FEATURES ===== */}
      <section className="features">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Why Speexify</h2>
            <p className="section-subtitle">
              Everything you need to master professional communication
            </p>
          </div>

          <div className="features__grid">
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
      <section className="spx-home-how">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">How it works</h2>
            <p className="section-subtitle">
              Three simple steps to transformation
            </p>
          </div>

          <div className="spx-home-how__grid">
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

          <div className="spx-home-how__cta">
            <Link className="btn btn--primary btn--shine" href="/register">
              <span>Start your assessment</span>
              <svg
                className="btn__arrow"
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
            <Link className="btn btn--ghost" href="/contact">
              Ask a question
            </Link>
          </div>
        </div>
      </section>

      {/* ===== CURRICULUM ===== */}
      <section className="spx-home-curriculum">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">What you'll learn</h2>
            <p className="section-subtitle">
              Practical, job-ready modules you can apply the same day
            </p>
          </div>

          <div className="spx-home-curriculum__grid">
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

          <div className="spx-home-curriculum__more">
            <Link className="btn btn--ghost" href="/packages">
              See full track list
            </Link>
          </div>
        </div>
      </section>

      {/* ===== COACHES ===== */}
      <section className="spx-home-coaches">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Meet a few of our coaches</h2>
            <p className="section-subtitle">
              Expert trainers with real-world business experience
            </p>
          </div>

          <div className="spx-home-coaches__grid">
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

          <p className="spx-home-coaches__note">
            We'll match you with the perfect coach for your goals
          </p>
        </div>
      </section>

      {/* ===== CASE STUDIES ===== */}
      <section className="spx-home-cases">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Real outcomes</h2>
            <p className="section-subtitle">
              See how teams are transforming their communication
            </p>
          </div>

          <div className="spx-home-cases__grid">
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
      <section className="testimonials">
        <div className="container">
          <div className="testimonials__grid">
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
      <section className="spx-home-faq">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Frequently asked questions</h2>
            <p className="section-subtitle">
              Everything you need to know to get started
            </p>
          </div>

          <div className="spx-home-faq__grid">
            <details className="spx-home-faq__item">
              <summary>How do you match me with a coach?</summary>
              <p>
                We consider your goals, current level, industry, and schedule to
                suggest the best coach profiles for you or your team.
              </p>
            </details>
            <details className="spx-home-faq__item">
              <summary>Can I switch coaches later?</summary>
              <p>
                Absolutely. If the fit isn't right, you can switch anytime
                without losing progress.
              </p>
            </details>
            <details className="spx-home-faq__item">
              <summary>Do you offer corporate packages?</summary>
              <p>
                Yes — we support budget controls, reporting, and manager
                dashboards for teams.
              </p>
            </details>
            <details className="spx-home-faq__item">
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
      <section className="spx-home-newsletter">
        <div className="container">
          <div className="spx-home-newsletter__inner">
            <div className="spx-home-newsletter__copy">
              <h3>Get actionable communication tips</h3>
              <p>Monthly insights from coaches — no spam, just value.</p>
            </div>
            <form
              className="spx-home-newsletter__form"
              onSubmit={(e) => e.preventDefault()}
            >
              <input
                type="email"
                placeholder="Enter your email"
                aria-label="Email"
                className="spx-home-newsletter__input"
              />
              <button className="btn btn--primary" type="submit">
                Subscribe
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="cta">
        <div className="cta__background">
          <div className="cta__gradient"></div>
          <div className="cta__shapes">
            <div className="cta__shape cta__shape--1"></div>
            <div className="cta__shape cta__shape--2"></div>
          </div>
        </div>

        <div className="container cta__inner">
          <div className="cta__content">
            <h3 className="cta__title">Ready to accelerate your English?</h3>
            <p className="cta__sub">
              Join Speexify today — start with a personalized plan in minutes.
            </p>
          </div>
          <div className="cta__actions">
            <Link
              className="btn btn--primary btn--lg btn--shine"
              href="/register"
            >
              <span>Create your account</span>
              <svg
                className="btn__arrow"
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
            <Link className="btn btn--ghost btn--lg" href="/contact">
              Talk to us
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ========== Local UI bits (unchanged) ========== */
function Feature({ icon, title, text }) {
  return (
    <div className="feature">
      <div className="feature__icon" aria-hidden="true">
        <span>{icon}</span>
      </div>
      <h3 className="feature__title">{title}</h3>
      <p className="feature__text">{text}</p>
    </div>
  );
}

function Quote({ quote, author, role, rating }) {
  return (
    <figure className="quote">
      <div className="quote__stars" aria-hidden="true">
        {Array.from({ length: rating }).map((_, i) => (
          <span key={i} className="quote__star">
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
    <div className="spx-home-how__card">
      <div className="spx-home-how__media">
        <img src={img} alt="" />
        <span className="spx-home-how__badge">{step}</span>
      </div>
      <div className="spx-home-how__body">
        <h3>{title}</h3>
        <p>{text}</p>
      </div>
    </div>
  );
}

function CurriculumCard({ title, desc, img, color }) {
  return (
    <article
      className={`spx-home-curriculum__card spx-home-curriculum__card--${color}`}
    >
      <div className="spx-home-curriculum__thumb">
        <img src={img} alt="" />
        <div className="spx-home-curriculum__overlay"></div>
      </div>
      <div className="spx-home-curriculum__content">
        <h3>{title}</h3>
        <p>{desc}</p>
      </div>
    </article>
  );
}

function CoachCard({ name, role, bio, img }) {
  return (
    <div className="spx-home-coaches__card">
      <div className="spx-home-coaches__avatar-wrap">
        <img className="spx-home-coaches__avatar" src={img} alt={name} />
        <div className="spx-home-coaches__avatar-ring"></div>
      </div>
      <div className="spx-home-coaches__info">
        <h3>{name}</h3>
        <p className="spx-home-coaches__role">{role}</p>
        <p className="spx-home-coaches__bio">{bio}</p>
      </div>
    </div>
  );
}

function CaseCard({ logo, title, text, metric, metricLabel }) {
  return (
    <div className="spx-home-cases__card">
      <div className="spx-home-cases__header">
        <div className="spx-home-cases__logo">
          <img src={logo} alt="" />
        </div>
        <div className="spx-home-cases__metric">
          <div className="spx-home-cases__metric-num">{metric}</div>
          <div className="spx-home-cases__metric-label">{metricLabel}</div>
        </div>
      </div>
      <div className="spx-home-cases__content">
        <h3>{title}</h3>
        <p>{text}</p>
      </div>
    </div>
  );
}
