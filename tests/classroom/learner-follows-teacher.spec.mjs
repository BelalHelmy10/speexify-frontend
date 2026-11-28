// In a live lesson the teacher chooses the material, turns the pages and
// runs the audio; learners follow. A learner's clicks on those controls only
// changed the learner's own screen and left them out of step with the class,
// so they are locked for learners while the teacher's changes still arrive.
import { test, expect } from "@playwright/test";
import { buildClassroomHarness } from "./support/buildClassroomHarness.mjs";

const harness = buildClassroomHarness({ realPrep: true });

test.skip(({ isMobile }) => isMobile, "Phone layouts are covered by the device layout tests");

const TEACHER = { userId: 20, role: "teacher" };

async function mount(page, role) {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1280, height: 800 });
  // Two resources open, A showing.
  await page.addInitScript(() => {
    window.testInitialClassroomState = { resourceId: "a", openResourceIds: ["a", "b"] };
    sessionStorage.setItem("classroom_tabs_tabs-test", JSON.stringify(["a", "b"]));
  });
  await page.route("http://classroom.test/**", (route) => route.fulfill({
    contentType: "text/html",
    body: '<!doctype html><html class="classroom-active"><head></head><body class="classroom-active"><div id="root"></div></body></html>',
  }));
  await page.goto(`http://classroom.test/?role=${role}`);
  await page.addStyleTag({ content: harness.css });
  await page.addScriptTag({ content: harness.script });
  await expect(page.locator("iframe")).toHaveCount(1);
  await page.evaluate(() => window.calls.at(-1).emit("videoConferenceJoined"));
  await expect(page.locator(".cr-resource-workspace__panel:not([hidden]) .prep-pdf-sidebar__page-button")).toHaveCount(2);
  return errors;
}

const panel = (page) => page.locator(".cr-resource-workspace__panel:not([hidden])");
const activePage = (page) => panel(page).locator(".prep-pdf-sidebar__page-button.is-active");
const selectedTab = (page) => page.locator('.cr-resource-tabs [role="tab"][aria-selected="true"]');

test("a learner follows the teacher's material, page and audio", async ({ page }) => {
  const errors = await mount(page, "learner");
  await expect(selectedTab(page)).toHaveText(/Resource A/);

  // Switching material is locked and changes nothing.
  const otherTab = page.locator('.cr-resource-tabs [role="tab"]', { hasText: "Resource B" });
  await expect(otherTab).toHaveAttribute("aria-disabled", "true");
  await otherTab.click({ force: true });
  await expect(selectedTab(page)).toHaveText(/Resource A/);

  // Turning pages is locked.
  await expect(activePage(page)).toHaveText("1");
  const pageTwo = panel(page).locator(".prep-pdf-sidebar__page-button", { hasText: "2" });
  await expect(pageTwo).toBeDisabled();
  await pageTwo.click({ force: true });
  await expect(activePage(page)).toHaveText("1");
  await expect(panel(page).locator(".cpv-nav__center .cpv-nav__btn").last()).toBeDisabled();

  // Audio is the teacher's to start, stop and restart.
  await expect(panel(page).locator(".prep-audio-player__play")).toBeDisabled();
  await expect(panel(page).locator(".prep-audio-player__restart")).toBeDisabled();

  // The teacher's page and material still reach the learner.
  await page.evaluate((from) => window.receive({ type: "PDF_SET_PAGE", resourceId: "a", page: 2, _from: from }), TEACHER);
  await expect(activePage(page)).toHaveText("2");
  await page.evaluate((from) => window.receive({ type: "SET_RESOURCE", resourceId: "b", openResourceIds: ["a", "b"], _from: from }), TEACHER);
  await expect(selectedTab(page)).toHaveText(/Resource B/);

  // Nothing about the lesson was sent by the learner.
  const sent = await page.evaluate(() => window.testState.messages.map((message) => message.type));
  expect(sent.filter((type) => /SET_RESOURCE|PDF_SET_PAGE|AUDIO_/.test(type))).toEqual([]);
  expect(errors).toEqual([]);
});

test("the teacher still turns pages, switches material and runs audio", async ({ page }) => {
  const errors = await mount(page, "teacher");
  const pageTwo = panel(page).locator(".prep-pdf-sidebar__page-button", { hasText: "2" });
  await expect(pageTwo).toBeEnabled();
  await pageTwo.click();
  await expect(activePage(page)).toHaveText("2");
  await expect.poll(() => page.evaluate(() => window.testState.messages.some((message) => message.type === "PDF_SET_PAGE" && message.page === 2))).toBe(true);

  await expect(panel(page).locator(".prep-audio-player__play")).toBeEnabled();

  await page.locator('.cr-resource-tabs [role="tab"]', { hasText: "Resource B" }).click();
  await expect(selectedTab(page)).toHaveText(/Resource B/);
  await expect.poll(() => page.evaluate(() => window.testState.messages.some((message) => message.type === "SET_RESOURCE" && message.resourceId === "b"))).toBe(true);
  expect(errors).toEqual([]);
});
