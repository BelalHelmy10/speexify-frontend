"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { usePathname } from "next/navigation";
import "@/styles/member-stories.scss";
import { getDictionary, t } from "@/app/i18n";
import { APP_ROUTES, getStarterSessionHref, routeHref } from "@/lib/routes";

export default function MemberStoryDetailClient() {
  const pathname = usePathname();
  const locale = pathname?.startsWith("/ar") ? "ar" : "en";
  const dict = getDictionary(locale, "member-stories");

  return (
    <main className="ms ms--detail">
      <div className="ms__container ms__detail-back">
        <Link
          href={routeHref(APP_ROUTES.memberStories, locale)}
          className="ms__back-link"
        >
          <ArrowLeft size={14} strokeWidth={2.2} aria-hidden="true" />
          <span>{t(dict, "back")}</span>
        </Link>
      </div>

      <header className="ms__detail-head">
        <div className="ms__container">
          <span className="ms__eyebrow">{t(dict, "detail_eyebrow")}</span>
          <h1 className="ms__detail-title">{t(dict, "detail_title")}</h1>
        </div>
      </header>

      <section className="ms__prose">
        <div className="ms__container ms__prose-inner">
          <p className="ms__lede">{t(dict, "detail_body")}</p>
          <p>{t(dict, "detail_method")}</p>
        </div>
      </section>

      <section className="ms__outcome">
        <div className="ms__container ms__outcome-inner">
          <span className="ms__eyebrow">{t(dict, "detail_note_label")}</span>
          <p>{t(dict, "detail_note")}</p>
        </div>
      </section>

      <section className="ms__cta">
        <div className="ms__container ms__cta-inner">
          <h2>{t(dict, "detail_cta_title")}</h2>
          <p>{t(dict, "detail_cta_sub")}</p>
          <div className="ms__cta-actions">
            <Link
              href={getStarterSessionHref(locale)}
              className="ms-btn ms-btn--primary"
            >
              <span>{t(dict, "detail_cta_primary")}</span>
              <ArrowRight size={16} strokeWidth={2.2} aria-hidden="true" />
            </Link>
            <Link
              href={routeHref(APP_ROUTES.contact, locale)}
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
