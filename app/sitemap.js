export default function sitemap() {
  const baseUrl = "https://speexify.com";
  const lastModified = new Date("2026-05-14T00:00:00.000Z");

  const publicPages = [
    { en: "", ar: "/ar", priority: 1.0, changeFrequency: "daily" },
    { en: "/packages", ar: "/ar/packages", priority: 0.9, changeFrequency: "weekly" },
    { en: "/individual-training", ar: "/ar/individual-training", priority: 0.9, changeFrequency: "weekly" },
    { en: "/corporate-training", ar: "/ar/corporate-training", priority: 0.9, changeFrequency: "weekly" },
    { en: "/why-speexify", ar: "/ar/why-speexify", priority: 0.8, changeFrequency: "monthly" },
    { en: "/about", ar: "/ar/about", priority: 0.8, changeFrequency: "monthly" },
    { en: "/contact", ar: "/ar/contact", priority: 0.7, changeFrequency: "monthly" },
    { en: "/careers", ar: "/ar/careers", priority: 0.6, changeFrequency: "monthly" },
    { en: "/privacy", ar: "/ar/privacy", priority: 0.3, changeFrequency: "yearly" },
    { en: "/terms", ar: "/ar/terms", priority: 0.3, changeFrequency: "yearly" },
    { en: "/refund-policy", ar: "/ar/refund-policy", priority: 0.3, changeFrequency: "yearly" },
  ];

  return publicPages.flatMap((page) => [
    {
      url: `${baseUrl}${page.en}`,
      lastModified,
      changeFrequency: page.changeFrequency,
      priority: page.priority,
      alternates: {
        languages: {
          en: `${baseUrl}${page.en}`,
          ar: `${baseUrl}${page.ar}`,
        },
      },
    },
    {
      url: `${baseUrl}${page.ar}`,
      lastModified,
      changeFrequency: page.changeFrequency,
      priority: Math.max(page.priority - 0.05, 0.1),
      alternates: {
        languages: {
          en: `${baseUrl}${page.en}`,
          ar: `${baseUrl}${page.ar}`,
        },
      },
    },
  ]);
}
