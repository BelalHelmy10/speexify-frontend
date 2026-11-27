// Phone and tablet layouts of the live classroom: nothing off screen, the
// lesson keeps most of the height, and rotating never reloads the call.
import { test, expect } from "@playwright/test";
import path from "node:path";
import * as sass from "sass";
import { buildClassroomHarness } from "./support/buildClassroomHarness.mjs";

const harness = buildClassroomHarness({ realPrep: true });
// The site loads these global variables (safe areas, 100dvh) on every page.
const responsiveCss = sass.compile(
  path.resolve(import.meta.dirname, "../../styles/_responsive.scss"),
  { logger: sass.Logger.silent }
).css;

test.use({ isMobile: true, hasTouch: true });
test.skip(({ browserName }) => browserName === "firefox", "Firefox has no mobile emulation");

async function mount(page, { role, width, height }) {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width, height });
  await page.route("http://classroom.test/**", (route) => route.fulfill({
    contentType: "text/html",
    body: '<!doctype html><html class="classroom-active"><head><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body class="classroom-active"><div id="root"></div></body></html>',
  }));
  await page.goto(`http://classroom.test/?role=${role}`);
  await page.addStyleTag({ content: responsiveCss + harness.css });
  await page.addScriptTag({ content: harness.script });
  await expect(page.locator("iframe")).toHaveCount(1);
  await page.evaluate(() => window.calls.at(-1).emit("videoConferenceJoined"));
  await expect(page.locator(".prep-pdf-main-inner")).toHaveCount(1);
  // The test PDF reports its pages after a short delay; wait for the page list.
  await expect(page.locator(".prep-pdf-sidebar")).toHaveCount(1);
  return errors;
}

function offScreenButtons(page) {
  return page.evaluate(() => [...document.querySelectorAll("button")]
    .filter((button) => {
      const box = button.getBoundingClientRect();
      if (!box.width || !box.height || getComputedStyle(button).visibility === "hidden") return false;
      return box.left < -1 || box.top < -1 || box.right > innerWidth + 1 || box.bottom > innerHeight + 1;
    })
    .map((button) => button.getAttribute("aria-label") || button.textContent.trim()));
}

function box(page, selector) {
  return page.locator(selector).first().boundingBox();
}

async function expectResourceTabsClearOfPageControls(page) {
  const overlaps = await page.evaluate(() => {
    const tabs = document.querySelector(".cr-resource-tabs")?.getBoundingClientRect();
    if (!tabs) return 0;
    return [...document.querySelectorAll(".cr-resource-workspace .cpv-nav button, .cr-resource-workspace .cpv-nav__pages")]
      .map((element) => element.getBoundingClientRect())
      .filter((nav) => nav.width && nav.left < tabs.right && nav.right > tabs.left
        && nav.top < tabs.bottom && nav.bottom > tabs.top)
      .length;
  });
  expect(overlaps).toBe(0);
}

