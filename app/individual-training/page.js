// app/individual-training/page.js
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import useAuth from "@/hooks/useAuth";
import api from "@/lib/api";
import "@/styles/individual.scss";
import { getDictionary, t } from "@/app/i18n";

function IndividualInner({ dict, locale }) {
  const { user } = useAuth();
  const formRef = useRef(null);

  // ✅ only used for URLs, NOT for translations
  const prefix = locale === "ar" ? "/ar" : "";

  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState("");
  const [form, setForm] = useState(() => ({
    name: "",
    email: "",
    timezone: "",
    level: t(dict, "level_a2"),
    goal: t(dict, "goal_confidence"),
    availability: t(dict, "availability_weekdays"),
    message: "",
    agree: false,
  }));

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
      setStatus(t(dict, "status_required"));
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
        message: `Level: ${form.level}\nGoal: ${form.goal}\nTimezone: ${form.timezone
          }\nAvailability: ${form.availability}\n\n${form.message || ""}`,
      });
      setStatus(t(dict, "status_sent"));
      formRef.current?.reset();
      setForm((f) => ({ ...f, message: "", agree: false }));
    } catch (_err) {
      const subject = encodeURIComponent(`[Individual] ${form.goal}`);
      const body = encodeURIComponent(
        `Name: ${form.name}\nEmail: ${form.email}\nLevel: ${form.level}\nGoal: ${form.goal}\nTimezone: ${form.timezone}\nAvailability: ${form.availability}\n\n${form.message}`
      );
      window.location.href = `mailto:hello@speexify.com?subject=${subject}&body=${body}`;
      setStatus(t(dict, "status_email_fallback"));
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
              <span>{t(dict, "hero_badge")}</span>
            </div>

            <h1 className="ind-hero__title">
              {t(dict, "hero_title_main")}
              <span className="ind-hero__title-accent">
                {t(dict, "hero_title_accent")}
              </span>
            </h1>

            <p className="ind-hero__subtitle">{t(dict, "hero_subtitle")}</p>

            <div className="ind-hero__actions">
              <a href="#trial" className="btn btn--primary btn--shine">
                <span>{t(dict, "hero_cta_primary")}</span>
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
              {/* 🔽 only URL changed */}
              <Link href={`${prefix}/packages`} className="btn btn--ghost">
                {t(dict, "hero_cta_secondary")}
              </Link>
            </div>

            <div className="ind-hero__features">
              <div className="ind-hero__feature">
                <CheckIcon />
                <span>{t(dict, "hero_feature_1")}</span>
              </div>
              <div className="ind-hero__feature">
                <CheckIcon />
                <span>{t(dict, "hero_feature_2")}</span>
              </div>
              <div className="ind-hero__feature">
                <CheckIcon />
                <span>{t(dict, "hero_feature_3")}</span>
              </div>
            </div>
          </div>

          <figure className="ind-hero__media">
            <div className="ind-hero__media-glow"></div>
            <img
              src="/images/individual-hero-speaker.png"
              alt="Learner practicing with a coach"
              loading="eager"
            />
            <div className="ind-hero__media-badge">
              <span className="ind-hero__media-badge-dot"></span>
              <span>{t(dict, "hero_media_badge")}</span>
            </div>
          </figure>
        </div>
      </section>

      {/* METRICS */}
      <section className="container ind-metrics">
        <div className="grid-3">
          <MetricCard
            metric={t(dict, "metric_1_value")}
            label={t(dict, "metric_1_label")}
            icon="📈"
          />
          <MetricCard
            metric={t(dict, "metric_2_value")}
            label={t(dict, "metric_2_label")}
            icon="⭐"
          />
          <MetricCard
            metric={t(dict, "metric_3_value")}
            label={t(dict, "metric_3_label")}
            icon="🎯"
          />
        </div>
      </section>

      {/* WHO IT'S FOR */}
      <section className="container ind-goals">
        <div className="section-header">
          <h2 className="section-title">{t(dict, "goals_title")}</h2>
          <p className="section-subtitle">{t(dict, "goals_subtitle")}</p>
        </div>

        <div className="ind-goals__grid">
          <Goal
            title={t(dict, "goal_1_title")}
            p={t(dict, "goal_1_p")}
            img="/images/goal-career.png"
          />
          <Goal
            title={t(dict, "goal_2_title")}
            p={t(dict, "goal_2_p")}
            img="/images/goal-fluency.png"
          />
          <Goal
            title={t(dict, "goal_3_title")}
            p={t(dict, "goal_3_p")}
            img="/images/goal-exams.png"
          />
        </div>

        <div className="ind-goals__cta">
          <a href="#trial" className="btn btn--ghost">
            {t(dict, "goals_cta")}
          </a>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="container ind-how">
        <div className="section-header">
          <h2 className="section-title">{t(dict, "how_title")}</h2>
          <p className="section-subtitle">{t(dict, "how_subtitle")}</p>
        </div>

        <div className="ind-steps">
          <Step n="1" title={t(dict, "how_step1_title")}>
            {t(dict, "how_step1_p")}
          </Step>
          <Step n="2" title={t(dict, "how_step2_title")}>
            {t(dict, "how_step2_p")}
          </Step>
          <Step n="3" title={t(dict, "how_step3_title")}>
            {t(dict, "how_step3_p")}
          </Step>
        </div>
      </section>

      {/* WHAT YOU'LL LEARN */}
      <section className="container ind-learn">
        <div className="section-header">
          <h2 className="section-title">{t(dict, "learn_title")}</h2>
          <p className="section-subtitle">{t(dict, "learn_subtitle")}</p>
        </div>

        <ul className="chips">
          <li>{t(dict, "chip_everyday")}</li>
          <li>{t(dict, "chip_meetings")}</li>
          <li>{t(dict, "chip_interview")}</li>
          <li>{t(dict, "chip_presentations")}</li>
          <li>{t(dict, "chip_pronunciation")}</li>
          <li>{t(dict, "chip_email")}</li>
          <li>{t(dict, "chip_vocab")}</li>
          <li>{t(dict, "chip_listening")}</li>
        </ul>
      </section>

      {/* TESTIMONIALS */}
      <section className="container ind-testimonials">
        <div className="section-header">
          <h2 className="section-title">{t(dict, "testi_title")}</h2>
          <p className="section-subtitle">{t(dict, "testi_subtitle")}</p>
        </div>

        <div className="grid-3">
          <Testimonial
            quote={t(dict, "testi1_quote")}
            by={t(dict, "testi1_by")}
            role={t(dict, "testi1_role")}
            avatar="/images/sara.avif"
            rating={5}
          />
          <Testimonial
            quote={t(dict, "testi2_quote")}
            by={t(dict, "testi2_by")}
            role={t(dict, "testi2_role")}
            avatar="/images/ali.avif"
            rating={5}
          />
          <Testimonial
            quote={t(dict, "testi3_quote")}
            by={t(dict, "testi3_by")}
            role={t(dict, "testi3_role")}
            avatar="/images/marta.avif"
            rating={5}
          />
        </div>
      </section>

      {/* TRIAL / CONSULT FORM */}
      <section id="trial" className="container ind-trial">
        <div className="ind-trial__card">
          <div className="section-header">
            <h2 className="section-title">{t(dict, "trial_title")}</h2>
            <p className="section-subtitle">{t(dict, "trial_subtitle")}</p>
          </div>

          <form ref={formRef} onSubmit={submit} className="rfp">
            <div className="rfp__row">
              <Field label={t(dict, "field_name")} name="name">
                <input
                  className="input"
                  name="name"
                  value={form.name}
                  onChange={onChange}
                  required
                />
              </Field>
              <Field label={t(dict, "field_email")} name="email">
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
              <Field label={t(dict, "field_timezone")} name="timezone">
                <input
                  className="input"
                  name="timezone"
                  placeholder={t(dict, "field_timezone_placeholder")}
                  value={form.timezone}
                  onChange={onChange}
                />
              </Field>
              <Field label={t(dict, "field_level")} name="level">
                <select
                  className="select"
                  name="level"
                  value={form.level}
                  onChange={onChange}
                >
                  <option>{t(dict, "level_a2")}</option>
                  <option>{t(dict, "level_b1")}</option>
                  <option>{t(dict, "level_b2")}</option>
                  <option>{t(dict, "level_c1")}</option>
                  <option>{t(dict, "level_c2")}</option>
                </select>
              </Field>
              <Field label={t(dict, "field_availability")} name="availability">
                <select
                  className="select"
                  name="availability"
                  value={form.availability}
                  onChange={onChange}
                >
                  <option>{t(dict, "availability_weekdays")}</option>
                  <option>{t(dict, "availability_weeknights")}</option>
                  <option>{t(dict, "availability_weekends")}</option>
                </select>
              </Field>
            </div>

            <div className="rfp__row">
              <Field label={t(dict, "field_goal")} name="goal">
                <select
                  className="select"
                  name="goal"
                  value={form.goal}
                  onChange={onChange}
                >
                  <option>{t(dict, "goal_confidence")}</option>
                  <option>{t(dict, "goal_interview")}</option>
                  <option>{t(dict, "goal_pronunciation")}</option>
                  <option>{t(dict, "goal_writing")}</option>
                  <option>{t(dict, "goal_exam")}</option>
                </select>
              </Field>
              <Field label={t(dict, "field_message")} name="message">
                <input
                  className="input"
                  name="message"
                  placeholder={t(dict, "message_placeholder")}
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
                {t(dict, "checkbox_prefix")} {/* 🔽 only URL changed */}
                <Link href={`${prefix}/privacy`} className="link">
                  {t(dict, "checkbox_link")}
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
                {sending
                  ? t(dict, "btn_sending")
                  : t(dict, "btn_request_consult")}
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
            <h2 className="ind-cta__title">{t(dict, "final_title")}</h2>
            <p className="ind-cta__subtitle">{t(dict, "final_subtitle")}</p>
          </div>
          <div className="ind-cta__actions">
            <a href="#trial" className="btn btn--primary btn--lg">
              {t(dict, "final_btn_primary")}
            </a>
            {/* 🔽 only URL changed */}
            <Link
              href={`${prefix}/packages`}
              className="btn btn--ghost btn--lg"
            >
              {t(dict, "final_btn_secondary")}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ——— small components ——— */

function CheckIcon() {
  return (
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
  );
}

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

// ✅ keep your original locale detection so Arabic stays Arabic
export default function IndividualPage() {
  const pathname = usePathname();
  const locale = pathname?.startsWith("/ar") ? "ar" : "en";
  const dict = getDictionary(locale, "individual");

  return <IndividualInner dict={dict} locale={locale} />;
}
