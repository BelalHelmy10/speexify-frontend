import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer";

const root = path.resolve(import.meta.dirname, "..");
const shouldStartServer = process.argv.includes("--start-server");
const port = process.env.PORT || "3100";
const baseUrl = (process.env.BASE_URL || `http://127.0.0.1:${port}`).replace(
  /\/$/,
  "",
);

const publicRoutes = [
  "/",
  "/individual-training",
  "/corporate-training",
  "/kids",
  "/packages",
  "/assessment",
  "/about",
  "/why-speexify",
  "/contact",
  "/blog",
  "/guides",
  "/help-center",
  "/member-stories",
  "/business-english-training-companies",
  "/corporate-english-training-egypt",
  "/english-presentation-coaching",
  "/english-speaking-coach-egypt",
  "/online-english-conversation-practice",
  "/careers",
  "/privacy",
  "/terms",
  "/refund-policy",
  "/login",
  "/register",
  "/forgot-password",
  "/ar",
  "/ar/individual-training",
  "/ar/corporate-training",
  "/ar/kids",
  "/ar/packages",
  "/ar/assessment",
  "/ar/about",
  "/ar/why-speexify",
  "/ar/contact",
  "/ar/blog",
  "/ar/guides",
  "/ar/help-center",
  "/ar/member-stories",
  "/ar/business-english-training-companies",
  "/ar/corporate-english-training-egypt",
  "/ar/english-presentation-coaching",
  "/ar/english-speaking-coach-egypt",
  "/ar/online-english-conversation-practice",
  "/ar/careers",
  "/ar/privacy",
  "/ar/terms",
  "/ar/refund-policy",
  "/ar/login",
  "/ar/register",
  "/ar/forgot-password",
];

const publicAssets = [
  "/audio/placement/balance-check.wav",
  "/audio/placement/bill-payment.wav",
  "/audio/placement/card-replacement.wav",
  "/security.txt",
  "/.well-known/security.txt",
];

const browserRoutes = [
  "/individual-training",
  "/ar/individual-training",
  "/assessment",
  "/ar/assessment",
  "/login",
  "/ar/login",
  "/register",
  "/ar/register",
  "/privacy",
  "/terms",
  "/careers",
];

let server;

function startServer() {
  if (!fs.existsSync(path.join(root, ".next", "BUILD_ID"))) {
    throw new Error("Production build not found. Run `npm run build` first.");
  }

  server = spawn("npm", ["run", "start", "--", "-p", port], {
    cwd: root,
    env: {
      ...process.env,
      PORT: port,
      NEXT_PUBLIC_GOOGLE_AUTH_ALLOW_LOCALHOST:
        process.env.NEXT_PUBLIC_GOOGLE_AUTH_ALLOW_LOCALHOST || "false",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  server.stdout.on("data", (chunk) => process.stdout.write(chunk));
  server.stderr.on("data", (chunk) => process.stderr.write(chunk));
}

async function waitForServer() {
  const deadline = Date.now() + 45_000;
  let lastError;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(baseUrl, { redirect: "manual" });
      if (response.status < 500) return;
      lastError = new Error(`Server returned ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`Timed out waiting for ${baseUrl}: ${lastError?.message}`);
}

async function checkRoute(route) {
  const response = await fetch(`${baseUrl}${route}`, { redirect: "manual" });
  const contentType = response.headers.get("content-type") || "";

  if (response.status !== 200) {
    throw new Error(`${route} returned ${response.status}`);
  }

  if (!contentType.includes("text/html")) {
    throw new Error(`${route} returned unexpected content-type ${contentType}`);
  }

  const html = await response.text();
  if (!html.includes("<html")) {
    throw new Error(`${route} did not return an HTML document`);
  }
}

async function checkAsset(asset) {
  const response = await fetch(`${baseUrl}${asset}`);
  const contentType = response.headers.get("content-type") || "";

  if (response.status !== 200) {
    throw new Error(`${asset} returned ${response.status}`);
  }

  if (asset.endsWith(".wav") && !contentType.includes("audio")) {
    throw new Error(`${asset} returned unexpected content-type ${contentType}`);
  }
}

function isExpectedAbortedPrefetch(request) {
  if (request.failure()?.errorText !== "net::ERR_ABORTED") return false;

  try {
    const url = new URL(request.url());
    return url.searchParams.has("_rsc");
  } catch {
    return false;
  }
}

async function checkBrowserRoutes() {
  const chrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  const executablePath = fs.existsSync(chrome) ? chrome : undefined;
  const browser = await puppeteer.launch({
    headless: "new",
    executablePath,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const failures = [];

  for (const route of browserRoutes) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    const consoleErrors = [];
    const pageErrors = [];
    const failedRequests = [];

    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => pageErrors.push(String(error)));
    page.on("requestfailed", (request) => {
      if (isExpectedAbortedPrefetch(request)) return;
      failedRequests.push(
        `${request.failure()?.errorText || "failed"} ${request.url()}`,
      );
    });
    page.on("response", (response) => {
      if (response.status() >= 400) {
        failedRequests.push(`${response.status()} ${response.url()}`);
      }
    });

    try {
      const response = await page.goto(`${baseUrl}${route}`, {
        waitUntil: "load",
        timeout: 30_000,
      });
      await new Promise((resolve) => setTimeout(resolve, 750));

      if (!response || response.status() !== 200) {
        failures.push(`${route}: browser status ${response?.status()}`);
      }
      if (consoleErrors.length) {
        failures.push(`${route}: console errors: ${consoleErrors.join(" | ")}`);
      }
      if (pageErrors.length) {
        failures.push(`${route}: page errors: ${pageErrors.join(" | ")}`);
      }
      if (failedRequests.length) {
        failures.push(`${route}: failed requests: ${failedRequests.join(" | ")}`);
      }
    } catch (error) {
      failures.push(`${route}: ${error.message}`);
    } finally {
      await page.close();
    }
  }

  await browser.close();

  if (failures.length) {
    throw new Error(`Browser route failures:\n${failures.join("\n")}`);
  }
}

async function main() {
  if (shouldStartServer) startServer();
  await waitForServer();

  const failures = [];

  for (const route of publicRoutes) {
    try {
      await checkRoute(route);
      process.stdout.write(`OK route ${route}\n`);
    } catch (error) {
      failures.push(error.message);
    }
  }

  for (const asset of publicAssets) {
    try {
      await checkAsset(asset);
      process.stdout.write(`OK asset ${asset}\n`);
    } catch (error) {
      failures.push(error.message);
    }
  }

  try {
    await checkBrowserRoutes();
    process.stdout.write("OK browser route checks\n");
  } catch (error) {
    failures.push(error.message);
  }

  if (failures.length) {
    throw new Error(`Public route health check failed:\n${failures.join("\n")}`);
  }

  process.stdout.write("Public route health check passed\n");
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => {
    if (server) server.kill("SIGTERM");
  });
