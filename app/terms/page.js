"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { getDictionary, t } from "@/app/i18n";
import "@/styles/policy.scss";

export default function TermsPage() {
  const pathname = usePathname();
  const locale = pathname?.startsWith("/ar") ? "ar" : "en";
  const dict = useMemo(() => getDictionary(locale, "terms"), [locale]);

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
                <a href="#s11">{t(dict, "s11_title")}</a>
              </li>
              <li>
                <a href="#s12">{t(dict, "s12_title")}</a>
              </li>
              <li>
                <a href="#s13">{t(dict, "s13_title")}</a>
              </li>
              <li>
                <a href="#s14">{t(dict, "s14_title")}</a>
              </li>
              <li>
                <a href="#s15">{t(dict, "s15_title")}</a>
              </li>
              <li>
                <a href="#s16">{t(dict, "s16_title")}</a>
              </li>
              <li>
                <a href="#contact">{t(dict, "contact_title")}</a>
              </li>
            </ul>
          </nav>

          <div className="policy__content">
            <p>{t(dict, "intro")}</p>

            {/* Section 1: Platform Description */}
            <section className="policy__section" id="s1">
              <h2>{t(dict, "s1_title")}</h2>
              <p>{t(dict, "s1_body")}</p>
            </section>

            {/* Section 2: Eligibility & Age Requirements */}
            <section className="policy__section" id="s2">
              <h2>{t(dict, "s2_title")}</h2>
              <p>{t(dict, "s2_p1")}</p>
              <ul>
                <li>{t(dict, "s2_li1")}</li>
                <li>{t(dict, "s2_li2")}</li>
                <li>{t(dict, "s2_li3")}</li>
                <li>{t(dict, "s2_li4")}</li>
                <li>{t(dict, "s2_li5")}</li>
              </ul>
              <p>{t(dict, "s2_p2")}</p>
            </section>

            {/* Section 3: Account Registration */}
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

            {/* Section 4: Digital Service Delivery */}
            <section className="policy__section" id="s4">
              <h2>{t(dict, "s4_title")}</h2>
              <p>{t(dict, "s4_body")}</p>
            </section>

            {/* Section 5: Session Credits & Packages */}
            <section className="policy__section" id="s5">
              <h2>{t(dict, "s5_title")}</h2>
              <p>{t(dict, "s5_p1")}</p>
              <ul>
                <li>{t(dict, "s5_li1")}</li>
                <li>{t(dict, "s5_li2")}</li>
                <li>{t(dict, "s5_li3")}</li>
                <li>{t(dict, "s5_li4")}</li>
                <li>{t(dict, "s5_li5")}</li>
              </ul>
            </section>

            {/* Section 6: Payments & Refunds */}
            <section className="policy__section" id="s6">
              <h2>{t(dict, "s6_title")}</h2>
              <p>{t(dict, "s6_body")}</p>
            </section>

            {/* Section 7: Session Recording & Consent */}
            <section className="policy__section" id="s7">
              <h2>{t(dict, "s7_title")}</h2>
              <p>{t(dict, "s7_p1")}</p>
              <ul>
                <li>{t(dict, "s7_li1")}</li>
                <li>{t(dict, "s7_li2")}</li>
                <li>{t(dict, "s7_li3")}</li>
                <li>{t(dict, "s7_li4")}</li>
              </ul>
              <p>{t(dict, "s7_p2")}</p>
            </section>

            {/* Section 8: User Responsibilities */}
            <section className="policy__section" id="s8">
              <h2>{t(dict, "s8_title")}</h2>
              <p>{t(dict, "s8_p1")}</p>
              <ul>
                <li>{t(dict, "s8_li1")}</li>
                <li>{t(dict, "s8_li2")}</li>
                <li>{t(dict, "s8_li3")}</li>
                <li>{t(dict, "s8_li4")}</li>
                <li>{t(dict, "s8_li5")}</li>
                <li>{t(dict, "s8_li6")}</li>
              </ul>
            </section>

            {/* Section 9: Prohibited Conduct */}
            <section className="policy__section" id="s9">
              <h2>{t(dict, "s9_title")}</h2>
              <p>{t(dict, "s9_p1")}</p>
              <ul>
                <li>{t(dict, "s9_li1")}</li>
                <li>{t(dict, "s9_li2")}</li>
                <li>{t(dict, "s9_li3")}</li>
                <li>{t(dict, "s9_li4")}</li>
                <li>{t(dict, "s9_li5")}</li>
                <li>{t(dict, "s9_li6")}</li>
                <li>{t(dict, "s9_li7")}</li>
              </ul>
            </section>

            {/* Section 10: Intellectual Property */}
            <section className="policy__section" id="s10">
              <h2>{t(dict, "s10_title")}</h2>
              <p>{t(dict, "s10_p1")}</p>
              <p>{t(dict, "s10_p2")}</p>
              <p>{t(dict, "s10_p3")}</p>
            </section>

            {/* Section 11: Account Termination */}
            <section className="policy__section" id="s11">
              <h2>{t(dict, "s11_title")}</h2>
              <p>{t(dict, "s11_p1")}</p>
              <ul>
                <li>{t(dict, "s11_li1")}</li>
                <li>{t(dict, "s11_li2")}</li>
                <li>{t(dict, "s11_li3")}</li>
                <li>{t(dict, "s11_li4")}</li>
              </ul>
              <p>{t(dict, "s11_p2")}</p>
            </section>

            {/* Section 12: Disclaimer of Warranties */}
            <section className="policy__section" id="s12">
              <h2>{t(dict, "s12_title")}</h2>
              <p>{t(dict, "s12_p1")}</p>
              <p>{t(dict, "s12_p2")}</p>
            </section>

            {/* Section 13: Limitation of Liability */}
            <section className="policy__section" id="s13">
              <h2>{t(dict, "s13_title")}</h2>
              <p>{t(dict, "s13_p1")}</p>
              <p>{t(dict, "s13_p2")}</p>
            </section>

            {/* Section 14: Indemnification */}
            <section className="policy__section" id="s14">
              <h2>{t(dict, "s14_title")}</h2>
              <p>{t(dict, "s14_body")}</p>
            </section>

            {/* Section 15: Modifications to Terms */}
            <section className="policy__section" id="s15">
              <h2>{t(dict, "s15_title")}</h2>
              <p>{t(dict, "s15_body")}</p>
            </section>

            {/* Section 16: Governing Law & Dispute Resolution */}
            <section className="policy__section" id="s16">
              <h2>{t(dict, "s16_title")}</h2>
              <p>{t(dict, "s16_p1")}</p>
              <p>{t(dict, "s16_p2")}</p>
              <p>{t(dict, "s16_p3")}</p>
            </section>

            {/* Section 17: General Provisions */}
            <section className="policy__section" id="s17">
              <h2>{t(dict, "s17_title")}</h2>
              <ul>
                <li>
                  <strong>{t(dict, "s17_severability_label")}</strong>{" "}
                  {t(dict, "s17_severability_body")}
                </li>
                <li>
                  <strong>{t(dict, "s17_waiver_label")}</strong>{" "}
                  {t(dict, "s17_waiver_body")}
                </li>
                <li>
                  <strong>{t(dict, "s17_entire_label")}</strong>{" "}
                  {t(dict, "s17_entire_body")}
                </li>
                <li>
                  <strong>{t(dict, "s17_assignment_label")}</strong>{" "}
                  {t(dict, "s17_assignment_body")}
                </li>
                <li>
                  <strong>{t(dict, "s17_force_label")}</strong>{" "}
                  {t(dict, "s17_force_body")}
                </li>
              </ul>
            </section>

            {/* Contact Information */}
            <section className="policy__section" id="contact">
              <h2>{t(dict, "contact_title")}</h2>
              <p>{t(dict, "contact_body")}</p>
              <p className="policy__contactLine">
                <strong>{t(dict, "contact_email_label")}</strong>{" "}
                <a href={`mailto:${email}`}>{email}</a>
              </p>
            </section>
          </div>
        </article>
      </div>
    </main>
  );
}
