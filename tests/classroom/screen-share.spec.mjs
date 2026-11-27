// Screen sharing shows in the content panel (where slides and PDFs appear),
// sent browser to browser, while the video column stays as it is. Two pages
// play teacher and learner; the test relays classroom events between them
// the way the server does: stamped with the sender, and targeted events
// delivered only to their recipient.
import { test, expect } from "@playwright/test";
import { buildClassroomHarness } from "./support/buildClassroomHarness.mjs";

const harness = buildClassroomHarness();
const PEOPLE = {
  teacher: { userId: 20, role: "teacher" },
  learner: { userId: 10, role: "learner" },
};

test.skip(({ isMobile }) => isMobile, "Screen sharing starts from desktop browsers");

async function openPage(context, name, peers) {
  const page = await context.newPage();
  const person = PEOPLE[name];
  const entry = { name, page, ...person, mounted: false, queue: [], errors: [] };
  // Like the server, deliver to a page that is still starting once it is up.
  entry.deliver = async (message) => {
    if (!entry.mounted) {
      entry.queue.push(message);
      return;
    }
    await page.evaluate((event) => window.receive(event), message);
  };
  peers[name] = entry;
  page.on("pageerror", (error) => entry.errors.push(error.message));
  await page.exposeFunction("relayClassroomEvent", async (event) => {
    for (const other of Object.values(peers)) {
      if (other === entry) continue;
      if (event.to != null && String(event.to) !== String(other.userId)) continue;
      await other.deliver({ ...event, _from: { userId: entry.userId, role: entry.role } });
    }
  });
  await page.addInitScript((userId) => {
    window.testUserId = userId;
    window.onClassroomSend = (message) => window.relayClassroomEvent(message);
  }, person.userId);
  await page.route("http://classroom.test/**", (route) => route.fulfill({
    contentType: "text/html",
    body: '<!doctype html><html class="classroom-active"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body class="classroom-active"><div id="root"></div></body></html>',
  }));
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`http://classroom.test/?role=${name}`);
  await page.addStyleTag({ content: harness.css });
  await page.addScriptTag({ content: harness.script });
  entry.mounted = true;
  for (const message of entry.queue.splice(0)) await entry.deliver(message);
  await expect(page.locator("iframe")).toBeVisible();
  await page.evaluate(() => window.calls.at(-1).emit("videoConferenceJoined", { id: "local" }));
  return entry;
}

async function startSharing(page) {
  await page.getByRole("button", { name: "Share your screen" }).first().click();
  await page.getByRole("button", { name: "Choose what to share" }).click();
}

const videoWidth = (page) => page.locator(".cr-panel--left").evaluate((node) => node.getBoundingClientRect().width);
const sharedFrameWidth = (page) => page.locator(".cr-screen-stage__video").evaluate((video) => video.videoWidth);

test("the teacher's screen shows in the learner's content panel and the video column stays", async ({ browser }) => {
  const context = await browser.newContext();
  const peers = {};
  const teacher = await openPage(context, "teacher", peers);
  const learner = await openPage(context, "learner", peers);
  const learnerVideoBefore = await videoWidth(learner.page);
  const teacherVideoBefore = await videoWidth(teacher.page);

  await startSharing(teacher.page);

  // The presenter sees their own screen where the lesson material was.
  const teacherStage = teacher.page.locator(".cr-panel--right .cr-screen-stage");
  await expect(teacherStage).toContainText("You're sharing your screen");
  await expect(teacher.page.locator(".cr-resource-workspace")).toBeHidden();

  // The learner receives it in the same place.
  const learnerStage = learner.page.locator(".cr-panel--right .cr-screen-stage");
  await expect(learnerStage).toContainText("is sharing their screen");
  await expect.poll(() => sharedFrameWidth(learner.page), { timeout: 15000 }).toBe(640);
  await expect(learner.page.locator(".cr-resource-workspace")).toBeHidden();
  await expect(teacherStage).toContainText("1 person is watching");

  // The video column is untouched on both sides.
  expect(Math.abs((await videoWidth(learner.page)) - learnerVideoBefore)).toBeLessThan(2);
  expect(Math.abs((await videoWidth(teacher.page)) - teacherVideoBefore)).toBeLessThan(2);
  await expect(learner.page.locator(".cr-panel--left iframe")).toBeVisible();

  // Stopping brings the lesson material back for everyone.
  await teacherStage.getByRole("button", { name: "Stop sharing" }).click();
  await expect(teacher.page.locator(".cr-screen-stage")).toHaveCount(0);
  await expect(learner.page.locator(".cr-screen-stage")).toHaveCount(0);
  await expect(learner.page.locator(".cr-resource-workspace")).toBeVisible();
  await expect(learner.page.locator("[data-resource][data-active='true']")).toHaveCount(1);

  expect([...teacher.errors, ...learner.errors]).toEqual([]);
  await context.close();
});

