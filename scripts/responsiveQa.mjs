import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer";
import { publicRoutes } from "./publicRoutes.mjs";

const baseUrl = (
  process.env.RESPONSIVE_QA_BASE_URL ||
  process.env.BASE_URL ||
  "http://localhost:3000"
).replace(/\/$/, "");

const pages = process.env.RESPONSIVE_QA_PATHS
  ? process.env.RESPONSIVE_QA_PATHS.split(",")
      .map((item) => item.trim())
      .filter(Boolean)
  : publicRoutes;

const allViewports = [
  { name: "phone-xs", width: 320, height: 568, touch: true },
  { name: "phone-compact", width: 360, height: 780, touch: true },
  { name: "phone", width: 390, height: 844, touch: true },
  { name: "phone-wide", width: 430, height: 932, touch: true },
  { name: "phone-landscape", width: 844, height: 390, touch: true },
  { name: "tablet-portrait", width: 768, height: 1024, touch: true },
  { name: "tablet-landscape", width: 1024, height: 768, touch: true },
  { name: "laptop", width: 1280, height: 800, touch: false },
  { name: "desktop", width: 1440, height: 900, touch: false },
  { name: "full-hd", width: 1920, height: 1080, touch: false },
  { name: "qhd", width: 2560, height: 1440, touch: false },
];

const requestedViewportNames = new Set(
  (process.env.RESPONSIVE_QA_VIEWPORTS || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean),
);
const viewports = requestedViewportNames.size
  ? allViewports.filter((viewport) => requestedViewportNames.has(viewport.name))
  : allViewports;
if (!viewports.length) {
  throw new Error("RESPONSIVE_QA_VIEWPORTS did not match a known viewport name");
}

const screenshotMode = process.env.RESPONSIVE_QA_SCREENSHOTS || "failures";
if (!["all", "failures", "none"].includes(screenshotMode)) {
  throw new Error("RESPONSIVE_QA_SCREENSHOTS must be all, failures, or none");
}

const concurrency = Math.max(
  1,
  Math.min(8, Number(process.env.RESPONSIVE_QA_CONCURRENCY) || 4),
);
const settleMs = Math.max(
  0,
  Number(process.env.RESPONSIVE_QA_SETTLE_MS) || 2300,
);
const navigationTimeoutMs = Math.max(
  10_000,
  Number(process.env.RESPONSIVE_QA_NAVIGATION_TIMEOUT_MS) || 60_000,
);
const outDir = path.resolve(
  process.env.RESPONSIVE_QA_OUT_DIR || path.join(process.cwd(), ".responsive-qa"),
);
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

const jobs = pages.flatMap((route) =>
  viewports.map((viewport) => ({ route, viewport })),
);
const results = [];
let nextJob = 0;

function normalizePathname(value) {
  const pathname = new URL(value, baseUrl).pathname.replace(/\/+$/, "");
  return pathname || "/";
}

