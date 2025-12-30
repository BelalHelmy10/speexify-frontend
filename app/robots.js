/**
 * app/robots.js
 * Controls how search engine crawlers access your site
 * Docs: https://nextjs.org/docs/app/api-reference/file-conventions/metadata/robots
 */

export default function robots() {
  const baseUrl = "https://speexify.com";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/", // Don't index API routes
          "/admin/", // Don't index admin pages (if you have any)
          "/private/", // Private pages
          "/_next/", // Next.js internal files
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
