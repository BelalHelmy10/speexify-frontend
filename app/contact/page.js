"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import api from "@/lib/api";
import useAuth from "@/hooks/useAuth";
import { getDictionary, t } from "../i18n";
import "@/styles/contact.scss";

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
    role: DEFAULT_ROLE,
    topic: DEFAULT_TOPIC,
    budget: "",
    message: "",
    agree: false,
  });

  const [status, setStatus] = useState({ text: "", tone: "" });
  const [sending, setSending] = useState(false);

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
    setStatus({ text: "", tone: "" });

    if (!form.name || !form.email || !form.message || !form.agree) {
      setStatus({ text: t(dict, "form_status_required"), tone: "error" });
      return;
    }

    setSending(true);
    try {
      await api.post("/api/contact", { ...form, locale });
      setStatus({ text: t(dict, "form_status_sent"), tone: "success" });
      setForm((f) => ({ ...f, message: "" }));
    } catch {
      const to = getTopicEmail(form.topic);
      const subject = encodeURIComponent(
        `[Contact] ${getTopicLabel(form.topic, dict)} - ${form.name}`
      );
      const body = encodeURIComponent(
        `Name: ${form.name}\nEmail: ${form.email}\nCompany: ${form.company}\nPhone: ${form.phone}\nRole: ${form.role}\nBudget: ${form.budget}\n\nMessage:\n${form.message}`
      );
      window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
      setStatus({
        text: t(dict, "form_status_email_fallback", { email: to }),
        tone: "info",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="contact" dir={locale === "ar" ? "rtl" : "ltr"}>
      <section className="hero">
        <div className="hero-bg"></div>
        <div className="hero-grid"></div>
        <div className="hero-wm">HELLO</div>

        <div className="hero-inner">
          <div className="hero-badge">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M2 2h10a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H8l-3 2v-2H2a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
              <path d="M4 6h6M4 8.5h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" opacity="0.6" />
            </svg>
            {t(dict, "hero_badge")}
          </div>

          <h1 className="hero-title">
            {t(dict, "hero_title_prefix")}
            <br />
            <span className="accent">{t(dict, "hero_title_accent")}</span>
          </h1>

          <p className="hero-sub">{t(dict, "hero_subtitle")}</p>

          <div className="hero-actions">
            <a href="#contact-form" className="btn btn-primary btn-lg">
              {t(dict, "hero_cta_primary")}
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
            <a href="mailto:support@speexify.com" className="btn btn-outline btn-lg">
              {t(dict, "hero_cta_secondary")}
            </a>
          </div>
        </div>
      </section>

      <section className="section" id="contact-form">
        <div className="container">
          <div className="contact-grid">
            <div className="form-card">
              <div className="form-head">
                <div>
                  <div className="form-title">{t(dict, "form_card_title")}</div>
                  <div className="form-sub">{t(dict, "form_card_subtitle")}</div>
                </div>
                <div className="form-hint">
                  {t(dict, "form_support_line_prefix")}{" "}
                  <a href="mailto:support@speexify.com">support@speexify.com</a>
                </div>
              </div>

              <form noValidate onSubmit={handleSubmit}>
                <div className="form-row">
                  <div className="field">
                    <label htmlFor="name">{t(dict, "form_name_label")}</label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      value={form.name}
                      onChange={onChange}
                      required
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="email">{t(dict, "form_email_label")}</label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={onChange}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="field">
                    <label htmlFor="company">{t(dict, "form_company_label")}</label>
                    <input
                      id="company"
                      name="company"
                      type="text"
                      value={form.company}
                      onChange={onChange}
                      placeholder={t(dict, "form_company_placeholder")}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="phone">{t(dict, "form_phone_label")}</label>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={form.phone}
                      onChange={onChange}
                      placeholder={t(dict, "form_phone_placeholder")}
                    />
                  </div>
                </div>

                <div className="form-row-3">
                  <div className="field">
                    <label htmlFor="role">{t(dict, "form_role_label")}</label>
                    <select id="role" name="role" value={form.role} onChange={onChange}>
                      <option value="INDIVIDUAL">{t(dict, "form_role_option_individual")}</option>
                      <option value="TEACHER">{t(dict, "form_role_option_teacher")}</option>
                      <option value="COMPANY">{t(dict, "form_role_option_company")}</option>
                    </select>
                  </div>

                  <div className="field">
                    <label htmlFor="topic">{t(dict, "form_topic_label")}</label>
                    <select id="topic" name="topic" value={form.topic} onChange={onChange}>
                      <option value="GENERAL">{t(dict, "form_topic_option_general")}</option>
                      <option value="SALES">{t(dict, "form_topic_option_sales")}</option>
                      <option value="SUPPORT">{t(dict, "form_topic_option_support")}</option>
                      <option value="PARTNERSHIPS">{t(dict, "form_topic_option_partnerships")}</option>
                      <option value="MEDIA">{t(dict, "form_topic_option_media")}</option>
                    </select>
                  </div>

                  <div className="field">
                    <label htmlFor="budget">{t(dict, "form_budget_label")}</label>
                    <select id="budget" name="budget" value={form.budget} onChange={onChange}>
                      <option value="">{t(dict, "form_budget_option_unsure")}</option>
                      <option value="UNDER_1K">{t(dict, "form_budget_option_under_1k")}</option>
                      <option value="1K_5K">{t(dict, "form_budget_option_1k_5k")}</option>
                      <option value="5K_15K">{t(dict, "form_budget_option_5k_15k")}</option>
                      <option value="15K_PLUS">{t(dict, "form_budget_option_15k_plus")}</option>
                    </select>
                  </div>
                </div>

                <div className="field-full">
                  <label htmlFor="message">{t(dict, "form_message_label")}</label>
                  <textarea
                    id="message"
                    name="message"
                    rows={6}
                    value={form.message}
                    onChange={onChange}
                    required
                  />
                </div>

                <label className="checkbox-row">
                  <input type="checkbox" name="agree" checked={form.agree} onChange={onChange} />
                  <span>
                    {t(dict, "form_privacy_label")}{" "}
                    <Link href={`${prefix}/privacy`}>{t(dict, "form_privacy_link")}</Link>.
                  </span>
                </label>

                <div className="form-actions">
                  <button className="btn-submit" type="submit" disabled={sending}>
                    {sending ? t(dict, "form_sending") : t(dict, "form_submit")}
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <path d="M14 2L2 8l5 2 2 5L14 2Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>

                  {status.text ? (
                    <span className={`form-status form-status--${status.tone || "info"}`} role="status" aria-live="polite">
                      {status.text}
                    </span>
                  ) : null}
                </div>
              </form>
            </div>

            <aside className="sidebar">
              <div className="sidebar-card">
                <div className="sidebar-card-head">
                  <div className="sidebar-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path d="M3 8l7.89 5.26a2 2 0 0 0 2.22 0L21 8M5 19h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2z" />
                    </svg>
                  </div>
                  <div className="sidebar-card-title">{t(dict, "sidebar_talk_title")}</div>
                </div>
                <div className="contact-list">
                  <div className="contact-list-item">
                    <div className="contact-list-label">{t(dict, "sidebar_sales_label")}</div>
                    <a href="mailto:sales@speexify.com" className="contact-list-val">sales@speexify.com</a>
                  </div>
                  <div className="contact-list-item">
                    <div className="contact-list-label">{t(dict, "sidebar_support_label")}</div>
                    <a href="mailto:support@speexify.com" className="contact-list-val">support@speexify.com</a>
                  </div>
                  <div className="contact-list-item">
                    <div className="contact-list-label">{t(dict, "sidebar_partnerships_label")}</div>
                    <a href="mailto:partners@speexify.com" className="contact-list-val">partners@speexify.com</a>
                  </div>
                </div>

                <div className="response-pill">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.8" />
                    <path d="M8 5v3.5l2 1.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                  {t(dict, "sidebar_response_time")}
                </div>
              </div>

              <div className="sidebar-card">
                <div className="sidebar-card-head">
                  <div className="sidebar-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                  </div>
                  <div className="sidebar-card-title">{t(dict, "sidebar_office_title")}</div>
                </div>

                <div className="kv-list">
                  <div className="kv-item">
                    <div className="kv-label">{t(dict, "sidebar_office_hq_label")}</div>
                    <div className="kv-val">{t(dict, "sidebar_office_hq_value")}</div>
                  </div>
                  <div className="kv-item">
                    <div className="kv-label">{t(dict, "sidebar_office_support_label")}</div>
                    <div className="kv-val">{t(dict, "sidebar_office_support_value")}</div>
                  </div>
                  <div className="kv-item">
                    <div className="kv-label">{t(dict, "sidebar_office_phone_label")}</div>
                    <div className="kv-val">
                      <a href="tel:+201111153366">{t(dict, "sidebar_office_phone_value")}</a>
                    </div>
                  </div>
                </div>
              </div>

              <div className="sidebar-card">
                <div className="sidebar-card-head">
                  <div className="sidebar-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path d="M17 2l4 4-4 4M3 11V9a4 4 0 0 1 4-4h14M7 22l-4-4 4-4M21 13v2a4 4 0 0 1-4 4H3" />
                    </svg>
                  </div>
                  <div className="sidebar-card-title">{t(dict, "sidebar_social_title")}</div>
                </div>
                <div className="social-btns">
                  <a className="social-btn" href="https://www.linkedin.com" target="_blank" rel="noreferrer">
                    {t(dict, "sidebar_social_linkedin")}
                  </a>
                  <a className="social-btn" href="https://x.com" target="_blank" rel="noreferrer">
                    {t(dict, "sidebar_social_x")}
                  </a>
                  <a className="social-btn" href="https://youtube.com" target="_blank" rel="noreferrer">
                    {t(dict, "sidebar_social_youtube")}
                  </a>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section className="lanes-section">
        <div className="container">
          <div className="lanes">
            <div className="lane lane-coral">
              <div className="lane-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="1.8" />
                  <path d="M3 21c0-5 4-9 9-9s9 4 9 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </div>
              <h3>{t(dict, "lanes_individual_title")}</h3>
              <p>{t(dict, "lanes_individual_body")}</p>
              <Link className="lane-btn" href={`${prefix}/individual-training`}>
                {t(dict, "lanes_individual_cta")}
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </Link>
            </div>

            <div className="lane lane-blue">
              <div className="lane-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="8" cy="7" r="3.5" stroke="currentColor" strokeWidth="1.8" />
                  <circle cx="16" cy="7" r="3.5" stroke="currentColor" strokeWidth="1.8" />
                  <path d="M1 21c0-4 3-7 7-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  <path d="M23 21c0-4-3-7-7-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  <path d="M8 14c1.2-.6 2.5-1 4-1s2.8.4 4 1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </div>
              <h3>{t(dict, "lanes_teams_title")}</h3>
              <p>{t(dict, "lanes_teams_body")}</p>
              <Link className="lane-btn" href={`${prefix}/corporate-training`}>
                {t(dict, "lanes_teams_cta")}
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </Link>
            </div>

            <div className="lane lane-teal">
              <div className="lane-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M12 2L4 7l8 5 8-5-8-5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                  <path d="M4 12l8 5 8-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M4 17l8 5 8-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
                </svg>
              </div>
              <h3>{t(dict, "lanes_packages_title")}</h3>
              <p>{t(dict, "lanes_packages_body")}</p>
              <Link className="lane-btn" href={`${prefix}/packages`}>
                {t(dict, "lanes_packages_cta")}
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="map-section">
        <div className="container">
          <div className="map-inner">
            <div className="map-panel">
              <div className="eyebrow">{t(dict, "map_title")}</div>
              <div className="map-title">{t(dict, "map_title")}</div>
              <p className="map-body">{t(dict, "map_body")}</p>
              <ul className="map-bullets">
                <li>
                  <div className="map-check">
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  {t(dict, "map_point_egypt")}
                </li>
                <li>
                  <div className="map-check">
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  {t(dict, "map_point_london")}
                </li>
                <li>
                  <div className="map-check">
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  {t(dict, "map_point_eu")}
                </li>
                <li>
                  <div className="map-check">
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  {t(dict, "map_point_us")}
                </li>
              </ul>
            </div>

            <div className="map-canvas" aria-label={t(dict, "map_iframe_aria")}>
              <iframe
                title={t(dict, "map_iframe_title")}
                src="https://www.google.com/maps?q=5th%20Settlement%2C%20New%20Cairo%2C%20Egypt&z=14&output=embed"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      </section>

      <section className="faq-section">
        <div className="container">
          <div className="faq-inner">
            <div className="faq-eyebrow">{t(dict, "faq_title")}</div>
            <div className="faq-title">{t(dict, "faq_title")}</div>
            <Accordion
              items={[
                { q: t(dict, "faq_1_q"), a: t(dict, "faq_1_a") },
                { q: t(dict, "faq_2_q"), a: t(dict, "faq_2_a") },
                { q: t(dict, "faq_3_q"), a: t(dict, "faq_3_a") },
              ]}
            />
          </div>
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
        <details key={idx} className="acc-item" open={open === idx}>
          <summary
            className="acc-q"
            onClick={(e) => {
              e.preventDefault();
              setOpen(open === idx ? -1 : idx);
            }}
          >
            <span>{it.q}</span>
            <span className="acc-chevron" aria-hidden="true">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </span>
          </summary>
          <div className="acc-a">{it.a}</div>
        </details>
      ))}
    </div>
  );
}

export default Contact;
