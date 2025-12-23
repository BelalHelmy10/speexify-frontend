import { getDictionary, t } from "@/app/i18n";

export const metadata = {
  title: "Terms & Conditions",
};

export default function TermsPage({ locale = "en" } = {}) {
  const dict = getDictionary(locale, "terms");

  return (
    <main
      dir={locale === "ar" ? "rtl" : "ltr"}
      style={{ maxWidth: 900, margin: "0 auto", padding: "40px 20px" }}
    >
      <h1>{t(dict, "title")}</h1>
      <p>{t(dict, "intro")}</p>

      <h2>{t(dict, "s1_title")}</h2>
      <p>{t(dict, "s1_body")}</p>

      <h2>{t(dict, "s2_title")}</h2>
      <p>{t(dict, "s2_body")}</p>

      <h2>{t(dict, "s3_title")}</h2>
      <p>{t(dict, "s3_body")}</p>

      <h2>{t(dict, "s4_title")}</h2>
      <ul>
        <li>{t(dict, "s4_li1")}</li>
        <li>{t(dict, "s4_li2")}</li>
        <li>{t(dict, "s4_li3")}</li>
        <li>{t(dict, "s4_li4")}</li>
      </ul>

      <h2>{t(dict, "s5_title")}</h2>
      <p>{t(dict, "s5_body")}</p>

      <h2>{t(dict, "s6_title")}</h2>
      <p>{t(dict, "s6_body")}</p>

      <h2>{t(dict, "s7_title")}</h2>
      <p>{t(dict, "s7_body")}</p>

      <h2>{t(dict, "s8_title")}</h2>
      <p>{t(dict, "s8_body")}</p>

      <p>
        <strong>{t(dict, "contact_email_label")}</strong>{" "}
        {t(dict, "contact_email_value")}
      </p>
    </main>
  );
}
