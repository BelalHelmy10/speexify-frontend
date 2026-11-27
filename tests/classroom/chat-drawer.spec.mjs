// Chat pops up over the lesson and slides back when closed. It must never
// resize the lesson: that re-fitted the PDF, and the teacher's new view was
// then sent to every learner.
import { test, expect } from "@playwright/test";
import { buildClassroomHarness } from "./support/buildClassroomHarness.mjs";

const harness = buildClassroomHarness({ realPrep: true });

test.skip(({ isMobile }) => isMobile, "Phones open chat as its own tab");

async function mount(page, role) {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.route("http://classroom.test/**", (route) => route.fulfill({
    contentType: "text/html",
    body: '<!doctype html><html class="classroom-active"><head></head><body class="classroom-active"><div id="root"></div></body></html>',
  }));
  await page.goto(`http://classroom.test/?role=${role}`);
  await page.addStyleTag({ content: harness.css });
  await page.addScriptTag({ content: harness.script });
  await expect(page.locator("iframe")).toHaveCount(1);
  await page.evaluate(() => window.calls.at(-1).emit("videoConferenceJoined"));
  await expect(page.locator(".prep-pdf-sidebar")).toHaveCount(1);
  return errors;
}

const lessonGeometry = (page) => page.evaluate(() => {
  const box = (selector) => {
    const rect = document.querySelector(selector)?.getBoundingClientRect();
    return rect && [rect.x, rect.y, rect.width, rect.height].map(Math.round).join(",");
  };
  return { viewer: box(".cr-content-viewer"), pdf: box(".prep-pdf-main-inner"), video: box(".cr-panel--left") };
});

for (const role of ["teacher", "learner"]) {
  test(`${role}: chat floats over the lesson without moving it`, async ({ page }) => {
    const errors = await mount(page, role);
    // Let the lesson settle first: the PDF's first fit and scroll are sent
    // once it loads (slower in WebKit), and must not count against chat.
    let quietSince = Date.now();
    let lastCount = -1;
    await expect.poll(async () => {
      const count = await page.evaluate(() => window.testState.messages.length);
      if (count !== lastCount) {
        lastCount = count;
        quietSince = Date.now();
      }
      return Date.now() - quietSince >= 2500;
    }, { timeout: 20_000, intervals: [200] }).toBe(true);
    const before = await lessonGeometry(page);
    const sentBefore = await page.evaluate(() => window.testState.messages.length);

    const chatButton = page.locator('[aria-controls="classroom-chat-drawer"]').first();
    const drawer = page.locator("#classroom-chat-drawer");
    await expect(drawer).toBeHidden();
    await chatButton.click();
    await expect(drawer).toHaveClass(/cr-chat-drawer--open/);
    await expect(drawer).toBeVisible();
    await expect.poll(() => page.evaluate(() =>
      document.getElementById("classroom-chat-drawer").contains(document.activeElement)
    )).toBe(true);

    // The lesson keeps its size and place, and nothing about the view is sent.
    await page.waitForTimeout(400);
    expect(await lessonGeometry(page)).toEqual(before);
    const sent = await page.evaluate((from) => window.testState.messages.slice(from).map((message) => message.type), sentBefore);
    expect(sent.filter((type) => /LAYOUT|PDF_|SCROLL|SET_RESOURCE|ZOOM/.test(type))).toEqual([]);

    // Escape inside the chat closes it and returns focus to the chat button.
    await page.keyboard.press("Escape");
    await expect(drawer).not.toHaveClass(/cr-chat-drawer--open/);
    await expect(drawer).toBeHidden();
    await expect(chatButton).toBeFocused();

    // The close button does the same.
    await chatButton.click();
    await expect(drawer).toBeVisible();
    await drawer.getByRole("button", { name: /close chat/i }).click();
    await expect(drawer).toBeHidden();
    expect(await lessonGeometry(page)).toEqual(before);
    expect(errors).toEqual([]);
  });
}

test("Escape in the lesson does not freeze the classroom", async ({ page }) => {
  await mount(page, "teacher");
  await page.waitForTimeout(500);
  await page.keyboard.press("Escape");
  await expect.poll(() => page.evaluate(() => document.querySelectorAll(".cr-panel--right").length), { timeout: 3000 }).toBe(1);
});

test("the teacher always answers a learner asking for the current PDF view", async ({ page }) => {
  await mount(page, "teacher");
  const scrollsSent = () => page.evaluate(() => window.testState.messages.filter((message) => message.type === "PDF_SCROLL").length);
  await expect.poll(scrollsSent, { timeout: 10_000 }).toBeGreaterThan(0);
  for (let request = 1; request <= 2; request += 1) {
    const before = await scrollsSent();
    await page.evaluate(() => window.receive({ type: "PDF_VIEW_REQUEST", resourceId: "a", _from: { userId: 10, role: "learner" } }));
    await expect.poll(scrollsSent).toBe(before + 1);
  }
});
