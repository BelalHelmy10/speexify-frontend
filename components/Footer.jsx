// src/components/Footer.jsx - PREMIUM EDITION (Next.js version)
"use client";

import Link from "next/link";
import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { getDictionary, t } from "@/app/i18n";

function Footer() {
  const pathname = usePathname();
  const locale = pathname?.startsWith("/ar") ? "ar" : "en";
  const dict = getDictionary(locale, "footer");
  const $t = (key) => t(dict, key);

  const dir = locale === "ar" ? "rtl" : "ltr";
  const prefix = locale === "ar" ? "/ar" : "";

  // avoid recomputing
  const currentYear = useMemo(() => new Date().getFullYear(), []);

  const handleNewsletterSubmit = (e) => {
    e.preventDefault();
    // TODO: wire up your API call here
  };

  return (
    <footer className="site-footer-wrapper" dir={dir}>
      <div className="site-footer container">
        {/* Main Footer Content */}
        <div className="footer-top">
          {/* Brand Section */}
          <div className="brand-section">
            <Link
              href={prefix || "/"}
              className="brand-link"
              aria-label={
                locale === "ar"
                  ? "العودة إلى الصفحة الرئيسية"
                  : "Go to homepage"
              }
            >
              <span className="brand-text">Speexify</span>
              <span className="brand-shimmer" />
            </Link>
            <p className="brand-tagline">{$t("tagline")}</p>

            {/* Newsletter Signup */}
            <div className="newsletter">
              <h4 className="newsletter-title">{$t("newsletterTitle")}</h4>
              <form
                className="newsletter-form"
                onSubmit={handleNewsletterSubmit}
                noValidate
              >
                <input
                  type="email"
                  name="email"
                  placeholder={$t("newsletterPlaceholder")}
                  className="newsletter-input"
                  aria-label={$t("newsletterPlaceholder")}
                  autoComplete="email"
                  required
                />
                <button type="submit" className="newsletter-btn">
                  <span>{$t("newsletterButton")}</span>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M3.33334 8H12.6667M12.6667 8L8.66668 4M12.6667 8L8.66668 12"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </form>
            </div>
          </div>

          {/* Navigation Columns */}
          <nav className="footer-nav" aria-label="Footer">
            <div className="nav-col">
              <h4 className="nav-col-title">{$t("productTitle")}</h4>
              <ul className="nav-col-list">
                <li>
                  <Link
                    href={`${prefix}/individual-training`}
                    className="nav-col-link"
                  >
                    <span>{$t("individualTraining")}</span>
                    <svg
                      className="link-arrow"
                      width="14"
                      height="14"
                      viewBox="0 0 14 14"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M2.91666 7H11.0833M11.0833 7L7.58333 3.5M11.0833 7L7.58333 10.5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </Link>
                </li>
                <li>
                  <Link
                    href={`${prefix}/corporate-training`}
                    className="nav-col-link"
                  >
                    <span>{$t("corporateTraining")}</span>
                    <svg
                      className="link-arrow"
                      width="14"
                      height="14"
                      viewBox="0 0 14 14"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M2.91666 7H11.0833M11.0833 7L7.58333 3.5M11.0833 7L7.58333 10.5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </Link>
                </li>
                <li>
                  <Link href={`${prefix}/packages`} className="nav-col-link">
                    <span>{$t("packages")}</span>
                    <svg
                      className="link-arrow"
                      width="14"
                      height="14"
                      viewBox="0 0 14 14"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M2.91666 7H11.0833M11.0833 7L7.58333 3.5M11.0833 7L7.58333 10.5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </Link>
                </li>
                <li>
                  <Link href={`${prefix}/why-speexify`} className="nav-col-link">
                    <span>{$t("whySpeexify")}</span>
                    <svg
                      className="link-arrow"
                      width="14"
                      height="14"
                      viewBox="0 0 14 14"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M2.91666 7H11.0833M11.0833 7L7.58333 3.5M11.0833 7L7.58333 10.5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </Link>
                </li>
              </ul>
            </div>

            <div className="nav-col">
              <h4 className="nav-col-title">{$t("companyTitle")}</h4>
              <ul className="nav-col-list">
                <li>
                  <Link href={`${prefix}/about`} className="nav-col-link">
                    <span>{$t("about")}</span>
                    <svg
                      className="link-arrow"
                      width="14"
                      height="14"
                      viewBox="0 0 14 14"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M2.91666 7H11.0833M11.0833 7L7.58333 3.5M11.0833 7L7.58333 10.5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </Link>
                </li>
                <li>
                  <Link href={`${prefix}/contact`} className="nav-col-link">
                    <span>{$t("contact")}</span>
                    <svg
                      className="link-arrow"
                      width="14"
                      height="14"
                      viewBox="0 0 14 14"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M2.91666 7H11.0833M11.0833 7L7.58333 3.5M11.0833 7L7.58333 10.5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </Link>
                </li>
                <li>
                  <Link href={`${prefix}/careers`} className="nav-col-link">
                    <span>{$t("careers")}</span>
                    <svg
                      className="link-arrow"
                      width="14"
                      height="14"
                      viewBox="0 0 14 14"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M2.91666 7H11.0833M11.0833 7L7.58333 3.5M11.0833 7L7.58333 10.5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </Link>
                </li>
              </ul>
            </div>

            <div className="nav-col">
              <h4 className="nav-col-title">{$t("resourcesTitle")}</h4>
              <ul className="nav-col-list">
                <li>
                  <a
                    href="#blog"
                    className="nav-col-link"
                    onClick={(e) => e.preventDefault()}
                    aria-label={$t("ariaBlog")}
                  >
                    <span>{$t("blog")}</span>
                    <svg
                      className="link-arrow"
                      width="14"
                      height="14"
                      viewBox="0 0 14 14"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M2.91666 7H11.0833M11.0833 7L7.58333 3.5M11.0833 7L7.58333 10.5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </a>
                </li>
                <li>
                  <a
                    href="#guides"
                    className="nav-col-link"
                    onClick={(e) => e.preventDefault()}
                    aria-label={$t("ariaGuides")}
                  >
                    <span>{$t("guides")}</span>
                    <svg
                      className="link-arrow"
                      width="14"
                      height="14"
                      viewBox="0 0 14 14"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M2.91666 7H11.0833M11.0833 7L7.58333 3.5M11.0833 7L7.58333 10.5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </a>
                </li>
                <li>
                  <a
                    href="#help"
                    className="nav-col-link"
                    onClick={(e) => e.preventDefault()}
                    aria-label={$t("ariaHelp")}
                  >
                    <span>{$t("helpCenter")}</span>
                    <svg
                      className="link-arrow"
                      width="14"
                      height="14"
                      viewBox="0 0 14 14"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M2.91666 7H11.0833M11.0833 7L7.58333 3.5M11.0833 7L7.58333 10.5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </a>
                </li>
              </ul>
            </div>

            <div className="nav-col">
              <h4 className="nav-col-title">{$t("legalTitle")}</h4>
              <ul className="nav-col-list">
                <li>
                  <Link
                    href={`${prefix}/privacy`}
                    className="nav-col-link"
                    aria-label={$t("ariaPrivacy")}
                  >
                    <span>{$t("privacyPolicy")}</span>
                    <svg
                      className="link-arrow"
                      width="14"
                      height="14"
                      viewBox="0 0 14 14"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M2.91666 7H11.0833M11.0833 7L7.58333 3.5M11.0833 7L7.58333 10.5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </Link>
                </li>

                <li>
                  <Link
                    href={`${prefix}/terms`}
                    className="nav-col-link"
                    aria-label={$t("ariaTerms")}
                  >
                    <span>{$t("termsOfService")}</span>
                    <svg
                      className="link-arrow"
                      width="14"
                      height="14"
                      viewBox="0 0 14 14"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M2.91666 7H11.0833M11.0833 7L7.58333 3.5M11.0833 7L7.58333 10.5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </Link>
                </li>

                <li>
                  <Link
                    href={`${prefix}/refund-policy`}
                    className="nav-col-link"
                    aria-label={$t("ariaRefund")}
                  >
                    <span>{$t("refundPolicy")}</span>
                    <svg
                      className="link-arrow"
                      width="14"
                      height="14"
                      viewBox="0 0 14 14"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M2.91666 7H11.0833M11.0833 7L7.58333 3.5M11.0833 7L7.58333 10.5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </Link>
                </li>
              </ul>
            </div>
          </nav>
        </div>

        {/* Bottom Bar */}
        <div className="footer-bottom">
          <div className="footer-bottom-left">
            <p className="copyright">
              © {currentYear} Speexify. {$t("rights")}
            </p>
          </div>

          <div className="footer-bottom-right">
            {/* Social Links */}
            <div className="social-links">
              {/* 1. LinkedIn */}
              <a
                href="https://www.linkedin.com/company/speexify/"
                target="_blank"
                rel="noopener noreferrer"
                className="social-link"
                aria-label={$t("ariaLinkedIn")}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M16.6667 2.5H3.33333C2.8731 2.5 2.5 2.8731 2.5 3.33333V16.6667C2.5 17.1269 2.8731 17.5 3.33333 17.5H16.6667C17.1269 17.5 17.5 17.1269 17.5 16.6667V3.33333C17.5 2.8731 17.1269 2.5 16.6667 2.5Z"
                    fill="currentColor"
                  />
                  <path
                    className="social-icon-inner"
                    d="M5.83333 8.33333H7.5V14.1667H5.83333V8.33333ZM6.66667 5.83333C6.32572 5.83333 6 6.15905 6 6.5C6 6.84095 6.32572 7.16667 6.66667 7.16667C7.00762 7.16667 7.33333 6.84095 7.33333 6.5C7.33333 6.15905 7.00762 5.83333 6.66667 5.83333ZM12.5 14.1667H14.1667V10.8333C14.1667 9.45238 13.5476 8.33333 11.9643 8.33333C11.4167 8.33333 10.7024 8.63095 10.4167 9.11905V8.33333H8.75V14.1667H10.4167V11.25C10.4167 10.5595 10.7262 10 11.4167 10C12.0714 10 12.5 10.5595 12.5 11.25V14.1667Z"
                    fill="white"
                  />
                </svg>
              </a>

              {/* 2. Facebook */}
              <a
                href="https://www.facebook.com/profile.php?id=61560942134964"
                target="_blank"
                rel="noopener noreferrer"
                className="social-link"
                aria-label={$t("ariaFacebook")}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M16.6667 2.5H3.33333C2.8731 2.5 2.5 2.8731 2.5 3.33333V16.6667C2.5 17.1269 2.8731 17.5 3.33333 17.5H10.625V11.875H8.75V9.375H10.625V7.5C10.625 5.84315 11.5931 4.375 13.5417 4.375C14.3194 4.375 15.2083 4.51389 15.2083 4.51389V6.25H14.2361C13.2778 6.25 12.9167 6.80556 12.9167 7.36111V9.375H15.1389L14.7917 11.875H12.9167V17.5H16.6667C17.1269 17.5 17.5 17.1269 17.5 16.6667V3.33333C17.5 2.8731 17.1269 2.5 16.6667 2.5Z"
                    fill="currentColor"
                  />
                </svg>
              </a>

              {/* 3. YouTube */}
              <a
                href="https://www.youtube.com/@Speexify" // TODO: Add your YouTube link here
                target="_blank"
                rel="noopener noreferrer"
                className="social-link"
                aria-label={$t("ariaYouTube")}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M17.9167 5.83333C17.9167 5.83333 17.7417 4.54167 17.1667 3.95833C16.45 3.2 15.65 3.19583 15.2833 3.15833C12.7667 2.97917 10.0042 2.97917 10.0042 2.97917H9.99583C9.99583 2.97917 7.23333 2.97917 4.71667 3.15833C4.35 3.19583 3.55 3.2 2.83333 3.95833C2.25833 4.54167 2.08333 5.83333 2.08333 5.83333C2.08333 5.83333 1.90417 7.34167 1.90417 8.84583V10.2917C1.90417 11.7958 2.08333 13.3042 2.08333 13.3042C2.08333 13.3042 2.25833 14.5958 2.83333 15.1792C3.55 15.9375 4.46667 15.9125 4.88333 16C6.35417 16.1375 10 16.1708 10 16.1708C10 16.1708 12.7667 16.1667 15.2833 15.9875C15.65 15.95 16.45 15.9458 17.1667 15.1875C17.7417 14.6042 17.9167 13.3125 17.9167 13.3125C17.9167 13.3125 18.0958 11.8042 18.0958 10.3V8.85417C18.0958 7.35 17.9167 5.83333 17.9167 5.83333ZM8.25 11.7917V6.875L13.0833 9.34583L8.25 11.7917Z"
                    fill="currentColor"
                  />
                </svg>
              </a>

              {/* 4. TikTok */}
              <a
                href="https://www.tiktok.com/@speexify" // TODO: Add your TikTok link here
                target="_blank"
                rel="noopener noreferrer"
                className="social-link"
                aria-label={$t("ariaTikTok")} // TODO: Ensure "ariaTikTok" is in your i18n file
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M16.25 2.5H3.75C3.05964 2.5 2.5 3.05964 2.5 3.75V16.25C2.5 16.9404 3.05964 17.5 3.75 17.5H16.25C16.9404 17.5 17.5 16.9404 17.5 16.25V3.75C17.5 3.05964 16.9404 2.5 16.25 2.5Z"
                    fill="transparent"
                  />
                  <path
                    d="M10.8333 2.5V11.4583C10.8333 12.7233 9.80833 13.75 8.54167 13.75C7.275 13.75 6.25 12.7233 6.25 11.4583C6.25 10.1933 7.275 9.16667 8.54167 9.16667V7.08333C6.125 7.08333 4.16667 9.04167 4.16667 11.4583C4.16667 13.875 6.125 15.8333 8.54167 15.8333C10.9583 15.8333 12.9167 13.875 12.9167 11.4583V5.41667C13.8583 6.09167 15 6.475 16.25 6.54167V4.38333C15.225 4.38333 14.2833 3.96667 13.5917 3.29167C13.1667 2.86667 12.9167 2.5 12.9167 2.5H10.8333Z"
                    fill="currentColor"
                  />
                </svg>
              </a>

              {/* 5. X (Twitter) */}
              <a
                href="https://x.com/speexify" // TODO: Add your X link here
                target="_blank"
                rel="noopener noreferrer"
                className="social-link"
                aria-label={$t("ariaTwitter")}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M15.1517 2.92334H17.7067L11.9517 9.5125L18.75 17.0767H13.3958L9.13833 11.8392L4.2275 17.0767H1.67083L7.81667 9.99584L1.25 2.92417H6.73417L10.6025 7.66667L15.1517 2.92334ZM14.1833 15.5692H15.6733L5.88667 4.44667H4.295L14.1833 15.5692Z"
                    fill="currentColor"
                  />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
