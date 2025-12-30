// app/sitemap.js
export default function sitemap() {
  const baseUrl = "https://speexify.com";

  const routes = [
    "",
    "/about",
    "/features",
    "/pricing",
    "/blog",
    "/contact",

    // add ONLY pages that exist + are public:
    // "/privacy",
    // "/terms",
    // "/faq",
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date().toISOString(),
    changeFrequency: route === "" ? "daily" : "weekly",
    priority: route === "" ? 1.0 : 0.8,
  }));

  return routes;
}
