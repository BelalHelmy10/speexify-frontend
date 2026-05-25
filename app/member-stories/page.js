// app/member-stories/page.js
"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import "@/styles/member-stories.scss";
import { getDictionary, t } from "@/app/i18n";
import { APP_ROUTES, routeHref } from "@/lib/routes";

const stories = [
  {
    key: "story1",
    slug: "sara",
    img: "/images/head-of-cs.avif",
  },
  {
    key: "story2",
    slug: "ahmed",
    img: "/images/ali.avif",
  },
  {
    key: "story3",
    slug: "yara",
    img: "/images/leader_chris.avif",
  },
];

export default function MemberStoriesIndexPage() {
  const pathname = usePathname();
  const locale = pathname?.startsWith("/ar") ? "ar" : "en";
  const dict = getDictionary(locale, "member-stories");

  return (
    <main className="ms">
      {/* HERO */}
      <section className="ms__hero">
        <div className="ms__container">
          <span className="ms__eyebrow">{t(dict, "index_eyebrow")}</span>
          <h1 className="ms__display">
            <span>{t(dict, "index_title_a")}</span>
            <em>{t(dict, "index_title_b")}</em>
          </h1>
          <p className="ms__sub">{t(dict, "index_sub")}</p>
        </div>
      </section>

      {/* STORY LIST */}
      <section className="ms__list">
        <div className="ms__container">
          {stories.map((s, idx) => (
            <article
              key={s.key}
              className={`ms__row${idx % 2 === 1 ? " ms__row--flip" : ""}`}
            >
              <Link
                href={routeHref(`${APP_ROUTES.memberStories}/${s.slug}`, locale)}
                className="ms__row-media"
                aria-label={t(dict, `${s.key}_name`)}
              >
                <Image
                  src={s.img}
                  alt={t(dict, `${s.key}_name`)}
                  width={900}
                  height={1100}
                  className="ms__row-img"
                  sizes="(max-width: 780px) 92vw, 46vw"
                />
                <span className="ms__row-index" aria-hidden="true">
                  N° 0{idx + 1}
                </span>
              </Link>

              <div className="ms__row-body">
                <div className="ms__meta">
                  <strong>{t(dict, `${s.key}_name`)}</strong>
                  <span>{t(dict, `${s.key}_role`)}</span>
                  <span className="ms__meta-dot" aria-hidden="true">·</span>
                  <span>{t(dict, `${s.key}_city`)}</span>
                </div>
                <h2 className="ms__row-title">{t(dict, `${s.key}_shift`)}</h2>
                <Link
                  href={routeHref(`${APP_ROUTES.memberStories}/${s.slug}`, locale)}
                  className="ms__read"
                >
                  <span>{t(dict, "index_card_read")}</span>
                  <ArrowUpRight size={16} strokeWidth={2} aria-hidden="true" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="ms__cta">
        <div className="ms__container ms__cta-inner">
          <h2>{t(dict, "index_cta_title")}</h2>
          <p>{t(dict, "index_cta_sub")}</p>
          <div className="ms__cta-actions">
            <Link
              href={routeHref(APP_ROUTES.register, locale)}
              className="ms-btn ms-btn--primary"
            >
              <span>{t(dict, "index_cta_primary")}</span>
              <ArrowRight size={16} strokeWidth={2.2} aria-hidden="true" />
            </Link>
            <Link
              href={routeHref(APP_ROUTES.contact, locale)}
              className="ms-btn ms-btn--ghost"
            >
              {t(dict, "index_cta_secondary")}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
