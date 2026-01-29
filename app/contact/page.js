"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import api from "@/lib/api";
import useAuth from "@/hooks/useAuth";
import { getDictionary, t } from "../i18n";
import "@/styles/contact.scss";
import FadeIn from "@/components/FadeIn";

const DEFAULT_ROLE = "INDIVIDUAL";
const DEFAULT_TOPIC = "GENERAL";

function getTopicLabel(topic, dict) {
  switch (topic) {
    case "SALES":
      return t(dict, "form_topic_option_sales");
    case "SUPPORT":
      return t(dict, "form_topic_option_support");
    case "PARTNERSHIPS":
      return t(dict, "form_topic_option_partnerships");
    case "MEDIA":
      return t(dict, "form_topic_option_media");
    case "GENERAL":
    default:
      return t(dict, "form_topic_option_general");
  }
}

function getTopicEmail(topic) {
  switch (topic) {
    case "SALES":
      return "sales@speexify.com";
    case "PARTNERSHIPS":
      return "partners@speexify.com";
    case "MEDIA":
      return "support@speexify.com";
    case "SUPPORT":
      return "support@speexify.com";
    case "GENERAL":
    default:
      return "support@speexify.com";
  }
}

function Contact() {
  const { user } = useAuth();
  const pathname = usePathname();

  const locale = pathname && pathname.startsWith("/ar") ? "ar" : "en";
  const dict = useMemo(() => getDictionary(locale, "contact"), [locale]);

  const prefix = locale === "ar" ? "/ar" : "";

  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    phone: "",
    role: DEFAULT_ROLE, // codes, not labels
    topic: DEFAULT_TOPIC,
    budget: "",
    message: "",
    agree: false,
  });

  const [status, setStatus] = useState("");
  const [sending, setSending] = useState(false);

  // Pre-fill from user
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("");

    if (!form.name || !form.email || !form.message || !form.agree) {
      setStatus(t(dict, "form_status_required"));
      return;
    }

    setSending(true);
    try {
      await api.post("/api/contact", {
        ...form,
        locale,
      });
      setStatus(t(dict, "form_status_sent"));
      setForm((f) => ({ ...f, message: "" }));
    } catch {
      const to = getTopicEmail(form.topic);
      const subject = encodeURIComponent(
        `[Contact] ${getTopicLabel(form.topic, dict)} — ${form.name}`
      );
      const body = encodeURIComponent(
        `Name: ${form.name}\nEmail: ${form.email}\nCompany: ${form.company}\nPhone: ${form.phone}\nRole: ${form.role}\nBudget: ${form.budget}\n\nMessage:\n${form.message}`
      );
      window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
      setStatus(t(dict, "form_status_email_fallback", { email: to }));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="contact">
      {/* HERO */}
      <section className="contact-hero section">
        <div className="contact-hero__background">
          <div className="contact-hero__gradient" />
          <div className="contact-hero__pattern" />
        </div>

        <div className="contact-hero__content container stack-lg">
          <FadeIn as="div" className="contact-hero__badge" delay={0.1}>
            <span className="contact-hero__badge-icon">💬</span>
            <span>{t(dict, "hero_badge")}</span>
          </FadeIn>

          <FadeIn as="h1" className="contact-hero__title" delay={0.2}>
            {t(dict, "hero_title_prefix")}
            <span className="contact-hero__title-accent">
              {t(dict, "hero_title_accent")}
            </span>
          </FadeIn>

          <FadeIn as="p" className="contact-hero__subtitle" delay={0.3}>{t(dict, "hero_subtitle")}</FadeIn>
          <FadeIn as="div" className="contact-hero__actions" delay={0.4}>
            <Link
              href={`${prefix}/register`}
              className="btn btn--primary btn--shine"
            >
              <span>{t(dict, "hero_cta_primary")}</span>
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
            <a href="mailto:support@speexify.com" className="btn btn--ghost">
              {t(dict, "hero_cta_secondary")}
            </a>
          </FadeIn>
        </div>
      </section>

      {/* GRID: Form + Sidebar */}
      <section className="section">
        <div className="container contact-grid">
          {/* LEFT: Form */}
          <div className="card contact-form stack-md">
            <div className="card__header contact-form__header">
              <div className="contact-form__header-left">
                <FadeIn as="h2" className="card__title">{t(dict, "form_card_title")}</FadeIn>
                <FadeIn as="p" className="card__subtitle" delay={0.1}>
                  {t(dict, "form_card_subtitle")}
                </FadeIn>
              </div>

              <div className="contact-form__header-right">
                <span className="contact-form__header-hint">
                  {t(dict, "form_support_line_prefix")}
                </span>{" "}
                <a className="link" href="mailto:support@speexify.com">
                  support@speexify.com
                </a>
              </div>
            </div>

            <form onSubmit={handleSubmit} noValidate className="stack-md">
              <div className="form-row">
                <div className="field">
                  <label className="label" htmlFor="name">
                    {t(dict, "form_name_label")}
                  </label>
                  <input
                    id="name"
                    name="name"
                    className="input"
                    value={form.name}
                    onChange={onChange}
                    required
                  />
                </div>
                <div className="field">
                  <label className="label" htmlFor="email">
                    {t(dict, "form_email_label")}
                  </label>
                  <input
                    id="email"
                    type="email"
                    name="email"
                    className="input"
                    value={form.email}
                    onChange={onChange}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="field">
                  <label className="label" htmlFor="company">
                    {t(dict, "form_company_label")}
                  </label>
                  <input
                    id="company"
                    name="company"
                    className="input"
                    value={form.company}
                    onChange={onChange}
                    placeholder={t(dict, "form_company_placeholder")}
                  />
                </div>
                <div className="field">
                  <label className="label" htmlFor="phone">
                    {t(dict, "form_phone_label")}
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    className="input"
                    value={form.phone}
                    onChange={onChange}
                    placeholder={t(dict, "form_phone_placeholder")}
                  />
                </div>
              </div>

              <div className="form-row form-row--3">
                <div className="field">
                  <label className="label" htmlFor="role">
                    {t(dict, "form_role_label")}
                  </label>
                  <select
                    id="role"
                    name="role"
                    className="select"
                    value={form.role}
                    onChange={onChange}
                  >
                    <option value="INDIVIDUAL">
                      {t(dict, "form_role_option_individual")}
                    </option>
                    <option value="TEACHER">
                      {t(dict, "form_role_option_teacher")}
                    </option>
                    <option value="COMPANY">
                      {t(dict, "form_role_option_company")}
                    </option>
                  </select>
                </div>
                <div className="field">
                  <label className="label" htmlFor="topic">
                    {t(dict, "form_topic_label")}
                  </label>
                  <select
                    id="topic"
                    name="topic"
                    className="select"
                    value={form.topic}
                    onChange={onChange}
                  >
                    <option value="GENERAL">
                      {t(dict, "form_topic_option_general")}
                    </option>
                    <option value="SALES">
                      {t(dict, "form_topic_option_sales")}
                    </option>
                    <option value="SUPPORT">
                      {t(dict, "form_topic_option_support")}
                    </option>
                    <option value="PARTNERSHIPS">
                      {t(dict, "form_topic_option_partnerships")}
                    </option>
                    <option value="MEDIA">
                      {t(dict, "form_topic_option_media")}
                    </option>
                  </select>
                </div>
                <div className="field">
                  <label className="label" htmlFor="budget">
                    {t(dict, "form_budget_label")}
                  </label>
                  <select
                    id="budget"
                    name="budget"
                    className="select"
                    value={form.budget}
                    onChange={onChange}
                  >
                    <option value="">
                      {t(dict, "form_budget_option_unsure")}
                    </option>
                    <option value="UNDER_1K">
                      {t(dict, "form_budget_option_under_1k")}
                    </option>
                    <option value="1K_5K">
                      {t(dict, "form_budget_option_1k_5k")}
                    </option>
                    <option value="5K_15K">
                      {t(dict, "form_budget_option_5k_15k")}
                    </option>
                    <option value="15K_PLUS">
                      {t(dict, "form_budget_option_15k_plus")}
                    </option>
                  </select>
                </div>
              </div>

              <div className="field">
                <label className="label" htmlFor="message">
                  {t(dict, "form_message_label")}
                </label>
                <textarea
                  id="message"
                  name="message"
                  className="textarea"
                  rows={6}
                  value={form.message}
                  onChange={onChange}
                  required
                />
              </div>

              <label className="checkbox">
                <input
                  type="checkbox"
                  name="agree"
                  checked={form.agree}
                  onChange={onChange}
                />
                <span>
                  {t(dict, "form_privacy_label")}{" "}
                  <Link href={`${prefix}/privacy`} className="link">
                    {t(dict, "form_privacy_link")}
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
                  {sending ? t(dict, "form_sending") : t(dict, "form_submit")}
                </button>
                {status && (
                  <span
                    className="form-status"
                    role="status"
                    aria-live="polite"
                  >
                    {status}
                  </span>
                )}
              </div>
            </form>
          </div>

          {/* RIGHT: Sidebar cards */}
          <aside className="contact-sidebar stack-md">
            {/* Contact channels */}
            <div className="card contact-card stack-sm">
              <div className="card__header row-gap-xs">
                <div className="card__icon">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="card__title">{t(dict, "sidebar_talk_title")}</h3>
              </div>
              <ul className="list stack-sm">
                <li>
                  <div className="list__title">
                    {t(dict, "sidebar_sales_label")}
                  </div>
                  <a className="link" href="mailto:sales@speexify.com">
                    sales@speexify.com
                  </a>
                </li>
                <li>
                  <div className="list__title">
                    {t(dict, "sidebar_support_label")}
                  </div>
                  <a className="link" href="mailto:support@speexify.com">
                    support@speexify.com
                  </a>
                </li>
                <li>
                  <div className="list__title">
                    {t(dict, "sidebar_partnerships_label")}
                  </div>
                  <a className="link" href="mailto:partners@speexify.com">
                    partners@speexify.com
                  </a>
                </li>
              </ul>
              <div className="pill row-gap-xs">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M8 14A6 6 0 108 2a6 6 0 000 12z"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <path
                    d="M8 6v4m0 2h.01"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
                <span>{t(dict, "sidebar_response_time")}</span>
              </div>
            </div>

            {/* Office / Hours */}
            <div className="card contact-card stack-sm">
              <div className="card__header row-gap-xs">
                <div className="card__icon">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                </div>
                <h3 className="card__title">
                  {t(dict, "sidebar_office_title")}
                </h3>
              </div>
              <div className="kvs">
                <div>
                  <span>{t(dict, "sidebar_office_hq_label")}</span>
                  <strong>{t(dict, "sidebar_office_hq_value")}</strong>
                </div>
                <div>
                  <span>{t(dict, "sidebar_office_support_label")}</span>
                  <strong>{t(dict, "sidebar_office_support_value")}</strong>
                </div>
                <div>
                  <span>{t(dict, "sidebar_office_phone_label")}</span>
                  <strong>
                    <a className="link" href="tel:+201111153366">
                      {t(dict, "sidebar_office_phone_value")}
                    </a>
                  </strong>
                </div>
              </div>
            </div>

            {/* Social */}
            <div className="card contact-card stack-sm">
              <div className="card__header row-gap-xs">
                <div className="card__icon">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <path d="M17 2l4 4-4 4M3 11V9a4 4 0 014-4h14M7 22l-4-4 4-4M21 13v2a4 4 0 01-4 4H3" />
                  </svg>
                </div>
                <h3 className="card__title">
                  {t(dict, "sidebar_social_title")}
                </h3>
              </div>
              <div className="social row-gap-xs">
                <a
                  className="btn btn--ghost btn--social"
                  href="https://www.linkedin.com"
                  target="_blank"
                  rel="noreferrer"
                >
                  {t(dict, "sidebar_social_linkedin")}
                </a>
                <a
                  className="btn btn--ghost btn--social"
                  href="https://x.com"
                  target="_blank"
                  rel="noreferrer"
                >
                  {t(dict, "sidebar_social_x")}
                </a>
                <a
                  className="btn btn--ghost btn--social"
                  href="https://youtube.com"
                  target="_blank"
                  rel="noreferrer"
                >
                  {t(dict, "sidebar_social_youtube")}
                </a>
              </div>
            </div>
          </aside>
        </div>
      </section>

      {/* Solutions lanes */}
      <section className="section">
        <div className="container lanes">
          <div className="lane stack-xs">
            <div className="lane__icon">👤</div>
            <h3>{t(dict, "lanes_individual_title")}</h3>
            <p>{t(dict, "lanes_individual_body")}</p>
            <Link className="btn btn--ghost" href={`${prefix}/individual`}>
              {t(dict, "lanes_individual_cta")}
            </Link>
          </div>

          <div className="lane stack-xs">
            <div className="lane__icon">👥</div>
            <h3>{t(dict, "lanes_teams_title")}</h3>
            <p>{t(dict, "lanes_teams_body")}</p>
            <Link className="btn btn--ghost" href={`${prefix}/corporate`}>
              {t(dict, "lanes_teams_cta")}
            </Link>
          </div>

          <div className="lane stack-xs">
            <div className="lane__icon">💎</div>
            <h3>{t(dict, "lanes_packages_title")}</h3>
            <p>{t(dict, "lanes_packages_body")}</p>
            <Link className="btn btn--ghost" href={`${prefix}/packages`}>
              {t(dict, "lanes_packages_cta")}
            </Link>
          </div>
        </div>
      </section>

      {/* Locations / map */}
      <section className="contact-map section section--tight">
        <div className="container contact-map__inner">
          <div className="contact-map__panel card stack-sm">
            <h3 className="card__title">{t(dict, "map_title")}</h3>
            <p>{t(dict, "map_body")}</p>
            <ul className="bullets">
              <li>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path d="M7 10L9 12L13 8M19 10C19 14.9706 14.9706 19 10 19C5.02944 19 1 14.9706 1 10C1 5.02944 5.02944 1 10 1C14.9706 1 19 5.02944 19 10C19 14.9706 14.9706 19 10 19C5.02944 19 1 14.9706 1 10C1 5.02944 5.02944 1 10 1Z" />
                </svg>
                <span>{t(dict, "map_point_egypt")}</span>
              </li>

              <li>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path d="M7 10L9 12L13 8M19 10C19 14.9706 14.9706 19 10 19C5.02944 19 1 14.9706 1 10C1 5.02944 5.02944 1 10 1C14.9706 1 19 5.02944 19 10Z" />
                </svg>
                <span>{t(dict, "map_point_london")}</span>
              </li>

              <li>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path d="M7 10L9 12L13 8M19 10C19 14.9706 14.9706 19 10 19C5.02944 19 1 14.9706 1 10C1 5.02944 5.02944 1 10 1C14.9706 1 19 5.02944 19 10Z" />
                </svg>
                <span>{t(dict, "map_point_eu")}</span>
              </li>

              <li>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path d="M7 10L9 12L13 8M19 10C19 14.9706 14.9706 19 10 19C5.02944 19 1 14.9706 1 10C1 5.02944 5.02944 1 10 1C14.9706 1 19 5.02944 19 10Z" />
                </svg>
                <span>{t(dict, "map_point_us")}</span>
              </li>
            </ul>
          </div>

          <div
            className="contact-map__canvas"
            aria-label={t(dict, "map_iframe_aria")}
          >
            <iframe
              title={t(dict, "map_iframe_title")}
              src="https://www.google.com/maps?q=5th%20Settlement%2C%20New%20Cairo%2C%20Egypt&z=14&output=embed"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              style={{
                width: "100%",
                height: "100%",
                border: 0,
                borderRadius: 16,
                display: "block",
              }}
              allowFullScreen
            />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="section">
        <div className="container faq">
          <FadeIn as="h2" className="faq__title">{t(dict, "faq_title")}</FadeIn>
          <Accordion
            items={[
              { q: t(dict, "faq_1_q"), a: t(dict, "faq_1_a") },
              { q: t(dict, "faq_2_q"), a: t(dict, "faq_2_a") },
              { q: t(dict, "faq_3_q"), a: t(dict, "faq_3_a") },
            ]}
          />
        </div>
      </section>
    </div>
  );
}

function Accordion({ items = [] }) {
  const [open, setOpen] = useState(0);
  return (
    <div className="accordion">
      {items.map((it, idx) => (
        <details key={idx} className="accordion__item" open={open === idx}>
          <summary
            className="accordion__q"
            onClick={(e) => {
              e.preventDefault();
              setOpen(open === idx ? -1 : idx);
            }}
          >
            {it.q}
          </summary>
          <div className="accordion__a">
            <p>{it.a}</p>
          </div>
        </details>
      ))}
    </div>
  );
}

export default Contact;
