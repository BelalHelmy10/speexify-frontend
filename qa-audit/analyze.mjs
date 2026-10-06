import fs from "node:fs";
const data = JSON.parse(fs.readFileSync(process.env.OUT_FILE, "utf8"));

// ---- A4: axe aggregation ----
const axeAgg = {};
for (const r of data) {
  for (const v of r.axe || []) {
    const k = v.id;
    axeAgg[k] = axeAgg[k] || { impact: v.impact, help: v.help, nodes: 0, pages: new Set(), sample: v.sample };
    axeAgg[k].nodes += v.nodes;
    axeAgg[k].pages.add(r.route);
  }
}
console.log("===== A4: AXE VIOLATIONS (aggregated across 50 routes) =====");
Object.entries(axeAgg)
  .sort((a, b) => b[1].pages.size - a[1].pages.size)
  .forEach(([id, v]) => {
    console.log(`\n[${v.impact}] ${id} — ${v.help}`);
    console.log(`   pages affected: ${v.pages.size}/50   total nodes: ${v.nodes}`);
    console.log(`   sample selector: ${v.sample}`);
  });

// ---- A3: metadata problems ----
console.log("\n\n===== A3: SEO METADATA ISSUES =====");
const probs = [];
for (const r of data) {
  const m = r.meta || {};
  const isAr = r.route === "/ar" || r.route.startsWith("/ar/");
  const p = [];
  if (!m.title) p.push("NO <title>");
  if (m.titleLen > 65) p.push(`title ${m.titleLen} chars (>65)`);
  if (!m.description) p.push("NO meta description");
  else if (m.description.length > 165) p.push(`desc ${m.description.length} chars (>165)`);
  if (!m.canonical) p.push("NO canonical");
  if (!m.ogTitle) p.push("NO og:title");
  if (!m.ogImage) p.push("NO og:image");
  if (!m.twitterCard) p.push("NO twitter:card");
  if (!m.hreflang || m.hreflang.length === 0) p.push("NO hreflang");
  if (m.h1Count === 0) p.push("NO <h1>");
  if (m.h1Count > 1) p.push(`${m.h1Count} <h1> (should be 1)`);
  if (isAr && m.lang !== "ar") p.push(`lang="${m.lang}" (expected ar)`);
  if (isAr && m.dir !== "rtl") p.push(`dir="${m.dir}" (expected rtl)`);
  if (!isAr && m.lang !== "en") p.push(`lang="${m.lang}" (expected en)`);
  if (p.length) probs.push(`${r.route}: ${p.join("; ")}`);
}
if (probs.length === 0) console.log("No metadata problems detected on any route.");
else probs.forEach((x) => console.log("  - " + x));

// ---- A3: hreflang + jsonLd coverage summary ----
console.log("\n----- metadata coverage summary -----");
const cov = { title: 0, desc: 0, canonical: 0, og: 0, twitter: 0, hreflang: 0, jsonld: 0, jsonldInvalid: 0 };
for (const r of data) {
  const m = r.meta || {};
  if (m.title) cov.title++;
  if (m.description) cov.desc++;
  if (m.canonical) cov.canonical++;
  if (m.ogTitle && m.ogImage) cov.og++;
  if (m.twitterCard) cov.twitter++;
  if (m.hreflang?.length) cov.hreflang++;
  if (m.jsonLdCount > 0) cov.jsonld++;
  if (m.jsonLdValid === false) cov.jsonldInvalid++;
}
console.log(JSON.stringify(cov, null, 0), "out of", data.length);
// show a sample canonical + hreflang for home en/ar
for (const route of ["/", "/ar", "/packages"]) {
  const r = data.find((x) => x.route === route);
  if (r) console.log(`  ${route}: canonical=${r.meta.canonical} hreflang=${JSON.stringify(r.meta.hreflang)} jsonLdTypes=${JSON.stringify(r.meta.jsonLdTypes)}`);
}

// ---- A2/A11: console errors + failed requests ----
console.log("\n\n===== A2/A11: CONSOLE ERRORS & FAILED REQUESTS =====");
const allErrs = new Set();
const allFailed = new Set();
for (const r of data) {
  (r.consoleErrors || []).forEach((e) => allErrs.add(`[${r.route}] ${e.slice(0, 200)}`));
  (r.pageErrors || []).forEach((e) => allErrs.add(`[PAGEERR ${r.route}] ${e.slice(0, 200)}`));
  (r.failedRequests || []).forEach((f) => allFailed.add(`${f.status || f.error} ${f.url}`));
}
console.log("--- console/page errors (" + allErrs.size + ") ---");
[...allErrs].forEach((e) => console.log("  " + e));
console.log("--- failed requests (unique " + allFailed.size + ") ---");
[...allFailed].forEach((f) => console.log("  " + f));

// ---- A10: overflow ----
console.log("\n\n===== A10: HORIZONTAL OVERFLOW @1440 =====");
const ov = data.filter((r) => (r.overflowX || 0) > 0);
if (ov.length === 0) console.log("No horizontal overflow at 1440px on any route.");
else ov.forEach((r) => console.log(`  ${r.route}: +${r.overflowX}px`));
