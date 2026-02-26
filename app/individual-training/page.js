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
import FadeIn from "@/components/FadeIn";

function IndividualInner({ dict, locale }) {
  const { user } = useAuth();
  const formRef = useRef(null);

  const prefix = locale === "ar" ? "/ar" : "";

  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState("");
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
        topic: "Individual Session Request",
        budget: "",
        message: `Level: ${form.level}\nGoal: ${form.goal}\nTimezone: ${form.timezone}\nAvailability: ${form.availability}\n\n${form.message || ""}`,
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
              <FadeIn delay={0.1} className="hero-badge">
                ✦ {t(dict, "hero_badge") || "Live 1-on-1 English Coaching"}
              </FadeIn>
              <FadeIn as="h1" delay={0.2} className="hero-title">
                {t(dict, "hero_title_1") || "Speak English"}
                <br />
                {t(dict, "hero_title_2") || "with "}
                <span className="accent">{t(dict, "hero_title_accent") || "real"}</span>
                <br />
                {t(dict, "hero_title_3") || " confidence"}
              </FadeIn>
              <FadeIn as="p" delay={0.3} className="hero-sub">
                {t(dict, "hero_subtitle") || "Expert-led live sessions that build fluency, precision, and presence — on your schedule, at your pace."}
              </FadeIn>
              <FadeIn delay={0.4} className="hero-cta">
                <a href="#trial" className="btn btn-primary btn-lg">
                  {t(dict, "hero_cta_primary")}
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                </a>
                <Link href={`${prefix}/packages`} className="btn btn-ghost btn-lg">
                  {t(dict, "hero_cta_secondary")}
                </Link>
              </FadeIn>
            </div>

            {/* Right: Sessions dashboard */}
            <div className="hero-visual">
              <div className="hero-toast">
                <span className="toast-dot"></span>
                Session starting now
              </div>

              <div className="sessions-card">
                <div className="sc-titlebar">
                  <span className="sc-dot r"></span>
                  <span className="sc-dot y"></span>
                  <span className="sc-dot g"></span>
                  <span className="sc-title">Today's Sessions</span>
                </div>
                <div className="sc-body">
                  <div className="sess-row">
                    <div className="sess-av av-coral">AM</div>
                    <div className="sess-info">
                      <span className="sess-name">Ahmed M.</span>
                      <span className="sess-detail">Presentation mastery · 45 min</span>
                    </div>
                    <span className="sess-badge sb-live">● Live</span>
                  </div>
                  <div className="sess-row">
                    <div className="sess-av av-purple">SR</div>
                    <div className="sess-info">
                      <span className="sess-name">Sara R.</span>
                      <span className="sess-detail">Business writing · 60 min</span>
                    </div>
                    <span className="sess-badge sb-done">✓ Done</span>
                  </div>
                  <div className="sess-row">
                    <div className="sess-av av-teal">LK</div>
                    <div className="sess-info">
                      <span className="sess-name">Layla K.</span>
                      <span className="sess-detail">Fluency · 30 min</span>
                    </div>
                    <span className="sess-badge sb-time">3:00 PM</span>
                  </div>
                  <div className="sc-progress">
                    <div className="sc-prog-header">
                      <span>Your progress</span>
                      <span className="sc-prog-label">Session 7 / 12</span>
                    </div>
                    <div className="sc-prog-track">
                      <div className="sc-prog-fill"></div>
                    </div>
                  </div>
                  <div className="sc-feedback">⚡ Instant feedback after every session</div>
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
              label={t(dict, "metric_1_label") || "more speaking time than group classes"}
            />
            <MetricCard
              tone="gold"
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              }
              metric={t(dict, "metric_2_value")}
              label={t(dict, "metric_2_label") || "average coach rating"}
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
              label={t(dict, "metric_3_label") || "to noticeable confidence"}
            />
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
         GOALS
      ════════════════════════════════════════ */}
      <section className="goals">
        <div className="container">
          <div className="section-header">
            <div className="section-label">Your Path</div>
            <FadeIn as="h2" className="section-title">{t(dict, "goals_title") || "What do you want to unlock?"}</FadeIn>
            <FadeIn as="p" delay={0.1} className="section-sub">{t(dict, "goals_subtitle") || "Every session is built around your real-world goals — not a generic curriculum."}</FadeIn>
          </div>
          <div className="goals-grid">
            <Goal
              cls="g1"
              visual={
                <div className="ui-visual">
                  <div className="ui-grid"></div>
                  <div className="glow-accent lime"></div>
                  <div className="ui-chart-box">
                    <div className="ui-chart-header">
                      <span className="ui-chart-title">Confidence</span>
                      <span className="ui-chart-badge">+42%</span>
                    </div>
                    <div className="ui-chart-bars">
                      <div className="bar" style={{ height: "40%" }}></div>
                      <div className="bar" style={{ height: "55%" }}></div>
                      <div className="bar" style={{ height: "35%" }}></div>
                      <div className="bar active" style={{ height: "90%" }}></div>
                    </div>
                  </div>
                </div>
              }
              tag="✦ Career"
              title={t(dict, "goal_1_title")}
              p={t(dict, "goal_1_p")}
            />
            <Goal
              cls="g2"
              visual={
                <div className="ui-visual">
                  <div className="ui-grid"></div>
                  <div className="glow-accent coral"></div>
                  <div className="ui-audio-box">
                    <div className="ui-play-btn">
                      <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14" style={{ marginLeft: 2 }}>
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                    <div className="ui-wave-bars">
                      <div className="wave" style={{ height: "40%" }}></div>
                      <div className="wave" style={{ height: "70%" }}></div>
                      <div className="wave active" style={{ height: "100%" }}></div>
                      <div className="wave active" style={{ height: "60%" }}></div>
                      <div className="wave" style={{ height: "30%" }}></div>
                      <div className="wave" style={{ height: "80%" }}></div>
                    </div>
                  </div>
                </div>
              }
              tag="✦ Fluency"
              title={t(dict, "goal_2_title")}
              p={t(dict, "goal_2_p")}
            />
            <Goal
              cls="g3"
              visual={
                <div className="ui-visual">
                  <div className="ui-grid"></div>
                  <div className="glow-accent violet"></div>
                  <div className="ui-score-box">
                    <div className="ui-score-ring"></div>
                    <div className="ui-score-val">8.5</div>
                    <div className="ui-score-lbl">IELTS Target</div>
                  </div>
                </div>
              }
              tag="✦ Academic"
              title={t(dict, "goal_3_title")}
              p={t(dict, "goal_3_p")}
            />
          </div>
          <div className="goals-cta">
            <a href="#trial" className="btn btn-ghost">{t(dict, "goals_cta") || "Talk to a coach"}</a>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
         HOW IT WORKS
      ════════════════════════════════════════ */}
      <section className="how">
        <div className="container">
          <div className="section-header">
            <div className="section-label">The Process</div>
            <FadeIn as="h2" className="section-title">{t(dict, "how_title") || "How it works"}</FadeIn>
            <FadeIn as="p" delay={0.1} className="section-sub">{t(dict, "how_subtitle") || "Three steps to a measurably better you."}</FadeIn>
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
            <FadeIn as="h2" className="section-title">{t(dict, "learn_title")}</FadeIn>
            <FadeIn as="p" delay={0.1} className="section-sub">{t(dict, "learn_subtitle")}</FadeIn>
          </div>
          <ul className="chips-list">
            <li className="chip">{t(dict, "chip_everyday")}</li>
            <li className="chip">{t(dict, "chip_meetings")}</li>
            <li className="chip">{t(dict, "chip_interview")}</li>
            <li className="chip">{t(dict, "chip_presentations")}</li>
            <li className="chip">{t(dict, "chip_pronunciation")}</li>
            <li className="chip">{t(dict, "chip_writing")}</li>
            <li className="chip">{t(dict, "chip_email")}</li>
            <li className="chip">{t(dict, "chip_vocab")}</li>
            <li className="chip">{t(dict, "chip_listening")}</li>
            <li className="chip">{t(dict, "chip_social")}</li>
          </ul>
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
              <FadeIn as="h2" className="section-title">{t(dict, "testi_title")}</FadeIn>
              <FadeIn as="p" delay={0.1} className="section-sub">{t(dict, "testi_subtitle")}</FadeIn>
            </div>
            <div className="testi-grid">
              <Testimonial
                avatarCls="tav1"
                avatarTxt="AM"
                quote={t(dict, "testi1_quote")}
                by={t(dict, "testi1_by")}
                role={t(dict, "testi1_role")}
              />
              <Testimonial
                avatarCls="tav2"
                avatarTxt="SR"
                quote={t(dict, "testi2_quote")}
                by={t(dict, "testi2_by")}
                role={t(dict, "testi2_role")}
              />
              <Testimonial
                avatarCls="tav3"
                avatarTxt="LK"
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
            <FadeIn as="h2" className="section-title">{t(dict, "trial_intro_title")}</FadeIn>
            <FadeIn as="p" delay={0.1} className="section-sub">{t(dict, "trial_intro_subtitle")}</FadeIn>
          </div>

          <div className="trial-card">
            <div className="trial-head">
              <FadeIn as="h2" className="trial-title">{t(dict, "trial_title") || "Request your session"}</FadeIn>
              <FadeIn as="p" delay={0.1} className="trial-sub">{t(dict, "trial_subtitle") || "Book your free starter session."}</FadeIn>
            </div>

            <form ref={formRef} onSubmit={submit}>
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
                    <option value="" disabled>Select your timezone...</option>
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
                  <Link href={`${prefix}/privacy`} className="form-link">
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
                  <span className="form-note" role="status" aria-live="polite">
                    {status}
                  </span>
                )}
              </div>
            </form>
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
                <Link href={`${prefix}/packages`} className="btn btn-ghost-white btn-lg">
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

function Goal({ cls, visual, tag, title, p }) {
  return (
    <div className={`goal-card ${cls}`}>
      <div className="goal-img-wrap">
        {visual}
      </div>
      <div className="goal-body">
        <div className="goal-tag">{tag}</div>
        <h3 className="goal-title">{title}</h3>
        <p className="goal-p">{p}</p>
      </div>
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

function Testimonial({ avatarCls, avatarTxt, quote, by, role }) {
  return (
    <div className="testi-card">
      <div className="testi-head">
        <div className={`testi-av ${avatarCls}`}>{avatarTxt}</div>
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
