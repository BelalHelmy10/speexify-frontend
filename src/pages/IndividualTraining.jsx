"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import useAuth from "../hooks/useAuth";
import api from "../lib/api";
import "../styles/individual.scss";

function Individual() {
  const { user } = useAuth();
  const formRef = useRef(null);

  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    timezone: "",
    level: "A2 (Elementary)",
    goal: "Speak more confidently",
    availability: "Weekdays",
    message: "",
    agree: false,
  });

  useEffect(() => {
    if (!user) return;
    setForm((f) => ({
      ...f,
      name: f.name || user.name || "",
      email: f.email || user.email || "",
    }));
  }, [user]);

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setStatus("");
    if (!form.name || !form.email || !form.agree) {
      setStatus("Please fill the required fields.");
      return;
    }
    setSending(true);
    try {
      await api.post("/api/contact", {
        name: form.name,
        email: form.email,
        role: "Individual",
        topic: "Trial / Consult",
        budget: "",
        message: `Level: ${form.level}\nGoal: ${form.goal}\nTimezone: ${
          form.timezone
        }\nAvailability: ${form.availability}\n\n${form.message || ""}`,
      });
      setStatus("Thanks! We'll email you to schedule a quick consult.");
      formRef.current?.reset();
      setForm((f) => ({ ...f, message: "", agree: false }));
    } catch (_err) {
      const subject = encodeURIComponent(`[Individual] ${form.goal}`);
      const body = encodeURIComponent(
        `Name: ${form.name}\nEmail: ${form.email}\nLevel: ${form.level}\nGoal: ${form.goal}\nTimezone: ${form.timezone}\nAvailability: ${form.availability}\n\n${form.message}`
      );
      window.location.href = `mailto:hello@speexify.com?subject=${subject}&body=${body}`;
      setStatus(
        "Opened your email client. If that didn't work, email hello@speexify.com."
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="ind">
      {/* HERO */}
      <section className="ind-hero">
        <div className="ind-hero__background">
          <div className="ind-hero__gradient"></div>
          <div className="ind-hero__pattern"></div>
        </div>

        <div className="container ind-hero__inner">
          <div className="ind-hero__copy">
            <div className="ind-hero__badge">
              <span className="ind-hero__badge-icon">✨</span>
              <span>Personalized 1:1 coaching</span>
            </div>

            <h1 className="ind-hero__title">
              Speak English with
              <span className="ind-hero__title-accent"> confidence</span>
            </h1>

            <p className="ind-hero__subtitle">
              1:1 coaching focused on your real life — interviews, meetings,
              travel, or exams. Improve fast with clear goals, practical
              language, and coach feedback.
            </p>

            <div className="ind-hero__actions">
              <a href="#trial" className="btn btn--primary btn--shine">
                <span>Book a free consult</span>
                <svg
                  className="btn__arrow"
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
              </a>
              <Link href="/packages" className="btn btn--ghost">
                See packages
              </Link>
            </div>

            <div className="ind-hero__features">
              <div className="ind-hero__feature">
                <svg
                  className="ind-hero__feature-icon"
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                >
                  <path
                    d="M7 10L9 12L13 8M19 10C19 14.9706 14.9706 19 10 19C5.02944 19 1 14.9706 1 10C1 5.02944 5.02944 1 10 1C14.9706 1 19 5.02944 19 10Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span>Flexible scheduling</span>
              </div>
              <div className="ind-hero__feature">
                <svg
                  className="ind-hero__feature-icon"
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                >
                  <path
                    d="M7 10L9 12L13 8M19 10C19 14.9706 14.9706 19 10 19C5.02944 19 1 14.9706 1 10C1 5.02944 5.02944 1 10 1C14.9706 1 19 5.02944 19 10Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span>Expert coaches</span>
              </div>
              <div className="ind-hero__feature">
                <svg
                  className="ind-hero__feature-icon"
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                >
                  <path
                    d="M7 10L9 12L13 8M19 10C19 14.9706 14.9706 19 10 19C5.02944 19 1 14.9706 1 10C1 5.02944 5.02944 1 10 1C14.9706 1 19 5.02944 19 10Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span>Real progress</span>
              </div>
            </div>
          </div>

          <figure className="ind-hero__media">
            <div className="ind-hero__media-glow"></div>
            <img
              src="/images/learner-practicing-with-a-coach.avif"
              alt="Learner practicing with a coach"
              loading="eager"
            />
            <div className="ind-hero__media-badge">
              <span className="ind-hero__media-badge-dot"></span>
              <span>Live coaching sessions</span>
            </div>
          </figure>
        </div>
      </section>

      {/* METRICS */}
      <section className="container ind-metrics">
        <div className="grid-3">
          <MetricCard
            metric="+3×"
            label="more speaking time than group classes"
            icon="📈"
          />
          <MetricCard metric="4.9/5" label="average coach rating" icon="⭐" />
          <MetricCard
            metric="6–8 wks"
            label="visible confidence gains"
            icon="🎯"
          />
        </div>
      </section>

      {/* WHO IT'S FOR */}
      <section className="container ind-goals">
        <div className="section-header">
          <h2 className="section-title">Built for your goals</h2>
          <p className="section-subtitle">
            Choose your focus area and we'll customize your learning path
          </p>
        </div>

        <div className="ind-goals__grid">
          <Goal
            title="Work & interviews"
            p="Practice interviews, meetings, and presentations. Get language you can use tomorrow."
            img="/images/interviews.avif"
          />
          <Goal
            title="Fluency & conversation"
            p="Sound natural in daily life. Build vocabulary and confidence with guided speaking."
            img="/images/speaking.avif"
          />
          <Goal
            title="Exams & study"
            p="Prepare for IELTS/TOEFL or university speaking tasks with targeted feedback."
            img="/images/exams.avif"
          />
        </div>

        <div className="ind-goals__cta">
          <a href="#trial" className="btn btn--ghost">
            Talk to a coach
          </a>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="container ind-how">
        <div className="section-header">
          <h2 className="section-title">How it works</h2>
          <p className="section-subtitle">
            Simple steps to get started and keep improving
          </p>
        </div>

        <div className="ind-steps">
          <Step n="1" title="Quick consult">
            Share goals and schedule. We match you with the right coach.
          </Step>
          <Step n="2" title="Personal plan">
            Weekly 1:1 sessions with practice between lessons.
          </Step>
          <Step n="3" title="Real progress">
            Regular feedback, pronunciation tune-ups, and clear milestones.
          </Step>
        </div>
      </section>

      {/* WHAT YOU'LL LEARN */}
      <section className="container ind-learn">
        <div className="section-header">
          <h2 className="section-title">What you'll learn</h2>
          <p className="section-subtitle">
            Practical modules customized to your level (A1–C2)
          </p>
        </div>

        <ul className="chips">
          <li>Everyday conversation</li>
          <li>Work meetings</li>
          <li>Interview prep</li>
          <li>Presentation skills</li>
          <li>Pronunciation & stress</li>
          <li>Email & chat tone</li>
          <li>Vocabulary building</li>
          <li>Listening strategies</li>
        </ul>
      </section>

      {/* TESTIMONIALS */}
      <section className="container ind-testimonials">
        <div className="section-header">
          <h2 className="section-title">What our learners say</h2>
          <p className="section-subtitle">
            Real stories from people just like you
          </p>
        </div>

        <div className="grid-3">
          <Testimonial
            quote="I finally feel comfortable leading meetings. My coach made it practical and fun."
            by="Sara"
            role="Software Engineer"
            avatar="/images/sara.avif"
            rating={5}
          />
          <Testimonial
            quote="Two months with Speexify did more than a year of classes."
            by="Ali"
            role="MSc Student"
            avatar="/images/ali.avif"
            rating={5}
          />
          <Testimonial
            quote="The interview practice helped me get an offer. Totally worth it."
            by="Marta"
            role="Product Designer"
            avatar="/images/marta.avif"
            rating={5}
          />
        </div>
      </section>

      {/* TRIAL / CONSULT FORM */}
      <section id="trial" className="container ind-trial">
        <div className="ind-trial__card">
          <div className="section-header">
            <h2 className="section-title">Book a free consult</h2>
            <p className="section-subtitle">
              Tell us a bit about you — we'll match a coach and set up a call
            </p>
          </div>

          <form ref={formRef} onSubmit={submit} className="rfp">
            <div className="rfp__row">
              <Field label="Full name*" name="name">
                <input
                  className="input"
                  name="name"
                  value={form.name}
                  onChange={onChange}
                  required
                />
              </Field>
              <Field label="Email*" name="email">
                <input
                  className="input"
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={onChange}
                  required
                />
              </Field>
            </div>

            <div className="rfp__row rfp__row--3">
              <Field label="Timezone" name="timezone">
                <input
                  className="input"
                  name="timezone"
                  placeholder="e.g., Europe/London"
                  value={form.timezone}
                  onChange={onChange}
                />
              </Field>
              <Field label="Level" name="level">
                <select
                  className="select"
                  name="level"
                  value={form.level}
                  onChange={onChange}
                >
                  <option>A2 (Elementary)</option>
                  <option>B1 (Intermediate)</option>
                  <option>B2 (Upper-Intermediate)</option>
                  <option>C1 (Advanced)</option>
                  <option>C2 (Proficient)</option>
                </select>
              </Field>
              <Field label="Availability" name="availability">
                <select
                  className="select"
                  name="availability"
                  value={form.availability}
                  onChange={onChange}
                >
                  <option>Weekdays</option>
                  <option>Weeknights</option>
                  <option>Weekends</option>
                </select>
              </Field>
            </div>

            <div className="rfp__row">
              <Field label="Main goal" name="goal">
                <select
                  className="select"
                  name="goal"
                  value={form.goal}
                  onChange={onChange}
                >
                  <option>Speak more confidently</option>
                  <option>Interview preparation</option>
                  <option>Improve pronunciation</option>
                  <option>Emails & writing</option>
                  <option>Exam preparation (IELTS/TOEFL)</option>
                </select>
              </Field>
              <Field label="Anything else?" name="message">
                <input
                  className="input"
                  name="message"
                  placeholder="Optional note"
                  value={form.message}
                  onChange={onChange}
                />
              </Field>
            </div>

            <label className="checkbox">
              <input
                type="checkbox"
                name="agree"
                checked={form.agree}
                onChange={onChange}
              />
              <span>
                I agree to the{" "}
                <Link href="/privacy" className="link">
                  privacy policy
                </Link>
                .
              </span>
            </label>

            <div className="actions">
              <button
                className="btn btn--primary btn--shine"
                type="submit"
                disabled={sending}
              >
                {sending ? "Sending…" : "Request consult"}
              </button>
              {status && (
                <span className="form-status" role="status" aria-live="polite">
                  {status}
                </span>
              )}
            </div>
          </form>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="ind-cta">
        <div className="ind-cta__background">
          <div className="ind-cta__gradient"></div>
          <div className="ind-cta__shapes">
            <div className="ind-cta__shape ind-cta__shape--1"></div>
            <div className="ind-cta__shape ind-cta__shape--2"></div>
          </div>
        </div>

        <div className="container ind-cta__inner">
          <div className="ind-cta__content">
            <h2 className="ind-cta__title">Ready to get started?</h2>
            <p className="ind-cta__subtitle">
              Join hundreds of learners transforming their English
            </p>
          </div>
          <div className="ind-cta__actions">
            <a href="#trial" className="btn btn--primary btn--lg">
              Book consult
            </a>
            <Link href="/packages" className="btn btn--ghost btn--lg">
              View packages
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ——— Components ——— */
function Field({ label, name, children }) {
  return (
    <div className="field" data-name={name}>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}

function MetricCard({ metric, label, icon }) {
  return (
    <div className="card metric">
      <div className="metric__icon">{icon}</div>
      <div className="metric__value">{metric}</div>
      <div className="metric__label">{label}</div>
    </div>
  );
}

function Goal({ title, p, img }) {
  return (
    <div className="card goal">
      <figure className="goal__media">
        <img src={img} alt="" loading="lazy" />
        <div className="goal__overlay"></div>
      </figure>
      <div className="goal__body">
        <h3 className="goal__title">{title}</h3>
        <p className="goal__p">{p}</p>
      </div>
    </div>
  );
}

function Step({ n, title, children }) {
  return (
    <div className="step">
      <div className="step__badge">
        <div className="step__n">{n}</div>
      </div>
      <div className="step__body">
        <div className="step__title">{title}</div>
        <p className="step__p">{children}</p>
      </div>
    </div>
  );
}

function Testimonial({ quote, by, role, avatar, rating }) {
  return (
    <div className="card testi">
      <div className="testi__header">
        <img className="testi__avatar" src={avatar} alt="" loading="lazy" />
        <div className="testi__stars">
          {[...Array(rating)].map((_, i) => (
            <span key={i} className="testi__star">
              ★
            </span>
          ))}
        </div>
      </div>
      <blockquote className="testi__quote">"{quote}"</blockquote>
      <div className="testi__author">
        <cite className="testi__by">{by}</cite>
        <span className="testi__role">{role}</span>
      </div>
    </div>
  );
}

export default Individual;
