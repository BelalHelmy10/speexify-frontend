"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { getDictionary, t } from "@/app/i18n";
import "@/styles/policy.scss";

export default function PrivacyPage() {
  const pathname = usePathname();
  const locale = pathname?.startsWith("/ar") ? "ar" : "en";
  const dict = useMemo(() => getDictionary(locale, "privacy"), [locale]);

  const email = t(dict, "contact_email_value");
  const dpoEmail = t(dict, "dpo_email_value");
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
                <a href="#contact">{t(dict, "contact_title")}</a>
              </li>
            </ul>
          </nav>

          <div className="policy__content">
            <p>{t(dict, "intro")}</p>

            {/* Section 1: Data We Collect */}
            <section className="policy__section" id="s1">
              <h2>{t(dict, "s1_title")}</h2>
              <p>{t(dict, "s1_p1")}</p>

              <h3>{t(dict, "s1_sub1_title")}</h3>
              <ul>
                <li>{t(dict, "s1_sub1_li1")}</li>
                <li>{t(dict, "s1_sub1_li2")}</li>
                <li>{t(dict, "s1_sub1_li3")}</li>
                <li>{t(dict, "s1_sub1_li4")}</li>
              </ul>

              <h3>{t(dict, "s1_sub2_title")}</h3>
              <ul>
                <li>{t(dict, "s1_sub2_li1")}</li>
                <li>{t(dict, "s1_sub2_li2")}</li>
                <li>{t(dict, "s1_sub2_li3")}</li>
                <li>{t(dict, "s1_sub2_li4")}</li>
              </ul>

              <h3>{t(dict, "s1_sub3_title")}</h3>
              <ul>
                <li>{t(dict, "s1_sub3_li1")}</li>
                <li>{t(dict, "s1_sub3_li2")}</li>
                <li>{t(dict, "s1_sub3_li3")}</li>
                <li>{t(dict, "s1_sub3_li4")}</li>
                <li>{t(dict, "s1_sub3_li5")}</li>
              </ul>
            </section>

            {/* Section 2: How We Use Your Data */}
            <section className="policy__section" id="s2">
              <h2>{t(dict, "s2_title")}</h2>
              <p>{t(dict, "s2_p1")}</p>
              <ul>
                <li>{t(dict, "s2_li1")}</li>
                <li>{t(dict, "s2_li2")}</li>
                <li>{t(dict, "s2_li3")}</li>
                <li>{t(dict, "s2_li4")}</li>
                <li>{t(dict, "s2_li5")}</li>
                <li>{t(dict, "s2_li6")}</li>
                <li>{t(dict, "s2_li7")}</li>
                <li>{t(dict, "s2_li8")}</li>
              </ul>
            </section>

            {/* Section 3: Legal Basis for Processing (GDPR) */}
            <section className="policy__section" id="s3">
              <h2>{t(dict, "s3_title")}</h2>
              <p>{t(dict, "s3_p1")}</p>
              <ul>
                <li>
                  <strong>{t(dict, "s3_li1_label")}</strong>{" "}
                  {t(dict, "s3_li1_body")}
                </li>
                <li>
                  <strong>{t(dict, "s3_li2_label")}</strong>{" "}
                  {t(dict, "s3_li2_body")}
                </li>
                <li>
                  <strong>{t(dict, "s3_li3_label")}</strong>{" "}
                  {t(dict, "s3_li3_body")}
                </li>
                <li>
                  <strong>{t(dict, "s3_li4_label")}</strong>{" "}
                  {t(dict, "s3_li4_body")}
                </li>
              </ul>
            </section>

            {/* Section 4: Session Recordings */}
            <section className="policy__section" id="s4">
              <h2>{t(dict, "s4_title")}</h2>
              <p>{t(dict, "s4_p1")}</p>
              <ul>
                <li>{t(dict, "s4_li1")}</li>
                <li>{t(dict, "s4_li2")}</li>
                <li>{t(dict, "s4_li3")}</li>
                <li>{t(dict, "s4_li4")}</li>
              </ul>
              <p>{t(dict, "s4_p2")}</p>
            </section>

            {/* Section 5: Data Retention */}
            <section className="policy__section" id="s5">
              <h2>{t(dict, "s5_title")}</h2>
              <p>{t(dict, "s5_p1")}</p>
              <ul>
                <li>
                  <strong>{t(dict, "s5_li1_label")}</strong>{" "}
                  {t(dict, "s5_li1_body")}
                </li>
                <li>
                  <strong>{t(dict, "s5_li2_label")}</strong>{" "}
                  {t(dict, "s5_li2_body")}
                </li>
                <li>
                  <strong>{t(dict, "s5_li3_label")}</strong>{" "}
                  {t(dict, "s5_li3_body")}
                </li>
                <li>
                  <strong>{t(dict, "s5_li4_label")}</strong>{" "}
                  {t(dict, "s5_li4_body")}
                </li>
                <li>
                  <strong>{t(dict, "s5_li5_label")}</strong>{" "}
                  {t(dict, "s5_li5_body")}
                </li>
              </ul>
              <p>{t(dict, "s5_p2")}</p>
            </section>

            {/* Section 6: Payment Data Handling */}
            <section className="policy__section" id="s6">
              <h2>{t(dict, "s6_title")}</h2>
              <p>{t(dict, "s6_p1")}</p>
              <p>{t(dict, "s6_p2")}</p>
            </section>

            {/* Section 7: Third-Party Service Providers */}
            <section className="policy__section" id="s7">
              <h2>{t(dict, "s7_title")}</h2>
              <p>{t(dict, "s7_p1")}</p>
              <ul>
                <li>
                  <strong>{t(dict, "s7_li1_label")}</strong>{" "}
                  {t(dict, "s7_li1_body")}
                </li>
                <li>
                  <strong>{t(dict, "s7_li2_label")}</strong>{" "}
                  {t(dict, "s7_li2_body")}
                </li>
                <li>
                  <strong>{t(dict, "s7_li3_label")}</strong>{" "}
                  {t(dict, "s7_li3_body")}
                </li>
                <li>
                  <strong>{t(dict, "s7_li4_label")}</strong>{" "}
                  {t(dict, "s7_li4_body")}
                </li>
                <li>
                  <strong>{t(dict, "s7_li5_label")}</strong>{" "}
                  {t(dict, "s7_li5_body")}
                </li>
              </ul>
              <p>{t(dict, "s7_p2")}</p>
            </section>

            {/* Section 8: Cookies & Tracking */}
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
              <p>{t(dict, "s8_p3")}</p>
            </section>

            {/* Section 9: Children's Privacy */}
            <section className="policy__section" id="s9">
              <h2>{t(dict, "s9_title")}</h2>
              <p>{t(dict, "s9_p1")}</p>
              <p>{t(dict, "s9_p2")}</p>
              <p>{t(dict, "s9_p3")}</p>
            </section>

            {/* Section 10: Your Rights */}
            <section className="policy__section" id="s10">
              <h2>{t(dict, "s10_title")}</h2>
              <p>{t(dict, "s10_p1")}</p>
              <ul>
                <li>
                  <strong>{t(dict, "s10_li1_label")}</strong>{" "}
                  {t(dict, "s10_li1_body")}
                </li>
                <li>
                  <strong>{t(dict, "s10_li2_label")}</strong>{" "}
                  {t(dict, "s10_li2_body")}
                </li>
                <li>
                  <strong>{t(dict, "s10_li3_label")}</strong>{" "}
                  {t(dict, "s10_li3_body")}
                </li>
                <li>
                  <strong>{t(dict, "s10_li4_label")}</strong>{" "}
                  {t(dict, "s10_li4_body")}
                </li>
                <li>
                  <strong>{t(dict, "s10_li5_label")}</strong>{" "}
                  {t(dict, "s10_li5_body")}
                </li>
                <li>
                  <strong>{t(dict, "s10_li6_label")}</strong>{" "}
                  {t(dict, "s10_li6_body")}
                </li>
                <li>
                  <strong>{t(dict, "s10_li7_label")}</strong>{" "}
                  {t(dict, "s10_li7_body")}
                </li>
              </ul>
              <p>{t(dict, "s10_p2")}</p>
            </section>

            {/* Section 11: Data Security */}
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

            {/* Section 12: International Data Transfers */}
            <section className="policy__section" id="s12">
              <h2>{t(dict, "s12_title")}</h2>
              <p>{t(dict, "s12_p1")}</p>
              <p>{t(dict, "s12_p2")}</p>
            </section>

            {/* Section 13: Changes to This Policy */}
            <section className="policy__section" id="s13">
              <h2>{t(dict, "s13_title")}</h2>
              <p>{t(dict, "s13_body")}</p>
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
                <strong>{t(dict, "dpo_email_label")}</strong>{" "}
                <a href={`mailto:${dpoEmail}`}>{dpoEmail}</a>
              </p>
            </section>
          </div>
        </article>
      </div>
    </main>
  );
}
