// Metadata/SEO smoke audit for public routes. This is intentionally separate
// from axe so it can also run in a deployment check without loading the
// accessibility bundle.
import puppeteer from "puppeteer";
import fs from "node:fs";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const routesFile = process.env.ROUTES_FILE || "qa-audit/public-routes.json";
const routes = JSON.parse(fs.readFileSync(routesFile, "utf8"));
const chrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const browser = await puppeteer.launch({
  headless: "new",
  executablePath: fs.existsSync(chrome) ? chrome : undefined,
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});

const failures = [];
const results = [];

for (const route of routes) {
  const page = await browser.newPage();
  const url = `${BASE}${route}`;
  try {
    const response = await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
    const metadata = await page.evaluate(() => {
      const content = (selector, attr = "content") =>
        document.querySelector(selector)?.getAttribute(attr) || "";
      const alternates = Array.from(document.querySelectorAll('link[rel="alternate"][hreflang]'));
      const jsonLd = Array.from(document.querySelectorAll('script[type="application/ld+json"]')).map((node) => {
        try { return JSON.parse(node.textContent || "{}"); } catch { return null; }
      });
      return {
        title: document.title,
        description: content('meta[name="description"]'),
        canonical: content('link[rel="canonical"]', "href"),
        ogTitle: content('meta[property="og:title"]'),
        ogDescription: content('meta[property="og:description"]'),
        ogImage: content('meta[property="og:image"]'),
        twitterCard: content('meta[name="twitter:card"]'),
        robots: content('meta[name="robots"]'),
        lang: document.documentElement.lang,
        dir: document.documentElement.dir,
        hreflang: alternates.map((node) => node.getAttribute("hreflang")),
        hreflangHrefs: alternates.map((node) => node.getAttribute("href")),
        jsonLdValid: jsonLd.every(Boolean),
        jsonLdTypes: jsonLd.filter(Boolean).flatMap((item) => item["@type"] || []),
      };
    });
    const expectedArabic = route === "/ar" || route.startsWith("/ar/");
    if (response?.status() !== 200) failures.push(`${route}: HTTP ${response?.status() ?? "unknown"}`);
    const required = ["title", "description", "canonical", "ogTitle", "ogDescription", "ogImage", "twitterCard"];
    for (const field of required) {
      if (!metadata[field]) failures.push(`${route}: missing ${field}`);
    }
    if (metadata.lang !== (expectedArabic ? "ar" : "en")) failures.push(`${route}: lang=${metadata.lang}`);
    if (metadata.dir !== (expectedArabic ? "rtl" : "ltr")) failures.push(`${route}: dir=${metadata.dir}`);
    if (metadata.canonical) {
      const canonicalPath = new URL(metadata.canonical).pathname || "/";
      if (canonicalPath !== route) failures.push(`${route}: canonical path=${canonicalPath}`);
    }
    if (!metadata.jsonLdValid) failures.push(`${route}: invalid JSON-LD`);
    const indexable = !/noindex/i.test(metadata.robots);
    if (indexable && (!metadata.hreflang.includes("en") || !metadata.hreflang.includes("ar") || !metadata.hreflang.includes("x-default"))) {
      failures.push(`${route}: incomplete hreflang set`);
    }
    results.push({ route, status: response?.status() ?? null, metadata });
  } catch (error) {
    failures.push(`${route}: ${error.message}`);
  } finally {
    await page.close();
  }
}

await browser.close();
const output = { base: BASE, routes: results.length, failures, results };
const outFile = process.env.OUT_FILE || "/tmp/speexify-seo-audit.json";
fs.writeFileSync(outFile, JSON.stringify(output, null, 2));
console.log(JSON.stringify({ base: BASE, routes: results.length, failures: failures.length, outFile }, null, 2));
if (failures.length) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
}
