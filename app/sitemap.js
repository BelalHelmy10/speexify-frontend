export default function sitemap() {
  const baseUrl = "https://speexify.com";
  const lastModified = new Date("2026-05-14T00:00:00.000Z");

  const publicPages = [
    { en: "", ar: "/ar", priority: 1.0, changeFrequency: "daily" },
    { en: "/packages", ar: "/ar/packages", priority: 0.9, changeFrequency: "weekly" },
    { en: "/individual-training", ar: "/ar/individual-training", priority: 0.9, changeFrequency: "weekly" },
    { en: "/corporate-training", ar: "/ar/corporate-training", priority: 0.9, changeFrequency: "weekly" },
    { en: "/english-speaking-coach-egypt", ar: "/ar/english-speaking-coach-egypt", priority: 0.88, changeFrequency: "weekly" },
    { en: "/business-english-training-companies", ar: "/ar/business-english-training-companies", priority: 0.88, changeFrequency: "weekly" },
    { en: "/online-english-conversation-practice", ar: "/ar/online-english-conversation-practice", priority: 0.86, changeFrequency: "weekly" },
    { en: "/english-presentation-coaching", ar: "/ar/english-presentation-coaching", priority: 0.86, changeFrequency: "weekly" },
    { en: "/corporate-english-training-egypt", ar: "/ar/corporate-english-training-egypt", priority: 0.86, changeFrequency: "weekly" },
    { en: "/why-speexify", ar: "/ar/why-speexify", priority: 0.8, changeFrequency: "monthly" },
    { en: "/about", ar: "/ar/about", priority: 0.8, changeFrequency: "monthly" },
    { en: "/blog", ar: "/ar/blog", priority: 0.75, changeFrequency: "weekly" },
    { en: "/guides", ar: "/ar/guides", priority: 0.72, changeFrequency: "weekly" },
    { en: "/help-center", ar: "/ar/help-center", priority: 0.7, changeFrequency: "weekly" },
    { en: "/contact", ar: "/ar/contact", priority: 0.7, changeFrequency: "monthly" },
    { en: "/careers", ar: "/ar/careers", priority: 0.6, changeFrequency: "monthly" },
    { en: "/privacy", ar: "/ar/privacy", priority: 0.3, changeFrequency: "yearly" },
    { en: "/terms", ar: "/ar/terms", priority: 0.3, changeFrequency: "yearly" },
    { en: "/refund-policy", ar: "/ar/refund-policy", priority: 0.3, changeFrequency: "yearly" },
  ];

  const roundedPriority = (value) => Number(value.toFixed(2));

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
          "x-default": `${baseUrl}${page.en}`,
        },
      },
    },
    {
      url: `${baseUrl}${page.ar}`,
      lastModified,
      changeFrequency: page.changeFrequency,
      priority: roundedPriority(Math.max(page.priority - 0.05, 0.1)),
      alternates: {
        languages: {
          en: `${baseUrl}${page.en}`,
          ar: `${baseUrl}${page.ar}`,
          "x-default": `${baseUrl}${page.en}`,
        },
      },
    },
  ]);
}
