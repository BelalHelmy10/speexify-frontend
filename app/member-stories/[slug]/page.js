// app/member-stories/[slug]/page.js
"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams, usePathname, notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Quote } from "lucide-react";
import "@/styles/member-stories.scss";
import { getDictionary, t } from "@/app/i18n";
import { APP_ROUTES, routeHref } from "@/lib/routes";

const storyMap = {
  sara: {
    key: "story1",
    img: "/images/head-of-cs.avif",
    nextSlug: "ahmed",
  },
  ahmed: {
    key: "story2",
    img: "/images/ali.avif",
    nextSlug: "yara",
  },
  yara: {
    key: "story3",
    img: "/images/leader_chris.avif",
    nextSlug: "sara",
  },
};

export default function MemberStoryDetailPage() {
  const pathname = usePathname();
  const params = useParams();
  const locale = pathname?.startsWith("/ar") ? "ar" : "en";
  const dict = getDictionary(locale, "member-stories");

  const slug = params?.slug;
  const story = storyMap[slug];
  if (!story) {
    return notFound();
  }

  const k = story.key;

  return (
    <main className="ms ms--detail">
      {/* BACK */}
      <div className="ms__container ms__detail-back">
        <Link
          href={routeHref(APP_ROUTES.memberStories, locale)}
          className="ms__back-link"
        >
          <ArrowLeft size={14} strokeWidth={2.2} aria-hidden="true" />
          <span>{t(dict, "back")}</span>
        </Link>
      </div>

      {/* HEADER */}
      <header className="ms__detail-head">
        <div className="ms__container">
          <span className="ms__eyebrow">
            {t(dict, `${k}_name`)} · {t(dict, `${k}_role`)}
          </span>
          <h1 className="ms__detail-title">{t(dict, `${k}_shift`)}</h1>
        </div>
      </header>

      {/* PORTRAIT */}
      <figure className="ms__portrait">
        <div className="ms__container">
          <Image
            src={story.img}
            alt={t(dict, `${k}_name`)}
            width={1600}
            height={1100}
            priority
            className="ms__portrait-img"
            sizes="(max-width: 900px) 100vw, 900px"
          />
          <figcaption className="ms__portrait-cap">
            <span>{t(dict, `${k}_name`)}</span>
            <span>{t(dict, `${k}_city`)}</span>
          </figcaption>
        </div>
      </figure>

      {/* META BAR */}
      <section className="ms__factbar">
        <div className="ms__container ms__factbar-grid">
          <div className="ms__fact">
            <span className="ms__fact-label">{t(dict, "detail_program_label")}</span>
            <span className="ms__fact-value">{t(dict, `${k}_program`)}</span>
          </div>
          <div className="ms__fact">
            <span className="ms__fact-label">{t(dict, "detail_coach_label")}</span>
            <span className="ms__fact-value">{t(dict, `${k}_coach`)}</span>
          </div>
          <div className="ms__fact">
            <span className="ms__fact-label">{t(dict, "detail_industry_label")}</span>
            <span className="ms__fact-value">{t(dict, `${k}_industry`)}</span>
          </div>
        </div>
      </section>

      {/* PROSE — PART 1 */}
      <section className="ms__prose">
        <div className="ms__container ms__prose-inner">
          <p className="ms__lede">{t(dict, `${k}_para1`)}</p>
          <p>{t(dict, `${k}_para2`)}</p>
          <p>{t(dict, `${k}_para3`)}</p>
        </div>
      </section>

      {/* BEFORE / AFTER */}
      <section className="ms__shift">
        <div className="ms__container ms__shift-grid">
          <div className="ms__shift-card ms__shift-card--before">
            <span className="ms__shift-tag">{t(dict, `${k}_before_label`)}</span>
            <p>&ldquo;{t(dict, `${k}_before`)}&rdquo;</p>
          </div>
          <div className="ms__shift-arrow" aria-hidden="true">→</div>
          <div className="ms__shift-card ms__shift-card--after">
            <span className="ms__shift-tag ms__shift-tag--after">
              {t(dict, `${k}_after_label`)}
            </span>
            <p>&ldquo;{t(dict, `${k}_after`)}&rdquo;</p>
          </div>
        </div>
      </section>

      {/* PROSE — PART 2 */}
      <section className="ms__prose">
        <div className="ms__container ms__prose-inner">
          <p>{t(dict, `${k}_para4`)}</p>
          <p>{t(dict, `${k}_para5`)}</p>
        </div>
      </section>

      {/* PULL QUOTE — the "surprise & stillness" moment */}
      <section className="ms__pull">
        <div className="ms__container">
          <Quote
            className="ms__pull-mark"
            size={36}
            strokeWidth={1.4}
            aria-hidden="true"
          />
          <blockquote className="ms__pull-quote">
            {t(dict, `${k}_pull_quote`)}
          </blockquote>
          <cite className="ms__pull-cite">
            — {t(dict, `${k}_name`)}, {t(dict, `${k}_role`)}
          </cite>
        </div>
      </section>

      {/* OUTCOME */}
      <section className="ms__outcome">
        <div className="ms__container ms__outcome-inner">
          <span className="ms__eyebrow">{t(dict, `${k}_outcome_label`)}</span>
          <p>{t(dict, `${k}_outcome`)}</p>
        </div>
      </section>

      {/* CTA */}
      <section className="ms__cta">
        <div className="ms__container ms__cta-inner">
          <h2>{t(dict, "detail_cta_title")}</h2>
          <p>{t(dict, "detail_cta_sub")}</p>
          <div className="ms__cta-actions">
            <Link
              href={routeHref(APP_ROUTES.register, locale)}
              className="ms-btn ms-btn--primary"
            >
              <span>{t(dict, "detail_cta_primary")}</span>
              <ArrowRight size={16} strokeWidth={2.2} aria-hidden="true" />
            </Link>
            <Link
              href={routeHref(`${APP_ROUTES.memberStories}/${story.nextSlug}`, locale)}
              className="ms-btn ms-btn--ghost"
            >
              {t(dict, "detail_cta_secondary")}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
