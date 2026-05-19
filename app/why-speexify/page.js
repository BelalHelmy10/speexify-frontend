// app/why-speexify/page.js
"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    AlertTriangle,
    ArrowRight,
    BarChart3,
    Boxes,
    CalendarCheck2,
    Check,
    Globe2,
    Handshake,
    MessageSquareText,
    Minus,
    Smartphone,
    Sparkles,
    Target,
    TrendingUp,
    Zap,
} from "lucide-react";
import "@/styles/why-speexify.scss";
import { getDictionary, t } from "@/app/i18n";
import { APP_ROUTES, routeHref } from "@/lib/routes";

const valuesConfig = [
    { num: "01", titleKey: "value1_title", descKey: "value1_desc", detailKey: "value1_detail", icon: Target },
    { num: "02", titleKey: "value2_title", descKey: "value2_desc", detailKey: "value2_detail", icon: MessageSquareText },
    { num: "03", titleKey: "value3_title", descKey: "value3_desc", detailKey: "value3_detail", icon: Globe2 },
    { num: "04", titleKey: "value4_title", descKey: "value4_desc", detailKey: "value4_detail", icon: TrendingUp },
];

const problemsConfig = [
    { titleKey: "problem_card1_title", textKey: "problem_card1_text", icon: AlertTriangle },
    { titleKey: "problem_card2_title", textKey: "problem_card2_text", icon: Smartphone },
    { titleKey: "problem_card3_title", textKey: "problem_card3_text", icon: Boxes },
];

const howConfig = [
    { titleKey: "how_point1_title", textKey: "how_point1_text", icon: Handshake },
    { titleKey: "how_point2_title", textKey: "how_point2_text", icon: Zap },
    { titleKey: "how_point3_title", textKey: "how_point3_text", icon: BarChart3 },
    { titleKey: "how_point4_title", textKey: "how_point4_text", icon: CalendarCheck2 },
];

const contrastConfig = [
    { themKey: "contrast_row1_them", usKey: "contrast_row1_us" },
    { themKey: "contrast_row2_them", usKey: "contrast_row2_us" },
    { themKey: "contrast_row3_them", usKey: "contrast_row3_us" },
    { themKey: "contrast_row4_them", usKey: "contrast_row4_us" },
    { themKey: "contrast_row5_them", usKey: "contrast_row5_us" },
];

const proofsConfig = [
    { quoteKey: "proof1_quote", nameKey: "proof1_name", contextKey: "proof1_context" },
    { quoteKey: "proof2_quote", nameKey: "proof2_name", contextKey: "proof2_context" },
    { quoteKey: "proof3_quote", nameKey: "proof3_name", contextKey: "proof3_context" },
];

