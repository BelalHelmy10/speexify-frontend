import fs from "node:fs/promises";
import path from "node:path";

const username = process.env.BROWSERSTACK_USERNAME || "";
const accessKey = process.env.BROWSERSTACK_ACCESS_KEY || "";
const classroomUrl = process.env.CLASSROOM_SMOKE_URL || "";
const shouldJoin = process.env.CLASSROOM_REAL_DEVICE_JOIN !== "0";
const hubUrl = "https://hub-cloud.browserstack.com/wd/hub";
const automateApiUrl = "https://api.browserstack.com/automate/sessions";
const artifactsDirectory = path.resolve("test-results/classroom-real-devices");

const defaultDevices = [
  { name: "iphone-15-pro", browserName: "Safari", deviceName: "iPhone 15 Pro", osVersion: "17" },
  { name: "ipad-pro-13-2024", browserName: "Safari", deviceName: "iPad Pro 13 2024", osVersion: "17" },
  { name: "pixel-8", browserName: "Chrome", deviceName: "Google Pixel 8", osVersion: "14.0" },
  { name: "galaxy-tab-s9", browserName: "Chrome", deviceName: "Samsung Galaxy Tab S9", osVersion: "13.0" },
];

function required(name, value) {
  if (!value) throw new Error(`${name} is required for real-device classroom smoke tests`);
}

function readDevices() {
  if (!process.env.CLASSROOM_REAL_DEVICES_JSON) return defaultDevices;
  const parsed = JSON.parse(process.env.CLASSROOM_REAL_DEVICES_JSON);
  if (!Array.isArray(parsed) || !parsed.length) {
    throw new Error("CLASSROOM_REAL_DEVICES_JSON must be a non-empty array");
  }
  return parsed;
}

function safeTargetLabel(value) {
  try {
    const url = new URL(value);
    return `${url.origin}${url.pathname}`;
  } catch {
    return "configured classroom URL";
  }
}

