// web/app/about/AboutClient.jsx
"use client";

import React from "react";
import Link from "next/link";
import "@/styles/about.scss";

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

const stats = [
  { value: "6", label: "languages", icon: "🌍" },
  { value: "150+", label: "countries", icon: "🗺️" },
  { value: "100+", label: "industry-focused courses", icon: "📚" },
  { value: "24/7", label: "live instruction", icon: "⏰" },
];

const values = [
  {
    icon: valuesIconA,
    title: "We take action with empathy",
    desc: "Impact starts with understanding. We balance compassion with pragmatic thinking to make decisions that align with our mission.",
  },
  {
    icon: valuesIconB,
    title: "We communicate to drive impact",
    desc: "We foster transparency, ask the right questions, and embrace constructive dialogue to deliver outcomes that matter.",
  },
  {
    icon: valuesIconC,
    title: "We own our outcomes",
    desc: "Everyone holds the wheel. We approach obstacles with purpose, hold ourselves accountable, and focus on results.",
  },
  {
    icon: valuesIconD,
    title: "We embrace diverse perspectives",
    desc: "Different viewpoints lead to better solutions. We break down barriers so learners and teams can achieve their goals.",
  },
];

const timeline = [
  {
    year: "2018",
    text: "Speexify starts as a small tutoring collective focused on real-world English.",
  },
  {
    year: "2020",
    text: "Launched 24/7 scheduling and a global tutor network.",
  },
  {
    year: "2023",
    text: "Expanded corporate programs with role-specific learning paths.",
  },
  {
    year: "2025",
    text: "Introduced AI-assisted practice to personalize every session.",
  },
];

const leaders = [
  { img: leadBilly, name: "Belal Helmy", role: "Co-Founder & CEO" },
  { img: leadZiad, name: "Eliane Yumi Iwasaki", role: "Co-Founder & CEO" },
  { img: leadChris, name: "Christopher Osborn", role: "Engineering" },
];

const testimonials = [
  {
    quote:
      "Speexify sharpened our team's business English and saved hours each week. Practical, flexible, and effective.",
    name: "John Guthrie",
    company: "Hilton International",
    rating: 5,
  },
  {
    quote:
      "We saw remarkable improvement within weeks. The blend of live coaching and targeted content exceeded expectations.",
    name: "Donatella De Vita",
    company: "Pirelli",
    rating: 5,
  },
  {
    quote:
      "Speexify's structure makes it easy to satisfy different learning styles across our organization.",
    name: "Bogdan Dumitrascu",
    company: "Forvia",
    rating: 5,
  },
  {
    quote:
      "Adoption was smooth and impact was fast. Highly recommended for business communication.",
    name: "Meredith Taghi",
    company: "DHL Group",
    rating: 5,
  },
];

