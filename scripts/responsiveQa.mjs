import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer";

const baseUrl =
  process.env.RESPONSIVE_QA_BASE_URL || process.env.BASE_URL || "http://localhost:3000";

const pages = (
  process.env.RESPONSIVE_QA_PATHS ||
  "/,/calendar,/dashboard,/resources,/settings,/profile"
)
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);

const viewports = [
  { name: "phone-compact", width: 360, height: 780, isMobile: true },
  { name: "phone", width: 390, height: 844, isMobile: true },
  { name: "phone-wide", width: 430, height: 932, isMobile: true },
  { name: "tablet", width: 768, height: 1024, isMobile: true },
  { name: "desktop", width: 1440, height: 1000, isMobile: false },
];

const outDir = path.join(process.cwd(), ".responsive-qa");
fs.mkdirSync(outDir, { recursive: true });

const localChromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const executablePath =
  process.env.PUPPETEER_EXECUTABLE_PATH ||
  (fs.existsSync(localChromePath) ? localChromePath : undefined);

const browser = await puppeteer.launch({
  headless: "new",
  executablePath,
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});

const failures = [];

async function settleClientNavigation(page, timeout = 2500) {
  await page
    .waitForNavigation({ waitUntil: "domcontentloaded", timeout })
    .catch(() => undefined);
  await new Promise((resolve) => setTimeout(resolve, 900));
}

async function collectResponsiveMetrics(page) {
  return page.evaluate(() => {
    const root = document.documentElement;
    const body = document.body;
    const scrollWidth = Math.max(root.scrollWidth, body?.scrollWidth || 0);
    const overflowX = scrollWidth - window.innerWidth;
    const fixedOffscreen = Array.from(document.querySelectorAll("*"))
      .filter((node) => getComputedStyle(node).position === "fixed")
      .map((node) => {
        const rect = node.getBoundingClientRect();
        return {
          selector:
            node.id ||
            node.className?.toString()?.split(/\s+/).slice(0, 3).join(".") ||
            node.tagName.toLowerCase(),
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          top: Math.round(rect.top),
          bottom: Math.round(rect.bottom),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        };
      })
      .filter(
        (rect) =>
          rect.width > 0 &&
          rect.height > 0 &&
          (rect.left < -4 ||
            rect.right > window.innerWidth + 4 ||
            rect.top < -4 ||
            rect.bottom > window.innerHeight + 24)
      );

    return {
      title: document.title,
      overflowX,
      scrollWidth,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      fixedOffscreen,
    };
  });
}

function recordMetrics(label, metrics) {
  if (metrics.overflowX > 4) {
    failures.push(`${label}: horizontal overflow ${metrics.overflowX}px`);
  }

  if (metrics.fixedOffscreen.length > 0) {
    failures.push(
      `${label}: fixed element outside viewport ${JSON.stringify(
        metrics.fixedOffscreen.slice(0, 3)
      )}`
    );
  }

  console.log(
    `${label}: ok (${metrics.viewportWidth}x${metrics.viewportHeight}, overflow ${metrics.overflowX}px)`
  );
}

try {
  for (const viewport of viewports) {
    const page = await browser.newPage();
    await page.setViewport({
      width: viewport.width,
      height: viewport.height,
      isMobile: viewport.isMobile,
      hasTouch: viewport.isMobile,
      deviceScaleFactor: viewport.isMobile ? 2 : 1,
    });

    for (const route of pages) {
      const url = new URL(route, baseUrl).toString();
      const label = `${viewport.name}-${route === "/" ? "home" : route.replace(/\W+/g, "-")}`;

      try {
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
        await settleClientNavigation(page);

        const metrics = await collectResponsiveMetrics(page);

        await page.screenshot({
          path: path.join(outDir, `${label}.png`),
          fullPage: false,
        });

        recordMetrics(label, metrics);
      } catch (error) {
        if (/Execution context|navigation|detached/i.test(error.message)) {
          try {
            await settleClientNavigation(page, 5000);
            const metrics = await collectResponsiveMetrics(page);
            await page.screenshot({
              path: path.join(outDir, `${label}.png`),
              fullPage: false,
            });
            recordMetrics(label, metrics);
            continue;
          } catch (retryError) {
            failures.push(`${label}: ${retryError.message}`);
            continue;
          }
        }
        failures.push(`${label}: ${error.message}`);
      }
    }

    await page.close();
  }
} finally {
  await browser.close();
}

if (failures.length > 0) {
  console.error("\nResponsive QA failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`\nResponsive QA passed. Screenshots saved in ${outDir}`);
