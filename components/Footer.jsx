"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  LifeBuoy,
  Loader2,
  ShieldCheck,
  Sparkles,
  Star,
  UsersRound,
} from "lucide-react";
import { isFocusedWorkspacePath } from "@/lib/chromeRoutes";
import { APP_ROUTES, routeHref } from "@/lib/routes";
import api from "@/lib/api";
import { getDictionary, t } from "@/app/i18n";
import BrandLogo from "@/components/brand/BrandLogo";

const SOCIAL_LINKS = [
  {
    href: "https://www.linkedin.com/company/speexify/",
    labelKey: "ariaLinkedIn",
    name: "LinkedIn",
    icon: LinkedInIcon,
  },
  {
    href: "https://www.facebook.com/profile.php?id=61560942134964",
    labelKey: "ariaFacebook",
    name: "Facebook",
    icon: FacebookIcon,
  },
  {
    href: "https://www.youtube.com/@Speexify",
    labelKey: "ariaYouTube",
    name: "YouTube",
    icon: YouTubeIcon,
  },
  {
    href: "https://www.tiktok.com/@speexify",
    labelKey: "ariaTikTok",
    name: "TikTok",
    icon: TikTokIcon,
  },
  {
    href: "https://x.com/speexify",
    labelKey: "ariaTwitter",
    name: "X",
    icon: XIcon,
  },
];

