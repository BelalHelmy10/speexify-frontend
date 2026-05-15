import Link from "next/link";
import SeoJsonLd from "./SeoJsonLd";
import { hubPages } from "./seoContent";
import { breadcrumbJsonLd, collectionPageJsonLd } from "./seo";
import { APP_ROUTES, routeHref } from "@/lib/routes";

export default function SeoHubPage({ hubKey, locale = "en" }) {
  const page = hubPages[hubKey]?.[locale];
  if (!page) return null;

  const homeLabel = locale === "ar" ? "الرئيسية" : "Home";

  const jsonLd = [
    breadcrumbJsonLd([
      { name: homeLabel, path: routeHref(APP_ROUTES.home, locale) },
      { name: page.eyebrow, path: page.path },
    ]),
    collectionPageJsonLd({
      name: page.title,
      description: page.subtitle,
      path: page.path,
    }),
  ];

  return (
    <main className="seo-page seo-page--hub">
      <SeoJsonLd data={jsonLd} />

      <section className="seo-hero seo-hero--compact">
        <div className="seo-container">
          <p className="seo-eyebrow">{page.eyebrow}</p>
          <h1>{page.title}</h1>
          <p className="seo-lede">{page.subtitle}</p>
        </div>
      </section>

      <section className="seo-section">
        <div className="seo-container seo-hub-grid">
          {page.cards.map((card) => (
            <Link className="seo-hub-card" href={card.href} key={card.href}>
              <span className="seo-hub-card__kicker">
                {locale === "ar" ? "اقرأ المزيد" : "Read more"}
              </span>
              <h2>{card.title}</h2>
              <p>{card.description}</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
