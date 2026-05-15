import Image from "next/image";
import Link from "next/link";
import HomeAuthRedirect from "./HomeAuthRedirect";
import HomePageContent from "./HomePageContent";
import { getDictionary, t } from "./i18n";
import { pageMetadata } from "./seo";
import "@/styles/home.scss";

export const metadata = pageMetadata("home", "en");

export default function Page({ locale = "en" }) {
  return (
    <>
      <HomeAuthRedirect locale={locale} />
      <HomeSsrFallback locale={locale} />
      <HomePageContent locale={locale} />
    </>
  );
}

function HomeSsrFallback({ locale = "en" }) {
  const dict = getDictionary(locale, "home");
  const prefix = locale === "ar" ? "/ar" : "";

  return (
    <div id="home-ssr-fallback" className="home-home">
      <section className="home-hero">
        <div className="home-hero__background">
          <div className="home-hero__gradient"></div>
          <div className="home-hero__grid-pattern"></div>
        </div>

        <div className="home-hero__grid home-container">
          <div className="home-hero__copy">
            <div className="home-hero__badge">
              <span>{t(dict, "badge")}</span>
            </div>
            <h1 className="home-hero__title">
              {t(dict, "title_main")}
              <span className="home-hero__title-accent">
                {t(dict, "title_accent")}
              </span>
            </h1>
            <p className="home-hero__sub">{t(dict, "subtitle")}</p>
            <div className="home-hero__cta">
              <Link
                className="home-btn home-btn--primary home-btn--shine"
                href={`${prefix}/register`}
              >
                <span>{t(dict, "ctaPrimary")}</span>
              </Link>
              <Link className="home-btn home-btn--ghost" href={`${prefix}/packages`}>
                {t(dict, "ctaSecondary")}
              </Link>
            </div>
          </div>

          <div className="home-hero__media" aria-hidden="true">
            <div className="home-media-card">
              <Image
                src="/images/home-hero-clean.png"
                alt=""
                className="home-media-card__img"
                width={2048}
                height={2048}
                priority
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