test("a learner who joins after the share started sees it", async ({ browser }) => {
  const context = await browser.newContext();
  const peers = {};
  const teacher = await openPage(context, "teacher", peers);
  await startSharing(teacher.page);
  await expect(teacher.page.locator(".cr-screen-stage")).toContainText("Waiting for others to connect");

  const learner = await openPage(context, "learner", peers);
  await expect.poll(() => sharedFrameWidth(learner.page), { timeout: 15000 }).toBe(640);
  await expect(teacher.page.locator(".cr-screen-stage")).toContainText("1 person is watching");
  await context.close();
});

test("stopping from the browser's own sharing bar ends the share", async ({ browser }) => {
  const context = await browser.newContext();
  const peers = {};
  const teacher = await openPage(context, "teacher", peers);
  const learner = await openPage(context, "learner", peers);
  await startSharing(teacher.page);
  await expect.poll(() => sharedFrameWidth(learner.page), { timeout: 15000 }).toBe(640);

  await teacher.page.evaluate(() => {
    const [track] = window.classroomTestMedia.displayStream.getVideoTracks();
    track.stop();
    track.dispatchEvent(new Event("ended"));
  });
  await expect(teacher.page.locator(".cr-screen-stage")).toHaveCount(0);
  await expect(learner.page.locator(".cr-screen-stage")).toHaveCount(0);
  await context.close();
});

test("the teacher can stop a learner's share", async ({ browser }) => {
  const context = await browser.newContext();
  const peers = {};
  const teacher = await openPage(context, "teacher", peers);
  const learner = await openPage(context, "learner", peers);

  await startSharing(learner.page);
  await expect.poll(() => sharedFrameWidth(teacher.page), { timeout: 15000 }).toBe(640);
  await teacher.page.getByRole("button", { name: "Stop their share" }).click();
  await expect(learner.page.locator(".cr-screen-stage")).toHaveCount(0);
  await expect(teacher.page.locator(".cr-screen-stage")).toHaveCount(0);
  await context.close();
});

test("closing the browser's picker leaves the classroom as it was", async ({ browser }) => {
  const context = await browser.newContext();
  const peers = {};
  const teacher = await openPage(context, "teacher", peers);
  await teacher.page.evaluate(() => { window.classroomTestMedia.displayDenied = true; });
  await startSharing(teacher.page);
  await teacher.page.waitForTimeout(300);
  await expect(teacher.page.locator(".cr-screen-stage")).toHaveCount(0);
  await expect(teacher.page.locator(".cr-moderation-notice")).toHaveCount(0);
  await expect(teacher.page.locator(".cr-resource-workspace")).toBeVisible();
  await context.close();
});

test("a share announcement that the server did not stamp is ignored", async ({ browser }) => {
  const context = await browser.newContext();
  const peers = {};
  const learner = await openPage(context, "learner", peers);
  await learner.page.evaluate(() => window.receive({ type: "SCREEN_RTC_START", shareId: "x", peer: "p", name: "Fake" }));
  await learner.page.waitForTimeout(200);
  await expect(learner.page.locator(".cr-screen-stage")).toHaveCount(0);
  await context.close();
});