function safeLabel(route, viewport) {
  const routeLabel = route === "/" ? "home" : route.replace(/^\//, "").replace(/\W+/g, "-");
  return `${viewport.name}-${routeLabel}`;
}

async function collectResponsiveMetrics(page) {
  return page.evaluate(() => {
    const root = document.documentElement;
    const body = document.body;
    const scrollWidth = Math.max(root.scrollWidth, body?.scrollWidth || 0);
    const isVisible = (node) => {
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      return (
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        Number(style.opacity) > 0 &&
        rect.width > 0 &&
        rect.height > 0
      );
    };
    const selectorFor = (node) =>
      node.id ||
      node.className?.toString()?.trim()?.split(/\s+/).slice(0, 3).join(".") ||
      node.tagName.toLowerCase();
    const insideHorizontalScroller = (node) => {
      let parent = node.parentElement;
      while (parent && parent !== body) {
        const style = getComputedStyle(parent);
        if (
          /(auto|scroll)/.test(style.overflowX) &&
          parent.scrollWidth > parent.clientWidth + 4
        ) {
          return true;
        }
        parent = parent.parentElement;
      }
      return false;
    };
    const rectSummary = (node) => {
      const rect = node.getBoundingClientRect();
      return {
        selector: selectorFor(node),
        left: Math.round(rect.left),
        right: Math.round(rect.right),
        top: Math.round(rect.top),
        bottom: Math.round(rect.bottom),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      };
    };

    const fixedOffscreen = Array.from(document.querySelectorAll("*"))
      .filter((node) => getComputedStyle(node).position === "fixed" && isVisible(node))
      .map(rectSummary)
      .filter(
        (rect) =>
          rect.left < -4 ||
          rect.right > window.innerWidth + 4 ||
          rect.top < -4 ||
          rect.bottom > window.innerHeight + 24,
      );

    const offscreenControls = Array.from(
      document.querySelectorAll(
        'a[href], button, input:not([type="hidden"]), select, textarea, [role="button"], [role="link"], [role="tab"]',
      ),
    )
      .filter(isVisible)
      .filter((node) => !insideHorizontalScroller(node))
      .map(rectSummary)
      .filter(
        (rect) => rect.left < -2 || rect.right > window.innerWidth + 2,
      );

    const undersizedButtons = Array.from(
      document.querySelectorAll('button, [role="button"], [role="tab"]'),
    )
      .filter(isVisible)
      .filter((node) => !node.closest('[aria-hidden="true"]'))
      .map(rectSummary)
      .filter((rect) => rect.width < 24 || rect.height < 24);

    const brokenImages = Array.from(document.images)
      .filter((image) => image.complete && image.naturalWidth === 0 && isVisible(image))
      .map((image) => image.currentSrc || image.src || selectorFor(image));

    const trialCta = document.querySelector(".spx-trial-cta.is-visible");
    const overlayCollisions = [];
    if (trialCta && isVisible(trialCta)) {
      const overlay = trialCta.getBoundingClientRect();
      const meaningful = document.querySelectorAll(
        "main h1, main h2, main h3, main p, main a[href], main button, main input, main select, main textarea, main label",
      );
      for (const node of meaningful) {
        if (!isVisible(node) || trialCta.contains(node)) continue;
        const rect = node.getBoundingClientRect();
        const overlapWidth = Math.max(
          0,
          Math.min(overlay.right, rect.right) - Math.max(overlay.left, rect.left),
        );
        const overlapHeight = Math.max(
          0,
          Math.min(overlay.bottom, rect.bottom) - Math.max(overlay.top, rect.top),
        );
        if (overlapWidth * overlapHeight > 16) {
          overlayCollisions.push(selectorFor(node));
        }
      }
    }

    return {
      title: document.title,
      lang: root.lang,
      dir: root.dir,
      overflowX: scrollWidth - window.innerWidth,
      scrollWidth,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      fixedOffscreen,
      offscreenControls,
      undersizedButtons,
      brokenImages,
      overlayCollisions: [...new Set(overlayCollisions)],
    };
  });
}

function metricFailures(route, viewport, metrics) {
  const failures = [];
  const expectedArabic = route === "/ar" || route.startsWith("/ar/");
  if (metrics.overflowX > 4) {
    failures.push(`horizontal overflow ${metrics.overflowX}px`);
  }
  if (metrics.fixedOffscreen.length) {
    failures.push(`fixed elements outside viewport: ${JSON.stringify(metrics.fixedOffscreen.slice(0, 3))}`);
  }
  if (metrics.offscreenControls.length) {
    failures.push(`unreachable horizontal controls: ${JSON.stringify(metrics.offscreenControls.slice(0, 5))}`);
  }
  if (metrics.undersizedButtons.length) {
    failures.push(`controls below 24px target minimum: ${JSON.stringify(metrics.undersizedButtons.slice(0, 5))}`);
  }
  if (metrics.brokenImages.length) {
    failures.push(`broken images: ${JSON.stringify(metrics.brokenImages.slice(0, 5))}`);
  }
  if (metrics.overlayCollisions.length) {
    failures.push(`trial CTA overlaps content: ${metrics.overlayCollisions.slice(0, 5).join(", ")}`);
  }
  if (metrics.lang !== (expectedArabic ? "ar" : "en")) {
    failures.push(`document language is ${metrics.lang || "missing"}`);
  }
  if (metrics.dir !== (expectedArabic ? "rtl" : "ltr")) {
    failures.push(`document direction is ${metrics.dir || "missing"}`);
  }
  return failures.map((message) => `${viewport.name} ${route}: ${message}`);
}

async function configurePage(page) {
  const origin = new URL(baseUrl);
  const isLocal = origin.hostname === "localhost" || origin.hostname === "127.0.0.1";
  const shouldStubBackend =
    isLocal && process.env.RESPONSIVE_QA_STUB_BACKEND !== "false";

  if (shouldStubBackend) {
    await page.setRequestInterception(true);
    page.on("request", (request) => {
      const url = new URL(request.url());
      if (url.origin !== origin.origin) {
        request.continue();
        return;
      }
      if (url.pathname === "/api/auth/me") {
        request.respond({
          status: 401,
          contentType: "application/json",
          body: '{"error":"Unauthenticated QA session"}',
        });
        return;
      }
      if (
        url.pathname === "/api/pricing/catalog" ||
        url.pathname === "/api/health"
      ) {
        request.respond({
          status: 503,
          contentType: "application/json",
          body: '{"error":"Backend intentionally unavailable during responsive fallback QA"}',
        });
        return;
      }
      request.continue();
    });
  }

  const sessionCookie = process.env.RESPONSIVE_QA_AUTH_COOKIE;
  if (!sessionCookie) return;
  await page.setCookie({
    name: "speexify.sid",
    value: sessionCookie,
    domain: origin.hostname,
    path: "/",
    secure: origin.protocol === "https:",
    httpOnly: true,
  });
}

async function runJob(page, job) {
  const { route, viewport } = job;
  const label = safeLabel(route, viewport);
  const url = new URL(route, `${baseUrl}/`).toString();
  const failures = [];
  const pageErrors = [];
  const errorHandler = (error) => pageErrors.push(String(error));
  page.on("pageerror", errorHandler);

  try {
    // Changing mobile/touch emulation may reload the current page. Reset to a
    // blank document first so that reload cannot race the navigation under test.
    await page.goto("about:blank");
    await page.setViewport({
      width: viewport.width,
      height: viewport.height,
      isMobile: viewport.touch,
      hasTouch: viewport.touch,
      deviceScaleFactor: 1,
    });
    const response = await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: navigationTimeoutMs,
    });
    await page.evaluate(() => document.fonts?.ready).catch(() => undefined);
    await new Promise((resolve) => setTimeout(resolve, settleMs));

    if (!response || response.status() >= 400) {
      failures.push(`${viewport.name} ${route}: HTTP status ${response?.status() ?? "missing"}`);
    }
    const actualPath = normalizePathname(page.url());
    const expectedPath = normalizePathname(route);
    if (actualPath !== expectedPath) {
      failures.push(`${viewport.name} ${route}: redirected to ${actualPath}`);
    }
    const metrics = await collectResponsiveMetrics(page);
    failures.push(...metricFailures(route, viewport, metrics));
    failures.push(
      ...pageErrors.map((error) => `${viewport.name} ${route}: page error ${error}`),
    );

    if (
      screenshotMode === "all" ||
      (screenshotMode === "failures" && failures.length)
    ) {
      await page.screenshot({
        path: path.join(outDir, `${label}.png`),
        fullPage: false,
      });
    }

    return { route, viewport, metrics, failures };
  } catch (error) {
    failures.push(`${viewport.name} ${route}: ${error.message}`);
    return { route, viewport, metrics: null, failures };
  } finally {
    page.off("pageerror", errorHandler);
  }
}

