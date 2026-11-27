// Profile photos fall back to initials when the image can't load, even when
// it fails before the page has finished starting up.
import { test, expect } from "@playwright/test";
import { buildFeedbackHarness } from "./support/buildFeedbackHarness.mjs";

const harness = buildFeedbackHarness({ entry: "tests/feedback/support/avatarEntry.jsx" });
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", "base64");

async function mount(page, src) {
  await page.route("http://feedback.test/**", (route) => {
    const url = route.request().url();
    if (url.endsWith("/missing.png")) return route.fulfill({ status: 404, contentType: "application/json", body: '{"error":"Not found"}' });
    if (url.endsWith("/photo.png")) return route.fulfill({ contentType: "image/png", body: PNG });
    return route.fulfill({ contentType: "text/html", body: '<!doctype html><html><body><div id="root"></div></body></html>' });
  });
  await page.addInitScript((src) => {
    window.feedbackTest = { role: "learner", props: { src }, posts: [], toasts: [], navigations: [], session: {} };
  }, src);
  await page.goto("http://feedback.test/");
  await page.addScriptTag({ content: harness.script });
  // Let the image finish (or fail) before React starts listening.
  await page.waitForFunction(() => document.querySelector(".test-avatar img")?.complete);
  await page.evaluate(() => window.feedbackTest.hydrate());
}

test("a photo that failed before React started shows the initials", async ({ page }) => {
  await mount(page, "http://feedback.test/missing.png");
  await expect(page.locator(".test-avatar")).toHaveText("BH");
  await expect(page.locator(".test-avatar img")).toHaveCount(0);
});

test("a photo that loads stays a photo", async ({ page }) => {
  await mount(page, "http://feedback.test/photo.png");
  await page.waitForTimeout(300);
  await expect(page.locator(".test-avatar img")).toHaveCount(1);
});
