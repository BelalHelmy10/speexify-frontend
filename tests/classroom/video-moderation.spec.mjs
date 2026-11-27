import { test, expect } from "@playwright/test";
import { buildClassroomHarness } from "./support/buildClassroomHarness.mjs";

const admissionHarness = buildClassroomHarness({ realLobby: true });
const teacher = { userId: 3, role: "teacher" };

async function mountAdmittedLearner(page) {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("http://classroom.test/**", (route) => route.fulfill({
    contentType: "text/html",
    body: '<!doctype html><html class="classroom-active"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body class="classroom-active"><div id="root"></div></body></html>',
  }));
  await page.goto("http://classroom.test/?role=learner");
  await page.evaluate(() => { window.testLobbyStatus = "admitted"; });
  await page.addStyleTag({ content: admissionHarness.css });
  await page.addScriptTag({ content: admissionHarness.script });
  await expect(page.locator(".cr-video-target iframe")).toBeVisible();
  await page.evaluate(() => {
    const call = window.calls.at(-1);
    window.commands = [];
    call.executeCommand = (...args) => window.commands.push(args);
    call.isAudioMuted = () => Promise.resolve(false);
    call.isVideoMuted = () => Promise.resolve(false);
    call.emit("videoConferenceJoined");
  });
  return errors;
}

// Translations are stubbed in the harness (t() returns the key).
const commandNames = (page) => page.evaluate(() => window.commands.map((c) => c[0]));

test("learner announces its video identity and obeys only stamped teacher mutes", async ({ page }) => {
  const errors = await mountAdmittedLearner(page);

  await expect.poll(() => page.evaluate(
    () => window.testState.messages.some((m) => m.type === "VIDEO_PARTICIPANT" && m.participantId === "local")
  )).toBe(true);

  // Forged (learner-stamped) and unstamped mutes are ignored.
  await page.evaluate(() => {
    window.receive({ type: "MODERATION_MUTE", media: "audio", targetUserId: "all", _from: { userId: 9, role: "learner" } });
    window.receive({ type: "MODERATION_MUTE", media: "audio", targetUserId: "all" });
  });
  await page.waitForTimeout(150);
  expect(await commandNames(page)).not.toContain("toggleAudio");

  await page.evaluate((from) => window.receive({ type: "MODERATION_MUTE", media: "audio", targetUserId: "all", _from: from }), teacher);
  await expect.poll(() => commandNames(page)).toContain("toggleAudio");
  await expect(page.locator(".cr-moderation-notice")).toContainText("Your teacher muted your microphone.");

  await page.evaluate((from) => window.receive({ type: "MODERATION_MUTE", media: "video", targetUserId: "test-user", _from: from }), teacher);
  await expect.poll(() => commandNames(page)).toContain("toggleVideo");
  await expect(page.locator(".cr-moderation-notice")).toContainText("Your teacher turned off your camera.");

  expect(errors).toEqual([]);
});

test("a removed learner leaves the call and lands on the removed screen", async ({ page }) => {
  const errors = await mountAdmittedLearner(page);

  // A removal aimed at someone else does nothing.
  await page.evaluate((from) => window.receive({ type: "MODERATION_REMOVE", targetUserId: 999, _from: from }), teacher);
  await page.waitForTimeout(150);
  await expect(page.locator(".cr-video-target iframe")).toBeVisible();

  await page.evaluate((from) => window.receive({ type: "MODERATION_REMOVE", targetUserId: "test-user", _from: from }), teacher);
  // The harness stubs the waiting-room screen, so assert the classroom and
  // its call are gone (the shell renders the waiting room instead).
  await expect(page.locator(".cr-shell")).toHaveCount(0);
  await expect(page.locator("iframe")).toHaveCount(0);
  expect(await commandNames(page)).toContain("hangup");
  expect(errors).toEqual([]);
});
