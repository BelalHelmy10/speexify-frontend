import { test, expect } from "@playwright/test";
import { buildClassroomHarness } from "./support/buildClassroomHarness.mjs";

const harness = buildClassroomHarness();

async function mountClassroom(page, {
  role = "teacher",
  media = "granted",
  network = "online",
} = {}) {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("http://classroom.test/**", (route) => route.fulfill({
    status: 200,
    contentType: "text/html",
    body: '<!doctype html><html class="classroom-active"><head><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body class="classroom-active"><div id="root"></div></body></html>',
  }));
  await page.goto(`http://classroom.test/?role=${role}&media=${media}&network=${network}`);
  await page.addStyleTag({ content: harness.css });
  await page.addScriptTag({ content: harness.script });
  await expect(page.locator("iframe")).toBeVisible();
  await expect(page.locator(".cr-prejoin")).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => window.calls.length)).toBe(1);
  return errors;
}

async function joinClassroom(page) {
  await page.evaluate(() => window.calls.at(-1).emit("videoConferenceJoined"));
  await expect(page.locator(".cr-video__loading")).toHaveCount(0);
  await expect(page.locator(".cr-header__pill-signal")).toHaveAttribute(
    "aria-label",
    /video call: connected/
  );
}

async function classroomGeometry(page) {
  return page.evaluate(() => {
    const frame = document.querySelector("iframe")?.getBoundingClientRect();
    return {
      viewport: { width: innerWidth, height: innerHeight },
      scrollWidth: document.documentElement.scrollWidth,
      frame: frame ? { width: frame.width, height: frame.height } : null,
      callCount: window.calls.length,
      originalFramePreserved: document.querySelector("iframe") === window.originalClassroomFrame,
    };
  });
}

for (const role of ["teacher", "learner"]) {
  test(`${role} classroom preserves the call through portrait and landscape`, async ({ page }) => {
    const errors = await mountClassroom(page, { role });
    await joinClassroom(page);
    await page.evaluate(() => {
      window.originalClassroomFrame = document.querySelector("iframe");
      window.originalClassroomFrame.contentWindow.connectionMarker = "connected";
    });

    const initial = page.viewportSize();
    const orientations = [
      initial,
      { width: initial.height, height: initial.width },
      initial,
    ];

    for (const viewport of orientations) {
      await page.setViewportSize(viewport);
      await page.waitForTimeout(250);
      const geometry = await classroomGeometry(page);
      expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.viewport.width + 1);
      expect(geometry.frame?.width).toBeGreaterThan(40);
      expect(geometry.frame?.height).toBeGreaterThan(40);
      expect(geometry.callCount).toBe(1);
      expect(geometry.originalFramePreserved).toBe(true);
      await expect.poll(() => page.evaluate(
        () => document.querySelector("iframe")?.contentWindow.connectionMarker
      )).toBe("connected");
    }

    expect(errors).toEqual([]);
  });
}

test("permission denial fails soft and mid-call revocation keeps the classroom usable", async ({ page }) => {
  const errors = await mountClassroom(page, { media: "denied" });
  await joinClassroom(page);
  const initialOptions = await page.evaluate(() => ({
    audio: window.calls.at(-1).options.configOverwrite.startWithAudioMuted,
    video: window.calls.at(-1).options.configOverwrite.startWithVideoMuted,
  }));
  expect(initialOptions).toEqual({ audio: true, video: false });

  await page.evaluate(() => window.calls.at(-1).emit("cameraError", { name: "NotAllowedError" }));
  await expect(page.locator(".cr-video__device-notice")).toContainText("Camera unavailable");
  await expect(page.locator("iframe")).toBeVisible();
  await page.evaluate(() => window.calls.at(-1).emit("videoMuteStatusChanged", { muted: false }));
  await expect(page.locator(".cr-video__device-notice")).toHaveCount(0);

  await page.evaluate(() => window.calls.at(-1).emit("micError", { name: "NotAllowedError" }));
  await expect(page.locator(".cr-video__device-notice")).toContainText("Microphone unavailable");
  await expect(page.locator(".cr-video__error")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("Bluetooth and camera hot-plug do not restart the live classroom", async ({ page }) => {
  const errors = await mountClassroom(page);
  await joinClassroom(page);
  await page.evaluate(() => { window.originalClassroomFrame = document.querySelector("iframe"); });

  await page.evaluate(() => window.classroomTestMedia.connectBluetooth());
  await page.evaluate(() => window.classroomTestMedia.disconnectBluetooth());
  await page.evaluate(() => window.classroomTestMedia.disconnectBuiltInCamera());
  expect(await page.evaluate(() => window.calls.length)).toBe(1);
  expect(await page.evaluate(
    () => document.querySelector("iframe") === window.originalClassroomFrame
  )).toBe(true);
  await expect(page.locator("iframe")).toBeVisible();
  expect(errors).toEqual([]);
});

test("network loss, restoration, and backgrounding preserve the live iframe", async ({ page, context }) => {
  const errors = await mountClassroom(page, { network: "offline" });
  await joinClassroom(page);
  await page.evaluate(() => { window.originalClassroomFrame = document.querySelector("iframe"); });

  await page.evaluate(() => window.classroomTestLifecycle.setVisibility("hidden"));
  await page.waitForTimeout(100);
  await page.evaluate(() => window.classroomTestLifecycle.setVisibility("visible"));
  expect(await page.evaluate(
    () => document.querySelector("iframe") === window.originalClassroomFrame
  )).toBe(true);

  await context.setOffline(true);
  await expect.poll(() => page.evaluate(() => navigator.onLine)).toBe(false);
  await page.evaluate(() => window.calls.at(-1).emit("connectionInterrupted"));
  await expect(page.locator(".cr-header__pill-signal")).toHaveAttribute(
    "aria-label",
    /video call: reconnecting/
  );
  await expect(page.locator("iframe")).toBeVisible();

  await context.setOffline(false);
  await expect.poll(() => page.evaluate(() => navigator.onLine)).toBe(true);
  await page.evaluate(() => window.calls.at(-1).emit("connectionRestored"));
  await expect(page.locator(".cr-header__pill-signal")).toHaveAttribute(
    "aria-label",
    /video call: connected/
  );
  expect(await page.evaluate(() => window.calls.length)).toBe(1);
  expect(await page.evaluate(
    () => document.querySelector("iframe") === window.originalClassroomFrame
  )).toBe(true);
  expect(errors).toEqual([]);
});