export default function WhySpeexifyPage() {
    const pathname = usePathname();
    const locale = pathname?.startsWith("/ar") ? "ar" : "en";
    const dict = getDictionary(locale, "why-speexify");

    return (
        <main className="why">
            {/* HERO */}
            <section className="why__hero">
                <div className="why__hero-background">
                    <div className="why__hero-gradient"></div>
                    <div className="why__hero-pattern"></div>
                </div>

                <div className="why__hero-content container">
                    <div className="why__badge">
                        <span className="why__badge-icon" aria-hidden="true">
                            <Sparkles size={16} strokeWidth={2.2} />
                        </span>
                        <span>{t(dict, "hero_badge")}</span>
                    </div>

                    <h1 className="why__headline">
                        {t(dict, "hero_title_main")}
                        <span className="why__headline-accent">{t(dict, "hero_title_accent")}</span>
                    </h1>

                    <p className="why__sub">{t(dict, "hero_sub")}</p>

                    <div className="why__hero-proof" aria-label="Speexify method highlights">
                        <span>{t(dict, "hero_proof_1", "Live coaching")}</span>
                        <span>{t(dict, "hero_proof_2", "Real-world speaking")}</span>
                        <span>{t(dict, "hero_proof_3", "Progress you can feel")}</span>
                    </div>
                </div>
            </section>

            {/* THE PROBLEM */}
            <section className="why__problem">
                <div className="container">
                    <div className="why__section-header">
                        <h2 className="why__section-title">{t(dict, "problem_title")}</h2>
                        <p className="why__section-subtitle">{t(dict, "problem_subtitle")}</p>
                    </div>

                    <div className="why__problem-grid">
                        {problemsConfig.map((p, idx) => {
                            const Icon = p.icon;
                            return (
                            <article className="why__problem-card" key={p.titleKey}>
                                <div className="why__problem-index">0{idx + 1}</div>
                                <div className="why__problem-icon" aria-hidden="true">
                                    <Icon size={26} strokeWidth={2.1} />
                                </div>
                                <h3>{t(dict, p.titleKey)}</h3>
                                <p>{t(dict, p.textKey)}</p>
                            </article>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* OUR ANSWER - VALUES */}
            <section className="why__values">
                <div className="container">
                    <div className="why__section-header">
                        <h2 className="why__section-title">{t(dict, "solution_title")}</h2>
                        <p className="why__section-subtitle">{t(dict, "solution_subtitle")}</p>
                    </div>

                    <div className="why__values-list">
                        {valuesConfig.map((v) => {
                            const Icon = v.icon;
                            return (
                            <article className="why__value-item" key={v.titleKey}>
                                <div className="why__value-num">{v.num}</div>
                                <div className="why__value-content">
                                    <div className="why__value-header">
                                        <span className="why__value-icon" aria-hidden="true">
                                            <Icon size={24} strokeWidth={2.1} />
                                        </span>
                                        <h3>{t(dict, v.titleKey)}</h3>
                                    </div>
                                    <p className="why__value-desc">{t(dict, v.descKey)}</p>
                                    <p className="why__value-detail">{t(dict, v.detailKey)}</p>
                                </div>
                            </article>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* HOW WE DELIVER */}
            <section className="why__how">
                <div className="container">
                    <div className="why__section-header">
                        <h2 className="why__section-title">{t(dict, "how_title")}</h2>
                        <p className="why__section-subtitle">{t(dict, "how_subtitle")}</p>
                    </div>

                    <div className="why__how-grid">
                        {howConfig.map((h) => {
                            const Icon = h.icon;
                            return (
                            <article className="why__how-card" key={h.titleKey}>
                                <div className="why__how-icon" aria-hidden="true">
                                    <Icon size={28} strokeWidth={2.1} />
                                </div>
                                <h3>{t(dict, h.titleKey)}</h3>
                                <p>{t(dict, h.textKey)}</p>
                            </article>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* CONTRAST TABLE */}
            <section className="why__contrast">
                <div className="container">
                    <div className="why__section-header">
                        <h2 className="why__section-title">{t(dict, "contrast_title")}</h2>
                        <p className="why__section-subtitle">{t(dict, "contrast_subtitle")}</p>
                    </div>

                    <div className="why__contrast-table">
                        <div className="why__contrast-header">
                            <div className="why__contrast-col why__contrast-col--them">{t(dict, "contrast_col_them")}</div>
                            <div className="why__contrast-col why__contrast-col--us">{t(dict, "contrast_col_us")}</div>
                        </div>
                        {contrastConfig.map((row, idx) => (
                            <div className="why__contrast-row" key={idx}>
                                <div className="why__contrast-cell why__contrast-cell--them">
                                    <span className="why__contrast-x" aria-hidden="true">
                                        <Minus size={18} strokeWidth={2.4} />
                                    </span>
                                    {t(dict, row.themKey)}
                                </div>
                                <div className="why__contrast-cell why__contrast-cell--us">
                                    <span className="why__contrast-check" aria-hidden="true">
                                        <Check size={18} strokeWidth={2.5} />
                                    </span>
                                    {t(dict, row.usKey)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* PROOF / TESTIMONIALS */}
            <section className="why__proof">
                <div className="container">
                    <div className="why__section-header">
                        <h2 className="why__section-title">{t(dict, "proof_title")}</h2>
                        <p className="why__section-subtitle">{t(dict, "proof_subtitle")}</p>
                    </div>

                    <div className="why__proof-grid">
                        {proofsConfig.map((p, idx) => (
                            <blockquote className="why__proof-card" key={idx}>
                                <p>&ldquo;{t(dict, p.quoteKey)}&rdquo;</p>
                                <footer>
                                    <strong>{t(dict, p.nameKey)}</strong>
                                    <span>{t(dict, p.contextKey)}</span>
                                </footer>
                            </blockquote>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="why__cta">
                <div className="why__cta-background">
                    <div className="why__cta-gradient"></div>
                </div>

                <div className="container why__cta-inner">
                    <h2>{t(dict, "cta_title")}</h2>
                    <p>{t(dict, "cta_sub")}</p>

                    <div className="why__cta-buttons">
                        <Link href={routeHref(APP_ROUTES.individualTraining, locale)} className="why-btn why-btn--primary why-btn--lg">
                            <span>{t(dict, "cta_primary")}</span>
                            <ArrowRight className="why-btn__arrow" size={18} strokeWidth={2.4} aria-hidden="true" />
                        </Link>

                        <Link href={routeHref(APP_ROUTES.packages, locale)} className="why-btn why-btn--outline why-btn--lg">
                            {t(dict, "cta_secondary")}
                        </Link>
                    </div>
                </div>
            </section>
        </main>
    );
}