export default function AboutClient() {
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
              <span>Meet Speexify</span>
            </div>

            <h1 className="about__headline">
              Where language training meets
              <span className="about__headline-accent"> business needs</span>
            </h1>

            <p className="about__sub">
              We deliver job-specific programs that increase productivity,
              foster collaboration, and unlock people's potential with real
              conversations and measurable progress.
            </p>

            <div className="about-cta-row">
              <Link
                href="/demo"
                className="about-btn about-btn--primary about-btn--lg"
              >
                <span>Request a demo</span>
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
                href="/packages"
                className="about-btn about-btn--outline about-btn--lg"
              >
                See packages
              </Link>
            </div>
          </div>

          <div className="about__hero-right">
            <div className="about__hero-media">
              <div className="about__hero-media-glow"></div>
              <img src={heroImg} alt="Learner using Speexify" />
              <div className="about__hero-media-badge">
                <span className="about__hero-media-badge-dot"></span>
                <span>Trusted globally</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="about__stats">
        <div className="container about__stats-grid">
          {stats.map((s) => (
            <div className="about__stat" key={s.label}>
              <div className="about__stat-icon">{s.icon}</div>
              <div className="about__stat-value">{s.value}</div>
              <div className="about__stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* HISTORY */}
      <section className="about__history">
        <div className="container about__history-grid">
          <div className="about__history-media">
            <img src={historyImg} alt="Speexify team" />
            <div className="about__history-overlay"></div>
          </div>
          <div className="about__history-copy">
            <h2>Our history</h2>
            <p>
              Since our early days, we've supported learners in more than 150
              countries with live coaching from certified teachers and
              role-specific courses. Our approach bridges soft and technical
              skill gaps so teams can communicate, collaborate, and thrive.
            </p>
            <p>
              Today we're remote-first and globally distributed. We keep
              improving the craft—refining our curriculum, growing our community
              of tutors, and building tools that make progress inevitable.
            </p>
          </div>
        </div>
      </section>

      {/* VALUES */}
      <section className="about__values">
        <div className="container">
          <div className="about__section-header">
            <h2 className="about__section-title">Our values</h2>
            <p className="about__section-subtitle">
              The principles that guide everything we do
            </p>
          </div>

          <div className="about__values-grid">
            {values.map((v) => (
              <article className="about__value" key={v.title}>
                <div className="about__value-icon-wrap">
                  <img className="about__value-icon" src={v.icon} alt="" />
                </div>
                <h3>{v.title}</h3>
                <p>{v.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* LIFE @ SPEEXIFY */}
      <section className="about__life">
        <div className="container about__life-grid">
          <div className="about__life-copy">
            <h2>Life@Speexify</h2>
            <p>
              We're a remote dream team across multiple time zones. Despite the
              distance, we stay closely connected, collaborate effectively, and
              show up for each other and our learners.
            </p>
            <p>
              Diversity is our strength—we bring different perspectives to the
              table and stay united in the mission to break down language
              barriers.
            </p>
          </div>
          <div className="about__life-media">
            <img
              className="about__life-img about__life-img--top"
              src={lifeImgA}
              alt="Team event"
            />
            <img
              className="about__life-img about__life-img--bottom"
              src={lifeImgB}
              alt="Learning in action"
            />
          </div>
        </div>
      </section>

      {/* TIMELINE */}
      <section className="about__timeline">
        <div className="container">
          <div className="about__section-header">
            <h2 className="about__section-title">Our journey</h2>
            <p className="about__section-subtitle">
              Key milestones in our story
            </p>
          </div>

          <div className="about__timeline-grid">
            {timeline.map((t, idx) => (
              <div className="about__timeline-card" key={t.year}>
                <div className="about__timeline-number">{idx + 1}</div>
                <div className="about__timeline-year">{t.year}</div>
                <p>{t.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* LEADERSHIP */}
      <section className="about__leaders">
        <div className="container">
          <div className="about__section-header">
            <h2 className="about__section-title">
              Meet our executive leadership
            </h2>
            <p className="about__section-subtitle">
              The team driving our vision forward
            </p>
          </div>

          <div className="about__leader-grid">
            {leaders.map((l) => (
              <div className="about__leader" key={l.name}>
                <div className="about__leader-media">
                  <img src={l.img} alt={l.name} />
                  <div className="about__leader-overlay"></div>
                </div>
                <div className="about__leader-card">
                  <h4>{l.name}</h4>
                  <span>{l.role}</span>
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
            <h2 className="about__section-title">Hear it from our clients</h2>
            <p className="about__section-subtitle">
              Real results from real companies
            </p>
          </div>

          <div className="about__quote-grid">
            {testimonials.map((q, i) => (
              <blockquote className="about__quote" key={i}>
                <div className="about__quote-stars">
                  {[...Array(q.rating)].map((_, idx) => (
                    <span key={idx} className="about__quote-star">
                      ★
                    </span>
                  ))}
                </div>
                <p>"{q.quote}"</p>
                <footer>
                  <strong>{q.name}</strong>
                  <span>{q.company}</span>
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
          <h2>Join the Speexify team</h2>
          <p>
            Help us build the most effective, human-centered language learning
            platform in the world.
          </p>
          <div className="about-cta-row">
            <Link
              href="/careers"
              className="about-btn about-btn--secondary about-btn--lg"
            >
              <span>See open roles</span>
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
              href="/contact"
              className="about-btn about-btn--ghost about-btn--lg"
            >
              Connect with us
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
