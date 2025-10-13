"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api from "../lib/api";
import useAuth from "../hooks/useAuth";
import "../styles/contact.scss";

function Contact() {
  const { user } = useAuth();

  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    phone: "",
    role: "Individual",
    topic: "General question",
    budget: "",
    message: "",
    agree: false,
  });

  const [status, setStatus] = useState("");
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
    setStatus("");
    if (!form.name || !form.email || !form.message || !form.agree) {
      setStatus("Please fill required fields.");
      return;
    }

    setSending(true);
    try {
      await api.post("/api/contact", form);
      setStatus("Sent ✓ Thanks — we'll get back to you shortly.");
      setForm((f) => ({ ...f, message: "" }));
    } catch (err) {
      const subject = encodeURIComponent(
        `[Contact] ${form.topic} — ${form.name}`
      );
      const body = encodeURIComponent(
        `Name: ${form.name}\nEmail: ${form.email}\nCompany: ${form.company}\nPhone: ${form.phone}\nRole: ${form.role}\nBudget: ${form.budget}\n\nMessage:\n${form.message}`
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
    <div className="contact">
      {/* HERO */}
      <section className="contact-hero">
        <div className="contact-hero__background">
          <div className="contact-hero__gradient"></div>
          <div className="contact-hero__pattern"></div>
        </div>

        <div className="contact-hero__content container">
          <div className="contact-hero__badge">
            <span className="contact-hero__badge-icon">💬</span>
            <span>Get in touch</span>
          </div>

          <h1 className="contact-hero__title">
            Talk to
            <span className="contact-hero__title-accent"> Speexify</span>
          </h1>

          <p className="contact-hero__subtitle">
            Language & communication coaching that drives results. Tell us what
            you need — we'll tailor a plan.
          </p>

          <div className="contact-hero__actions">
            <Link href="/register" className="btn btn--primary btn--shine">
              <span>Book a call</span>
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
            </Link>
            <a href="mailto:hello@speexify.com" className="btn btn--ghost">
              Email us
            </a>
          </div>
        </div>
      </section>

      {/* GRID: Form + Sidebar */}
      <section className="container contact-grid">
        {/* LEFT: Form */}
        <div className="card contact-form">
          <div className="card__header">
            <h2 className="card__title">Contact us</h2>
            <p className="card__subtitle">
              We usually reply within one business day.
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <div className="form-row">
              <div className="field">
                <label className="label" htmlFor="name">
                  Full name*
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
                  Email*
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
                  Company
                </label>
                <input
                  id="company"
                  name="company"
                  className="input"
                  value={form.company}
                  onChange={onChange}
                  placeholder="(optional)"
                />
              </div>
              <div className="field">
                <label className="label" htmlFor="phone">
                  Phone
                </label>
                <input
                  id="phone"
                  name="phone"
                  className="input"
                  value={form.phone}
                  onChange={onChange}
                  placeholder="(optional)"
                />
              </div>
            </div>

            <div className="form-row form-row--3">
              <div className="field">
                <label className="label" htmlFor="role">
                  I'm a…
                </label>
                <select
                  id="role"
                  name="role"
                  className="select"
                  value={form.role}
                  onChange={onChange}
                >
                  <option>Individual</option>
                  <option>Teacher</option>
                  <option>Company</option>
                </select>
              </div>
              <div className="field">
                <label className="label" htmlFor="topic">
                  Topic
                </label>
                <select
                  id="topic"
                  name="topic"
                  className="select"
                  value={form.topic}
                  onChange={onChange}
                >
                  <option>General question</option>
                  <option>Sales / Team training</option>
                  <option>Support</option>
                  <option>Partnerships</option>
                  <option>Media</option>
                </select>
              </div>
              <div className="field">
                <label className="label" htmlFor="budget">
                  Budget
                </label>
                <select
                  id="budget"
                  name="budget"
                  className="select"
                  value={form.budget}
                  onChange={onChange}
                >
                  <option value="">Not sure yet</option>
                  <option>Under $1,000</option>
                  <option>$1,000 – $5,000</option>
                  <option>$5,000 – $15,000</option>
                  <option>$15,000+</option>
                </select>
              </div>
            </div>

            <div className="field">
              <label className="label" htmlFor="message">
                How can we help?*
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
                I agree to the processing of my info per the{" "}
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
                {sending ? "Sending…" : "Send message"}
              </button>
              {status && (
                <span className="form-status" role="status" aria-live="polite">
                  {status}
                </span>
              )}
            </div>
          </form>
        </div>

        {/* RIGHT: Sidebar cards */}
        <aside className="contact-sidebar">
          {/* Contact channels */}
          <div className="card contact-card">
            <div className="card__header">
              <div className="card__icon">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="card__title">Talk to a human</h3>
            </div>
            <ul className="list">
              <li>
                <div className="list__title">Sales (teams & companies)</div>
                <a className="link" href="mailto:sales@speexify.com">
                  sales@speexify.com
                </a>
              </li>
              <li>
                <div className="list__title">Support (learners & teachers)</div>
                <a className="link" href="mailto:support@speexify.com">
                  support@speexify.com
                </a>
              </li>
              <li>
                <div className="list__title">Partnerships</div>
                <a className="link" href="mailto:partners@speexify.com">
                  partners@speexify.com
                </a>
              </li>
            </ul>
            <div className="pill">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
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
              <span>Avg. response: &lt; 24h (Mon–Fri)</span>
            </div>
          </div>

          {/* Office / Hours */}
          <div className="card contact-card">
            <div className="card__header">
              <div className="card__icon">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </div>
              <h3 className="card__title">Office & hours</h3>
            </div>
            <div className="kvs">
              <div>
                <span>HQ</span>
                <strong>London, UK</strong>
              </div>
              <div>
                <span>Support</span>
                <strong>Mon–Fri, 9–6 (UTC)</strong>
              </div>
              <div>
                <span>Phone</span>
                <strong>+44 20 0000 0000</strong>
              </div>
            </div>
          </div>

          {/* Social */}
          <div className="card contact-card">
            <div className="card__header">
              <div className="card__icon">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M17 2l4 4-4 4M3 11V9a4 4 0 014-4h14M7 22l-4-4 4-4M21 13v2a4 4 0 01-4 4H3" />
                </svg>
              </div>
              <h3 className="card__title">Follow us</h3>
            </div>
            <div className="social">
              <a
                className="btn btn--ghost btn--social"
                href="https://www.linkedin.com"
                target="_blank"
                rel="noreferrer"
              >
                LinkedIn
              </a>
              <a
                className="btn btn--ghost btn--social"
                href="https://x.com"
                target="_blank"
                rel="noreferrer"
              >
                X
              </a>
              <a
                className="btn btn--ghost btn--social"
                href="https://youtube.com"
                target="_blank"
                rel="noreferrer"
              >
                YouTube
              </a>
            </div>
          </div>
        </aside>
      </section>

      {/* Solutions lanes */}
      <section className="container lanes">
        <div className="lane">
          <div className="lane__icon">👤</div>
          <h3>For individuals</h3>
          <p>
            Improve speaking, listening, and confidence with tailored sessions.
          </p>
          <Link className="btn btn--ghost" href="/individual">
            Learn more
          </Link>
        </div>
        <div className="lane">
          <div className="lane__icon">👥</div>
          <h3>For teams</h3>
          <p>
            Onboarding, meetings, and presentations — programs that fit your
            culture.
          </p>
          <Link className="btn btn--ghost" href="/corporate">
            Learn more
          </Link>
        </div>
        <div className="lane">
          <div className="lane__icon">💎</div>
          <h3>Packages</h3>
          <p>Transparent pricing for individuals and companies.</p>
          <Link className="btn btn--ghost" href="/packages">
            See packages
          </Link>
        </div>
      </section>

      {/* Locations / map */}
      <section className="contact-map">
        <div className="container contact-map__inner">
          <div className="contact-map__panel card">
            <h3 className="card__title">Where we operate</h3>
            <p>
              Remote-first across EMEA & North America. In-person options on
              request.
            </p>
            <ul className="bullets">
              <li>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M7 10L9 12L13 8M19 10C19 14.9706 14.9706 19 10 19C5.02944 19 1 14.9706 1 10C1 5.02944 5.02944 1 10 1C14.9706 1 19 5.02944 19 10Z" />
                </svg>
                <span>🇬🇧 London (HQ)</span>
              </li>
              <li>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M7 10L9 12L13 8M19 10C19 14.9706 14.9706 19 10 19C5.02944 19 1 14.9706 1 10C1 5.02944 5.02944 1 10 1C14.9706 1 19 5.02944 19 10Z" />
                </svg>
                <span>🇪🇺 EU time zones covered</span>
              </li>
              <li>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M7 10L9 12L13 8M19 10C19 14.9706 14.9706 19 10 19C5.02944 19 1 14.9706 1 10C1 5.02944 5.02944 1 10 1C14.9706 1 19 5.02944 19 10Z" />
                </svg>
                <span>🇺🇸 East & Pacific time</span>
              </li>
            </ul>
          </div>
          <div className="contact-map__canvas">
            <div className="map-placeholder">
              <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                <path
                  d="M32 58C46.9117 58 59 45.9117 59 31C59 16.0883 46.9117 4 32 4C17.0883 4 5 16.0883 5 31C5 45.9117 17.0883 58 32 58Z"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <path
                  d="M32 4C32 4 40 18 40 31C40 44 32 58 32 58M32 4C32 4 24 18 24 31C24 44 32 58 32 58"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <path
                  d="M7 31H57M10 18H54M10 44H54"
                  stroke="currentColor"
                  strokeWidth="2"
                />
              </svg>
              <span>Interactive map</span>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="container faq">
        <h2 className="faq__title">Frequently asked questions</h2>
        <Accordion
          items={[
            {
              q: "How fast can we start?",
              a: "Most individuals start within 48 hours. Teams: 1–2 weeks depending on scope.",
            },
            {
              q: "Do you offer corporate invoicing?",
              a: "Yes. We support invoicing & purchase orders for approved accounts.",
            },
            {
              q: "What languages do you coach?",
              a: "English-focused today, with custom programs available on request.",
            },
          ]}
        />
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
