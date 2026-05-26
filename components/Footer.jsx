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
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="24" height="24" rx="5" fill="#000" />
      <path
        d="M7.05 9.6h2.4v8.1h-2.4zM8.25 5.9a1.4 1.4 0 1 1 0 2.8 1.4 1.4 0 0 1 0-2.8zM10.95 9.6h2.3v1.1c.42-.78 1.36-1.32 2.55-1.32 2.27 0 2.95 1.45 2.95 3.55v4.77h-2.4v-4.27c0-1.08-.42-1.85-1.5-1.85s-1.5.7-1.5 1.85v4.27h-2.4z"
        fill="#fff"
      />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="24" height="24" rx="5" fill="#000" />
      <path
        d="M13.6 19v-6.6h2.22l.33-2.7H13.6V8c0-.78.22-1.3 1.36-1.3h1.45V4.28c-.25-.03-1.12-.1-2.13-.1-2.1 0-3.55 1.28-3.55 3.65v2.04H8.5v2.7h2.23V19z"
        fill="#fff"
      />
    </svg>
  );
}

function YouTubeIcon() {
  return (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="24" height="24" rx="5" fill="#000" />
      <path d="M10.2 8.4 16 12l-5.8 3.6z" fill="#fff" />
    </svg>
  );
}

function TikTokIcon() {
  return (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="24" height="24" rx="5" fill="#000" />
      <path
        d="M16.7 9.55a4.18 4.18 0 0 1-3.18-1.42v5.95a4.07 4.07 0 1 1-4.07-4.07c.17 0 .33.01.5.03v2.13a1.96 1.96 0 1 0 1.45 1.9V4.6h2.15a3.18 3.18 0 0 0 3.15 2.83z"
        fill="#fff"
      />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="24" height="24" rx="5" fill="#000" />
      <g transform="translate(2 2) scale(0.833)" fill="#fff">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </g>
    </svg>
  );
}

export default Footer;
