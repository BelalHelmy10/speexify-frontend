"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { usePathname } from "next/navigation";
import "@/styles/member-stories.scss";
import { getDictionary, t } from "@/app/i18n";
import { APP_ROUTES, getStarterSessionHref, routeHref } from "@/lib/routes";

const practiceNotes = [
  { key: "note1", slug: "practice", index: "01" },
  { key: "note2", slug: "conversation", index: "02" },
  { key: "note3", slug: "next-step", index: "03" },
];

export default function MemberStoriesIndexPage() {
  const pathname = usePathname();
  const locale = pathname?.startsWith("/ar") ? "ar" : "en";
  const dict = getDictionary(locale, "member-stories");

  return (
    <main className="ms">
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

      <section className="ms__list">
        <div className="ms__container">
          {practiceNotes.map((note, idx) => (
            <article
              key={note.key}
              className={`ms__row${idx % 2 === 1 ? " ms__row--flip" : ""}`}
            >
              <Link
                href={routeHref(`${APP_ROUTES.memberStories}/${note.slug}`, locale)}
                className="ms__row-media ms__row-media--note"
                aria-label={t(dict, `${note.key}_title`)}
              >
                <span className="ms__row-index" aria-hidden="true">
                  N° {note.index}
                </span>
                <span className="ms__eyebrow">{t(dict, "note_label")}</span>
                <strong>{t(dict, `${note.key}_title`)}</strong>
              </Link>

              <div className="ms__row-body">
                <div className="ms__meta">
                  <strong>{t(dict, "note_label")}</strong>
                  <span>{t(dict, `${note.key}_tag`)}</span>
                </div>
                <h2 className="ms__row-title">{t(dict, `${note.key}_title`)}</h2>
                <p className="ms__row-copy">{t(dict, `${note.key}_body`)}</p>
                <Link
                  href={routeHref(`${APP_ROUTES.memberStories}/${note.slug}`, locale)}
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

      <section className="ms__cta">
        <div className="ms__container ms__cta-inner">
          <h2>{t(dict, "index_cta_title")}</h2>
          <p>{t(dict, "index_cta_sub")}</p>
          <div className="ms__cta-actions">
            <Link
              href={getStarterSessionHref(locale)}
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