function Footer() {
  const pathname = usePathname();
  const locale = pathname?.startsWith("/ar") ? "ar" : "en";
  const dict = getDictionary(locale, "footer");
  const $t = (key) => t(dict, key);
  const isFocusedWorkspace = isFocusedWorkspacePath(pathname);
  const dir = locale === "ar" ? "rtl" : "ltr";
  const currentYear = useMemo(() => new Date().getFullYear(), []);
  const [email, setEmail] = useState("");
  const [newsletterStatus, setNewsletterStatus] = useState({
    tone: "",
    text: "",
  });
  const [submitting, setSubmitting] = useState(false);

  if (isFocusedWorkspace) return null;

  const hrefFor = (path, suffix = "") => routeHref(path, locale, suffix);
  const staticHref = (path) => path;

  const proofItems = [
    {
      icon: UsersRound,
      value: $t("proofSessionsValue"),
      label: $t("proofSessionsLabel"),
    },
    {
      icon: Star,
      value: $t("proofRatingValue"),
      label: $t("proofRatingLabel"),
    },
    {
      icon: Clock3,
      value: $t("proofBookingValue"),
      label: $t("proofBookingLabel"),
    },
    {
      icon: ShieldCheck,
      value: $t("proofSecureValue"),
      label: $t("proofSecureLabel"),
    },
  ];

  const footerColumns = [
    {
      title: $t("productTitle"),
      links: [
        {
          label: $t("individualTraining"),
          href: hrefFor(APP_ROUTES.individualTraining),
        },
        {
          label: $t("corporateTraining"),
          href: hrefFor(APP_ROUTES.corporateTraining),
        },
        {
          label: $t("kidsTraining"),
          href: hrefFor(APP_ROUTES.kidsTraining),
        },
        { label: $t("packages"), href: hrefFor(APP_ROUTES.packages) },
        { label: $t("assessment"), href: hrefFor(APP_ROUTES.assessment) },
      ],
    },
    {
      title: $t("solutionsTitle"),
      links: [
        {
          label: $t("businessEnglish"),
          href: hrefFor(APP_ROUTES.businessEnglish),
        },
        {
          label: $t("presentationCoaching"),
          href: hrefFor(APP_ROUTES.presentationCoaching),
        },
        {
          label: $t("conversationPractice"),
          href: hrefFor(APP_ROUTES.conversationPractice),
        },
        {
          label: $t("teamReporting"),
          href: hrefFor(APP_ROUTES.corporateEnglishEgypt),
        },
      ],
    },
    {
      title: $t("resourcesTitle"),
      links: [
        { label: $t("blog"), href: hrefFor(APP_ROUTES.blog) },
        { label: $t("guides"), href: hrefFor(APP_ROUTES.guides) },
        {
          label: $t("memberStories"),
          href: hrefFor(APP_ROUTES.memberStories),
        },
        { label: $t("helpCenter"), href: hrefFor(APP_ROUTES.helpCenter) },
      ],
    },
    {
      title: $t("companyTitle"),
      links: [
        { label: $t("about"), href: hrefFor(APP_ROUTES.about) },
        { label: $t("careers"), href: hrefFor(APP_ROUTES.careers) },
        { label: $t("contact"), href: hrefFor(APP_ROUTES.contact) },
        { label: $t("contactSales"), href: "mailto:sales@speexify.com" },
      ],
    },
    {
      title: $t("trustTitle"),
      links: [
        { label: $t("privacyPolicy"), href: hrefFor(APP_ROUTES.privacy) },
        { label: $t("termsOfService"), href: hrefFor(APP_ROUTES.terms) },
        {
          label: $t("refundPolicy"),
          href: hrefFor(APP_ROUTES.refundPolicy),
        },
        { label: $t("security"), href: staticHref("/security.txt") },
        { label: $t("cookiePolicy"), href: hrefFor(APP_ROUTES.privacy, "#s8") },
      ],
    },
  ];

  const handleNewsletterSubmit = async (event) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();

    setNewsletterStatus({ tone: "", text: "" });

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setNewsletterStatus({
        tone: "error",
        text: $t("newsletterInvalid"),
      });
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/contact", {
        name: "Footer newsletter subscriber",
        email: normalizedEmail,
        role: "NEWSLETTER",
        topic: "NEWSLETTER",
        locale,
        message: `Newsletter signup from footer. Locale: ${locale}`,
      });
      setEmail("");
      setNewsletterStatus({
        tone: "success",
        text: $t("newsletterSuccess"),
      });
    } catch {
      setNewsletterStatus({
        tone: "error",
        text: $t("newsletterError"),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <footer className="site-footer-wrapper" dir={dir}>
      <div className="site-footer container">
        <section className="footer-cta" aria-labelledby="footer-cta-title">
          <div className="footer-cta__copy">
            <p className="footer-eyebrow">
              <Sparkles size={16} strokeWidth={2.2} aria-hidden="true" />
              <span>{$t("ctaEyebrow")}</span>
            </p>
            <h2 id="footer-cta-title">{$t("ctaTitle")}</h2>
            <p>{$t("ctaBody")}</p>
          </div>
          <div className="footer-cta__actions">
            <Link
              href={hrefFor(APP_ROUTES.assessment)}
              className="footer-action footer-action--primary"
            >
              <span>{$t("ctaPrimary")}</span>
              <ArrowRight size={18} strokeWidth={2.2} aria-hidden="true" />
            </Link>
            <Link
              href={hrefFor(APP_ROUTES.packages)}
              className="footer-action footer-action--secondary"
            >
              <span>{$t("ctaSecondary")}</span>
            </Link>
          </div>
        </section>

        <section className="footer-proof" aria-label={$t("proofAria")}>
          {proofItems.map((item) => {
            const Icon = item.icon;
            return (
              <div className="footer-proof__item" key={item.label}>
                <span className="footer-proof__icon" aria-hidden="true">
                  <Icon size={18} strokeWidth={2.2} />
                </span>
                <strong>{item.value}</strong>
                <span>{item.label}</span>
              </div>
            );
          })}
        </section>

        <div className="footer-main">
          <section className="footer-brand" aria-label={$t("brandAria")}>
            <BrandLogo
              context="footer"
              href={hrefFor(APP_ROUTES.home)}
              ariaLabel={$t("homeAria")}
            />
            <p className="brand-tagline">{$t("tagline")}</p>

            <div className="footer-support-strip">
              <span className="footer-support-strip__icon" aria-hidden="true">
                <LifeBuoy size={17} strokeWidth={2.2} />
              </span>
              <div>
                <strong>{$t("supportTitle")}</strong>
                <a href="mailto:support@speexify.com">support@speexify.com</a>
              </div>
            </div>

            <div className="newsletter">
              <div className="newsletter__header">
                <h3 className="newsletter-title">{$t("newsletterTitle")}</h3>
                <p>{$t("newsletterSubtitle")}</p>
              </div>
              <form
                className="newsletter-form"
                onSubmit={handleNewsletterSubmit}
                noValidate
              >
                <label className="sr-only" htmlFor="footer-newsletter-email">
                  {$t("newsletterPlaceholder")}
                </label>
                <input
                  id="footer-newsletter-email"
                  type="email"
                  name="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder={$t("newsletterPlaceholder")}
                  className="newsletter-input"
                  autoComplete="email"
                  disabled={submitting}
                  aria-describedby="footer-newsletter-status footer-newsletter-note"
                  required
                />
                <button
                  type="submit"
                  className="newsletter-btn"
                  disabled={submitting}
                >
                  {submitting ? (
                    <Loader2
                      className="newsletter-btn__spinner"
                      size={17}
                      strokeWidth={2.2}
                      aria-hidden="true"
                    />
                  ) : (
                    <span>{$t("newsletterButton")}</span>
                  )}
                  <ArrowRight size={17} strokeWidth={2.2} aria-hidden="true" />
                </button>
              </form>
              <p id="footer-newsletter-note" className="newsletter-note">
                {$t("newsletterPrivacy")}
              </p>
              <p
                id="footer-newsletter-status"
                className={`newsletter-status ${
                  newsletterStatus.tone
                    ? `newsletter-status--${newsletterStatus.tone}`
                    : ""
                }`}
                role="status"
                aria-live="polite"
              >
                {newsletterStatus.text}
              </p>
            </div>
          </section>

          <nav className="footer-nav" aria-label={$t("navAria")}>
            {footerColumns.map((column) => (
              <div className="nav-col" key={column.title}>
                <h3 className="nav-col-title">{column.title}</h3>
                <ul className="nav-col-list">
                  {column.links.map((link) => (
                    <li key={`${column.title}-${link.label}`}>
                      <FooterLink href={link.href}>{link.label}</FooterLink>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="footer-bottom">
          <div className="footer-bottom-left">
            <p className="copyright">
              © {currentYear} Speexify. {$t("rights")}
            </p>
            <span className="footer-availability">
              <CheckCircle2 size={16} strokeWidth={2.2} aria-hidden="true" />
              {$t("availability")}
            </span>
          </div>

          <div className="footer-bottom-right">
            <div className="social-links" aria-label={$t("socialAria")}>
              {SOCIAL_LINKS.map((social) => {
                const Icon = social.icon;
                return (
                  <a
                    key={social.href}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="social-link"
                    aria-label={$t(social.labelKey)}
                    title={social.name}
                  >
                    <Icon />
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterLink({ href, children }) {
  const isExternal =
    typeof href === "string" && /^(https?:|mailto:|tel:)/.test(href);

  if (isExternal) {
    return (
      <a className="nav-col-link" href={href}>
        <span>{children}</span>
        <ArrowRight size={15} strokeWidth={2.1} aria-hidden="true" />
      </a>
    );
  }

  return (
    <Link className="nav-col-link" href={href}>
      <span>{children}</span>
      <ArrowRight size={15} strokeWidth={2.1} aria-hidden="true" />
    </Link>
  );
}

function LinkedInIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M16.6667 2.5H3.33333C2.8731 2.5 2.5 2.8731 2.5 3.33333V16.6667C2.5 17.1269 2.8731 17.5 3.33333 17.5H16.6667C17.1269 17.5 17.5 17.1269 17.5 16.6667V3.33333C17.5 2.8731 17.1269 2.5 16.6667 2.5Z"
        fill="currentColor"
      />
      <path
        d="M5.83333 8.33333H7.5V14.1667H5.83333V8.33333ZM6.66667 5.83333C6.32572 5.83333 6 6.15905 6 6.5C6 6.84095 6.32572 7.16667 6.66667 7.16667C7.00762 7.16667 7.33333 6.84095 7.33333 6.5C7.33333 6.15905 7.00762 5.83333 6.66667 5.83333ZM12.5 14.1667H14.1667V10.8333C14.1667 9.45238 13.5476 8.33333 11.9643 8.33333C11.4167 8.33333 10.7024 8.63095 10.4167 9.11905V8.33333H8.75V14.1667H10.4167V11.25C10.4167 10.5595 10.7262 10 11.4167 10C12.0714 10 12.5 10.5595 12.5 11.25V14.1667Z"
        fill="white"
      />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M16.6667 2.5H3.33333C2.8731 2.5 2.5 2.8731 2.5 3.33333V16.6667C2.5 17.1269 2.8731 17.5 3.33333 17.5H10.625V11.875H8.75V9.375H10.625V7.5C10.625 5.84315 11.5931 4.375 13.5417 4.375C14.3194 4.375 15.2083 4.51389 15.2083 4.51389V6.25H14.2361C13.2778 6.25 12.9167 6.80556 12.9167 7.36111V9.375H15.1389L14.7917 11.875H12.9167V17.5H16.6667C17.1269 17.5 17.5 17.1269 17.5 16.6667V3.33333C17.5 2.8731 17.1269 2.5 16.6667 2.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

function YouTubeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M17.9167 5.83333C17.9167 5.83333 17.7417 4.54167 17.1667 3.95833C16.45 3.2 15.65 3.19583 15.2833 3.15833C12.7667 2.97917 10.0042 2.97917 10.0042 2.97917H9.99583C9.99583 2.97917 7.23333 2.97917 4.71667 3.15833C4.35 3.19583 3.55 3.2 2.83333 3.95833C2.25833 4.54167 2.08333 5.83333 2.08333 5.83333C2.08333 5.83333 1.90417 7.34167 1.90417 8.84583V10.2917C1.90417 11.7958 2.08333 13.3042 2.08333 13.3042C2.08333 13.3042 2.25833 14.5958 2.83333 15.1792C3.55 15.9375 4.46667 15.9125 4.88333 16C6.35417 16.1375 10 16.1708 10 16.1708C10 16.1708 12.7667 16.1667 15.2833 15.9875C15.65 15.95 16.45 15.9458 17.1667 15.1875C17.7417 14.6042 17.9167 13.3125 17.9167 13.3125C17.9167 13.3125 18.0958 11.8042 18.0958 10.3V8.85417C18.0958 7.35 17.9167 5.83333 17.9167 5.83333ZM8.25 11.7917V6.875L13.0833 9.34583L8.25 11.7917Z"
        fill="currentColor"
      />
    </svg>
  );
}

function TikTokIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M10.8333 2.5V11.4583C10.8333 12.7233 9.80833 13.75 8.54167 13.75C7.275 13.75 6.25 12.7233 6.25 11.4583C6.25 10.1933 7.275 9.16667 8.54167 9.16667V7.08333C6.125 7.08333 4.16667 9.04167 4.16667 11.4583C4.16667 13.875 6.125 15.8333 8.54167 15.8333C10.9583 15.8333 12.9167 13.875 12.9167 11.4583V5.41667C13.8583 6.09167 15 6.475 16.25 6.54167V4.38333C15.225 4.38333 14.2833 3.96667 13.5917 3.29167C13.1667 2.86667 12.9167 2.5 12.9167 2.5H10.8333Z"
        fill="currentColor"
      />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M15.1517 2.92334H17.7067L11.9517 9.5125L18.75 17.0767H13.3958L9.13833 11.8392L4.2275 17.0767H1.67083L7.81667 9.99584L1.25 2.92417H6.73417L10.6025 7.66667L15.1517 2.92334ZM14.1833 15.5692H15.6733L5.88667 4.44667H4.295L14.1833 15.5692Z"
        fill="currentColor"
      />
    </svg>
  );
}

export default Footer;
