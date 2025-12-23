import { getDictionary, t } from "@/app/i18n";

export const metadata = {
  title: "Privacy Policy",
};

export default function PrivacyPage({ locale = "en" } = {}) {
  const dict = getDictionary(locale, "privacy");
  const date = t(dict, "date_value");

  return (
    <main
      dir={locale === "ar" ? "rtl" : "ltr"}
      style={{ maxWidth: 900, margin: "0 auto", padding: "40px 20px" }}
    >
      <h1>{t(dict, "title")}</h1>
      <p style={{ opacity: 0.8 }}>{t(dict, "last_updated", { date })}</p>

      <p>{t(dict, "intro")}</p>

      <h2>{t(dict, "s1_title")}</h2>
      <p>{t(dict, "s1_p1")}</p>
      <ul>
        <li>{t(dict, "s1_li1")}</li>
        <li>{t(dict, "s1_li2")}</li>
        <li>{t(dict, "s1_li3")}</li>
        <li>{t(dict, "s1_li4")}</li>
        <li>{t(dict, "s1_li5")}</li>
      </ul>

      <h2>{t(dict, "s2_title")}</h2>
      <p>{t(dict, "s2_p1")}</p>
      <ul>
        <li>{t(dict, "s2_li1")}</li>
        <li>{t(dict, "s2_li2")}</li>
        <li>{t(dict, "s2_li3")}</li>
        <li>{t(dict, "s2_li4")}</li>
        <li>{t(dict, "s2_li5")}</li>
        <li>{t(dict, "s2_li6")}</li>
      </ul>

      <h2>{t(dict, "s3_title")}</h2>
      <p>{t(dict, "s3_p1")}</p>
      <p>{t(dict, "s3_p2")}</p>

      <h2>{t(dict, "s4_title")}</h2>
      <p>{t(dict, "s4_p1")}</p>
      <ul>
        <li>{t(dict, "s4_li1")}</li>
        <li>{t(dict, "s4_li2")}</li>
        <li>{t(dict, "s4_li3")}</li>
      </ul>
      <p>{t(dict, "s4_p2")}</p>

      <h2>{t(dict, "s5_title")}</h2>
      <p>{t(dict, "s5_p1")}</p>
      <ul>
        <li>{t(dict, "s5_li1")}</li>
        <li>{t(dict, "s5_li2")}</li>
        <li>{t(dict, "s5_li3")}</li>
        <li>{t(dict, "s5_li4")}</li>
      </ul>
      <p>{t(dict, "s5_p2")}</p>

      <h2>{t(dict, "s6_title")}</h2>
      <p>{t(dict, "s6_p1")}</p>
      <p>
        <strong>{t(dict, "contact_email_label")}</strong>{" "}
        {t(dict, "contact_email_value")}
      </p>
    </main>
  );
}
