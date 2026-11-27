// The session report: teachers add rows with a type on the left, mark words
// with *asterisks*, and learners see mistakes in red and corrections in green.
import { test, expect } from "@playwright/test";
import { buildFeedbackHarness } from "./support/buildFeedbackHarness.mjs";

const harness = buildFeedbackHarness();
const START = "[[SPEEXIFY_FEEDBACK_REPORT_V1]]";
const END = "[[/SPEEXIFY_FEEDBACK_REPORT_V1]]";

function savedFeedback(report) {
  return {
    messageToLearner: report.summary,
    commentsOnSession: `Structured session recap\n${START}\n${JSON.stringify({ version: 1, ...report })}\n${END}`,
  };
}

async function mount(page, { role = "teacher", teacherFeedback = {} } = {}) {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("http://feedback.test/**", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;font-family:system-ui"><div id="root"></div></body></html>',
    })
  );
  await page.addInitScript(
    ({ role, teacherFeedback }) => {
      window.feedbackTest = {
        role,
        pathname: "/dashboard/sessions/s1/feedback",
        posts: [],
        toasts: [],
        navigations: [],
        session: { _id: "s1", title: "Voicing your opinion", startAt: "2026-11-26T12:30:00Z", teacherFeedback },
      };
    },
    { role, teacherFeedback }
  );
  await load(page);
  return errors;
}

async function load(page) {
  await page.goto("http://feedback.test/");
  await page.addStyleTag({ content: harness.css });
  await page.addScriptTag({ content: harness.script });
  await expect(page.locator(".session-report-view")).toHaveCount(1);
}

const entry = (page, row) => page.getByRole("textbox", { name: new RegExp(`entry ${row}$`) }).first();
const field = (page, label, row) => page.getByRole("textbox", { name: `${label}, entry ${row}` });
const modifier = process.platform === "darwin" ? "Meta" : "Control";

test("a teacher fills the report row by row from the keyboard", async ({ page }) => {
  const errors = await mount(page);

  await field(page, "Word or phrase", 1).fill("viewpoint");
  await page.keyboard.press("Enter");
  await expect(field(page, "Meaning", 1)).toBeFocused();
  await page.keyboard.type("A particular way of thinking about a topic.");
  await page.keyboard.press("Enter");

  // Enter on the last box opens a new row of the same type, ready to type in.
  await expect(field(page, "Word or phrase", 2)).toBeFocused();
  await page.getByRole("combobox", { name: "Type for entry 2" }).selectOption("grammar");
  const mistake = field(page, "What the learner said", 2);
  await mistake.fill("I am agree with you.");
  await mistake.evaluate((element) => element.setSelectionRange(2, 10));
  await page.keyboard.press(`${modifier}+b`);
  await expect(mistake).toHaveValue("I *am agree* with you.");
  await page.keyboard.press("Enter");
  await page.keyboard.type("I *agree* with you.");

  const row2 = page.locator(".fb-grid__row").nth(1);
  await expect(row2.locator(".fb-mark--wrong")).toHaveText(/am agree/);
  await expect(row2.locator(".fb-mark--right")).toHaveText(/agree/);

  // A mistake row without asterisks still shows what changed.
  await page.keyboard.press("Enter");
  await field(page, "What the learner said", 3).fill("Let me to check the order.");
  await field(page, "Correction", 3).fill("Let me check the order.");
  const row3 = page.locator(".fb-grid__row").nth(2);
  await expect(row3.locator(".fb-mark--wrong")).toHaveText(/to/);
  await expect(row3).toContainText("Changes found for you");

  // A stray asterisk is pointed out before the learner sees it.
  await field(page, "Correction", 3).fill("Let me *check the order.");
  await expect(row3).toContainText("missing its partner");
  await field(page, "Correction", 3).fill("Let me check the order.");

  await page.getByRole("button", { name: "Add pronunciation for the new word" }).click();
  await expect(field(page, "Word", 4)).toHaveValue("viewpoint");

  await page.getByRole("button", { name: "Add explanation for entry 2" }).click();
  await page.keyboard.type("Agree is already a verb.");

  await page.getByRole("textbox", { name: "General comments" }).fill("Great session, Iñaki.");
  await expect(page.locator(".session-report-status")).toHaveText("Not published yet");
  await page.getByRole("button", { name: /Publish feedback/ }).click();
  await expect(page.locator(".session-report-status")).toHaveText("Published");

  const posted = await page.evaluate(() => window.feedbackTest.posts);
  expect(posted).toHaveLength(1);
  const payload = JSON.parse(posted[0].body.commentsOnSession.split(START)[1].split(END)[0]);
  expect(payload.items.map((item) => [item.type, item.prompt, item.response, item.note || ""])).toEqual([
    ["vocabulary", "viewpoint", "A particular way of thinking about a topic.", ""],
    ["grammar", "I *am agree* with you.", "I *agree* with you.", "Agree is already a verb."],
    ["grammar", "Let me to check the order.", "Let me check the order.", ""],
    ["pronunciation", "viewpoint", "", ""],
  ]);

  // The learner preview shows the same rows in red and green.
  await page.getByRole("button", { name: "Learner" }).click();
  const report = page.locator(".fb-report__row");
  await expect(report).toHaveCount(4);
  await expect(report.nth(1).locator(".fb-report__entry .fb-mark--wrong")).toHaveText(/am agree/);
  await expect(report.nth(1).locator(".fb-report__comment .fb-mark--right")).toHaveText(/agree/);
  await expect(report.nth(1)).toContainText("Agree is already a verb.");
  const colours = await report.nth(1).evaluate((row) => ({
    wrong: getComputedStyle(row.querySelector(".fb-mark--wrong")).color,
    right: getComputedStyle(row.querySelector(".fb-mark--right")).color,
  }));
  expect(colours.wrong).toMatch(/^rgb\((1[5-9]\d|2\d\d), \d{1,2}, \d{1,2}\)$/);
  expect(colours.right).toMatch(/^rgb\(\d{1,2}, (1[0-9]\d), \d{2,3}\)$/);
  expect(errors).toEqual([]);
});

