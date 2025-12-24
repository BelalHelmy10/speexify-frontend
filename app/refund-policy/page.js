"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { getDictionary, t } from "@/app/i18n";
import "@/styles/policy.scss";

export default function RefundPolicyPage() {
  const pathname = usePathname();
  const locale = pathname?.startsWith("/ar") ? "ar" : "en";
  // Namespace must match your JSON filename (e.g., refundPolicy.json → "refundPolicy")
  const dict = useMemo(() => getDictionary(locale, "refundPolicy"), [locale]);

  const email = t(dict, "contact_email_value");
  const date = t(dict, "date_value");

  return (
    <main className="policy" dir={locale === "ar" ? "rtl" : "ltr"}>
      <div className="container">
        <article className="policy__card">
          <header className="policy__header">
            <h1 className="policy__title">{t(dict, "title")}</h1>
            <p className="policy__meta">{t(dict, "last_updated", { date })}</p>
          </header>

          {/* Table of Contents */}
          <nav className="policy__toc" aria-label={t(dict, "toc_aria")}>
            <div className="policy__tocTitle">{t(dict, "toc_title")}</div>
            <ul className="policy__tocList policy__tocList--unstyled">
              <li>
                <a href="#s1">{t(dict, "s1_title")}</a>
              </li>
              <li>
                <a href="#s2">{t(dict, "s2_title")}</a>
              </li>
              <li>
                <a href="#s3">{t(dict, "s3_title")}</a>
              </li>
              <li>
                <a href="#s4">{t(dict, "s4_title")}</a>
              </li>
              <li>
                <a href="#s5">{t(dict, "s5_title")}</a>
              </li>
              <li>
                <a href="#s6">{t(dict, "s6_title")}</a>
              </li>
              <li>
                <a href="#s7">{t(dict, "s7_title")}</a>
              </li>
              <li>
                <a href="#s8">{t(dict, "s8_title")}</a>
              </li>
              <li>
                <a href="#s9">{t(dict, "s9_title")}</a>
              </li>
              <li>
                <a href="#s10">{t(dict, "s10_title")}</a>
              </li>
              <li>
                <a href="#contact">{t(dict, "contact_title")}</a>
              </li>
            </ul>
          </nav>

          <div className="policy__content">
            <p>{t(dict, "intro")}</p>

            {/* Section 1: Overview */}
            <section className="policy__section" id="s1">
              <h2>{t(dict, "s1_title")}</h2>
              <p>{t(dict, "s1_body")}</p>
            </section>

            {/* Section 2: Session Credits & Packages */}
            <section className="policy__section" id="s2">
              <h2>{t(dict, "s2_title")}</h2>
              <p>{t(dict, "s2_p1")}</p>
              <ul>
                <li>{t(dict, "s2_li1")}</li>
                <li>{t(dict, "s2_li2")}</li>
                <li>{t(dict, "s2_li3")}</li>
                <li>{t(dict, "s2_li4")}</li>
              </ul>
              <p>{t(dict, "s2_p2")}</p>
            </section>

            {/* Section 3: Eligibility for Refunds */}
            <section className="policy__section" id="s3">
              <h2>{t(dict, "s3_title")}</h2>
              <p>{t(dict, "s3_p1")}</p>
              <ul>
                <li>{t(dict, "s3_li1")}</li>
                <li>{t(dict, "s3_li2")}</li>
                <li>{t(dict, "s3_li3")}</li>
                <li>{t(dict, "s3_li4")}</li>
              </ul>
            </section>

            {/* Section 4: Non-Refundable Situations */}
            <section className="policy__section" id="s4">
              <h2>{t(dict, "s4_title")}</h2>
              <p>{t(dict, "s4_p1")}</p>
              <ul>
                <li>{t(dict, "s4_li1")}</li>
                <li>{t(dict, "s4_li2")}</li>
                <li>{t(dict, "s4_li3")}</li>
                <li>{t(dict, "s4_li4")}</li>
                <li>{t(dict, "s4_li5")}</li>
                <li>{t(dict, "s4_li6")}</li>
              </ul>
            </section>

            {/* Section 5: Teacher Cancellations & No-Shows */}
            <section className="policy__section" id="s5">
              <h2>{t(dict, "s5_title")}</h2>
              <p>{t(dict, "s5_p1")}</p>
              <ul>
                <li>{t(dict, "s5_li1")}</li>
                <li>{t(dict, "s5_li2")}</li>
                <li>{t(dict, "s5_li3")}</li>
              </ul>
              <p>{t(dict, "s5_p2")}</p>
            </section>

            {/* Section 6: Partial Refunds */}
            <section className="policy__section" id="s6">
              <h2>{t(dict, "s6_title")}</h2>
              <p>{t(dict, "s6_p1")}</p>
              <ul>
                <li>{t(dict, "s6_li1")}</li>
                <li>{t(dict, "s6_li2")}</li>
                <li>{t(dict, "s6_li3")}</li>
              </ul>
              <p>{t(dict, "s6_p2")}</p>
            </section>

            {/* Section 7: How to Request a Refund */}
            <section className="policy__section" id="s7">
              <h2>{t(dict, "s7_title")}</h2>
              <p>{t(dict, "s7_p1")}</p>
              <ol>
                <li>{t(dict, "s7_step1")}</li>
                <li>{t(dict, "s7_step2")}</li>
                <li>{t(dict, "s7_step3")}</li>
                <li>{t(dict, "s7_step4")}</li>
              </ol>
              <p>{t(dict, "s7_p2")}</p>
            </section>

            {/* Section 8: Refund Processing & Timeframes */}
            <section className="policy__section" id="s8">
              <h2>{t(dict, "s8_title")}</h2>
              <p>{t(dict, "s8_p1")}</p>
              <ul>
                <li>
                  <strong>{t(dict, "s8_li1_label")}</strong>{" "}
                  {t(dict, "s8_li1_body")}
                </li>
                <li>
                  <strong>{t(dict, "s8_li2_label")}</strong>{" "}
                  {t(dict, "s8_li2_body")}
                </li>
                <li>
                  <strong>{t(dict, "s8_li3_label")}</strong>{" "}
                  {t(dict, "s8_li3_body")}
                </li>
              </ul>
              <p>{t(dict, "s8_p2")}</p>
            </section>

            {/* Section 9: Chargebacks & Disputes */}
            <section className="policy__section" id="s9">
              <h2>{t(dict, "s9_title")}</h2>
              <p>{t(dict, "s9_p1")}</p>
              <p>{t(dict, "s9_p2")}</p>
            </section>

            {/* Section 10: B2B & Corporate Accounts */}
            <section className="policy__section" id="s10">
              <h2>{t(dict, "s10_title")}</h2>
              <p>{t(dict, "s10_body")}</p>
            </section>

            {/* Contact Information */}
            <section className="policy__section" id="contact">
              <h2>{t(dict, "contact_title")}</h2>
              <p>{t(dict, "contact_body")}</p>
              <p className="policy__contactLine">
                <strong>{t(dict, "contact_email_label")}</strong>{" "}
                <a href={`mailto:${email}`}>{email}</a>
              </p>
              <p className="policy__contactLine">
                <strong>{t(dict, "contact_response_label")}</strong>{" "}
                {t(dict, "contact_response_value")}
              </p>
            </section>
          </div>
        </article>
      </div>
    </main>
  );
}
