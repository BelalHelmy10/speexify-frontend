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

// Leftover tiles: a reload or dropped connection leaves the old connection
// in the call for about a minute, so the person showed twice.
const plainHarness = buildClassroomHarness();

async function mountTeacherCall(page, { lastTile = "" } = {}) {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("http://classroom.test/**", (route) => route.fulfill({
    contentType: "text/html",
    body: '<!doctype html><html class="classroom-active"><head></head><body class="classroom-active"><div id="root"></div></body></html>',
  }));
  await page.addInitScript((tile) => {
    if (tile) localStorage.setItem("speexify_classroom_video_tile_tabs-test", tile);
  }, lastTile);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("http://classroom.test/?role=teacher");
  await page.addStyleTag({ content: plainHarness.css });
  await page.addScriptTag({ content: plainHarness.script });
  await expect(page.locator("iframe")).toHaveCount(1);
  await page.evaluate(() => {
    const call = window.calls.at(-1);
    window.commands = [];
    window.fakeParticipants = [];
    call.executeCommand = (...args) => window.commands.push(args);
    call.getParticipantsInfo = () => window.fakeParticipants;
    window.setParticipants = (list) => {
      window.fakeParticipants = list;
      call.emit("participantJoined", list.at(-1) || {});
    };
  });
  return errors;
}

const kicked = (page) => page.evaluate(() => window.commands.filter((c) => c[0] === "kickParticipant").map((c) => c[1]));
const learner = { userId: 10, role: "learner" };

test("the teacher removes a rejoining learner's leftover tile at once", async ({ page }) => {
  const errors = await mountTeacherCall(page);
  await page.evaluate(() => window.calls.at(-1).emit("videoConferenceJoined", { id: "teacher-tile" }));

  // Known tile of the same learner, then the learner comes back on a new one.
  await page.evaluate((from) => {
    window.setParticipants([{ participantId: "old-tile", displayName: "Belal Helmy" }]);
    window.receive({ type: "VIDEO_PARTICIPANT", participantId: "old-tile", userId: 10, _from: from });
    window.setParticipants([
      { participantId: "old-tile", displayName: "Belal Helmy" },
      { participantId: "new-tile", displayName: "Belal Helmy" },
    ]);
    window.receive({ type: "VIDEO_PARTICIPANT", participantId: "new-tile", userId: 10, _from: from });
  }, learner);
  await expect.poll(() => kicked(page)).toEqual(["old-tile"]);
  expect(errors).toEqual([]);
});

test("a tile the teacher never saw is removed only for the same person, even if it arrives late", async ({ page }) => {
  await mountTeacherCall(page);
  await page.evaluate(() => window.calls.at(-1).emit("videoConferenceJoined", { id: "teacher-tile" }));

  // Another learner's tile is known; a claim on it is ignored.
  await page.evaluate(() => {
    window.setParticipants([{ participantId: "sara-tile", displayName: "Sara" }]);
    window.receive({ type: "VIDEO_PARTICIPANT", participantId: "sara-tile", userId: 11, _from: { userId: 11, role: "learner" } });
  });
  // The announcement arrives before the teacher's call shows the new tile.
  await page.evaluate((from) => {
    window.receive({ type: "VIDEO_PARTICIPANT", participantId: "new-tile", userId: 10, replaces: "ghost-tile", _from: from });
    window.receive({ type: "VIDEO_PARTICIPANT", participantId: "new-tile", userId: 10, replaces: "sara-tile", _from: from });
  }, learner);
  await page.evaluate(() => window.setParticipants([
    { participantId: "sara-tile", displayName: "Sara" },
    { participantId: "ghost-tile", displayName: "Belal Helmy" },
    { participantId: "new-tile", displayName: "Belal Helmy" },
  ]));
  await page.waitForTimeout(300);
  // The claim that arrived last wins for this learner and points at Sara: nothing removed.
  expect(await kicked(page)).toEqual([]);

  await page.evaluate((from) => {
    window.receive({ type: "VIDEO_PARTICIPANT", participantId: "new-tile", userId: 10, replaces: "ghost-tile", _from: from });
  }, learner);
  await expect.poll(() => kicked(page)).toEqual(["ghost-tile"]);
});

test("a rejoining teacher clears its own leftover tile", async ({ page }) => {
  await mountTeacherCall(page, { lastTile: "teacher-old" });
  await page.evaluate(() => {
    window.fakeParticipants = [{ participantId: "teacher-old", displayName: "Ahmed Yasser" }];
    window.calls.at(-1).emit("videoConferenceJoined", { id: "teacher-new" });
    window.setParticipants([{ participantId: "teacher-old", displayName: "Ahmed Yasser" }]);
  });
  await expect.poll(() => kicked(page)).toEqual(["teacher-old"]);
  expect(await page.evaluate(() => localStorage.getItem("speexify_classroom_video_tile_tabs-test"))).toBe("teacher-new");
});

test("a learner mentions its previous tile, and leaves the call when the page goes away", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("speexify_classroom_video_tile_tabs-test", "my-old-tile"));
  await mountAdmittedLearner(page);
  await expect.poll(() => page.evaluate(() => window.testState.messages.find((m) => m.type === "VIDEO_PARTICIPANT")?.replaces)).toBe("my-old-tile");
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent("pagehide", { persisted: false })));
  await expect.poll(() => commandNames(page)).toContain("hangup");
});
