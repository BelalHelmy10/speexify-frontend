// A10 responsive screenshots → qa-screenshots/<page>/<locale>/<viewport>.png
// Also records horizontal overflow per viewport. Read-only navigation.
import puppeteer from "puppeteer";
import fs from "node:fs";
import path from "node:path";

const BASE = "http://localhost:3000";
const OUT = process.env.SHOT_DIR;
const chrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const exe = fs.existsSync(chrome) ? chrome : undefined;

// EN public routes; AR derived. arSkip = routes with no AR page (404).
const routes = JSON.parse(fs.readFileSync(process.env.EN_ROUTES, "utf8"));
const arSkip = new Set(["/needsanalysis", "/member-stories"]);

const viewports = [
  { name: "360", width: 360, height: 780 },
  { name: "768", width: 768, height: 1024 },
  { name: "1024", width: 1024, height: 1366 },
  { name: "1440", width: 1440, height: 900 },
];

const slug = (r) => (r === "/" ? "home" : r.replace(/^\//, "").replace(/\//g, "-"));

const browser = await puppeteer.launch({
  headless: "new",
  executablePath: exe,
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});

const overflow = [];
async function shoot(route, locale) {
  const url = BASE + (locale === "ar" ? (route === "/" ? "/ar" : "/ar" + route) : route);
  const dir = path.join(OUT, slug(route), locale);
  fs.mkdirSync(dir, { recursive: true });
  const page = await browser.newPage();
  try {
    for (const v of viewports) {
      await page.setViewport({ width: v.width, height: v.height });
      if (v === viewports[0]) {
        await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
      } else {
        await page.setViewport({ width: v.width, height: v.height });
        await new Promise((r) => setTimeout(r, 400));
      }
      await new Promise((r) => setTimeout(r, 300));
      const ox = await page.evaluate(() => {
        const d = document.documentElement;
        return Math.max(d.scrollWidth, document.body?.scrollWidth || 0) - window.innerWidth;
      });
      if (ox > 0) overflow.push({ url, viewport: v.name, overflowPx: ox });
      await page.screenshot({ path: path.join(dir, `${v.name}.png`), fullPage: true });
    }
  } catch (e) {
    process.stderr.write(`ERR ${url}: ${e}\n`);
  }
  await page.close();
}

let count = 0;
for (const route of routes) {
  await shoot(route, "en");
  count++;
  if (!arSkip.has(route)) {
    await shoot(route, "ar");
    count++;
  }
  process.stderr.write(`done ${route} (${count})\n`);
}
await browser.close();
fs.writeFileSync(path.join(OUT, "_overflow.json"), JSON.stringify(overflow, null, 2));
console.log("SHOTS DONE. pages:", count, "overflow issues:", overflow.length);