async function worker() {
  const page = await browser.newPage();
  await configurePage(page);
  try {
    while (nextJob < jobs.length) {
      const index = nextJob;
      nextJob += 1;
      const job = jobs[index];
      const result = await runJob(page, job);
      results[index] = result;
      const status = result.failures.length ? `FAIL ${result.failures.length}` : "OK";
      process.stdout.write(
        `${status} ${job.viewport.name} ${job.route} (${index + 1}/${jobs.length})\n`,
      );
      if (result.failures.length) {
        process.stdout.write(`  ${result.failures[0]}\n`);
      }
    }
  } finally {
    await page.close();
  }
}

try {
  await Promise.all(
    Array.from({ length: Math.min(concurrency, jobs.length) }, () => worker()),
  );
} finally {
  await browser.close();
}

const failures = results.flatMap((result) => result?.failures || []);
const report = {
  generatedAt: new Date().toISOString(),
  baseUrl,
  routes: pages.length,
  viewports,
  states: jobs.length,
  passed: jobs.length - results.filter((result) => result?.failures.length).length,
  failed: results.filter((result) => result?.failures.length).length,
  failures,
  results,
};
fs.writeFileSync(
  path.join(outDir, "results.json"),
  `${JSON.stringify(report, null, 2)}\n`,
);

if (failures.length) {
  console.error(`\nResponsive QA failed with ${failures.length} finding(s):`);
  for (const failure of failures) console.error(`- ${failure}`);
  console.error(`Detailed results: ${path.join(outDir, "results.json")}`);
  process.exit(1);
}

console.log(
  `\nResponsive QA passed: ${pages.length} routes, ${viewports.length} viewports, ${jobs.length} states.`,
);
console.log(`Detailed results: ${path.join(outDir, "results.json")}`);
