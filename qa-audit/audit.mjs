// QA browser audit — runs against the LIVE server on :3000 (read-only GET navigation).
// Collects: console errors/warnings, page errors, failed network requests,
// SEO metadata, axe-core a11y violations, horizontal overflow.
import puppeteer from "puppeteer";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const chrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const exe = fs.existsSync(chrome) ? chrome : undefined;
const axeSrc = fs.readFileSync(path.resolve("node_modules/axe-core/axe.min.js"), "utf8");

const routes = JSON.parse(fs.readFileSync(process.env.ROUTES_FILE, "utf8"));
const outFile = process.env.OUT_FILE || "qa-audit/audit-result.json";

const browser = await puppeteer.launch({
  headless: "new",
  executablePath: exe,
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});

const results = [];
for (const route of routes) {
  const url = BASE + route;
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  const consoleErrors = [];
  const consoleWarnings = [];
  const pageErrors = [];
  const failedRequests = [];
  page.on("console", (msg) => {
    const t = msg.type();
    const txt = msg.text();
    if (t === "error") consoleErrors.push(txt);
    else if (t === "warning" || t === "warn") consoleWarnings.push(txt);
  });
  page.on("pageerror", (err) => pageErrors.push(String(err)));
  page.on("requestfailed", (req) =>
    failedRequests.push({ url: req.url(), error: req.failure()?.errorText })
  );
  page.on("response", (resp) => {
    const s = resp.status();
    if (s >= 400) failedRequests.push({ url: resp.url(), status: s });
  });

  const rec = { route, url };
  try {
    const resp = await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
    rec.status = resp ? resp.status() : null;
    // settle
    await new Promise((r) => setTimeout(r, 600));

    // Metadata
    rec.meta = await page.evaluate(() => {
      const get = (sel, attr = "content") =>
        document.querySelector(sel)?.getAttribute(attr) || null;
      const all = (sel, attr) =>
        Array.from(document.querySelectorAll(sel)).map((n) => n.getAttribute(attr));
      let jsonLd = [];
      let jsonLdValid = true;
      document.querySelectorAll('script[type="application/ld+json"]').forEach((s) => {
        try { jsonLd.push(JSON.parse(s.textContent)); } catch (e) { jsonLdValid = false; }
      });
      return {
        title: document.title || null,
        titleLen: (document.title || "").length,
        description: get('meta[name="description"]'),
        canonical: get('link[rel="canonical"]', "href"),
        ogTitle: get('meta[property="og:title"]'),
        ogDescription: get('meta[property="og:description"]'),
        ogImage: get('meta[property="og:image"]'),
        ogType: get('meta[property="og:type"]'),
        twitterCard: get('meta[name="twitter:card"]'),
        hreflang: all('link[rel="alternate"][hreflang]', "hreflang"),
        hreflangHrefs: all('link[rel="alternate"][hreflang]', "href"),
        jsonLdCount: jsonLd.length,
        jsonLdValid,
        jsonLdTypes: jsonLd.map((j) => j["@type"]).flat(),
        h1Count: document.querySelectorAll("h1").length,
        h1Text: document.querySelector("h1")?.textContent?.trim()?.slice(0, 80) || null,
        lang: document.documentElement.getAttribute("lang"),
        dir: document.documentElement.getAttribute("dir"),
        metaRobots: get('meta[name="robots"]'),
        viewport: get('meta[name="viewport"]'),
      };
    });

    // Overflow at desktop
    rec.overflowX = await page.evaluate(() => {
      const d = document.documentElement;
      return Math.max(d.scrollWidth, document.body?.scrollWidth || 0) - window.innerWidth;
    });

    // axe-core
    try {
      await page.addScriptTag({ content: axeSrc });
      const axe = await page.evaluate(async () => {
        // eslint-disable-next-line no-undef
        const r = await axe.run(document, {
          runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] },
        });
        return r.violations.map((v) => ({
          id: v.id,
          impact: v.impact,
          help: v.help,
          nodes: v.nodes.length,
          sample: v.nodes[0]?.target?.join(" ") || null,
        }));
      });
      rec.axe = axe;
    } catch (e) {
      rec.axeError = String(e);
    }
  } catch (e) {
    rec.error = String(e);
  }
  rec.consoleErrors = consoleErrors;
  rec.consoleWarnings = consoleWarnings;
  rec.pageErrors = pageErrors;
  rec.failedRequests = failedRequests;
  results.push(rec);
  await page.close();
  process.stderr.write(
    `${route}  status=${rec.status}  axe=${rec.axe ? rec.axe.length : "?"}  errs=${consoleErrors.length}  pageErr=${pageErrors.length}  failedReq=${failedRequests.length}\n`
  );
}

await browser.close();
fs.writeFileSync(outFile, JSON.stringify(results, null, 2));
console.log("WROTE", outFile, "routes:", results.length);
