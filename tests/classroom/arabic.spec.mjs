// The classroom in Arabic: the interface is translated, right to left, and
// nothing is pushed off screen. Lesson content (names, titles) stays as is.
import { test, expect } from "@playwright/test";
import { buildClassroomHarness } from "./support/buildClassroomHarness.mjs";

const harness = buildClassroomHarness();

// English interface words that must not show in the Arabic classroom.
const ENGLISH_UI = ["Leave", "Chat", "Raise hand", "Materials", "Controls", "More controls", "Reconnecting", "Participants"];

async function mount(page, role) {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("http://classroom.test/**", (route) => route.fulfill({
    contentType: "text/html",
    body: '<!doctype html><html class="classroom-active" lang="ar"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body class="classroom-active"><div lang="ar" dir="rtl"><div id="root"></div></div></body></html>',
  }));
  await page.goto(`http://classroom.test/?role=${role}&locale=ar`);
  await page.addStyleTag({ content: harness.css });
  await page.addScriptTag({ content: harness.script });
  await expect(page.locator("iframe")).toBeVisible();
  await page.evaluate(() => window.calls.at(-1).emit("videoConferenceJoined", { id: "local" }));
  return errors;
}

function visibleEnglish(page) {
  return page.evaluate((words) => {
    const texts = [...document.querySelectorAll("button, a, [aria-label], [title], span, strong, h1, h2, h3, p")]
      .filter((element) => element.getClientRects().length)
      .flatMap((element) => [
        element.children.length ? "" : element.textContent,
        element.getAttribute("aria-label") || "",
        element.getAttribute("title") || "",
      ])
      .map((text) => text.trim())
      .filter(Boolean);
    return words.filter((word) => texts.some((text) => text === word || text.startsWith(`${word} `)));
  }, ENGLISH_UI);
}

for (const role of ["learner", "teacher"]) {
  test(`the ${role} classroom is in Arabic`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    const errors = await mount(page, role);

    await expect(page.locator(".cr-header__back-label")).toHaveText("مغادرة");
    await expect(page.getByRole("button", { name: /المحادثة/ }).first()).toBeVisible();
    if (role === "teacher") {
      await expect(page.getByRole("button", { name: "اختر مادة" }).first()).toBeVisible();
    } else {
      await expect(page.locator(".cr-header__pill-signal")).toHaveAttribute("aria-label", /^الفصل: /);
    }
    expect(await visibleEnglish(page)).toEqual([]);

    const offScreen = await page.evaluate(() => [...document.querySelectorAll("button")]
      .filter((button) => {
        const box = button.getBoundingClientRect();
        if (!box.width || !box.height || getComputedStyle(button).visibility === "hidden") return false;
        return box.left < -1 || box.right > innerWidth + 1;
      })
      .map((button) => button.getAttribute("aria-label") || button.textContent.trim()));
    expect(offScreen).toEqual([]);
    expect(errors).toEqual([]);
  });
}

test("the Arabic leave dialog points learners at their lesson recap", async ({ page }) => {
  await mount(page, "learner");
  await page.locator(".cr-header__back").click();
  const dialog = page.getByRole("dialog", { name: "مغادرة الفصل؟" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("link", { name: "افتح ملخص حصتي" })).toHaveAttribute("href", /\/dashboard\/sessions\/tabs-test#lesson$/);
  await expect(dialog.getByRole("button", { name: "البقاء في الحصة" })).toBeVisible();
});

test("in Arabic the video sits on the right and the divider moves the way it is dragged", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await mount(page, "teacher");
  const video = page.locator(".cr-panel--left");
  const divider = page.getByRole("separator", { name: "تغيير حجم الأقسام" });
  const before = await video.boundingBox();
  expect(before.x + before.width).toBeGreaterThan(1200);

  // Dragging the divider left gives the video (on the right) more room.
  const handle = await divider.boundingBox();
  await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
  await page.mouse.down();
  await page.mouse.move(handle.x - 120, handle.y + handle.height / 2, { steps: 6 });
  await page.mouse.up();
  await expect.poll(async () => (await video.boundingBox()).width).toBeGreaterThan(before.width + 60);

  // The arrow keys follow the arrow: right shrinks the right-hand video.
  const afterDrag = (await video.boundingBox()).width;
  await divider.focus();
  await page.keyboard.press("ArrowRight");
  await expect.poll(async () => (await video.boundingBox()).width).toBeLessThan(afterDrag);
});
