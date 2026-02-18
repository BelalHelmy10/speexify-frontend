// app/corporate-training/page.js
"use client";

import { useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import "@/styles/corporate.scss";
import { getDictionary, t } from "@/app/i18n";
import FadeIn from "@/components/FadeIn";

function CorporateTraining({ dict, locale }) {
  const formRef = useRef(null);

  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState("");
  const [form, setForm] = useState({
    company: "",
    contactName: "",
    email: "",
    size: "10–50",
    timeframe: "This month",
    goals: "",
    message: "",
    agree: false,
  });

  // ✅ prefix ONLY for URLs, not for translations
  const prefix = locale === "ar" ? "/ar" : "";

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setStatus("");

    if (!form.company || !form.email || !form.agree) {
      setStatus(t(dict, "status_required"));
      return;
    }

    setSending(true);
    try {
      await api.post("/api/contact", {
        name: `${form.contactName || "(no name)"} @ ${form.company}`,
        email: form.email,
        role: "Corporate",
        topic: "Corporate RFP",
        budget: "",
        message: `Company: ${form.company}\nTeam size: ${form.size
          }\nTimeframe: ${form.timeframe}\nGoals: ${form.goals}\n\n${form.message || ""
          }`,
      });

      setStatus(t(dict, "status_sent"));
      formRef.current?.reset();
      setForm((f) => ({ ...f, message: "", agree: false }));
    } catch (_err) {
      const subject = encodeURIComponent(`[Corporate RFP] ${form.company}`);
      const body = encodeURIComponent(
        `Company: ${form.company}\nContact: ${form.contactName}\nEmail: ${form.email}\nTeam size: ${form.size}\nTimeframe: ${form.timeframe}\nGoals: ${form.goals}\n\n${form.message}`
      );
      window.location.href = `mailto:hello@speexify.com?subject=${subject}&body=${body}`;
      setStatus(t(dict, "status_email_fallback"));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="spx-corp">
      {/* HERO */}
      <section className="spx-corp__section spx-corp-hero">
        <div className="spx-corp-hero__background">
          <div className="spx-corp-hero__gradient"></div>
          <div className="spx-corp-hero__pattern"></div>
        </div>

        <div className="spx-corp__container spx-corp-hero__inner">
          <div className="spx-corp-hero__copy">
            <FadeIn as="div" className="spx-corp-hero__badge" delay={0.1}>
              <span className="spx-corp-hero__badge-icon" aria-hidden="true">
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
                  <rect x="1" y="5" width="13" height="9" rx="1" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M5 14V9h5v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M1 8V4a1 1 0 0 1 .553-.894l6-3a1 1 0 0 1 .894 0l6 3A1 1 0 0 1 15 4v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </span>
              <span>{t(dict, "hero_badge")}</span>
            </FadeIn>

            <FadeIn as="h1" className="spx-corp-hero__title" delay={0.2}>
              {t(dict, "hero_title_main")}
              <span className="spx-corp-hero__title-accent">
                {t(dict, "hero_title_accent")}
              </span>
            </FadeIn>

            <FadeIn as="p" className="spx-corp-hero__subtitle" delay={0.3}>
              {t(dict, "hero_subtitle")}
            </FadeIn>

            <FadeIn as="div" className="spx-corp-hero__actions" delay={0.4}>
              <a
                href="#rfp"
                className="spx-corp-btn spx-corp-btn--primary spx-corp-btn--shine"
              >
                <span>{t(dict, "hero_cta_primary")}</span>
                <svg
                  className="spx-corp-btn__arrow"
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
              </a>
              {/* ✅ locale-aware packages link */}
              <Link
                href={`${prefix}/packages?tab=corporate`}
                className="spx-corp-btn spx-corp-btn--ghost"
              >
                {t(dict, "hero_cta_secondary")}
              </Link>
            </FadeIn>

            <FadeIn as="div" className="spx-corp-hero__features" aria-label="Key features" delay={0.6}>
              <HeroFeature>{t(dict, "hero_feature_coach")}</HeroFeature>
              <HeroFeature>{t(dict, "hero_feature_flex")}</HeroFeature>
              <HeroFeature>{t(dict, "hero_feature_reporting")}</HeroFeature>
            </FadeIn>
          </div>

          <figure className="spx-corp-media spx-corp-hero__media">
            <div className="spx-corp-hero__media-glow"></div>
            <img
              src="/images/team-practicing-communication.avif"
              alt="Team practicing communication"
              loading="eager"
            />
            <div className="spx-corp-hero__media-badge">
              <span className="spx-corp-hero__media-badge-icon" aria-hidden="true">
                <svg width="18" height="14" viewBox="0 0 18 14" fill="none" aria-hidden="true">
                  <circle cx="6" cy="4" r="3" stroke="currentColor" strokeWidth="1.5" />
                  <circle cx="12" cy="4" r="3" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M0 13c0-2.761 2.686-5 6-5s6 2.239 6 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M12 8c2.209 0 4 1.567 4 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </span>
              <span>{t(dict, "hero_media_badge")}</span>
            </div>
          </figure>
        </div>
      </section>

      {/* LOGOS */}
      <section className="spx-corp__section spx-corp-logos">
        <div className="spx-corp__container">
          <FadeIn as="p" className="spx-corp-logos__title">{t(dict, "logos_title")}</FadeIn>
          <div className="spx-corp-logos__row">
            <Logo src="/logos/slack.svg" alt="Slack" />
            <Logo src="/logos/notion.svg" alt="Notion" />
            <Logo src="/logos/zoom.svg" alt="Zoom" />
            <Logo src="/logos/hubspot.svg" alt="HubSpot" />
            <Logo src="/logos/ibm.svg" alt="IBM" />
          </div>
        </div>
      </section>

      {/* OUTCOMES */}
      <section className="spx-corp__section spx-corp-outcomes">
        <div className="spx-corp__container spx-corp-grid--3">
          <Metric value="92%" label={t(dict, "metric1_label")} tone="coral" icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="2" y="12" width="4" height="10" rx="1" fill="currentColor" opacity="0.5" />
              <rect x="8" y="7" width="4" height="15" rx="1" fill="currentColor" opacity="0.75" />
              <rect x="14" y="3" width="4" height="19" rx="1" fill="currentColor" />
              <path d="M20 6l-3-3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          } />
          <Metric value="4.9/5" label={t(dict, "metric2_label")} tone="gold" icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 2l2.6 5.26L21 8.27l-4.5 4.38 1.06 6.19L12 15.77l-5.56 2.92 1.06-6.19L3 8.27l6.4-.91L12 2Z" fill="currentColor" />
            </svg>
          } />
          <Metric value="6–8 wks" label={t(dict, "metric3_label")} tone="teal" icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
              <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1.8" />
              <circle cx="12" cy="12" r="1.5" fill="currentColor" />
              <path d="M12 3V1M12 23v-2M3 12H1M23 12h-2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          } />
        </div>
      </section>

      {/* PROGRAMS */}
      <section className="spx-corp__section spx-corp-programs">
        <div className="spx-corp__container">
          <SectionHead
            title={t(dict, "programs_title")}
            subtitle={t(dict, "programs_subtitle")}
          />

          <div className="spx-corp-grid--3">
            <Program
              img="/images/elite-one-on-one.png"
              title={t(dict, "program1_title")}
              points={[
                t(dict, "program1_p1"),
                t(dict, "program1_p2"),
                t(dict, "program1_p3"),
              ]}
            />
            <Program
              img="/images/elite-team-practice.png"
              title={t(dict, "program2_title")}
              points={[
                t(dict, "program2_p1"),
                t(dict, "program2_p2"),
                t(dict, "program2_p3"),
              ]}
            />
            <Program
              img="/images/elite-workshops.png"
              title={t(dict, "program3_title")}
              points={[
                t(dict, "program3_p1"),
                t(dict, "program3_p2"),
                t(dict, "program3_p3"),
              ]}
            />
          </div>
        </div>
      </section>

      {/* PLANS PREVIEW */}
      <section className="spx-corp__section spx-corp-plans">
        <div className="spx-corp__container">
          <SectionHead
            title={t(dict, "plans_title")}
            subtitle={t(dict, "plans_subtitle")}
          />

          <div className="spx-corp-grid--3">
            <Plan
              img="/images/elite-pilot.png"
              title={t(dict, "plan1_title")}
              desc={t(dict, "plan1_desc")}
              bullets={[
                t(dict, "plan1_b1"),
                t(dict, "plan1_b2"),
                t(dict, "plan1_b3"),
              ]}
              dict={dict}
              prefix={prefix}
            />
            <Plan
              img="/images/elite-team-large.png"
              title={t(dict, "plan2_title")}
              desc={t(dict, "plan2_desc")}
              bullets={[
                t(dict, "plan2_b1"),
                t(dict, "plan2_b2"),
                t(dict, "plan2_b3"),
              ]}
              popular
              popularLabel={t(dict, "plan2_badge")}
              dict={dict}
              prefix={prefix}
            />
            <Plan
              img="/images/elite-company.png"
              title={t(dict, "plan3_title")}
              desc={t(dict, "plan3_desc")}
              bullets={[
                t(dict, "plan3_b1"),
                t(dict, "plan3_b2"),
                t(dict, "plan3_b3"),
              ]}
              dict={dict}
              prefix={prefix}
            />
          </div>

          <div className="spx-corp-center">
            {/* ✅ locale-aware plans link */}
            <Link
              href={`${prefix}/packages?tab=corporate`}
              className="spx-corp-btn spx-corp-btn--primary"
            >
              {t(dict, "plans_view_corp")}
            </Link>
          </div>
        </div>
      </section>

      {/* REPORTING */}
      <section className="spx-corp__section spx-corp-reporting">
        <div className="spx-corp__container">
          <div className="spx-corp-reporting__inner">
            <div className="spx-corp-reporting__copy">
              <SectionHead
                title={t(dict, "reporting_title")}
                subtitle={t(dict, "reporting_subtitle")}
              />
              <ul className="spx-corp-bullets">
                <li>{t(dict, "reporting_b1")}</li>
                <li>{t(dict, "reporting_b2")}</li>
                <li>{t(dict, "reporting_b3")}</li>
              </ul>
            </div>
            <figure className="spx-corp-media spx-corp-reporting__media">
              <img
                src="/images/reporting-preview.avif"
                alt="Reporting preview"
                loading="lazy"
              />
              <div className="spx-corp-reporting__overlay"></div>
            </figure>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="spx-corp__section spx-corp-testis">
        <div className="spx-corp__container">
          <SectionHead
            title={t(dict, "testis_title")}
            subtitle={t(dict, "testis_subtitle")}
          />
          <div className="spx-corp-grid--3">
            <Testi
              quote={t(dict, "testi1_quote")}
              by={t(dict, "testi1_by")}
              role={t(dict, "testi1_role")}
              avatar="/images/head-of-cs.avif"
              rating={5}
            />
            <Testi
              quote={t(dict, "testi2_quote")}
              by={t(dict, "testi2_by")}
              role={t(dict, "testi2_role")}
              avatar="/images/l&d-manager.avif"
              rating={5}
            />
            <Testi
              quote={t(dict, "testi3_quote")}
              by={t(dict, "testi3_by")}
              role={t(dict, "testi3_role")}
              avatar="/images/global-ops.avif"
              rating={5}
            />
          </div>
        </div>
      </section>

      {/* RFP FORM */}
      <section id="rfp" className="spx-corp__section spx-corp-rfp">
        <div className="spx-corp__container">
          <div className="spx-corp-rfp__card">
            <SectionHead
              title={t(dict, "rfp_title")}
              subtitle={t(dict, "rfp_subtitle")}
            />
            <form ref={formRef} onSubmit={submit} className="spx-corp-form">
              <div className="spx-corp-form__row spx-corp-form__row--2">
                <Field label={t(dict, "field_company")}>
                  <input
                    className="spx-corp-input"
                    name="company"
                    value={form.company}
                    onChange={onChange}
                    required
                  />
                </Field>
                <Field label={t(dict, "field_contact_name")}>
                  <input
                    className="spx-corp-input"
                    name="contactName"
                    value={form.contactName}
                    onChange={onChange}
                  />
                </Field>
              </div>

              <div className="spx-corp-form__row spx-corp-form__row--3">
                <Field label={t(dict, "field_email")}>
                  <input
                    className="spx-corp-input"
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={onChange}
                    required
                    autoComplete="email"
                  />
                </Field>
                <Field label={t(dict, "field_team_size")}>
                  <select
                    className="spx-corp-select"
                    name="size"
                    value={form.size}
                    onChange={onChange}
                  >
                    <option>5–10</option>
                    <option>10–50</option>
                    <option>50–200</option>
                    <option>200+</option>
                  </select>
                </Field>
                <Field label={t(dict, "field_timeframe")}>
                  <select
                    className="spx-corp-select"
                    name="timeframe"
                    value={form.timeframe}
                    onChange={onChange}
                  >
                    <option>This month</option>
                    <option>Next 2–3 months</option>
                    <option>This quarter</option>
                  </select>
                </Field>
              </div>

              <div className="spx-corp-form__row spx-corp-form__row--2">
                <Field label={t(dict, "field_goals")}>
                  <input
                    className="spx-corp-input"
                    name="goals"
                    placeholder={t(dict, "placeholder_goals")}
                    value={form.goals}
                    onChange={onChange}
                  />
                </Field>
                <Field label={t(dict, "field_notes")}>
                  <input
                    className="spx-corp-input"
                    name="message"
                    placeholder={t(dict, "placeholder_notes")}
                    value={form.message}
                    onChange={onChange}
                  />
                </Field>
              </div>

              <label className="spx-corp-check">
                <input
                  type="checkbox"
                  name="agree"
                  checked={form.agree}
                  onChange={onChange}
                />
                <span>
                  {t(dict, "check_privacy_prefix")}{" "}
                  {/* ✅ locale-aware privacy link */}
                  <Link href={`${prefix}/privacy`} className="spx-corp-link">
                    {t(dict, "check_privacy_link")}
                  </Link>
                  .
                </span>
              </label>

              <div className="spx-corp-actions">
                <button
                  className="spx-corp-btn spx-corp-btn--primary spx-corp-btn--shine"
                  type="submit"
                  disabled={sending}
                >
                  {sending
                    ? t(dict, "sending")
                    : t(dict, "btn_request_proposal")}
                </button>
                {status && <span className="spx-corp-status">{status}</span>}
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="spx-corp__section spx-corp-cta">
        <div className="spx-corp-cta__background">
          <div className="spx-corp-cta__gradient"></div>
          <div className="spx-corp-cta__shapes">
            <div className="spx-corp-cta__shape spx-corp-cta__shape--1"></div>
            <div className="spx-corp-cta__shape spx-corp-cta__shape--2"></div>
          </div>
        </div>

        <div className="spx-corp__container spx-corp-cta__inner">
          <div className="spx-corp-cta__content">
            <h2 className="spx-corp-cta__title">{t(dict, "cta_title")}</h2>
            <p className="spx-corp-cta__subtitle">{t(dict, "cta_subtitle")}</p>
          </div>
          <div className="spx-corp-cta__actions">
            <a
              href="#rfp"
              className="spx-corp-btn spx-corp-btn--primary spx-corp-btn--lg"
            >
              {t(dict, "cta_btn_primary")}
            </a>
            {/* ✅ locale-aware packages link */}
            <Link
              href={`${prefix}/packages?tab=corporate`}
              className="spx-corp-btn spx-corp-btn--ghost spx-corp-btn--lg"
            >
              {t(dict, "cta_btn_secondary")}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

/* helpers */

function HeroFeature({ children }) {
  return (
    <div className="spx-corp-hero__feature">
      <svg
        className="spx-corp-hero__feature-icon"
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M7 10L9 12L13 8M19 10C19 14.9706 14.9706 19 10 19C5.02944 19 1 14.9706 1 10C1 5.02944 5.02944 1 10 1C14.9706 1 19 5.02944 19 10Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span>{children}</span>
    </div>
  );
}

function Logo({ src, alt }) {
  return (
    <div className="spx-corp-logos__item">
      <img src={src} alt={alt} loading="lazy" />
    </div>
  );
}

function SectionHead({ title, subtitle }) {
  return (
    <div className="spx-corp-section-head">
      <FadeIn as="h2" className="spx-corp-section-title">{title}</FadeIn>
      <FadeIn as="p" className="spx-corp-section-sub" delay={0.1}>{subtitle}</FadeIn>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="spx-corp-field">
      <label className="spx-corp-label">{label}</label>
      {children}
    </div>
  );
}

function Metric({ value, label, icon, tone = "blue" }) {
  return (
    <div className={`spx-corp-card spx-corp-metric spx-corp-metric--${tone}`}>
      <div className="spx-corp-metric__icon">{icon}</div>
      <div className="spx-corp-metric__value">{value}</div>
      <div className="spx-corp-metric__label">{label}</div>
    </div>
  );
}

function Program({ img, title, points = [] }) {
  return (
    <div className="spx-corp-card spx-corp-program">
      <figure className="spx-corp-media spx-corp-program__media">
        <img src={img} alt="" loading="lazy" />
      </figure>
      <div className="spx-corp-program__body">
        <div className="spx-corp-program__title">{title}</div>
        <ul className="spx-corp-bullets">
          {points.map((p, i) => (
            <li key={i}>{p}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Plan({
  img,
  title,
  desc,
  bullets = [],
  popular = false,
  popularLabel,
  dict,
  prefix,
}) {
  return (
    <div
      className={`spx-corp-card spx-corp-plan ${popular ? "is-popular" : ""}`}
    >
      {popular && <span className="spx-corp-badge">{popularLabel}</span>}
      <figure className="spx-corp-media spx-corp-plan__media">
        <img src={img} alt="" loading="lazy" />
      </figure>
      <div className="spx-corp-plan__head">
        <div className="spx-corp-plan__title">{title}</div>
      </div>
      <p className="spx-corp-plan__desc">{desc}</p>
      <ul className="spx-corp-bullets">
        {bullets.map((b, i) => (
          <li key={i}>{b}</li>
        ))}
      </ul>
      <div className="spx-corp-plan__actions">
        <a href="#rfp" className="spx-corp-btn spx-corp-btn--primary">
          {t(dict, "btn_request_proposal")}
        </a>
        <Link
          href={`${prefix}/packages?tab=corporate`}
          className="spx-corp-btn spx-corp-btn--ghost"
        >
          {t(dict, "hero_cta_secondary")}
        </Link>
      </div>
    </div>
  );
}

function Testi({ quote, by, role, avatar, rating }) {
  return (
    <div className="spx-corp-card spx-corp-testi">
      <div className="spx-corp-testi__header">
        <img
          className="spx-corp-testi__avatar"
          src={avatar}
          alt=""
          loading="lazy"
        />
        <div
          className="spx-corp-testi__stars"
          aria-label={`${rating} out of 5 stars`}
        >
          {[...Array(rating)].map((_, i) => (
            <svg key={i} className="spx-corp-testi__star" width="16" height="16" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M7 1.5l1.545 3.13 3.455.503-2.5 2.436.59 3.44L7 9.25l-3.09 1.759.59-3.44L2 5.133l3.455-.503L7 1.5Z" fill="currentColor" />
            </svg>
          ))}
        </div>
      </div>
      <blockquote className="spx-corp-testi__quote">
        {quote}
      </blockquote>
      <div className="spx-corp-testi__author">
        <cite className="spx-corp-testi__by">{by}</cite>
        <span className="spx-corp-testi__role">{role}</span>
      </div>
    </div>
  );
}

export default function CorporateTrainingPage() {
  const pathname = usePathname();
  const locale = pathname?.startsWith("/ar") ? "ar" : "en";
  const dict = getDictionary(locale, "corporate");

  return <CorporateTraining dict={dict} locale={locale} />;
}
