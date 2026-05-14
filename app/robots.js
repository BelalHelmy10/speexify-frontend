/**
 * app/robots.js
 * Controls how search engine crawlers access your site
 * Docs: https://nextjs.org/docs/app/api-reference/file-conventions/metadata/robots
 */

export default function robots() {
  const baseUrl = "https://speexify.com";
  const privatePaths = [
    "/api/",
    "/admin/",
    "/ar/admin/",
    "/dashboard/",
    "/ar/dashboard/",
    "/calendar/",
    "/ar/calendar/",
    "/settings/",
    "/ar/settings/",
    "/classroom/",
    "/ar/classroom/",
    "/resources/",
    "/ar/resources/",
    "/assessment",
    "/ar/assessment",
    "/onboarding",
    "/ar/onboarding",
    "/manual-payment",
    "/ar/manual-payment",
    "/checkout/",
    "/ar/checkout/",
    "/payment/",
    "/ar/payment/",
    "/_next/",
  ];

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: privatePaths,
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
