// app/individual-training/page.js
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import useAuth from "@/hooks/useAuth";
import api from "@/lib/api";
import "@/styles/individual.scss";
import { getDictionary, t } from "@/app/i18n";
import { getSupportedTimezones } from "../../lib/timezones";
import { APP_ROUTES, routeHref } from "@/lib/routes";

const MARKETING_IMAGE_VERSION = "20260519";
const marketingImage = (src) => {
  const encodedPath = src
    .split("/")
    .map((segment, index) => (index === 0 ? segment : encodeURIComponent(segment)))
    .join("/");
  return `${encodedPath}?v=${MARKETING_IMAGE_VERSION}`;
};

function Reveal({ children, as: Component = "div", delay: _delay, blur: _blur, ...props }) {
  return <Component {...props}>{children}</Component>;
}

const goalIcons = {
  career: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 9h16v10H4z" />
      <path d="M8 9V6h8v3" />
      <path d="M4 13h16" />
    </svg>
  ),
  fluency: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h2" />
      <path d="M10 6v12" />
      <path d="M14 9v6" />
      <path d="M18 4v16" />
    </svg>
  ),
  academic: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 4l9 5-9 5-9-5 9-5Z" />
      <path d="M6 12v4c2 2 10 2 12 0v-4" />
    </svg>
  ),
};