async function webdriver(sessionId, method, commandPath, body) {
  const response = await fetch(`${hubUrl}${sessionId ? `/session/${sessionId}` : ""}${commandPath}`, {
    method,
    headers: {
      Authorization: `Basic ${Buffer.from(`${username}:${accessKey}`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.value?.error) {
    throw new Error(payload?.value?.message || `WebDriver ${method} ${commandPath} failed (${response.status})`);
  }
  return payload.value;
}

async function execute(sessionId, script, args = []) {
  return webdriver(sessionId, "POST", "/execute/sync", { script, args });
}

async function updateNetwork(sessionId, networkProfile) {
  const response = await fetch(`${automateApiUrl}/${sessionId}/update_network.json`, {
    method: "PUT",
    headers: {
      Authorization: `Basic ${Buffer.from(`${username}:${accessKey}`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ networkProfile }),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Could not switch ${sessionId} to ${networkProfile} (${response.status}) ${detail}`.trim());
  }
}

async function waitFor(sessionId, script, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  let lastError = null;
  while (Date.now() < deadline) {
    try {
      if (await execute(sessionId, script)) return;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw lastError || new Error(`Timed out after ${timeoutMs}ms`);
}

async function setSessionStatus(sessionId, status, reason) {
  const payload = JSON.stringify({ action: "setSessionStatus", arguments: { status, reason } });
  await execute(sessionId, `browserstack_executor: ${payload}`).catch(() => {});
}

async function addConfiguredCookies(sessionId) {
  if (!process.env.CLASSROOM_SMOKE_COOKIES_JSON) return;
  const cookies = JSON.parse(process.env.CLASSROOM_SMOKE_COOKIES_JSON);
  if (!Array.isArray(cookies)) throw new Error("CLASSROOM_SMOKE_COOKIES_JSON must be an array");
  const origin = new URL(classroomUrl).origin;
  await webdriver(sessionId, "POST", "/url", { url: origin });
  for (const cookie of cookies) {
    await webdriver(sessionId, "POST", "/cookie", { cookie });
  }
}

async function assertClassroomGeometry(sessionId, label) {
  const geometry = await execute(sessionId, `return (() => {
    const shell = document.querySelector('.cr-shell');
    const frame = document.querySelector('iframe');
    return {
      ready: Boolean(shell),
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      scrollWidth: document.documentElement.scrollWidth,
      shellWidth: shell ? shell.getBoundingClientRect().width : 0,
      frameWidth: frame ? frame.getBoundingClientRect().width : null,
      frameHeight: frame ? frame.getBoundingClientRect().height : null,
    };
  })();`);
  if (!geometry.ready) throw new Error(`${label}: classroom shell did not render`);
  if (geometry.scrollWidth > geometry.viewportWidth + 1) {
    throw new Error(`${label}: horizontal overflow ${geometry.scrollWidth}px > ${geometry.viewportWidth}px`);
  }
  if (geometry.shellWidth < 200) throw new Error(`${label}: classroom shell is not usable`);
  if (shouldJoin && (geometry.frameWidth < 40 || geometry.frameHeight < 40)) {
    throw new Error(`${label}: joined call frame is not visible`);
  }
}

async function runDevice(device) {
  let sessionId = null;
  let networkIsDisabled = false;
  try {
    const created = await webdriver(null, "POST", "/session", {
      capabilities: {
        alwaysMatch: {
          browserName: device.browserName,
          "bstack:options": {
            userName: username,
            accessKey,
            deviceName: device.deviceName,
            osVersion: device.osVersion,
            realMobile: "true",
            projectName: "Speexify Classroom",
            buildName: process.env.BROWSERSTACK_BUILD_NAME || `classroom-${new Date().toISOString().slice(0, 10)}`,
            sessionName: device.name,
            local: Boolean(process.env.BROWSERSTACK_LOCAL_IDENTIFIER),
            localIdentifier: process.env.BROWSERSTACK_LOCAL_IDENTIFIER || undefined,
            deviceOrientation: "portrait",
            networkProfile: "4g-lte-good",
            networkLogs: "true",
            video: "true",
            autoAcceptPermissions: true,
            autoAcceptAlerts: true,
          },
        },
      },
    });
    sessionId = created.sessionId || created.capabilities?.sessionId;
    if (!sessionId) throw new Error(`${device.name}: BrowserStack did not return a session id`);

    await addConfiguredCookies(sessionId);
    await webdriver(sessionId, "POST", "/url", { url: classroomUrl });
    await waitFor(sessionId, "return document.readyState === 'complete' && Boolean(document.querySelector('.cr-shell'));", 45_000);
    await assertClassroomGeometry(sessionId, `${device.name} portrait`);

    if (shouldJoin) {
      await waitFor(sessionId, "return Boolean(document.querySelector('iframe'));", 45_000);
      const hasRedundantPrejoin = await execute(sessionId, "return Boolean(document.querySelector('.cr-prejoin')); ");
      if (hasRedundantPrejoin) throw new Error(`${device.name}: redundant prejoin screen was rendered`);
      await assertClassroomGeometry(sessionId, `${device.name} joined portrait`);

      await execute(sessionId, "window.__classroomFrameBeforeBackground=document.querySelector('iframe');return true;");
      await webdriver(sessionId, "POST", "/appium/app/background", { seconds: 2 });
      await waitFor(sessionId, "return document.visibilityState === 'visible';", 15_000);
      const frameSurvivedBackgrounding = await execute(
        sessionId,
        "return document.querySelector('iframe') === window.__classroomFrameBeforeBackground;"
      );
      if (!frameSurvivedBackgrounding) {
        throw new Error(`${device.name}: backgrounding recreated or removed the live classroom frame`);
      }

      await updateNetwork(sessionId, "no-network");
      networkIsDisabled = true;
      await waitFor(sessionId, "return navigator.onLine === false;", 20_000);
      const frameSurvivedOffline = await execute(sessionId, "return Boolean(document.querySelector('iframe')); ");
      if (!frameSurvivedOffline) throw new Error(`${device.name}: network loss removed the classroom frame`);
      await updateNetwork(sessionId, "4g-lte-good");
      networkIsDisabled = false;
      await waitFor(sessionId, "return navigator.onLine === true;", 30_000);
      await assertClassroomGeometry(sessionId, `${device.name} network restored`);
    }

    await webdriver(sessionId, "POST", "/orientation", { orientation: "LANDSCAPE" });
    await new Promise((resolve) => setTimeout(resolve, 1_500));
    await assertClassroomGeometry(sessionId, `${device.name} landscape`);

    const screenshot = await webdriver(sessionId, "GET", "/screenshot");
    await fs.mkdir(artifactsDirectory, { recursive: true });
    await fs.writeFile(path.join(artifactsDirectory, `${device.name}.png`), Buffer.from(screenshot, "base64"));
    await setSessionStatus(sessionId, "passed", "Classroom rendered without overflow in portrait and landscape");
    process.stdout.write(`PASS ${device.name} (${device.deviceName}, ${device.browserName})\n`);
    return { device: device.name, passed: true };
  } catch (error) {
    if (sessionId) await setSessionStatus(sessionId, "failed", error.message.slice(0, 240));
    process.stderr.write(`FAIL ${device.name}: ${error.message}\n`);
    return { device: device.name, passed: false, error: error.message };
  } finally {
    if (sessionId && networkIsDisabled) {
      await updateNetwork(sessionId, "4g-lte-good").catch(() => {});
    }
    if (sessionId) await webdriver(sessionId, "DELETE", "", undefined).catch(() => {});
  }
}

required("BROWSERSTACK_USERNAME", username);
required("BROWSERSTACK_ACCESS_KEY", accessKey);
required("CLASSROOM_SMOKE_URL", classroomUrl);
const parsedUrl = new URL(classroomUrl);
if (parsedUrl.protocol !== "https:") throw new Error("CLASSROOM_SMOKE_URL must use HTTPS");

const devicesToTest = readDevices();
process.stdout.write(`Running ${devicesToTest.length} real-device checks against ${safeTargetLabel(classroomUrl)}\n`);
const results = await Promise.all(devicesToTest.map(runDevice));
const failures = results.filter((result) => !result.passed);
if (failures.length) {
  throw new Error(`${failures.length}/${results.length} real-device classroom checks failed`);
}
