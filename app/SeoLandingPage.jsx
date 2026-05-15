import Link from "next/link";
import SeoJsonLd from "./SeoJsonLd";
import { landingPages } from "./seoContent";
import {
  breadcrumbJsonLd,
  faqJsonLd,
  serviceJsonLd,
} from "./seo";
import { APP_ROUTES, routeHref } from "@/lib/routes";

export default function SeoLandingPage({ pageKey, locale = "en" }) {
  const config = landingPages[pageKey];
  const page = config?.[locale];

  if (!config || !page) return null;

  const contactPath = routeHref(APP_ROUTES.contact, locale);
  const packagesPath = routeHref(APP_ROUTES.packages, locale);
  const homeLabel = locale === "ar" ? "الرئيسية" : "Home";

  const jsonLd = [
    breadcrumbJsonLd([
      { name: homeLabel, path: routeHref(APP_ROUTES.home, locale) },
      { name: page.eyebrow, path: page.path },
    ]),
    serviceJsonLd({
      name: page.eyebrow,
      description: page.subtitle,
      path: page.path,
      serviceType: config.serviceType,
      audience: config.audience,
    }),
    faqJsonLd(page.faq),
  ];

  return (
    <main className="seo-page">
      <SeoJsonLd data={jsonLd} />

      <section className="seo-hero">
        <div className="seo-container seo-hero__grid">
          <div className="seo-hero__copy">
            <p className="seo-eyebrow">{page.eyebrow}</p>
            <h1>{page.title}</h1>
            <p className="seo-lede">{page.subtitle}</p>
            <div className="seo-actions">
              <Link href={contactPath} className="seo-btn seo-btn--primary">
                {page.primaryCta}
              </Link>
              <Link href={packagesPath} className="seo-btn seo-btn--secondary">
                {page.secondaryCta}
              </Link>
            </div>
          </div>

          <aside className="seo-proof" aria-label={locale === "ar" ? "نقاط القوة" : "Proof points"}>
            {page.proof.map((item) => (
              <div className="seo-proof__item" key={item}>
                <span />
                <strong>{item}</strong>
              </div>
            ))}
          </aside>
        </div>
      </section>

      <section className="seo-section">
        <div className="seo-container seo-section__grid">
          {page.sections.map((section) => (
            <article className="seo-card" key={section.title}>
              <h2>{section.title}</h2>
              <p>{section.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="seo-faq">
        <div className="seo-container">
          <p className="seo-eyebrow">{locale === "ar" ? "أسئلة شائعة" : "FAQ"}</p>
          <h2>{locale === "ar" ? "إجابات سريعة قبل أن تبدأ" : "Quick answers before you start"}</h2>
          <div className="seo-faq__list">
            {page.faq.map((item) => (
              <details className="seo-faq__item" key={item.question}>
                <summary>{item.question}</summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="seo-cta">
        <div className="seo-container seo-cta__inner">
          <h2>
            {locale === "ar"
              ? "جاهز لتحويل الإنجليزية إلى مهارة تستخدمها بثقة؟"
              : "Ready to turn English into a skill you actually use?"}
          </h2>
          <Link href={contactPath} className="seo-btn seo-btn--primary">
            {page.primaryCta}
          </Link>
        </div>
      </section>
    </main>
  );
}
