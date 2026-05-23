"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import "@/styles/kids.scss";
import { APP_ROUTES, routeHref } from "@/lib/routes";

function useSectionObserver() {
  useEffect(() => {
    const els = document.querySelectorAll("[data-reveal]");
    if (!els.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-visible");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

export default function KidsPageContent() {
  const pathname = usePathname();
  const locale = pathname?.startsWith("/ar") ? "ar" : "en";
  useSectionObserver();

  return (
    <main className="kids-page">
      <KidsHero locale={locale} />
      <KidsTrustStrip />
      <KidsFirstSession locale={locale} />
      <KidsManifesto />
      <KidsProblem />
      <KidsLiveDemo />
      <KidsParentReassurance />
      <KidsAgeGroups />
      <KidsWhyItWorks />
      <KidsHowItWorks locale={locale} />
      <KidsSessionTypes locale={locale} />
      <KidsTestimonials />
      <KidsCoaches />
      <KidsFAQ />
      <KidsCTA locale={locale} />
      <KidsStickyCTA locale={locale} />
    </main>
  );
}

/* ─────────────────────────────────────────────
   HERO
───────────────────────────────────────────── */
function KidsHero({ locale }) {
  return (
    <section className="kids-hero">
      <div className="kids-hero__bg" aria-hidden="true">
        <div className="kids-hero__gradient" />
        <div className="kids-hero__grid-lines" />
        <div className="kids-hero__deco kids-hero__deco--circle-1" />
        <div className="kids-hero__deco kids-hero__deco--circle-2" />
        <div className="kids-hero__deco kids-hero__deco--dot-grid" />
      </div>

      <div className="kids-container kids-hero__grid">
        <div className="kids-hero__copy" data-reveal>
          <span className="kids-hero__badge">
            <span className="kids-hero__badge-dot" aria-hidden="true" />
            English coaching for ages 6–18
          </span>

          <h1 className="kids-hero__title">
            Your child has<br />
            <span className="kids-hero__title-accent">something to say.</span>
          </h1>

          <p className="kids-hero__sub">
            One-on-one coaching that builds real confidence — not just test scores.
            Live sessions. Real coaches. The kind of progress that shows at school,
            at home, and everywhere in between.
          </p>

          <div className="kids-hero__cta">
            <Link
              className="kids-btn kids-btn--primary"
              href={routeHref(APP_ROUTES.register, locale)}
            >
              <span>Book a free trial session</span>
            </Link>
            <a className="kids-btn kids-btn--ghost" href="#kids-how">
              See how it works
            </a>
          </div>

          <div className="kids-hero__stats">
            <div className="kids-hero__stat">
              <span className="kids-hero__stat-num">500+</span>
              <span className="kids-hero__stat-label">Kids coached</span>
            </div>
            <div className="kids-hero__stat-sep" aria-hidden="true" />
            <div className="kids-hero__stat">
              <span className="kids-hero__stat-num">98%</span>
              <span className="kids-hero__stat-label">Parent satisfaction</span>
            </div>
            <div className="kids-hero__stat-sep" aria-hidden="true" />
            <div className="kids-hero__stat">
              <span className="kids-hero__stat-num">3</span>
              <span className="kids-hero__stat-label">Age groups</span>
            </div>
          </div>
        </div>

        <div className="kids-hero__media" aria-hidden="true">
          <div className="kids-hero__img-wrap">
            <div className="kids-hero__img-placeholder">
              <span className="kids-hero__img-label">Kids coaching photo</span>
            </div>
            <div className="kids-hero__img-overlay" />
          </div>
          <div className="kids-hero__float kids-hero__float--a">
            <span className="kids-hero__float-dot" />
            Live with a coach
          </div>
          <div className="kids-hero__float kids-hero__float--b">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
              <circle cx="6.5" cy="6.5" r="5.5" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M4 6.5l2 2 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Great job, Omar!
          </div>
          <div className="kids-hero__float kids-hero__float--c">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
              <path d="M6.5 1.5v1.2M6.5 10.3v1.2M1.5 6.5h1.2M10.3 6.5h1.2M3.2 3.2l.85.85M8.95 8.95l.85.85M3.2 9.8l.85-.85M8.95 4.05l.85-.85" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
            Real-time feedback
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   TRUST STRIP
───────────────────────────────────────────── */
const TRUST_ITEMS = [
  {
    title: "Vetted kids coaches",
    text: "Matched by age, goals, and personality.",
    tone: "coral",
  },
  {
    title: "Parent notes every time",
    text: "You always know what improved and what is next.",
    tone: "teal",
  },
  {
    title: "Free first session",
    text: "Try the coach, the flow, and the fit first.",
    tone: "gold",
  },
  {
    title: "No pressure to perform",
    text: "Confidence comes before correction.",
    tone: "navy",
  },
];

function KidsTrustStrip() {
  return (
    <section className="kids-trust" aria-label="Why parents trust Speexify kids">
      <div className="kids-container">
        <div className="kids-trust__grid" data-reveal>
          {TRUST_ITEMS.map((item) => (
            <div
              key={item.title}
              className={`kids-trust__item kids-trust__item--${item.tone}`}
            >
              <span className="kids-trust__icon" aria-hidden="true">
                <span />
              </span>
              <div>
                <h2>{item.title}</h2>
                <p>{item.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   FIRST SESSION
───────────────────────────────────────────── */
const FIRST_SESSION_STEPS = [
  {
    time: "0-5 min",
    title: "They settle in.",
    text: "The coach starts with something easy: name, hobbies, school, favorite things. No test. No cold start.",
  },
  {
    time: "5-20 min",
    title: "They speak for real.",
    text: "A short story, picture prompt, or playful question gets them talking in complete thoughts.",
  },
  {
    time: "20-30 min",
    title: "They leave with a win.",
    text: "The coach gives one small correction, one confidence note, and one thing to practice next.",
  },
];

function KidsFirstSession({ locale }) {
  return (
    <section className="kids-first">
      <div className="kids-container kids-first__grid">
        <div className="kids-first__copy" data-reveal>
          <span className="kids-first__eyebrow">The free trial</span>
          <h2 className="kids-first__title">
            You will know in one session if this is right for them.
          </h2>
          <p className="kids-first__sub">
            The first session is designed to feel warm, easy, and safe. We are
            not measuring your child against a textbook. We are watching how
            they speak, where they hesitate, and what kind of coach will bring
            them out.
          </p>
          <Link
            className="kids-btn kids-btn--primary"
            href={routeHref(APP_ROUTES.register, locale)}
          >
            Book the free trial
          </Link>
        </div>

        <div className="kids-first__card" data-reveal>
          <div className="kids-first__card-top">
            <span className="kids-first__card-label">First session flow</span>
            <span className="kids-first__card-pill">30 min</span>
          </div>
          <div className="kids-first__steps">
            {FIRST_SESSION_STEPS.map((step, i) => (
              <div key={step.time} className="kids-first__step">
                <span className="kids-first__step-dot" aria-hidden="true">
                  {i + 1}
                </span>
                <div>
                  <span className="kids-first__step-time">{step.time}</span>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="kids-first__parent-note">
            <span aria-hidden="true">Parent note</span>
            <strong>After the trial, you get a clear recommendation.</strong>
            <p>Best session type, suggested frequency, and what your child needs next.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   MANIFESTO STRIP
───────────────────────────────────────────── */
function KidsManifesto() {
  const items = [
    "Real coaches.",
    "Real conversations.",
    "Real confidence.",
    "No drills.",
    "No scripts.",
    "Just your child, a coach, and a language.",
    "Ages 6–18.",
    "One conversation at a time.",
  ];

  return (
    <div className="kids-manifesto" aria-hidden="true">
      <div className="kids-manifesto__track">
        {[...items, ...items].map((item, i) => (
          <span key={i} className="kids-manifesto__item">
            {item}
            <span className="kids-manifesto__sep">·</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   PROBLEM SECTION
───────────────────────────────────────────── */
function KidsProblem() {
  return (
    <section className="kids-problem">
      <div className="kids-container">
        <div className="kids-problem__inner">
          <div className="kids-problem__text" data-reveal>
            <span className="kids-problem__eyebrow">The gap no one talks about</span>
            <h2 className="kids-problem__title">
              They study English every day.
              <br />
              But ask them to speak it — and they freeze.
            </h2>
            <p className="kids-problem__body">
              That moment of silence when it&apos;s their turn to answer.
              The hesitation before they say something. Translating in
              their head instead of just talking.
            </p>
            <p className="kids-problem__body">
              That&apos;s not a language problem. That&apos;s a practice problem.
              And Speexify is where it gets solved — one real conversation
              at a time.
            </p>
          </div>

          <div className="kids-problem__visual" aria-hidden="true" data-reveal>
            <div className="kids-problem__card kids-problem__card--before">
              <div className="kids-problem__card-label">Before</div>
              <div className="kids-problem__card-silence">
                <span>. . .</span>
                <span className="kids-problem__card-note">That silence.</span>
              </div>
            </div>
            <div className="kids-problem__arrow" aria-hidden="true">→</div>
            <div className="kids-problem__card kids-problem__card--after">
              <div className="kids-problem__card-label">After Speexify</div>
              <div className="kids-problem__card-quote">
                &ldquo;My name is Omar and I want to tell you about my weekend…&rdquo;
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   KIDS LIVE SESSION DEMO  (CSS cinema)
───────────────────────────────────────────── */
function KidsLiveDemo() {
  const waveBars = [
    { h: 20, d: "0s" },
    { h: 45, d: "0.1s" },
    { h: 60, d: "0.2s" },
    { h: 30, d: "0.05s" },
    { h: 70, d: "0.15s" },
    { h: 50, d: "0.08s" },
    { h: 75, d: "0.18s" },
    { h: 38, d: "0.12s" },
    { h: 55, d: "0.22s" },
    { h: 25, d: "0.06s" },
    { h: 65, d: "0.16s" },
    { h: 42, d: "0.28s" },
  ];

  return (
    <section className="kids-demo">
      <div className="kids-demo__glow" aria-hidden="true" />
      <div className="kids-container">
        <div className="kids-demo__header" data-reveal>
          <span className="kids-demo__eyebrow">
            <span className="kids-demo__eyebrow-dot" aria-hidden="true" />
            Inside a session
          </span>
          <h2 className="kids-demo__heading">
            See what happens when<br />your child has a real coach.
          </h2>
          <p className="kids-demo__sub">
            Not a game. Not a video. A live session where coaches build
            confidence one conversation at a time.
          </p>
        </div>

        <div className="kids-demo__scene">
          <div
            className="kids-demo__window"
            role="img"
            aria-label="Animated preview of a Speexify kids coaching session"
          >
            {/* Browser chrome */}
            <div className="kids-demo__chrome">
              <div className="kids-demo__dots">
                <span aria-hidden="true" />
                <span aria-hidden="true" />
                <span aria-hidden="true" />
              </div>
              <div className="kids-demo__url">speexify.com/session</div>
              <div className="kids-demo__timer">18:42</div>
            </div>

            {/* Session body */}
            <div className="kids-demo__body">
              {/* Coach row */}
              <div className="kids-demo__coach-row kdemo-in-1">
                <div className="kids-demo__coach-avatar">
                  <span>MS</span>
                  <span className="kids-demo__live-dot" aria-hidden="true" />
                </div>
                <div className="kids-demo__coach-info">
                  <div className="kids-demo__coach-name">Miss Sarah</div>
                  <div className="kids-demo__coach-role">Kids English Coach</div>
                </div>
                <div className="kids-demo__live-badge">LIVE</div>
              </div>

              <div className="kids-demo__sep" aria-hidden="true" />

              {/* Coach question */}
              <div className="kids-demo__coach-msg kdemo-in-2">
                <div className="kids-demo__coach-bubble">
                  Tell me about your weekend!
                </div>
              </div>

              {/* Child response */}
              <div className="kids-demo__student-msg kdemo-in-3">
                <div className="kids-demo__student-bubble">
                  I{" "}
                  <mark className="kids-demo__err">go</mark>{" "}
                  to the park with my dad.
                </div>
              </div>

              {/* Waveform */}
              <div className="kids-demo__wave kdemo-wave-show" aria-hidden="true">
                {waveBars.map((bar, i) => (
                  <span
                    key={i}
                    className="kids-demo__wave-bar"
                    style={{
                      "--bar-h": `${bar.h}%`,
                      "--bar-delay": bar.d,
                    }}
                  />
                ))}
              </div>

              {/* Correction panel */}
              <div className="kids-demo__correction kdemo-in-4">
                <div className="kids-demo__correction-icon" aria-hidden="true">
                  <svg viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M5.5 8l2 2 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="kids-demo__correction-content">
                  <div className="kids-demo__correction-label">
                    Nice try! Small fix:
                  </div>
                  <div className="kids-demo__correction-row">
                    <span className="kids-demo__corr-before">go</span>
                    <span className="kids-demo__corr-arrow">→</span>
                    <span className="kids-demo__corr-after">went</span>
                    <span className="kids-demo__corr-hint">(past tense)</span>
                  </div>
                </div>
              </div>

              {/* Corrected child text */}
              <div className="kids-demo__corrected-msg kdemo-in-5">
                <div className="kids-demo__student-bubble">
                  I{" "}
                  <mark className="kids-demo__corrected-word">went</mark>{" "}
                  to the park with my dad.
                </div>
              </div>

              {/* Coach note */}
              <div className="kids-demo__note kdemo-in-6">
                <svg viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <path d="M7 1.5l1.4 2.8 3.1.45-2.25 2.2.53 3.1L7 8.6l-2.78 1.45.53-3.1L2.5 4.75l3.1-.45L7 1.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
                </svg>
                Perfect! You got it. Keep going, Omar!
              </div>
            </div>
          </div>

          {/* Floating badges */}
          <div className="kids-demo__float kids-demo__float--a">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
              <path d="M6.5 1l1.3 2.65 2.93.43-2.12 2.07.5 2.92L6.5 7.7 3.89 9.07l.5-2.92L2.27 4.08l2.93-.43L6.5 1z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
            </svg>
            1 star earned!
          </div>
          <div className="kids-demo__float kids-demo__float--b">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
              <circle cx="6.5" cy="6.5" r="5.5" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M4 6.5l2 2 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Great job, Omar!
          </div>
        </div>

        <div className="kids-demo__features" data-reveal>
          {[
            "Gentle, encouraging corrections",
            "Live 1-on-1 sessions, no pressure",
            "Progress reports for parents",
            "Coaches trained in child development",
          ].map((f, i) => (
            <div key={i} className="kids-demo__feature">
              <span className="kids-demo__feature-dot" aria-hidden="true" />
              {f}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   PARENT REASSURANCE
───────────────────────────────────────────── */
const REASSURANCE_ITEMS = [
  {
    title: "For shy kids",
    text: "The first goal is comfort. Coaches build trust before they ask for longer answers.",
  },
  {
    title: "Screen-safe sessions",
    text: "A real coach leads the room. No random peers, no public chat, no unsupervised practice.",
  },
  {
    title: "Coach matching",
    text: "We match by age, personality, goals, and whether your child needs gentle support or a bigger challenge.",
  },
  {
    title: "Visible progress",
    text: "Parents receive simple notes after sessions, so progress is not hidden inside a video call.",
  },
];

function KidsParentReassurance() {
  return (
    <section className="kids-reassure">
      <div className="kids-container">
        <div className="kids-reassure__header" data-reveal>
          <span className="kids-reassure__eyebrow">Parent peace of mind</span>
          <h2 className="kids-reassure__title">
            Warm for kids. Clear for parents.
          </h2>
          <p className="kids-reassure__sub">
            A child should feel seen, not judged. A parent should never wonder
            what happened in the session or whether the coach is the right fit.
          </p>
        </div>

        <div className="kids-reassure__grid">
          {REASSURANCE_ITEMS.map((item, i) => (
            <div key={item.title} className="kids-reassure__card" data-reveal>
              <span className="kids-reassure__num">{String(i + 1).padStart(2, "0")}</span>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   AGE GROUPS
───────────────────────────────────────────── */
const AGE_GROUPS = [
  {
    range: "Ages 6 – 10",
    name: "Young Explorers",
    tagline: "Building the habit of speaking.",
    mod: "coral",
    focus: [
      "Storytelling & imagination",
      "Songs, rhythm, and sound",
      "Confidence to speak up",
      "Simple everyday conversations",
    ],
  },
  {
    range: "Ages 11 – 14",
    name: "Rising Stars",
    tagline: "Finding their voice at school.",
    mod: "teal",
    focus: [
      "School presentations",
      "Social confidence",
      "Reading aloud without fear",
      "Expressing opinions clearly",
    ],
  },
  {
    range: "Ages 15 – 18",
    name: "Future Leaders",
    tagline: "Ready for what is next.",
    mod: "gold",
    focus: [
      "University and interview prep",
      "Leadership communication",
      "Writing that gets noticed",
      "Global English fluency",
    ],
  },
];

function KidsAgeGroups() {
  return (
    <section className="kids-ages">
      <div className="kids-container">
        <div className="kids-ages__header" data-reveal>
          <span className="kids-ages__eyebrow">Age groups</span>
          <h2 className="kids-ages__title">
            Built for every stage of growing up.
          </h2>
          <p className="kids-ages__sub">
            Different ages need different approaches. We build each session
            around where your child is — not where a textbook says they
            should be.
          </p>
        </div>

        <div className="kids-ages__grid">
          {AGE_GROUPS.map((g, i) => (
            <div
              key={i}
              className={`kids-ages__card kids-ages__card--${g.mod}`}
              data-reveal
            >
              <div className="kids-ages__card-stripe" aria-hidden="true" />
              <div className="kids-ages__card-top">
                <span className="kids-ages__card-range">{g.range}</span>
              </div>
              <div className="kids-ages__img-placeholder" aria-hidden="true">
                <span className="kids-ages__img-label">Photo placeholder</span>
              </div>
              <h3 className="kids-ages__card-name">{g.name}</h3>
              <p className="kids-ages__card-tagline">{g.tagline}</p>
              <ul className="kids-ages__card-focus">
                {g.focus.map((item, j) => (
                  <li key={j} className="kids-ages__card-focus-item">
                    <span className="kids-ages__card-check" aria-hidden="true">
                      <svg viewBox="0 0 8 8" fill="none">
                        <path d="M1.5 4l2 2 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   WHY IT WORKS  (bento grid)
───────────────────────────────────────────── */
function KidsWhyItWorks() {
  return (
    <section className="kids-why">
      <div className="kids-container">
        <div className="kids-why__header" data-reveal>
          <span className="kids-why__eyebrow">Why it works</span>
          <h2 className="kids-why__title">
            Different from every class they have had.
          </h2>
        </div>

        <div className="kids-why__bento">
          <div className="kids-why__card kids-why__card--lg" data-reveal>
            <span className="kids-why__num">01</span>
            <h3 className="kids-why__card-title">
              Coaches trained for children, not adults.
            </h3>
            <p className="kids-why__card-text">
              Our kids coaches know child psychology, attention spans, and how
              to make English feel like discovery — not homework.
            </p>
            <div className="kids-why__card-img" aria-hidden="true" />
          </div>

          <div className="kids-why__card kids-why__card--sm" data-reveal>
            <span className="kids-why__num">02</span>
            <h3 className="kids-why__card-title">
              Progress you can actually see.
            </h3>
            <p className="kids-why__card-text">
              After every session, parents get a short note: what was
              practiced, what improved, what is next.
            </p>
          </div>

          <div className="kids-why__card kids-why__card--sm" data-reveal>
            <span className="kids-why__num">03</span>
            <h3 className="kids-why__card-title">
              Sessions that fit real schedules.
            </h3>
            <p className="kids-why__card-text">
              30 or 45 minutes, once or twice a week. Short enough to keep
              focus. Consistent enough to feel real progress.
            </p>
          </div>

          <div className="kids-why__card kids-why__card--sm" data-reveal>
            <span className="kids-why__num">04</span>
            <h3 className="kids-why__card-title">Encouragement first. Always.</h3>
            <p className="kids-why__card-text">
              We build confidence before we correct. The moment a child
              feels safe to make mistakes is when they start to truly learn.
            </p>
          </div>

          <div className="kids-why__card kids-why__card--wide" data-reveal>
            <span className="kids-why__num">05</span>
            <h3 className="kids-why__card-title">
              Group sessions for the ones who learn from the room.
            </h3>
            <p className="kids-why__card-text">
              Small groups of 4–6 kids where conversations happen naturally.
              The kind of social confidence that cannot be built alone.
            </p>
            <div className="kids-why__stat">
              <span className="kids-why__stat-num">4–6</span>
              <span className="kids-why__stat-label">kids per group, maximum</span>
            </div>
          </div>

          <div className="kids-why__card kids-why__card--sm kids-why__card--dark" data-reveal>
            <span className="kids-why__num">06</span>
            <h3 className="kids-why__card-title">
              Built around your child.
            </h3>
            <p className="kids-why__card-text">
              Preparing for an international school? Studying abroad? We
              build the plan from your child&apos;s real life — not a textbook.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   HOW IT WORKS
───────────────────────────────────────────── */
const HOW_STEPS = [
  {
    num: "01",
    label: "Tell us about your child",
    title: "Tell us about your child.",
    text: "A short call. We listen for what they need — at school, with friends, for their future. Then we shape a practice plan around that.",
  },
  {
    num: "02",
    label: "Meet their coach",
    title: "Meet their coach.",
    text: "We match your child with a coach who fits their age, their goals, and their personality. Not random. Chosen.",
  },
  {
    num: "03",
    label: "Watch them grow",
    title: "Watch them grow.",
    text: "Live sessions, once or twice a week. A parent note after every one. Within a month, you will hear the difference.",
  },
];

function KidsHowItWorks({ locale }) {
  return (
    <section className="kids-how" id="kids-how">
      <div className="kids-container">
        <div className="kids-how__header" data-reveal>
          <span className="kids-how__eyebrow">How it works</span>
          <h2 className="kids-how__title">
            Three steps to a different kind of confidence.
          </h2>
        </div>

        <div className="kids-how__steps">
          {HOW_STEPS.map((step, i) => (
            <div key={i} className="kids-how__step" data-reveal>
              <div className="kids-how__step-num">{step.num}</div>
              <div className="kids-how__step-line" aria-hidden="true" />
              <div className="kids-how__step-body">
                <span className="kids-how__step-label">{step.label}</span>
                <h3 className="kids-how__step-title">{step.title}</h3>
                <p className="kids-how__step-text">{step.text}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="kids-how__cta" data-reveal>
          <Link
            className="kids-btn kids-btn--primary"
            href={routeHref(APP_ROUTES.register, locale)}
          >
            Book a free trial session
          </Link>
          <Link
            className="kids-btn kids-btn--ghost"
            href={routeHref(APP_ROUTES.contact, locale)}
          >
            Ask us anything
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   SESSION TYPES
───────────────────────────────────────────── */
function KidsSessionTypes({ locale }) {
  return (
    <section className="kids-sessions">
      <div className="kids-container">
        <div className="kids-sessions__header" data-reveal>
          <span className="kids-sessions__eyebrow">Session types</span>
          <h2 className="kids-sessions__title">
            One-on-one or group. Your child&apos;s pace, your call.
          </h2>
        </div>

        <div className="kids-sessions__grid">
          <div className="kids-sessions__card kids-sessions__card--solo" data-reveal>
            <div className="kids-sessions__tag">1-on-1</div>
            <h3 className="kids-sessions__card-title">Private sessions.</h3>
            <p className="kids-sessions__card-text">
              100% of the coach&apos;s attention on your child. Faster progress,
              deeper focus, and a relationship that builds over time.
            </p>
            <div className="kids-sessions__img-placeholder" aria-hidden="true">
              <span>Photo placeholder</span>
            </div>
            <ul className="kids-sessions__list">
              <li>Fully personalised practice plan</li>
              <li>Flexible scheduling</li>
              <li>30 or 45 minutes per session</li>
              <li>Parent progress notes after every session</li>
            </ul>
            <Link
              className="kids-btn kids-btn--primary kids-btn--full"
              href={routeHref(APP_ROUTES.register, locale)}
            >
              Book free 1-on-1 trial
            </Link>
          </div>

          <div className="kids-sessions__card kids-sessions__card--group" data-reveal>
            <div className="kids-sessions__tag kids-sessions__tag--group">
              Group
            </div>
            <h3 className="kids-sessions__card-title">Group sessions.</h3>
            <p className="kids-sessions__card-text">
              4–6 kids, one coach. Real conversations between real peers.
              The social confidence that only comes from speaking in a room.
            </p>
            <div className="kids-sessions__img-placeholder" aria-hidden="true">
              <span>Photo placeholder</span>
            </div>
            <ul className="kids-sessions__list">
              <li>Small groups — 4 to 6 kids maximum</li>
              <li>Age-matched peers</li>
              <li>Fixed weekly schedule</li>
              <li>Shared goals, individual growth</li>
            </ul>
            <Link
              className="kids-btn kids-btn--outline kids-btn--full"
              href={routeHref(APP_ROUTES.contact, locale)}
            >
              Join a group
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function KidsStickyCTA({ locale }) {
  return (
    <Link
      className="kids-sticky-cta"
      href={routeHref(APP_ROUTES.register, locale)}
      aria-label="Book a free trial session"
    >
      <span>
        <strong>Free trial</strong>
        <small>No commitment</small>
      </span>
      <b>Book free trial</b>
    </Link>
  );
}

/* ─────────────────────────────────────────────
   PARENT TESTIMONIALS
───────────────────────────────────────────── */
const TESTIMONIALS = [
  {
    quote:
      "My daughter used to refuse to speak English outside of school. After six sessions, she corrects ME when I say something wrong. The confidence shift was real.",
    author: "Dina R.",
    role: "Mother of a 9-year-old",
    metric: "6 sessions",
    metricLabel: "to a visible shift",
  },
  {
    quote:
      "My son had a school presentation he was terrified of. We did three practice sessions. He got full marks. But more than that — he walked in without the fear.",
    author: "Ahmed M.",
    role: "Father of a 13-year-old",
    metric: "3 sessions",
    metricLabel: "before the big one",
  },
  {
    quote:
      "We tried apps, we tried tutors. Nothing worked like this. The coach felt like she actually cared about Layla specifically — not just teaching English in general.",
    author: "Mona K.",
    role: "Mother of an 11-year-old",
    metric: "1 month",
    metricLabel: "to real progress",
  },
];

function KidsTestimonials() {
  return (
    <section className="kids-testi">
      <div className="kids-container">
        <div className="kids-testi__header" data-reveal>
          <span className="kids-testi__eyebrow">From parents</span>
          <h2 className="kids-testi__title">What parents say, after.</h2>
          <p className="kids-testi__sub">
            Real shifts. In real kids. Noticed by the people watching closest.
          </p>
        </div>

        <div className="kids-testi__grid">
          {TESTIMONIALS.map((item, i) => (
            <div key={i} className="kids-testi__card" data-reveal>
              <div className="kids-testi__metric">
                <span className="kids-testi__metric-num">{item.metric}</span>
                <span className="kids-testi__metric-label">{item.metricLabel}</span>
              </div>
              <blockquote className="kids-testi__quote">
                &ldquo;{item.quote}&rdquo;
              </blockquote>
              <div className="kids-testi__author">
                <div className="kids-testi__avatar">
                  {item.author
                    .split(" ")
                    .map((w) => w[0])
                    .join("")}
                </div>
                <div>
                  <div className="kids-testi__name">{item.author}</div>
                  <div className="kids-testi__role">{item.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   COACHES
───────────────────────────────────────────── */
const COACHES = [
  {
    initials: "NE",
    name: "Nadia E.",
    role: "Kids Specialist · Ages 6–12",
    bio: "Seven years teaching children in international schools. Knows exactly how to make a shy kid feel brave enough to speak.",
  },
  {
    initials: "KA",
    name: "Karim A.",
    role: "Teen Coach · Ages 12–18",
    bio: "Former school counsellor turned language coach. Helps teenagers find their voice — in English and beyond.",
  },
  {
    initials: "LS",
    name: "Leila S.",
    role: "Group Session Coach",
    bio: "Specialises in group dynamics. Runs sessions where every child feels seen — not just the loudest ones.",
  },
];

function KidsCoaches() {
  return (
    <section className="kids-coaches">
      <div className="kids-container">
        <div className="kids-coaches__header" data-reveal>
          <span className="kids-coaches__eyebrow">The coaches</span>
          <h2 className="kids-coaches__title">
            Coaches your child will actually look up to.
          </h2>
          <p className="kids-coaches__sub">
            Every Speexify kids coach has worked with children before. Not
            just in language teaching — in real classrooms, real schools,
            real pressure situations.
          </p>
        </div>

        <div className="kids-coaches__grid">
          {COACHES.map((c, i) => (
            <div key={i} className="kids-coaches__card" data-reveal>
              <div className="kids-coaches__img-placeholder" aria-hidden="true">
                <span className="kids-coaches__initials">{c.initials}</span>
              </div>
              <h3 className="kids-coaches__name">{c.name}</h3>
              <p className="kids-coaches__role">{c.role}</p>
              <p className="kids-coaches__bio">{c.bio}</p>
            </div>
          ))}
        </div>

        <p className="kids-coaches__note" data-reveal>
          All coaches go through our kids-specific matching process.
          No random assignments.
        </p>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   FAQ
───────────────────────────────────────────── */
const FAQS = [
  {
    q: "What age does my child need to be?",
    a: "We work with kids from 6 to 18. Each age group has coaches trained specifically for that stage — Young Explorers (6–10), Rising Stars (11–14), and Future Leaders (15–18).",
  },
  {
    q: "What if my child is shy or hesitant to speak?",
    a: "Good. That is exactly who this is for. Our coaches are trained to build trust before they build fluency. The first session is always about making your child feel safe, not evaluated.",
  },
  {
    q: "How long is each session and how often?",
    a: "30 or 45 minutes, once or twice a week. Short enough to keep their focus. Consistent enough to feel real progress inside a month.",
  },
  {
    q: "Will I know what happened in each session?",
    a: "Yes. After every session, you get a short note: what was practiced, what went well, and what is coming next. You will never wonder if it is working.",
  },
  {
    q: "Is this different from a regular English tutor?",
    a: "Very. Tutors teach. Coaches practice. Our sessions are not about grammar drills or homework help — they are about building the confidence to actually use the language in the real world.",
  },
];

function KidsFAQ() {
  const [open, setOpen] = useState(null);

  return (
    <section className="kids-faq">
      <div className="kids-container">
        <div className="kids-faq__header" data-reveal>
          <span className="kids-faq__eyebrow">Before you book</span>
          <h2 className="kids-faq__title">Questions parents ask first.</h2>
        </div>

        <div className="kids-faq__list" data-reveal>
          {FAQS.map((faq, i) => (
            <div
              key={i}
              className={`kids-faq__item${open === i ? " kids-faq__item--open" : ""}`}
            >
              <button
                className="kids-faq__question"
                onClick={() => setOpen(open === i ? null : i)}
                aria-expanded={open === i}
              >
                <span>{faq.q}</span>
                <span className="kids-faq__toggle" aria-hidden="true">
                  {open === i ? "−" : "+"}
                </span>
              </button>
              <div className="kids-faq__answer">
                <p>{faq.a}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   FINAL CTA
───────────────────────────────────────────── */
function KidsCTA({ locale }) {
  return (
    <section className="kids-cta">
      <div className="kids-cta__bg" aria-hidden="true">
        <div className="kids-cta__gradient" />
      </div>
      <div className="kids-container">
        <div className="kids-cta__inner" data-reveal>
          <span className="kids-cta__eyebrow">Get started</span>
          <h2 className="kids-cta__title">
            The first session<br />is on us.
          </h2>
          <p className="kids-cta__sub">
            Book a free trial session. No commitment. See for yourself what a
            real coach — and a child who has been given a place to practice
            — can do.
          </p>
          <div className="kids-cta__buttons">
            <Link
              className="kids-btn kids-btn--cta"
              href={routeHref(APP_ROUTES.register, locale)}
            >
              Book their free session
            </Link>
            <Link
              className="kids-btn kids-btn--cta-ghost"
              href={routeHref(APP_ROUTES.contact, locale)}
            >
              Ask us anything
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