test("a learner sees the published report with marks and no asterisks", async ({ page }) => {
  const errors = await mount(page, {
    role: "learner",
    teacherFeedback: savedFeedback({
      summary: "Thank you for today's session.",
      futureSteps: "",
      items: [
        { id: "a", type: "vocabulary", prompt: "convince", response: "To make someone believe something." },
        { id: "b", type: "grammar", prompt: "*According to me*, it is a good idea.", response: "*In my view*, it is a good idea." },
        { id: "c", type: "grammar", prompt: "هذه رحلة *ممتع*.", response: "هذه رحلة *ممتعة*." },
        { id: "d", type: "pronunciation", prompt: "convince", response: "https://howjsay.com/how-to-pronounce-convince" },
        { id: "e", type: "grammar", prompt: "I agree with you.", response: "I agree with you. | Agree is already a verb." },
      ],
    }),
  });

  await expect(page.locator(".fb-editor")).toHaveCount(0);
  const rows = page.locator(".fb-report__row");
  await expect(rows).toHaveCount(5);
  await expect(page.locator(".fb-report")).not.toContainText("*");
  await expect(rows.nth(1).locator(".fb-mark--wrong")).toHaveText(/According to me/);
  await expect(rows.nth(1).locator(".fb-mark--right")).toHaveText(/In my view/);
  await expect(rows.nth(2).locator(".fb-mark--right")).toHaveText(/ممتعة/);
  await expect(rows.nth(3).getByRole("link", { name: /Hear it spoken/ })).toHaveAttribute(
    "href",
    "https://howjsay.com/how-to-pronounce-convince"
  );
  // Older reports kept the explanation after a bar.
  await expect(rows.nth(4).locator(".fb-report__note")).toHaveText("Agree is already a verb.");
  await expect(page.getByText("Thank you for today's session.")).toBeVisible();
  expect(errors).toEqual([]);
});

test("unpublished work comes back after the tab is closed", async ({ page }) => {
  await mount(page);
  await field(page, "Word or phrase", 1).fill("justify");
  await field(page, "Meaning", 1).fill("To give a good reason.");
  await expect(page.locator(".fb-save-state")).toContainText("kept on this device");
  await page.waitForTimeout(700);

  page.on("dialog", (dialog) => dialog.accept());
  await load(page);
  await expect(page.locator(".fb-draft-notice")).toBeVisible();
  await expect(field(page, "Word or phrase", 1)).toHaveValue("justify");

  await page.getByRole("button", { name: "Discard them" }).click();
  await expect(field(page, "Word or phrase", 1)).toHaveValue("");
  await expect(page.locator(".fb-draft-notice")).toHaveCount(0);
});

for (const role of ["teacher", "learner"]) {
  test(`${role} report fits a phone screen`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    const errors = await mount(page, {
      role,
      teacherFeedback: savedFeedback({
        summary: "Great work.",
        futureSteps: "",
        items: [
          { id: "a", type: "grammar", prompt: "I disagree with *that you said* during the long discussion.", response: "I disagree with *what you said* during the long discussion." },
          { id: "b", type: "vocabulary", prompt: "acknowledge", response: "To accept that another person's point is true." },
        ],
      }),
    });
    await expect(page.locator(".session-report-view")).toBeVisible();
    // Let the cards finish sliding in before measuring.
    await page.waitForTimeout(1200);
    const overflow = await page.evaluate(() => {
      const wide = [...document.querySelectorAll(".session-report-view *")].filter((element) => {
        const box = element.getBoundingClientRect();
        return box.width > 0 && box.right > innerWidth + 1;
      });
      return wide.map((element) => element.className).slice(0, 5);
    });
    expect(overflow).toEqual([]);
    if (role === "teacher") {
      await expect(page.locator(".fb-grid__field-label").first()).toBeVisible();
    }
    expect(errors).toEqual([]);
  });
}