for (const role of ["teacher", "learner"]) {
  for (const [width, height] of [[852, 393], [667, 375], [740, 360]]) {
    test(`${role} phone landscape ${width}x${height} gives the lesson the height`, async ({ page }) => {
      const errors = await mount(page, { role, width, height });
      await expect(page.locator(".cr-shell--compact-landscape")).toHaveCount(1);
      // Header and controls live in the video column, not across the screen.
      await expect(page.locator(".cr-panel--left .cr-header--compact")).toBeVisible();
      await expect(page.locator(".cr-panel--left .cr-dock")).toBeVisible();
      await expect(page.locator("footer.cr-controls")).toHaveCount(0);
      for (const label of [/microphone/, /camera/, /chat/i, "More controls"]) {
        await expect(page.locator(".cr-dock").getByRole("button", { name: label })).toBeVisible();
      }

      const lesson = await box(page, ".prep-pdf-main-inner");
      expect(lesson.height).toBeGreaterThan(height * 0.75);
      expect(await offScreenButtons(page)).toEqual([]);
      await expectResourceTabsClearOfPageControls(page);

      await page.getByRole("button", { name: "More controls" }).click();
      const sheet = page.getByRole("dialog", { name: "More classroom controls" });
      await expect(sheet).toBeVisible();
      await expect(sheet.locator(".cr-focus-btn")).toHaveCount(3);
      expect(await offScreenButtons(page)).toEqual([]);
      await sheet.getByRole("button", { name: "Close more controls" }).click();
      await expect(sheet).toHaveCount(0);

      await page.locator(".cr-dock").getByRole("button", { name: /open chat/i }).click();
      const drawer = await box(page, ".cr-chat-drawer--open");
      expect(drawer.height).toBeGreaterThan(height * 0.7);
      await expect(page.locator(".cr-chat-drawer__header")).toBeVisible();
      expect(errors).toEqual([]);
    });
  }

  test(`${role} phone portrait keeps every control on screen`, async ({ page }) => {
    const errors = await mount(page, { role, width: 393, height: 852 });
    await expect(page.locator(".cr-mobile-tabs")).toBeVisible();
    expect((await box(page, ".cr-panel--left")).width).toBeLessThanOrEqual(393);
    expect(await offScreenButtons(page)).toEqual([]);

    await page.locator(".cr-mobile-tabs__tab", { hasText: "Content" }).click();
    expect(await offScreenButtons(page)).toEqual([]);
    await expectResourceTabsClearOfPageControls(page);
    const rail = await box(page, ".prep-pdf-sidebar");
    const lesson = await box(page, ".prep-pdf-main-inner");
    expect(rail.x).toBeGreaterThanOrEqual(lesson.x + lesson.width - 1);

    await page.locator(".cr-mobile-quick-actions").getByRole("button", { name: "More controls" }).click();
    await expect(page.getByRole("dialog", { name: "More classroom controls" })).toBeVisible();
    expect(await offScreenButtons(page)).toEqual([]);
    expect(errors).toEqual([]);
  });
}

for (const [width, height] of [[810, 1080], [744, 1133]]) {
  test(`tablet portrait ${width}x${height} stacks video above the lesson`, async ({ page }) => {
    const errors = await mount(page, { role: "teacher", width, height });
    await expect(page.locator(".cr-main--stacked")).toHaveCount(1);
    await expect(page.locator(".cr-mobile-tabs")).toHaveCount(0);
    await expect(page.locator("footer.cr-controls")).toBeVisible();
    const video = await box(page, ".cr-panel--left");
    const lesson = await box(page, ".prep-pdf-main-inner");
    const rail = await box(page, ".prep-pdf-sidebar");
    expect(video.width).toBeLessThanOrEqual(width);
    expect(video.y + video.height).toBeLessThanOrEqual(lesson.y + 1);
    expect(rail.x).toBeGreaterThanOrEqual(lesson.x + lesson.width - 1);
    expect(await offScreenButtons(page)).toEqual([]);
    expect(errors).toEqual([]);
  });
}

test("rotating a phone switches layouts without reloading the call", async ({ page }) => {
  const errors = await mount(page, { role: "learner", width: 393, height: 852 });
  await page.evaluate(() => { window.callFrame = document.querySelector("iframe"); });
  for (const [width, height, layout] of [
    [852, 393, ".cr-shell--compact-landscape"],
    [393, 852, ".cr-mobile-tabs"],
    [852, 393, ".cr-shell--compact-landscape"],
  ]) {
    await page.setViewportSize({ width, height });
    await expect(page.locator(layout)).toHaveCount(1);
    expect(await page.evaluate(() => ({
      calls: window.calls.length,
      sameFrame: document.querySelector("iframe") === window.callFrame,
      connected: window.callFrame.isConnected,
    }))).toEqual({ calls: 1, sameFrame: true, connected: true });
  }
  expect(errors).toEqual([]);
});
