import puppeteer from "puppeteer";
import fs from "node:fs";
const BASE = "http://localhost:3000";
const chrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const exe = fs.existsSync(chrome) ? chrome : undefined;
const pages = ["/", "/individual-training", "/packages", "/blog", "/why-speexify"];
const browser = await puppeteer.launch({ headless: "new", executablePath: exe, args: ["--no-sandbox", "--disable-setuid-sandbox"] });
for (const route of pages) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.evaluateOnNewDocument(() => {
    window.__cls = 0;
    new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: "layout-shift", buffered: true });
    window.__lcp = 0;
    new PerformanceObserver((l) => { const es = l.getEntries(); window.__lcp = es[es.length - 1].renderTime || es[es.length - 1].loadTime || es[es.length - 1].startTime; }).observe({ type: "largest-contentful-paint", buffered: true });
  });
  await page.goto(BASE + route, { waitUntil: "networkidle2", timeout: 30000 });
  await new Promise((r) => setTimeout(r, 1200));
  const m = await page.evaluate(() => {
    const res = performance.getEntriesByType("resource");
    const sum = (t) => res.filter((r) => r.initiatorType === t || (t === "img" && r.name.match(/\.(png|jpe?g|webp|gif|svg|avif)|_next\/image/i)) || (t === "script" && r.name.endsWith(".js"))).reduce((a, r) => a + (r.encodedBodySize || r.transferSize || 0), 0);
    const nav = performance.getEntriesByType("navigation")[0] || {};
    const totalImg = res.filter((r) => r.name.match(/\.(png|jpe?g|webp|gif|avif)|_next\/image/i)).reduce((a, r) => a + (r.encodedBodySize || 0), 0);
    const totalJs = res.filter((r) => r.name.match(/\.js(\?|$)/)).reduce((a, r) => a + (r.encodedBodySize || 0), 0);
    const totalCss = res.filter((r) => r.name.match(/\.css(\?|$)/)).reduce((a, r) => a + (r.encodedBodySize || 0), 0);
    const biggest = res.map((r) => ({ n: r.name.split("/").pop().slice(0, 50), kb: Math.round((r.encodedBodySize || 0) / 1024) })).sort((a, b) => b.kb - a.kb).slice(0, 4);
    return { ttfb: Math.round(nav.responseStart || 0), domContentLoaded: Math.round(nav.domContentLoadedEventEnd || 0), load: Math.round(nav.loadEventEnd || 0), reqCount: res.length, totalJsKB: Math.round(totalJs / 1024), totalImgKB: Math.round(totalImg / 1024), totalCssKB: Math.round(totalCss / 1024), biggest };
  });
  const cls = await page.evaluate(() => Math.round((window.__cls || 0) * 1000) / 1000);
  const lcp = await page.evaluate(() => Math.round(window.__lcp || 0));
  console.log(`\n=== ${route} ===`);
  console.log(`  LCP=${lcp}ms  CLS=${cls}  TTFB=${m.ttfb}ms  DCL=${m.domContentLoaded}ms  load=${m.load}ms  requests=${m.reqCount}`);
  console.log(`  JS=${m.totalJsKB}KB  CSS=${m.totalCssKB}KB  IMG=${m.totalImgKB}KB`);
  console.log(`  biggest: ${m.biggest.map((b) => `${b.n}(${b.kb}KB)`).join(", ")}`);
  await page.close();
}
await browser.close();
console.log("\nPERF DONE");
