import { test, expect } from "@playwright/test";
import { buildClassroomHarness } from "./support/buildClassroomHarness.mjs";

const harness = buildClassroomHarness();

async function mount(page, role) {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("http://classroom.test/**", (route) => route.fulfill({
    contentType: "text/html",
    body: '<!doctype html><html class="classroom-active"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body class="classroom-active"><div id="root"></div></body></html>',
  }));
  await page.goto(`http://classroom.test/?role=${role}`);
  await page.addStyleTag({ content: harness.css });
  await page.addScriptTag({ content: harness.script });
  await expect(page.locator("iframe")).toBeVisible();
  await page.evaluate(() => {
    const call = window.calls.at(-1);
    window.commands = [];
    call.executeCommand = (...args) => window.commands.push(args);
    call.emit("videoConferenceJoined", { id: "local" });
    call.emit("participantJoined", { id: "t1", displayName: "Teacher Mona" });
  });
  return errors;
}

test("a learner sees the teacher's presentation full-width, named by Jitsi", async ({ page }) => {
  const errors = await mount(page, "learner");
  await expect(page.locator(".cr-main--screen-share")).toHaveCount(0);

  await page.evaluate(() => window.calls.at(-1).emit("contentSharingParticipantsChanged", { data: ["t1"] }));
  await expect(page.locator(".cr-main--screen-share")).toHaveCount(1);
  await expect(page.locator(".cr-screenshare-banner")).toContainText("Teacher Mona is presenting");
  await expect(page.locator(".cr-screenshare-banner--mine")).toHaveCount(0);
  await expect.poll(() => page.evaluate(() =>
    window.commands.some(([name, value]) => name === "setTileView" && value === false)
  )).toBe(true);

  await page.evaluate(() => window.calls.at(-1).emit("contentSharingParticipantsChanged", { data: [] }));
  await expect(page.locator(".cr-main--screen-share")).toHaveCount(0);
  await expect(page.locator(".cr-screenshare-banner")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("the presenter keeps the lesson visible and sees a calm banner", async ({ page }) => {
  const errors = await mount(page, "teacher");
  await page.evaluate(() => {
    const call = window.calls.at(-1);
    call.emit("screenSharingStatusChanged", { on: true, details: { sourceType: "window" } });
    call.emit("contentSharingParticipantsChanged", { data: ["local"] });
  });
  await expect(page.locator(".cr-screenshare-banner--mine")).toContainText("You're presenting");
  await expect(page.locator(".cr-main--screen-share")).toHaveCount(0);
  // The lesson workspace stays mounted and un-hidden for the presenter (on
  // portrait phones it lives behind the "content" tab, as always).
  await expect(page.locator(".cr-resource-workspace")).not.toHaveAttribute("hidden", /.*/);
  await expect(page.locator("[data-resource][data-active='true']")).toHaveCount(1);
  const bannerColor = await page.locator(".cr-screenshare-banner--mine").evaluate(
    (node) => getComputedStyle(node).backgroundColor
  );
  // Not the old red "recording" tint.
  expect(bannerColor).not.toMatch(/rgba?\(239, 68, 68/);
  expect(errors).toEqual([]);
});

test("a classroom message claiming a screen share no longer changes the layout", async ({ page }) => {
  const errors = await mount(page, "learner");
  await page.evaluate(() => window.receive({ type: "SCREEN_SHARE", on: true, sharerId: "x", sharerName: "Fake", _from: { userId: 9, role: "learner" } }));
  await page.waitForTimeout(200);
  await expect(page.locator(".cr-main--screen-share")).toHaveCount(0);
  await expect(page.locator(".cr-screenshare-banner")).toHaveCount(0);
  expect(errors).toEqual([]);
});