function IndividualInner({ dict, locale }) {
  const { user } = useAuth();
  const formRef = useRef(null);

  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState("");
  const [statusTone, setStatusTone] = useState("");
  const [form, setForm] = useState(() => ({
    name: "",
    email: "",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
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
    setStatusTone("");
    if (!form.name || !form.email || !form.agree) {
      setStatus(t(dict, "status_required"));
      setStatusTone("error");
      return;
    }
    setSending(true);
    try {
      await api.post("/api/contact", {
        name: form.name,
        email: form.email,
        role: "Individual",
        topic: "Individual Session Request",
        budget: "",
        message: `Level: ${form.level}\nGoal: ${form.goal}\nTimezone: ${form.timezone}\nAvailability: ${form.availability}\n\n${form.message || ""}`,
      });
      setStatus(t(dict, "status_sent"));
      setStatusTone("success");
      formRef.current?.reset();
      setForm((f) => ({ ...f, message: "", agree: false }));
    } catch (_err) {
      const subject = encodeURIComponent(`[Individual] ${form.goal}`);
      const body = encodeURIComponent(
        `Name: ${form.name}\nEmail: ${form.email}\nLevel: ${form.level}\nGoal: ${form.goal}\nTimezone: ${form.timezone}\nAvailability: ${form.availability}\n\n${form.message}`
      );
      window.location.href = `mailto:hello@speexify.com?subject=${subject}&body=${body}`;
      setStatus(t(dict, "status_email_fallback"));
      setStatusTone("info");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="individual-page-wrapper">
      {/* ═══════════════════════════════════════
         HERO
      ════════════════════════════════════════ */}
      <section className="hero">
        <div className="hero-bg"></div>
        <div className="hero-watermark">SPEAK</div>

        <div className="container">
          <div className="hero-grid">

            {/* Left copy */}
            <div className="hero-copy">
              <Reveal delay={0.1} className="hero-badge">
                <span className="badge-signal" aria-hidden="true"></span>
                {t(dict, "hero_badge") || "Private practice. One coach at a time."}
              </Reveal>
              <Reveal as="h1" delay={0.2} className="hero-title">
                {t(dict, "hero_title_1") || "Show up."}
                <br />
                {t(dict, "hero_title_2") || ""}
                <span className="accent">{t(dict, "hero_title_accent") || "Speak."}</span>
                <br />
                {t(dict, "hero_title_3") || "Repeat."}
              </Reveal>
              <Reveal as="p" delay={0.3} className="hero-sub">
                {t(dict, "hero_subtitle") || "Private one-on-one sessions with a coach picked for you. Real conversations, every time. The reps you've been missing, booked when you're ready."}
              </Reveal>
              <Reveal delay={0.4} className="hero-cta">
                <a href="#trial" className="btn btn-primary btn-lg">
                  {t(dict, "hero_cta_primary")}
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                </a>
                <Link href={routeHref(APP_ROUTES.packages, locale)} className="btn btn-ghost btn-lg">
                  {t(dict, "hero_cta_secondary")}
                </Link>
              </Reveal>
            </div>

            {/* Right: Sessions dashboard */}
            <div className="hero-visual">
              <div className="hero-toast">
                <span className="toast-dot"></span>
                {t(dict, "hero_toast")}
              </div>

              <div className="sessions-card">
                <div className="sc-titlebar">
                  <span className="sc-dot r"></span>
                  <span className="sc-dot y"></span>
                  <span className="sc-dot g"></span>
                  <span className="sc-title">{t(dict, "panel_title")}</span>
                </div>
                <div className="sc-body">
                  <div className="sess-row sess-row-live">
                    <div className="sess-av av-coral">●</div>
                    <div className="sess-info">
                      <span className="sess-name">{t(dict, "panel_row1_title")}</span>
                      <span className="sess-detail">{t(dict, "panel_row1_detail")}</span>
                    </div>
                    <span className="sess-badge sb-live"><span className="live-dot"></span> {t(dict, "panel_badge_live")}</span>
                  </div>
                  <div className="sess-row">
                    <div className="sess-av av-purple">●</div>
                    <div className="sess-info">
                      <span className="sess-name">{t(dict, "panel_row2_title")}</span>
                      <span className="sess-detail">{t(dict, "panel_row2_detail")}</span>
                    </div>
                    <span className="sess-badge sb-done">{t(dict, "panel_badge_saved")}</span>
                  </div>
                  <div className="sess-row">
                    <div className="sess-av av-teal">●</div>
                    <div className="sess-info">
                      <span className="sess-name">{t(dict, "panel_row3_title")}</span>
                      <span className="sess-detail">{t(dict, "panel_row3_detail")}</span>
                    </div>
                    <span className="sess-badge sb-time">{t(dict, "panel_badge_queued")}</span>
                  </div>
                  <div className="coach-note">
                    <span>{t(dict, "panel_correction_label")}</span>
                    <p>“{t(dict, "panel_correction_quote")}”</p>
                    <div className="typing-dots" aria-hidden="true">
                      <i></i><i></i><i></i>
                    </div>
                  </div>
                  <div className="sc-progress">
                    <div className="sc-prog-header">
                      <span>{t(dict, "panel_progress_label")}</span>
                      <span className="sc-prog-label">{t(dict, "panel_progress_count")}</span>
                    </div>
                    <div className="sc-prog-track">
                      <div className="sc-prog-fill"></div>
                    </div>
                  </div>
                  <div className="sc-feedback">{t(dict, "panel_progress_feedback")}</div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
         STATS STRIP
      ════════════════════════════════════════ */}
      <section className="stats">
        <div className="container">
          <div className="stats-grid">
            <MetricCard
              tone="coral"
              icon={
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z" />
                  <path d="M19 11a7 7 0 0 1-14 0" />
                  <path d="M12 18v3" />
                  <path d="M8 21h8" />
                </svg>
              }
              metric={t(dict, "metric_1_value")}
              label={t(dict, "metric_1_label") || "more time talking than a group class"}
            />
            <MetricCard
              tone="gold"
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              }
              metric={t(dict, "metric_2_value")}
              label={t(dict, "metric_2_label") || "average rating from our members"}
            />
            <MetricCard
              tone="teal"
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </svg>
              }
              metric={t(dict, "metric_3_value")}
              label={t(dict, "metric_3_label") || "to a shift everyone notices"}
            />
          </div>
          <div className="proof-strip" aria-label="Individual training proof">
            <span>{t(dict, "proof_chip1")}</span>
            <span>{t(dict, "proof_chip2")}</span>
            <span>{t(dict, "proof_chip3")}</span>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
         GOALS
      ════════════════════════════════════════ */}
      <section className="goals">
        <div className="container">
          <div className="section-header">
            <div className="section-label">{t(dict, "section_goals_label")}</div>
            <Reveal as="h2" className="section-title">{t(dict, "goals_title") || "What are you here to practice?"}</Reveal>
            <Reveal as="p" delay={0.1} className="section-sub">{t(dict, "goals_subtitle") || "Pick the one that's actually pulling at you. Your coach builds the practice around it."}</Reveal>
          </div>
          <div className="goals-grid">
            <Goal
              cls="g1"
              icon="career"
              image={marketingImage("/images/Career & interviews.png")}
              tag={t(dict, "goal_1_title")}
              title={t(dict, "goal_1_title")}
              p={t(dict, "goal_1_p")}
            />
            <Goal
              cls="g2"
              icon="fluency"
              image={marketingImage("/images/Fluency & confidence.png")}
              tag={t(dict, "goal_2_title")}
              title={t(dict, "goal_2_title")}
              p={t(dict, "goal_2_p")}
            />
            <Goal
              cls="g3"
              icon="academic"
              image={marketingImage("/images/Exams & academics.png")}
              tag={t(dict, "goal_3_title")}
              title={t(dict, "goal_3_title")}
              p={t(dict, "goal_3_p")}
            />
          </div>
          <div className="goals-cta">
            <a href="#trial" className="btn btn-ghost">{t(dict, "goals_cta") || "Tell us yours"}</a>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
         HOW IT WORKS
      ════════════════════════════════════════ */}
      <section className="how">
        <div className="container">
          <div className="section-header">
            <div className="section-label">{t(dict, "section_how_label")}</div>
            <Reveal as="h2" className="section-title">{t(dict, "how_title") || "How it works."}</Reveal>
            <Reveal as="p" delay={0.1} className="section-sub">{t(dict, "how_subtitle") || "From your first session to sounding like yourself in another language."}</Reveal>
          </div>
          <div className="how-steps">
            <Step
              cls="s1"
              n="1"
              title={t(dict, "how_step1_title")}
              p={t(dict, "how_step1_p")}
            />
            <Step
              cls="s2"
              n="2"
              title={t(dict, "how_step2_title")}
              p={t(dict, "how_step2_p")}
            />
            <Step
              cls="s3"
              n="3"
              title={t(dict, "how_step3_title")}
              p={t(dict, "how_step3_p")}
            />
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
         WHAT YOU'LL LEARN
      ════════════════════════════════════════ */}
      <section className="learn">
        <div className="container">
          <div className="section-header learn-header">
            <div className="section-label">{t(dict, "learn_label")}</div>
            <Reveal as="h2" className="section-title">{t(dict, "learn_title")}</Reveal>
            <Reveal as="p" delay={0.1} className="section-sub">{t(dict, "learn_subtitle")}</Reveal>
          </div>
          <div className="curriculum-grid">
            <CurriculumGroup
              title={t(dict, "curr_group_speak")}
              items={[t(dict, "chip_everyday"), t(dict, "chip_pronunciation"), t(dict, "chip_social")]}
            />
            <CurriculumGroup
              title={t(dict, "curr_group_work")}
              items={[t(dict, "chip_meetings"), t(dict, "chip_presentations"), t(dict, "chip_email")]}
            />
            <CurriculumGroup
              title={t(dict, "curr_group_prepare")}
              items={[t(dict, "chip_interview"), t(dict, "chip_listening")]}
            />
            <CurriculumGroup
              title={t(dict, "curr_group_polish")}
              items={[t(dict, "chip_writing"), t(dict, "chip_vocab")]}
            />
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
         TESTIMONIALS
      ════════════════════════════════════════ */}
      <section className="testimonials">
        <div className="container">
          <div className="testi-wrap">
            <div className="section-header">
              <div className="section-label">{t(dict, "testi_label")}</div>
              <Reveal as="h2" className="section-title">{t(dict, "testi_title")}</Reveal>
              <Reveal as="p" delay={0.1} className="section-sub">{t(dict, "testi_subtitle")}</Reveal>
            </div>
            <div className="testi-grid">
              <Testimonial
                avatarCls="tav1"
                avatarTxt="AM"
                outcome={t(dict, "testi1_outcome")}
                quote={t(dict, "testi1_quote")}
                by={t(dict, "testi1_by")}
                role={t(dict, "testi1_role")}
              />
              <Testimonial
                avatarCls="tav2"
                avatarTxt="SR"
                outcome={t(dict, "testi2_outcome")}
                quote={t(dict, "testi2_quote")}
                by={t(dict, "testi2_by")}
                role={t(dict, "testi2_role")}
              />
              <Testimonial
                avatarCls="tav3"
                avatarTxt="LK"
                outcome={t(dict, "testi3_outcome")}
                quote={t(dict, "testi3_quote")}
                by={t(dict, "testi3_by")}
                role={t(dict, "testi3_role")}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
         TRIAL FORM
      ════════════════════════════════════════ */}
      <section id="trial" className="trial">
        <div className="container">
          <div className="section-header trial-intro">
            <div className="section-label">{t(dict, "trial_intro_label")}</div>
            <Reveal as="h2" className="section-title">{t(dict, "trial_intro_title")}</Reveal>
            <Reveal as="p" delay={0.1} className="section-sub">{t(dict, "trial_intro_subtitle")}</Reveal>
          </div>

          <div className="trial-card">
            <aside className="trial-proof">
              <span className="trial-proof-kicker">{t(dict, "trial_proof_kicker")}</span>
              <h3>{t(dict, "trial_proof_title")}</h3>
              <p>{t(dict, "trial_proof_body")}</p>
              <ul>
                <li>{t(dict, "trial_proof_bullet1")}</li>
                <li>{t(dict, "trial_proof_bullet2")}</li>
                <li>{t(dict, "trial_proof_bullet3")}</li>
              </ul>
            </aside>

            <div className="trial-form-panel">
              <div className="trial-head">
                <Reveal as="h2" className="trial-title">{t(dict, "trial_title") || "Tell us about you."}</Reveal>
                <Reveal as="p" delay={0.1} className="trial-sub">{t(dict, "trial_subtitle") || "One of us will be back within a business day to set the time."}</Reveal>
              </div>

            <form ref={formRef} onSubmit={submit} className={statusTone === "error" ? "form-has-error" : ""}>
              <div className="form-row">
                <div className="form-field">
                  <label className="form-label">{t(dict, "field_name")}</label>
                  <input
                    className="form-input"
                    name="name"
                    value={form.name}
                    onChange={onChange}
                    required
                  />
                </div>
                <div className="form-field">
                  <label className="form-label">{t(dict, "field_email")}</label>
                  <input
                    className="form-input"
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={onChange}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-field">
                  <label className="form-label">{t(dict, "field_timezone")}</label>
                  <select
                    className="form-select"
                    name="timezone"
                    value={form.timezone}
                    onChange={onChange}
                  >
                    <option value="" disabled>{t(dict, "timezone_placeholder_text")}</option>
                    {getSupportedTimezones().map(({ value, label }) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-field">
                  <label className="form-label">{t(dict, "field_level")}</label>
                  <select
                    className="form-select"
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
                </div>
              </div>

              <div className="form-row">
                <div className="form-field">
                  <label className="form-label">{t(dict, "field_availability")}</label>
                  <select
                    className="form-select"
                    name="availability"
                    value={form.availability}
                    onChange={onChange}
                  >
                    <option>{t(dict, "availability_weekdays")}</option>
                    <option>{t(dict, "availability_weeknights")}</option>
                    <option>{t(dict, "availability_weekends")}</option>
                  </select>
                </div>
                <div className="form-field">
                  <label className="form-label">{t(dict, "field_goal")}</label>
                  <select
                    className="form-select"
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
                </div>
              </div>

              <div className="form-row full">
                <div className="form-field">
                  <label className="form-label">{t(dict, "field_message")}</label>
                  <input
                    className="form-input"
                    name="message"
                    placeholder={t(dict, "message_placeholder")}
                    value={form.message}
                    onChange={onChange}
                  />
                </div>
              </div>

              <label className="form-checkbox">
                <input
                  type="checkbox"
                  name="agree"
                  checked={form.agree}
                  onChange={onChange}
                />
                <span>
                  {t(dict, "checkbox_prefix")}
                  <Link href={routeHref(APP_ROUTES.privacy, locale)} className="form-link">
                    {t(dict, "checkbox_link")}
                  </Link>
                  .
                </span>
              </label>

              <div className="form-actions">
                <button
                  className="btn btn-primary"
                  type="submit"
                  disabled={sending}
                >
                  {sending ? t(dict, "btn_sending") : t(dict, "btn_request_consult")}
                </button>
                {status && (
                  <span className={`form-note ${statusTone}`} role="status" aria-live="polite">
                    {status}
                  </span>
                )}
              </div>
            </form>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
         FINAL CTA
      ════════════════════════════════════════ */}
      <section className="cta-section">
        <div className="container">
          <div className="cta-wrap">
            <div className="cta-blob cta-blob-1"></div>
            <div className="cta-blob cta-blob-2"></div>
            <div className="cta-inner">
              <h2 className="cta-title">{t(dict, "final_title")}</h2>
              <p className="cta-sub">{t(dict, "final_subtitle")}</p>
              <div className="cta-btns">
                <a href="#trial" className="btn btn-cta-white btn-lg">
                  {t(dict, "final_btn_primary")}
                </a>
                <Link href={routeHref(APP_ROUTES.packages, locale)} className="btn btn-ghost-white btn-lg">
                  {t(dict, "final_btn_secondary")}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ——— small components ——— */

function MetricCard({ tone, icon, metric, label }) {
  return (
    <div className={`stat-card t-${tone}`}>
      <div className="stat-icon">{icon}</div>
      <div className="stat-value">{metric}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function Goal({ cls, icon, image, tag, title, p }) {
  return (
    <div className={`goal-card ${cls}`}>
      <div className="goal-img-wrap">
        <img
          className="goal-img"
          src={image}
          alt={title || ""}
          loading="lazy"
          decoding="async"
        />
      </div>
      <div className="goal-body">
        <div className="goal-tag">
          <span className="goal-tag-icon">{goalIcons[icon]}</span>
          {tag}
        </div>
        <h3 className="goal-title">{title}</h3>
        <p className="goal-p">{p}</p>
      </div>
    </div>
  );
}

function CurriculumGroup({ title, items }) {
  return (
    <div className="curriculum-group">
      <div className="curriculum-title">{title}</div>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function Step({ cls, n, title, p }) {
  return (
    <div className={`how-step ${cls}`}>
      <div className="step-num">{n}</div>
      <div className="step-body">
        <div className="step-title">{title}</div>
        <p className="step-p">{p}</p>
      </div>
    </div>
  );
}

function Testimonial({ avatarCls, avatarTxt, outcome, quote, by, role }) {
  return (
    <div className="testi-card">
      <div className="testi-head">
        <div className={`testi-av ${avatarCls}`}>{avatarTxt}</div>
        <span className="testi-outcome">{outcome}</span>
        <div className="testi-stars" aria-label="5 out of 5 stars">
          {Array.from({ length: 5 }).map((_, idx) => (
            <svg
              key={idx}
              className="testi-star"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M12 2.5l2.87 5.82 6.43.94-4.65 4.53 1.1 6.41L12 17.18 6.25 20.2l1.1-6.41L2.7 9.26l6.43-.94L12 2.5z" />
            </svg>
          ))}
        </div>
      </div>
      <div className="testi-quote">{quote}</div>
      <div className="testi-author">
        <div className="testi-name">{by}</div>
        <div className="testi-role">{role}</div>
      </div>
    </div>
  );
}

// Keep original locale detection so Arabic stays Arabic
export default function IndividualPage() {
  const pathname = usePathname();
  const locale = pathname?.startsWith("/ar") ? "ar" : "en";
  const dict = getDictionary(locale, "individual");

  return <IndividualInner dict={dict} locale={locale} />;
}
